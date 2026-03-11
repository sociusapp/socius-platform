const http = require('http')
const path = require('path')
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
require('dotenv').config()

const { connectDB } = require('./src/config/db')
const { initFirebase } = require('./src/config/firebase')
const { initSocket } = require('./src/config/socket')
const { connectRedis } = require('./src/config/redis')
const routes = require('./src/routes')
const { notFoundHandler, errorHandler } = require('./src/middlewares/errorHandler')
const User = require('./src/models/User')
const cron = require('node-cron')
const { runAutoCloseJobs } = require('./src/jobs/autoClose.job')
const { cleanupOldChats } = require('./src/jobs/cleanup.job')
const { runSubscriptionCheck } = require('./src/jobs/subscriptionCheck.job')

const app = express()

const rawOrigins = process.env.ALLOWED_ORIGINS
const corsOrigin =
  !rawOrigins || rawOrigins === '*'
    ? '*'
    : rawOrigins.split(',')

app.use(cors({ origin: corsOrigin }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.use('/uploads/documents', express.static(path.join(__dirname, 'uploads/documents')))
app.use('/uploads/selfies', express.static(path.join(__dirname, 'uploads/selfies')))

app.use('/api', routes)

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Socius Backend API</title>
      <style>
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f0f2f5;
          color: #1a1a1a;
        }
        .container {
          text-align: center;
          padding: 3rem;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          max-width: 500px;
          width: 90%;
        }
        h1 {
          color: #4f46e5;
          margin-top: 0;
          font-size: 2rem;
        }
        p {
          color: #4b5563;
          line-height: 1.6;
          margin-bottom: 0;
        }
        code {
          background-color: #f3f4f6;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.9em;
          color: #e11d48;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Socius Backend</h1>
        <p>The backend server is successfully running. <br><br> API endpoints are accessible via the <code>/api</code> prefix.</p>
      </div>
    </body>
    </html>
  `)
})

app.use(notFoundHandler)
app.use(errorHandler)

const port = process.env.PORT || 8000

const runStartupMigrations = async () => {
  try {
    await User.updateMany({ email: null }, { $unset: { email: '' } })
  } catch (err) {
    console.error('Startup migration failed', err)
  }
}

const start = async () => {
  await connectDB()

  try {
    const redis = connectRedis()
    // Optional: wait for connect to verify
  } catch (err) {
    console.error('Redis init failed (non-fatal for dev if handling offline)', err)
  }
  
  await runStartupMigrations()

  try {
    initFirebase()
  } catch (err) {
    console.error('Firebase init failed at startup', err)
  }

  const server = http.createServer(app)
  initSocket(server)

  server.listen(port, () => {
    console.log(`Socius backend listening on port ${port}`)
    
    // Schedule background jobs
    // Auto-close jobs every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await runAutoCloseJobs()
      } catch (err) {
        console.error('Auto-close job failed:', err)
      }
    })
    
    // Cleanup old chats daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        await cleanupOldChats()
      } catch (err) {
        console.error('Cleanup job failed:', err)
      }
    })
    
    // Subscription check every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await runSubscriptionCheck()
      } catch (err) {
        console.error('Subscription check job failed:', err)
      }
    })
    
    console.log('Background jobs scheduled successfully')
  })
}

start().catch((err) => {
  console.error('Failed to start server', err)
  process.exit(1)
})
