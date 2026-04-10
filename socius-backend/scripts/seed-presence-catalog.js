/**
 * Seeds Need Presence categories + subcategories (situations) for admin + mobile.
 * Idempotent: upserts by category `slug` and item `slug` within each category.
 *
 * Usage (from socius-backend/):
 *   node scripts/seed-presence-catalog.js
 *
 * Requires MONGO_URI (and optional DB_NAME) in .env
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const PresenceCategory = require('../src/models/PresenceCategory')
const PresenceItem = require('../src/models/PresenceItem')

/**
 * Categories match the in-app “What’s happening” cards; 6 situations each.
 * Upsert is idempotent on category slug + item slug.
 */
const CATALOG = [
  {
    slug: 'calm_presence',
    title: 'I need calm presence',
    iconName: 'account-group',
    sortOrder: 0,
    items: [
      {
        slug: 'unsafe_walk',
        title: 'Feeling unsafe while walking',
        description: 'Someone nearby is making me uncomfortable.',
        tags: ['unsafe_walk', 'walking', 'alone'],
        iconName: 'shoe-print',
        sortOrder: 0,
      },
      {
        slug: 'being_followed',
        title: 'Being followed',
        description: 'I feel someone may be following me.',
        tags: ['being_followed', 'walking'],
        iconName: 'eye',
        sortOrder: 1,
      },
      {
        slug: 'public_intimidation',
        title: 'Public intimidation',
        description: 'Someone is acting aggressively or intimidating.',
        tags: ['public_intimidation', 'crowd'],
        iconName: 'alert',
        sortOrder: 2,
      },
      {
        slug: 'shop_tension',
        title: 'Shop or workplace tension',
        description: 'A situation at my shop or workplace feels tense.',
        tags: ['shop_tension', 'work'],
        iconName: 'store',
        sortOrder: 3,
      },
      {
        slug: 'night_travel',
        title: 'Late-night travel unease',
        description: 'I don’t feel safe traveling alone right now.',
        tags: ['night_travel', 'travel'],
        iconName: 'moon-waning-crescent',
        sortOrder: 4,
      },
      {
        slug: 'alone_something_feels_off',
        title: 'Alone and something feels off',
        description: 'Something feels off and I don’t want to be alone with it — light awareness nearby would help.',
        tags: ['alone', 'uneasy', 'calm'],
        iconName: 'account-alert',
        sortOrder: 5,
      },
    ],
  },
  {
    slug: 'care_support',
    title: 'Someone needs care or support',
    iconName: 'heart',
    sortOrder: 1,
    items: [
      {
        slug: 'care_company',
        title: 'Company or a gentle check-in',
        description: 'This is about care, comfort, or assistance — someone to stay loosely aware.',
        tags: ['care', 'company'],
        iconName: 'hand-heart',
        sortOrder: 0,
      },
      {
        slug: 'care_medical_non_emergency',
        title: 'Non-emergency medical support',
        description: 'Support around a medical situation that is not an emergency.',
        tags: ['care', 'medical'],
        iconName: 'medical-bag',
        sortOrder: 1,
      },
      {
        slug: 'elder_family_check',
        title: 'Checking on an elder or family member',
        description: 'A relative nearby may need calm presence while things get sorted.',
        tags: ['family', 'elder', 'care'],
        iconName: 'account-heart',
        sortOrder: 2,
      },
      {
        slug: 'after_difficult_news',
        title: 'After difficult news',
        description: 'Emotional weight — sharing awareness, not fixing everything.',
        tags: ['care', 'emotional'],
        iconName: 'heart-pulse',
        sortOrder: 3,
      },
      {
        slug: 'child_dependent_concern',
        title: 'Concern for a child or dependent',
        description: 'Looking for calm, appropriate community awareness nearby.',
        tags: ['care', 'child', 'dependent'],
        iconName: 'human-child',
        sortOrder: 4,
      },
      {
        slug: 'recovery_fatigue',
        title: 'Recovery or heavy fatigue',
        description: 'Still mobile but depleted — light awareness on the way home or at a stop.',
        tags: ['care', 'recovery'],
        iconName: 'sleep',
        sortOrder: 5,
      },
    ],
  },
  {
    slug: 'right_help',
    title: 'We need the right help',
    iconName: 'link-variant',
    sortOrder: 2,
    items: [
      {
        slug: 'blood_needed',
        title: 'Blood donation awareness',
        description: 'Sharing awareness about a need for blood donors nearby.',
        tags: ['blood', 'donation', 'medical'],
        iconName: 'water',
        sortOrder: 0,
      },
      {
        slug: 'car_issue',
        title: 'Car or roadside issue',
        description: 'Vehicle problem — calm awareness while arranging help.',
        tags: ['car', 'roadside'],
        iconName: 'car-wrench',
        sortOrder: 1,
      },
      {
        slug: 'lost_or_disoriented',
        title: 'Lost or disoriented',
        description: 'Hard to orient — pointing to appropriate help and safer spot.',
        tags: ['lost', 'navigation'],
        iconName: 'map-search',
        sortOrder: 2,
      },
      {
        slug: 'supplies_access',
        title: 'Supplies or access (food, medicine, basics)',
        description: 'Need to connect with the right resource — not emergency, but specific.',
        tags: ['supplies', 'access'],
        iconName: 'shopping',
        sortOrder: 3,
      },
      {
        slug: 'coordination_services',
        title: 'Coordination with services',
        description: 'Shelter, clinic, transport, or local office — help finding the right door.',
        tags: ['services', 'coordination'],
        iconName: 'phone-in-talk',
        sortOrder: 4,
      },
      {
        slug: 'language_access_barrier',
        title: 'Language or access barrier',
        description: 'Hard to reach the right help — community awareness can reduce friction.',
        tags: ['access', 'language'],
        iconName: 'translate',
        sortOrder: 5,
      },
    ],
  },
  {
    slug: 'prevent_fix',
    title: "Let's prevent or fix something",
    iconName: 'wrench',
    sortOrder: 3,
    items: [
      {
        slug: 'local_hazard_awareness',
        title: 'Local hazard or tension',
        description: 'A local issue that could become a problem — calm visibility.',
        tags: ['community', 'hazard'],
        iconName: 'shield-alert',
        sortOrder: 0,
      },
      {
        slug: 'blocked_walkway_lighting',
        title: 'Blocked path or poor lighting',
        description: 'Trip hazard, blocked stairs, or dark route worth flagging calmly.',
        tags: ['walkway', 'lighting'],
        iconName: 'road-variant',
        sortOrder: 1,
      },
      {
        slug: 'noise_conflict_escalation',
        title: 'Noise or conflict that could escalate',
        description: 'Ongoing tension — early awareness before it sharpens.',
        tags: ['noise', 'conflict'],
        iconName: 'volume-high',
        sortOrder: 2,
      },
      {
        slug: 'shared_space_issue',
        title: 'Shared space (lobby, stair, gate)',
        description: 'Building or block shared space feels off or unmaintained.',
        tags: ['shared', 'building'],
        iconName: 'office-building',
        sortOrder: 3,
      },
      {
        slug: 'weather_outage_impact',
        title: 'Weather or outage affecting safety',
        description: 'Heat, flood risk, blackout corridor — neighbors should know gently.',
        tags: ['weather', 'outage'],
        iconName: 'weather-lightning-rainy',
        sortOrder: 4,
      },
      {
        slug: 'repeat_local_concern',
        title: 'Something that keeps happening',
        description: 'Repeat concern in the area — seeking steady, non-alarmist visibility.',
        tags: ['repeat', 'community'],
        iconName: 'alert-decagram',
        sortOrder: 5,
      },
    ],
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

  let catCount = 0
  let itemCount = 0

  for (const block of CATALOG) {
    const category = await PresenceCategory.findOneAndUpdate(
      { slug: block.slug },
      {
        $set: {
          title: block.title,
          slug: block.slug,
          iconName: block.iconName || null,
          sortOrder: block.sortOrder,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    catCount += 1

    for (const it of block.items || []) {
      await PresenceItem.findOneAndUpdate(
        { categoryId: category._id, slug: it.slug },
        {
          $set: {
            categoryId: category._id,
            slug: it.slug,
            title: it.title,
            description: it.description || '',
            tags: Array.isArray(it.tags) ? it.tags : [],
            iconName: it.iconName || null,
            sortOrder: it.sortOrder ?? 0,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      itemCount += 1
    }
  }

  console.log(
    `Presence catalog: upserted ${catCount} categories + ${itemCount} items (slug-stable for mobile).`
  )
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
