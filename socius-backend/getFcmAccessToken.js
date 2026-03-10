require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { GoogleAuth } = require('google-auth-library')

async function loadCredentials() {
  const jsonPath = process.env.SERVICE_ACCOUNT_PATH || './sociusapp-0d91d68176e5.json'
  if (jsonPath) {
    const fullPath = path.isAbsolute(jsonPath)
      ? jsonPath
      : path.join(__dirname, jsonPath)
    if (!fs.existsSync(fullPath)) {
      console.error(`\n❌ SERVICE_ACCOUNT_PATH file nahi mila: ${fullPath}\n`)
      process.exit(1)
    }
    const raw = fs.readFileSync(fullPath, 'utf8')
    const json = JSON.parse(raw)
    return {
      client_email: json.client_email,
      private_key: json.private_key,
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!clientEmail || !rawPrivateKey) {
    console.error(
      '\n❌ FIREBASE_CLIENT_EMAIL ya FIREBASE_PRIVATE_KEY .env me set nahi hai\n'
    )
    console.error(
      '   Ya to .env me yeh vars set karo, ya SERVICE_ACCOUNT_PATH env se JSON file ka path do.\n'
    )
    process.exit(1)
  }

  const privateKey = rawPrivateKey.replace(/\\n/g, '\n')

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    console.warn(
      '\n⚠️  FIREBASE_PRIVATE_KEY unusual format me lag raha hai (BEGIN PRIVATE KEY nahi mila)'
    )
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
  }
}

async function getAccessToken() {
  try {
    const { client_email, private_key } = await loadCredentials()

    const auth = new GoogleAuth({
      credentials: {
        client_email,
        private_key,
      },
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })

    const client = await auth.getClient()
    const accessTokenResponse = await client.getAccessToken()
    const token =
      typeof accessTokenResponse === 'string'
        ? accessTokenResponse
        : accessTokenResponse?.token

    console.log('\n✅ Access Token:\n')
    console.log(token)
    console.log('\n⚠️  Yeh token ~1 ghante ke liye valid rahega\n')
  } catch (err) {
    console.error('\n❌ Access token generate karne me error aaya:\n')
    console.error(err.message || err)
    if (String(err.message || '').includes('DECODER routines')) {
      console.error(
        '\n👉 Hint: Private key ka format galat ho sakta hai.\n' +
          '   - Firebase JSON se private_key ko bilkul jaisa hai vaisa hi copy karo\n' +
          '   - .env me value kuch aisi ho: FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"\n' +
          '   - Extra quotes / backticks / spaces mat add karo\n' +
          '   - Ya SERVICE_ACCOUNT_PATH env set karke direct JSON file ka path do\n'
      )
    }
    process.exit(1)
  }
}

getAccessToken()


// node getFcmAccessToken.js 
