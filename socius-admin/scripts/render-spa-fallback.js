const fs = require('fs')
const path = require('path')

const buildDir = path.join(__dirname, '..', 'build')
const indexPath = path.join(buildDir, 'index.html')
const appJsPath = path.join(__dirname, '..', 'src', 'App.js')

if (!fs.existsSync(indexPath)) {
  console.error('Missing build/index.html. Run `npm run build` first.')
  process.exit(1)
}

const indexHtml = fs.readFileSync(indexPath, 'utf8')

const normalizeRoute = (p) => {
  const raw = String(p || '').trim()
  if (!raw) return null
  if (raw === '/' || raw === '/*' || raw === '*') return null
  if (!raw.startsWith('/')) return null
  if (raw.includes(':')) return null
  const withoutLeading = raw.replace(/^\/+/, '')
  if (!withoutLeading) return null
  return withoutLeading.replace(/\/+$/, '')
}

const discoverRoutesFromApp = () => {
  if (!fs.existsSync(appJsPath)) return []
  const src = fs.readFileSync(appJsPath, 'utf8')
  const routes = new Set()
  const re = /<Route\s+[^>]*path="([^"]+)"[^>]*>/g
  let m
  while ((m = re.exec(src))) {
    const normalized = normalizeRoute(m[1])
    if (normalized) routes.add(normalized)
  }
  return [...routes]
}

const staticRoutes = discoverRoutesFromApp()

for (const route of staticRoutes) {
  const outDir = path.join(buildDir, route)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml)
}

console.log(`SPA fallback generated for ${staticRoutes.length} routes.`)
