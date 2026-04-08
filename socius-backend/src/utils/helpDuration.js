const normalize = (label) =>
  String(label || '')
    .trim()
    .toLowerCase()
    .replace(/–/g, '-')

/**
 * Map requester-selected labels to session length (minutes, upper end of range).
 */
const parseRequestedDurationMinutes = (label) => {
  const n = normalize(label)
  if (!n) return 30

  const map = {
    '5-10 minutes': 10,
    '10-15 minutes': 15,
    '15-30 minutes': 30,
    '30 minutes': 30,
    '30-45 minutes': 45,
    '45-60 minutes': 60,
    'about 1 hour': 60,
    '1 hour': 60,
  }

  if (map[n] != null) return map[n]

  const hour = n.match(/(\d+)\s*h(ou)?r/)
  if (hour) return Math.min(240, parseInt(hour[1], 10) * 60)

  const digit = n.match(/(\d+)\s*min/)
  if (digit) return Math.min(240, parseInt(digit[1], 10))

  return 30
}

module.exports = {
  parseRequestedDurationMinutes,
}
