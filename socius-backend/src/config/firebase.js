const fs = require('fs')
const path = require('path')
const admin = require('firebase-admin')
const { GoogleAuth } = require('google-auth-library')
const logger = require('../utils/logger')

let firebaseApp = null
let googleAuth = null
let cachedProjectId = null

const loadServiceAccount = () => {
  // 1. Try SERVICE_ACCOUNT_PATH or default JSON file
  let jsonPath = process.env.SERVICE_ACCOUNT_PATH
  
  // If not set, check if the default file exists in current directory (socius-backend/)
  if (!jsonPath) {
    const defaultFile = 'sociusapp-0d91d68176e5.json'
    const defaultPath = path.join(__dirname, '..', '..', defaultFile)
    
    if (fs.existsSync(defaultPath)) {
      jsonPath = defaultPath
      logger.info(`Using default service account file: ${defaultFile}`)
    } else {
      logger.warn(`Default service account file not found: ${defaultPath}`)
    }
  }

  if (jsonPath) {
    const fullPath = path.isAbsolute(jsonPath)
      ? jsonPath
      : path.join(__dirname, '..', '..', jsonPath)

    if (fs.existsSync(fullPath)) {
      try {
        const raw = fs.readFileSync(fullPath, 'utf8')
        return JSON.parse(raw)
      } catch (e) {
        logger.error(`Error reading service account JSON: ${e.message}`)
      }
    } else {
      logger.warn(`Service account JSON not found at path: ${fullPath}`)
    }
  }

  // 2. Fallback to env vars
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !rawPrivateKey) {
    logger.error(
      'Firebase credentials missing: SERVICE_ACCOUNT_PATH ya FIREBASE_* env vars set karo'
    )
    throw new Error('Firebase credentials not configured')
  }

  cachedProjectId = projectId
  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: rawPrivateKey.replace(/\\n/g, '\n'),
  }
}

const initFirebase = () => {
  if (firebaseApp) {
    return firebaseApp
  }

  try {
    if (admin.apps && admin.apps.length) {
      firebaseApp = admin.app()
      logger.info('Firebase Admin: reused existing app instance')
      return firebaseApp
    }

    const serviceAccount = loadServiceAccount()

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })

    logger.info('Firebase Admin initialized')
    return firebaseApp
  } catch (err) {
    logger.error('Firebase init failed:', err)
    throw err
  }
}

const ensureFirebaseApp = () => {
  if (firebaseApp) return firebaseApp
  return initFirebase()
}

const ensureGoogleAuth = () => {
  if (googleAuth) return googleAuth

  const svc = loadServiceAccount()
  const projectId = svc.project_id
  cachedProjectId = projectId

  googleAuth = new GoogleAuth({
    credentials: {
      client_email: svc.client_email,
      private_key: svc.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  })

  return googleAuth
}

const getAccessToken = async () => {
  const auth = ensureGoogleAuth()
  const client = await auth.getClient()
  const res = await client.getAccessToken()
  if (!res || !res.token) {
    logger.error('Failed to obtain FCM access token')
    throw new Error('Failed to obtain FCM access token')
  }
  // logger.info(`FCM Access Token generated: ${res.token.substring(0, 10)}...`)
  return res.token
}

const getProjectId = () => {
  if (cachedProjectId) return cachedProjectId
  const svc = loadServiceAccount()
  cachedProjectId = svc.project_id
  return cachedProjectId
}

/**
 * Single device ko notification bhejo (HTTP v1, Postman jaisa)
 */
const sendToDevice = async ({ token, title, body, data = {}, priority = 'high' }) => {
  try {
    const accessToken = await getAccessToken()
    const projectId = getProjectId()

    const isHigh = String(priority).toLowerCase() === 'high'
    const hasNotification = title || body

    const bodyPayload = {
      message: {
        token,
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        android: {
          priority: isHigh ? 'HIGH' : 'NORMAL',
        },
      },
    }

    if (hasNotification) {
      bodyPayload.message.notification = { title, body }
      bodyPayload.message.android.notification = {
        channel_id: isHigh ? 'presence_alarm' : 'default_channel',
        sound: isHigh ? 'presence_alarm' : undefined,
      }
    }

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      }
    )

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      const errMsg =
        json?.error?.message ||
        json?.error ||
        `HTTP ${res.status} from FCM`
      logger.error('sendToDevice HTTP v1 error:', errMsg)
      return { success: false, error: errMsg }
    }

    logger.info(`FCM HTTP v1 sent to device: ${JSON.stringify(json)}`)
    return { success: true, messageId: json?.name || null }
  } catch (err) {
    logger.error('sendToDevice error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Multiple devices ko notification bhejo (HTTP v1, per-token)
 */
const sendToMultipleDevices = async ({ tokens, title, body, data = {}, priority = 'high' }) => {
  if (!tokens || tokens.length === 0) return { success: false, error: 'No tokens' }

  try {
    const results = []
    for (const token of tokens) {
      // single-device sender already logs and handles errors
      // eslint-disable-next-line no-await-in-loop
      const r = await sendToDevice({ token, title, body, data, priority })
      results.push(r)
    }

    let successCount = 0
    let failureCount = 0
    for (const r of results) {
      if (r && r.success) successCount++
      else failureCount++
    }

    logger.info(
      `FCM HTTP v1 multi: ${successCount} success, ${failureCount} failed (tokens=${tokens.length})`
    )

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      responses: results,
    }
  } catch (err) {
    logger.error('sendToMultipleDevices error:', err)
    return { success: false, error: err.message }
  }
}

module.exports = {
  initFirebase,
  ensureFirebaseApp,
  sendToDevice,
  sendToMultipleDevices,
}
