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
const { resolveUploadDir, ensureAllUploadSubdirs, UPLOADS_ROOT } = require('./src/config/uploads')

ensureAllUploadSubdirs()
if (process.env.NODE_ENV === 'production') {
  console.log('[uploads] Persisted files directory:', UPLOADS_ROOT)
}
const routes = require('./src/routes')
const { notFoundHandler, errorHandler } = require('./src/middlewares/errorHandler')
const User = require('./src/models/User')
const cron = require('node-cron')
const { runAutoCloseJobs } = require('./src/jobs/autoClose.job')
const { runHelpRequestExpiryWarnings } = require('./src/jobs/helpRequestExpiryWarnings.job')
const { runHelpSessionCompletionPrompts } = require('./src/jobs/helpSessionCompletion.job')
const { cleanupOldChats } = require('./src/jobs/cleanup.job')
const {
  cleanupExpiredNotificationCampaignAssets,
} = require('./src/jobs/notificationCampaignAssets.job')
const { runSubscriptionCheck } = require('./src/jobs/subscriptionCheck.job')
const { notifyMissingHelpersForOpenRequestsBatch } = require('./src/services/helpRequest.service')

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

app.use('/uploads/documents', express.static(resolveUploadDir('documents')))
app.use('/uploads/selfies', express.static(resolveUploadDir('selfies')))
app.use('/uploads/help-categories', express.static(resolveUploadDir('help-categories')))
app.use('/uploads/presence-categories', express.static(resolveUploadDir('presence-categories')))
app.use('/uploads/presence-items', express.static(resolveUploadDir('presence-items')))
app.use('/uploads/help-catalog-items', express.static(resolveUploadDir('help-catalog-items')))
app.use('/uploads/issue-screenshots', express.static(resolveUploadDir('issue-screenshots')))
app.use('/uploads/gallery', express.static(resolveUploadDir('gallery')))
app.use('/uploads/blog-types', express.static(resolveUploadDir('blog-types')))
app.use('/uploads/blogs', express.static(resolveUploadDir('blogs')))
app.use('/uploads/chat-media', express.static(resolveUploadDir('chat-media')))
app.use('/uploads/closures', express.static(resolveUploadDir('closures')))
app.use('/uploads/prepare-cards', express.static(resolveUploadDir('prepare-cards')))
app.use(
  '/uploads/notification-campaigns',
  express.static(resolveUploadDir('notification-campaigns'))
)

app.use('/public', require('./src/routes/public.routes'))
app.use('/api/blog-types', require('./src/routes/blogType.routes'))
app.use('/api/blogs', require('./src/routes/blog.routes'))
app.use('/api/tracking-links', require('./src/routes/trackingLink.routes'))
app.use('/api/gallery', require('./src/routes/galleryImage.routes'))

// Dynamic tracking URLs - handle custom slugs like /xxx/momtaj, /xxx/rehan
// ANY slug after /xxx/ will show the capture page
app.get('/xxx/:slug', async (req, res, next) => {
  try {
    const TrackingLink = require('./src/models/TrackingLink');
    const link = await TrackingLink.findOne({ 
      slug: req.params.slug.toLowerCase(),
      isActive: true
    });
    
    // Store the tracking link info (or null if not found)
    req.trackingLink = link;
    
    // Always render the capture page, even if link not found
    // This allows any /xxx/slug to work
    const publicController = require('./src/controllers/public.controller');
    return publicController.renderCapturePage(req, res, next);
  } catch (err) {
    next(err);
  }
});

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
        await runHelpRequestExpiryWarnings()
      } catch (err) {
        console.error('Expiry warning job failed:', err)
      }
      try {
        await runAutoCloseJobs()
      } catch (err) {
        console.error('Auto-close job failed:', err)
      }
    })

    // Session end prompts + alarms: run every minute so requester/helper get timely FCM (not only every 5 min).
    cron.schedule('* * * * *', async () => {
      try {
        await runHelpSessionCompletionPrompts()
      } catch (err) {
        console.error('Help session completion prompt job failed:', err)
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

    // Temporary FCM campaign images (admin uploads) — daily at 3 AM
    cron.schedule('0 3 * * *', async () => {
      try {
        await cleanupExpiredNotificationCampaignAssets()
      } catch (err) {
        console.error('Notification campaign asset cleanup failed:', err)
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

    // Daily Help: naye available helpers / radius me aane wale users ko open requests par notify (incremental)
    cron.schedule('*/2 * * * *', async () => {
      try {
        await notifyMissingHelpersForOpenRequestsBatch()
      } catch (err) {
        console.error('Help request helper broadcast job failed:', err)
      }
    })
    
    console.log('Background jobs scheduled successfully')
  })
}

start().catch((err) => {
  console.error('Failed to start server', err)
  process.exit(1)
})
