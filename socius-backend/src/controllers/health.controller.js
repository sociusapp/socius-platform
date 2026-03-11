const mongoose = require('mongoose')
const { success } = require('../utils/response')

const getHealth = async (req, res) => {
  const conn = mongoose.connection
  const dbName =
    conn?.db?.databaseName ||
    conn?.name ||
    process.env.DB_NAME ||
    null

  return success(res, {
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.round(process.uptime()),
    db: {
      readyState: conn?.readyState ?? null,
      host: conn?.host || null,
      name: dbName,
    },
  })
}

module.exports = { getHealth }

