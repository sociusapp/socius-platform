/**
 * Seeds the six “Daily Help topics” (blog types) + one published article each,
 * aligned with the Community screen reference cards.
 *
 * Usage (from socius-backend/):
 *   node scripts/seed-daily-help-blog-topics.js
 *
 * Requires MONGO_URI (and optional DB_NAME) in .env
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const BlogType = require('../src/models/BlogType')
const Blog = require('../src/models/Blog')

const publishedAt = new Date()

const TOPICS = [
  {
    name: 'Calm presence',
    slug: 'calm-presence',
    iconName: 'meditation',
    color: '#B87A7A',
    sortOrder: 0,
    description: 'Staying steady and grounded during everyday stress.',
    blogSlug: 'guide-calm-presence',
    blogTitle: 'Calm presence in daily life',
    excerpt:
      'Simple ways to stay grounded, reduce overwhelm, and show up steadily for yourself and others.',
    html: `<h2>What “calm presence” means here</h2>
<p>Calm presence is not about being silent or invisible—it’s about responding with care instead of rushing or escalating. In community support, a calm tone helps everyone feel safer.</p>
<h2>Quick practices</h2>
<ul>
<li>Pause before you reply; one slow breath often changes the tone of a message.</li>
<li>Keep requests concrete and small: time, place, what you need, and for how long.</li>
<li>If you’re overwhelmed, it’s okay to step back and ask for a different kind of help.</li>
</ul>
<p>This guide is maintained in the Socius admin panel—update the text anytime to match your community’s language and norms.</p>`,
  },
  {
    name: 'Care & support',
    slug: 'care-support',
    iconName: 'hand-heart',
    color: '#9A7878',
    sortOrder: 1,
    description: 'Neighborly care without pressure or obligation.',
    blogSlug: 'guide-care-support',
    blogTitle: 'Care & support — what to expect',
    excerpt:
      'How everyday care works on Socius: voluntary, respectful, and bounded—so help stays kind for everyone.',
    html: `<h2>Care without pressure</h2>
<p>Socius is built for small, practical support between people nearby. Participation is voluntary and kindness should never come with guilt.</p>
<h2>Ways to offer support</h2>
<ul>
<li>Short, specific offers (“I can drop off in 20 minutes”) are easier to accept than vague promises.</li>
<li>Ask what would help most—and confirm boundaries (time, access, comfort level).</li>
<li>Keep communication simple and respectful; don’t push for more than someone wants.</li>
</ul>
<p>Edit this article in the admin <strong>Blogs</strong> screen to match your programs and policies.</p>`,
  },
  {
    name: 'Medical awareness',
    slug: 'medical-awareness',
    iconName: 'medical-bag',
    color: '#C17B7B',
    sortOrder: 2,
    description: 'Safety-first awareness — not a substitute for emergency care.',
    blogSlug: 'guide-medical-awareness',
    blogTitle: 'Medical awareness & safety',
    excerpt:
      'When to call emergency services, how to share information clearly, and why Socius is not a medical service.',
    html: `<h2>Emergencies</h2>
<p>If someone is injured, unconscious, confused, bleeding heavily, or may be having a heart attack or stroke, call your local emergency number immediately. Socius is not an emergency service.</p>
<h2>Helpful awareness (non-clinical)</h2>
<ul>
<li>Share what you observed, when it happened, and what changed—facts help responders.</li>
<li>Don’t diagnose; support by reducing risk (rest, water, shade, calm directions).</li>
<li>Protect privacy: only share health details the person agrees to share.</li>
</ul>
<p>Coordinate with your legal/clinical advisors and update this content via the admin panel as needed.</p>`,
  },
  {
    name: 'Language support',
    slug: 'language-support',
    iconName: 'translate',
    color: '#8A6F6F',
    sortOrder: 3,
    description: 'Clear communication across languages and comfort levels.',
    blogSlug: 'guide-language-support',
    blogTitle: 'Language support tips',
    excerpt:
      'Practical ways to communicate when languages don’t match: patience, tools, and simple structure.',
    html: `<h2>Keep it simple</h2>
<ul>
<li>Short sentences, one idea per message, and plain words reduce misunderstanding.</li>
<li>Confirm understanding (“Does 6pm at the corner work?”) instead of assuming.</li>
<li>If needed, use a trusted translation tool—and double‑check important safety details.</li>
</ul>
<h2>Respect and dignity</h2>
<p>Accent, literacy, or nervousness isn’t a reflection of intelligence. Extra patience usually saves time.</p>`,
  },
  {
    name: 'Elder assistance',
    slug: 'elder-assistance',
    iconName: 'human-greeting-proximity',
    color: '#A67979',
    sortOrder: 4,
    description: 'Respectful help that preserves autonomy and safety.',
    blogSlug: 'guide-elder-assistance',
    blogTitle: 'Elder assistance — respectful help',
    excerpt:
      'How to offer help to older neighbors while honoring independence, dignity, and personal choice.',
    html: `<h2>Start with choice</h2>
<ul>
<li>Ask what they prefer, and offer options (“I can carry this, or walk beside you—what helps?”).</li>
<li>Be patient with pacing; rushing increases risk.</li>
<li>Watch for trip hazards, glare, and fatigue—small environmental fixes matter.</li>
</ul>
<h2>Boundaries</h2>
<p>Medical decisions belong to the person (and their trusted contacts). Your role is supportive, not controlling.</p>`,
  },
  {
    name: 'Community upkeep',
    slug: 'community-upkeep',
    iconName: 'home-heart',
    color: '#7D6868',
    sortOrder: 5,
    description: 'Shared spaces, small fixes, and neighborly upkeep.',
    blogSlug: 'guide-community-upkeep',
    blogTitle: 'Community upkeep ideas',
    excerpt:
      'Light-touch ways neighbors can keep shared spaces safer and more welcoming—without heavy coordination.',
    html: `<h2>Small actions, visible care</h2>
<ul>
<li>Report hazards clearly (photo + location + what you saw).</li>
<li>Coordinate light tasks (trash near a bench, loose signage) with local rules in mind.</li>
<li>Prefer scheduled, public-spirited efforts over informal “fixes” that might need permits.</li>
</ul>
<p>Use the admin <strong>Blogs</strong> editor to link local programs, volunteer days, or municipal contacts.</p>`,
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

  for (const t of TOPICS) {
    const type = await BlogType.findOneAndUpdate(
      { slug: t.slug },
      {
        $set: {
          name: t.name,
          description: t.description,
          iconName: t.iconName,
          iconPath: null,
          iconType: 'image',
          color: t.color,
          sortOrder: t.sortOrder,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    await Blog.findOneAndUpdate(
      { slug: t.blogSlug },
      {
        $set: {
          title: t.blogTitle,
          typeId: type._id,
          content: t.html,
          excerpt: t.excerpt,
          author: 'Socius Team',
          isPublished: true,
          publishedAt,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }

  console.log(`Seeded ${TOPICS.length} blog types + ${TOPICS.length} published articles (Daily Help topics).`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
