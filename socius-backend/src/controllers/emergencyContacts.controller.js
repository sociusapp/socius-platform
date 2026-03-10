const emergencyContactsService = require('../services/emergencyContacts.service')
const { success, created } = require('../utils/response')

const getContacts = async (req, res, next) => {
  try {
    const contacts = await emergencyContactsService.getContacts(req.user._id)
    return success(res, contacts)
  } catch (err) {
    next(err)
  }
}

const addContact = async (req, res, next) => {
  try {
    const contact = await emergencyContactsService.addContact(req.user._id, req.body)
    return created(res, contact, 'Emergency contact added')
  } catch (err) {
    next(err)
  }
}

const updateContact = async (req, res, next) => {
  try {
    const contact = await emergencyContactsService.updateContact(
      req.user._id,
      req.params.id,
      req.body
    )
    return success(res, contact, 'Contact updated')
  } catch (err) {
    next(err)
  }
}

const deleteContact = async (req, res, next) => {
  try {
    const result = await emergencyContactsService.deleteContact(req.user._id, req.params.id)
    return success(res, result)
  } catch (err) {
    next(err)
  }
}

module.exports = { getContacts, addContact, updateContact, deleteContact }
