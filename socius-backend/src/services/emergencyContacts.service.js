const EmergencyContact = require('../models/EmergencyContact')
const logger = require('../utils/logger')

const MAX_CONTACTS = 5

/**
 * Contacts get karo
 */
const getContacts = async (userId) => {
  return EmergencyContact.find({ userId, isActive: true }).sort({ order: 1 })
}

/**
 * Contact add karo
 */
const addContact = async (userId, { contactName, phoneNumber, relationship, notifyOnEscalation }) => {
  const count = await EmergencyContact.countDocuments({ userId, isActive: true })

  if (count >= MAX_CONTACTS) {
    const err = new Error(`Maximum ${MAX_CONTACTS} emergency contacts allowed`)
    err.statusCode = 400
    throw err
  }

  const contact = await EmergencyContact.create({
    userId,
    contactName,
    phoneNumber,
    relationship: relationship || null,
    notifyOnEscalation: notifyOnEscalation !== undefined ? notifyOnEscalation : true,
    order: count,
  })

  return contact
}

/**
 * Contact update karo
 */
const updateContact = async (userId, contactId, updates) => {
  const contact = await EmergencyContact.findOneAndUpdate(
    { _id: contactId, userId, isActive: true },
    {
      $set: {
        contactName: updates.contactName,
        phoneNumber: updates.phoneNumber,
        relationship: updates.relationship,
        notifyOnEscalation: updates.notifyOnEscalation,
      },
    },
    { new: true, runValidators: true }
  )

  if (!contact) {
    const err = new Error('Contact not found')
    err.statusCode = 404
    throw err
  }

  return contact
}

/**
 * Contact delete karo
 */
const deleteContact = async (userId, contactId) => {
  const contact = await EmergencyContact.findOneAndUpdate(
    { _id: contactId, userId },
    { isActive: false },
    { new: true }
  )

  if (!contact) {
    const err = new Error('Contact not found')
    err.statusCode = 404
    throw err
  }

  return { message: 'Contact removed' }
}

module.exports = {
  getContacts,
  addContact,
  updateContact,
  deleteContact,
}
