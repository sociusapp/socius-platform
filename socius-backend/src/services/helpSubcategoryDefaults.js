const HelpCategory = require('../models/HelpCategory')
const HelpSubcategory = require('../models/HelpSubcategory')

const DEFAULT_HELP_SUBCATEGORIES = {
  print_document: [
    { title: 'Urgent print near me', description: 'Need a quick printout from a nearby shop.' },
    { title: 'Scan and send document', description: 'Need help scanning and sharing one file.' },
    { title: 'Photocopy small set', description: 'Need 2-10 pages copied nearby.' },
    { title: 'Form print support', description: 'Need a form printed today for submission.' },
    { title: 'Document upload help', description: 'Need help printing and uploading one document.' },
  ],
  tool_repair: [
    { title: 'Basic tool support', description: 'Need a small tool to fix something quickly.' },
    { title: 'Minor home fix', description: 'Need quick help with a simple repair task.' },
    { title: 'Bike puncture assist', description: 'Need nearby help for a basic bike issue.' },
    { title: 'Loose fitting repair', description: 'Need help tightening a loose fitting safely.' },
    { title: 'Small appliance check', description: 'Need quick check for a non-critical appliance issue.' },
  ],
  carry_lift: [
    { title: 'Lift one heavy bag', description: 'Need nearby help carrying a heavy bag.' },
    { title: 'Move small furniture', description: 'Need help shifting one light furniture item.' },
    { title: 'Carry groceries upstairs', description: 'Need support carrying groceries to my floor.' },
    { title: 'Load item into vehicle', description: 'Need help lifting one item into a car.' },
    { title: 'Short-distance carry', description: 'Need help carrying an item a short distance.' },
  ],
  transport_help: [
    { title: 'Drop to nearby stop', description: 'Need a short drop to a nearby location.' },
    { title: 'Ride-share guidance', description: 'Need help finding a safe local ride option.' },
    { title: 'Public transport assist', description: 'Need help reaching the right bus/metro point.' },
    { title: 'Pickup from nearby point', description: 'Need pickup from a nearby landmark.' },
    { title: 'Travel route support', description: 'Need quick route help for local travel.' },
  ],
  household_help: [
    { title: 'Quick home setup help', description: 'Need small help setting up one household task.' },
    { title: 'Minor cleaning support', description: 'Need quick support with a small cleaning task.' },
    { title: 'Simple organization help', description: 'Need help arranging a small home area.' },
    { title: 'Kitchen task assist', description: 'Need short help with a simple kitchen task.' },
    { title: 'Basic household errand', description: 'Need quick nearby help for a home errand.' },
  ],
  study_office_help: [
    { title: 'Notebook or file support', description: 'Need quick help organizing study/work files.' },
    { title: 'Assignment print support', description: 'Need nearby help printing assignment pages.' },
    { title: 'Quick office document task', description: 'Need short support for a simple office task.' },
    { title: 'Stationery help nearby', description: 'Need help getting basic stationery urgently.' },
    { title: 'Submission prep help', description: 'Need quick support before document submission.' },
  ],
  language_support: [
    { title: 'Short translation help', description: 'Need help translating a short message.' },
    { title: 'Call interpretation support', description: 'Need quick language help during a call.' },
    { title: 'Form language guidance', description: 'Need help understanding simple form text.' },
    { title: 'Conversation assist nearby', description: 'Need nearby support for basic communication.' },
    { title: 'Read and explain text', description: 'Need help reading and explaining one paragraph.' },
  ],
  elder_assistance: [
    { title: 'Walk assistance nearby', description: 'Need calm support while walking nearby.' },
    { title: 'Medicine pickup support', description: 'Need help picking up medicine locally.' },
    { title: 'Clinic visit companion', description: 'Need nearby company for a short clinic visit.' },
    { title: 'Small daily task support', description: 'Need help with one simple daily task.' },
    { title: 'Accessibility movement help', description: 'Need support with safe movement nearby.' },
  ],
  tech_help: [
    { title: 'Phone settings help', description: 'Need quick help adjusting one phone setting.' },
    { title: 'App install support', description: 'Need help installing a required app.' },
    { title: 'Login issue assist', description: 'Need help resolving a simple login issue.' },
    { title: 'Wi-Fi setup quick help', description: 'Need nearby support for basic Wi-Fi setup.' },
    { title: 'Document upload tech help', description: 'Need help uploading a file from phone.' },
  ],
  general_help: [
    { title: 'Small local task', description: 'Need help with a short local non-emergency task.' },
    { title: 'Quick nearby support', description: 'Need one-time nearby support right now.' },
    { title: 'Short assistance request', description: 'Need brief practical help for a simple task.' },
    { title: 'General everyday help', description: 'Need ordinary help with a basic daily issue.' },
    { title: 'Last resort local help', description: 'Need fallback support when no category fits.' },
  ],
}

const ensureHelpSubcategoryDefaults = async () => {
  const categories = await HelpCategory.find({ isActive: true, slug: { $in: Object.keys(DEFAULT_HELP_SUBCATEGORIES) } })
    .select('_id slug')
    .lean()

  for (const cat of categories) {
    const defaults = DEFAULT_HELP_SUBCATEGORIES[cat.slug] || []
    if (!defaults.length) continue

    const existing = await HelpSubcategory.find({ parentCategoryId: cat._id })
      .select('title')
      .lean()
    const existingTitles = new Set(existing.map((r) => String(r.title || '').trim().toLowerCase()))

    const toInsert = defaults
      .filter((d) => !existingTitles.has(String(d.title || '').trim().toLowerCase()))
      .map((d) => ({
        parentCategoryId: cat._id,
        title: d.title,
        description: d.description,
        isActive: true,
      }))

    if (toInsert.length) {
      await HelpSubcategory.insertMany(toInsert, { ordered: false }).catch(() => {})
    }
  }
}

module.exports = {
  ensureHelpSubcategoryDefaults,
  DEFAULT_HELP_SUBCATEGORIES,
}
