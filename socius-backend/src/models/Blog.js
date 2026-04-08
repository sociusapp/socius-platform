const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    typeId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogType', required: true, index: true },
    content: { type: String, required: true }, // HTML content from CKEditor
    excerpt: { type: String, trim: true, maxlength: 500 }, // Short summary
    featuredImage: { type: String, default: null }, // URL to featured image
    author: { type: String, trim: true, maxlength: 100, default: 'Socius Team' },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
    viewCount: { type: Number, default: 0 },
    metaTitle: { type: String, trim: true, maxlength: 70 },
    metaDescription: { type: String, trim: true, maxlength: 160 },
  },
  { timestamps: true }
)

// Index for published blogs by type
blogSchema.index({ isPublished: 1, typeId: 1, publishedAt: -1 })
// Index for listing all published blogs
blogSchema.index({ isPublished: 1, publishedAt: -1 })

module.exports = mongoose.model('Blog', blogSchema)
