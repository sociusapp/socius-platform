const fs = require('fs')
const path = require('path')

const buildDir = path.join(__dirname, '..', 'build')
const indexPath = path.join(buildDir, 'index.html')

if (!fs.existsSync(indexPath)) {
  console.error('Missing build/index.html. Run `npm run build` first.')
  process.exit(1)
}

const indexHtml = fs.readFileSync(indexPath, 'utf8')

const routes = [
  'login',
  'developer-login',
  'login-developer',
  'forgot-password',
  'dashboard',
  'issue-tracker',
  'live-awareness',
  'daily-help',
  'incident-review',
  'users',
  'verification',
  'content',
  'static-pages',
  'static-pages/new',
  'reports',
  'notifications',
  'settings',
  'audit-logs',
  'appeals',
  'risk-tiers',
  'subscriptions',
  'content/scenario-config',
  'account-settings',
]

for (const route of routes) {
  const outDir = path.join(buildDir, route)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml)
}

console.log(`SPA fallback generated for ${routes.length} routes.`)

