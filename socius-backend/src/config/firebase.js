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
const normalizeImageUrl = (url) => {
  const s = String(url || '').trim()
  if (!s) return null
  if (/^https:\/\//i.test(s)) return s
  return null
}

const sendToDevice = async ({ token, title, body, data = {}, priority = 'high', imageUrl = null }) => {
  try {
    const accessToken = await getAccessToken()
    const projectId = getProjectId()

    const isHigh = String(priority).toLowerCase() === 'high'
    const hasNotification = title || body

    const resolveAndroidNotifConfig = () => {
      const t = String(data?.type || '').toLowerCase()
      const campaign = String(data?.campaignType || '').toLowerCase()
      // IDs must match channels created on mobile (MainApplication / Notifee).
      if (
        t.includes('help_request') ||
        t.includes('borrow_item_request') ||
        t.includes('offer_item_request') ||
        t.includes('request_rematched') ||
        t === 'request_completion_prompt'
      ) {
        return { channelId: 'socius_help_alarm', sound: 'help_request' }
      }
      if (t.includes('presence_alarm') || t.includes('presence')) {
        return { channelId: 'socius_presence_alarm', sound: 'presence_alarm' }
      }
      if (t === 'admin_broadcast' && (campaign === 'marketing' || campaign === 'promo')) {
        return { channelId: 'socius_nudge', sound: null }
      }
      return { channelId: 'socius_updates', sound: null }
    }

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
      const androidCfg = resolveAndroidNotifConfig()
      const img = normalizeImageUrl(imageUrl)
      bodyPayload.message.notification = img ? { title, body, image: img } : { title, body }
      bodyPayload.message.android.notification = {
        channel_id: androidCfg.channelId,
        ...(androidCfg.sound ? { sound: androidCfg.sound } : {}),
        notification_priority: isHigh ? 'PRIORITY_MAX' : 'PRIORITY_DEFAULT',
        ...(img ? { image: img } : {}),
      }
      // iOS (APNs): explicit aps alert — without this, some iOS builds only get data or miss banners when backgrounded.
      bodyPayload.message.apns = {
        headers: {
          'apns-priority': isHigh ? '10' : '5',
        },
        payload: {
          aps: {
            alert: {
              title: String(title || ''),
              body: String(body || ''),
            },
            sound: 'default',
          },
        },
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
      const retryable =
        res.status >= 500 ||
        /UNAVAILABLE|INTERNAL|RESOURCE_EXHAUSTED|DEADLINE_EXCEEDED/i.test(String(errMsg))
      return { success: false, error: errMsg, retryable }
    }

    logger.info(`FCM HTTP v1 sent to device: ${JSON.stringify(json)}`)
    return { success: true, messageId: json?.name || null }
  } catch (err) {
    logger.error('sendToDevice error:', err)
    return { success: false, error: err.message, retryable: true }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * FCM send with limited retries (transient errors only)
 */
const sendToDeviceWithRetry = async (payload, maxAttempts = 3) => {
  const delays = [0, 500, 2000]
  let last = null
  for (let i = 0; i < maxAttempts; i++) {
    // eslint-disable-next-line no-await-in-loop
    if (delays[i]) await sleep(delays[i])
    // eslint-disable-next-line no-await-in-loop
    last = await sendToDevice(payload)
    if (last.success) return last
    if (!last.retryable) return last
  }
  return last
}

/**
 * Multiple devices ko notification bhejo (HTTP v1, per-token)
 */
const sendToMultipleDevices = async ({ tokens, title, body, data = {}, priority = 'high', imageUrl = null }) => {
  if (!tokens || tokens.length === 0) return { success: false, error: 'No tokens' }

  try {
    const results = []
    for (const token of tokens) {
      // eslint-disable-next-line no-await-in-loop
      const r = await sendToDeviceWithRetry({ token, title, body, data, priority, imageUrl })
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
  sendToDeviceWithRetry,
  sendToMultipleDevices,
}
