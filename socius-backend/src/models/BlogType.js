const mongoose = require('mongoose')

const blogTypeSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: null, trim: true, maxlength: 140 },
    iconPath: { type: String, default: null }, // URL to icon image
    /** Optional: react-native-vector-icons MaterialCommunityIcons name (mobile) when no iconPath */
    iconName: { type: String, default: null, trim: true, maxlength: 64 },
    iconType: { type: String, enum: ['image', 'svg', 'emoji'], default: 'image' },
    color: { type: String, default: '#C84D59', trim: true, maxlength: 16 },
    sortOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

blogTypeSchema.index({ isActive: 1, sortOrder: 1, name: 1 })

module.exports = mongoose.model('BlogType', blogTypeSchema)
