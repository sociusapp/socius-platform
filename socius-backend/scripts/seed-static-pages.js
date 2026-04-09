/**
 * Upserts core legal / static CMS pages used by the mobile app (GET /api/pages/:slug).
 *
 * Usage (from socius-backend/):
 *   node scripts/seed-static-pages.js
 *
 * Requires MONGO_URI (and optional DB_NAME) in .env
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const StaticPage = require('../src/models/StaticPage')

const PAGES = [
  {
    slug: 'terms-of-use',
    title: 'Terms of Use',
    section: 'legal',
    content: `<h1>Terms of Use</h1>
<p>By using Socius, you agree to use the platform responsibly and in accordance with all applicable laws and regulations in your region.</p>
<p>Socius is a community information-sharing tool. It does not direct your actions, provide professional advice, or replace emergency services. You remain responsible for your own choices and safety.</p>
<p>We may update these terms from time to time. Continued use of the app after changes means you accept the updated terms.</p>
<p>For questions, contact Socius support through the app or your official support channel.</p>`,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    section: 'privacy',
    content: `<h1>Privacy Policy</h1>
<p>Socius collects only the information needed to run the service—such as account details, verification materials you choose to submit, and data required for location-aware features when you grant permission.</p>
<p>Your personal data is processed to operate the app, keep the community safer, and comply with the law. We do not sell your personal information.</p>
<p>Information you share during an active request may be visible to a limited set of nearby participants as described in the product—you control what you share and can stop using features at any time.</p>
<p>You may request access, correction, or deletion where applicable law allows, by contacting support.</p>`,
  },
  {
    slug: 'data-privacy',
    title: 'Data privacy',
    section: 'privacy',
    content: `<h1>Data privacy</h1>
<p>This summary explains how Socius handles data in line with the main Privacy Policy.</p>
<ul>
<li>We minimize data collection to what the product needs.</li>
<li>Sensitive verification documents are used only for identity review as described in the app.</li>
<li>Location is used when you allow it, for features that depend on place.</li>
</ul>
<p>See the full <strong>Privacy Policy</strong> in the app for more detail.</p>`,
  },
  {
    slug: 'consent-disclaimers',
    title: 'Consent & disclaimers',
    section: 'legal',
    content: `<h1>Consent &amp; disclaimers</h1>
<p>By using Socius, you acknowledge that the platform shares information to improve awareness and community support. Participation is voluntary.</p>
<p>Socius is not a substitute for police, ambulance, or other emergency services. In an emergency, contact the appropriate authorities in your area.</p>`,
  },
  {
    slug: 'jurisdiction-resolution',
    title: 'Jurisdiction & dispute resolution',
    section: 'legal',
    content: `<h1>Jurisdiction &amp; dispute resolution</h1>
<p>These terms are governed by the laws applicable to Socius and your region as indicated in your agreement or app store listing.</p>
<p>For disputes, follow the process described in your jurisdiction or contact support for guidance.</p>`,
  },
  {
    slug: 'what-socius-is-not',
    title: 'What Socius is not',
    section: 'safety',
    content: `<h1>What Socius is not</h1>
<p>Socius is not emergency services, medical advice, legal advice, or a guarantee of physical presence.</p>
<p>It is a tool for calm, voluntary community awareness. Use judgment and local emergency numbers when safety is at risk.</p>`,
  },
  {
    slug: 'volunteer-code-of-conduct',
    title: 'Volunteer code of conduct',
    section: 'legal',
    content: `<h1>Volunteer code of conduct</h1>
<p>When helping others through Socius, act with respect, boundaries, and safety. Do not harass, pressure, or put yourself or others at risk.</p>
<p>Follow community guidelines and local laws. You may disengage at any time.</p>`,
  },
]

async function run() {
  const uri = process.env.MONGO_URI
  const dbName = process.env.DB_NAME || 'socius'
  if (!uri) {
    console.error('Missing MONGO_URI in .env')
    process.exit(1)
  }

  await mongoose.connect(uri, { dbName })

  for (const p of PAGES) {
    await StaticPage.findOneAndUpdate(
      { slug: p.slug },
      {
        $set: {
          title: p.title,
          content: p.content,
          section: p.section,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }

  console.log(`Seeded ${PAGES.length} static pages (slugs: ${PAGES.map((x) => x.slug).join(', ')}).`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
