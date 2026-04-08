import React, { useState, useEffect } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { blogApi, blogTypeApi, getFullImageUrl } from '../services/api/blog';

const BlogsPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    typeId: '',
    content: '',
    excerpt: '',
    author: 'Socius Team',
    isPublished: false,
    metaTitle: '',
    metaDescription: '',
  });
  const [featuredImageFile, setFeaturedImageFile] = useState(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState(null);

  useEffect(() => {
    fetchBlogs();
    fetchTypes();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await blogApi.getAll();
      setBlogs(response.items || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await blogTypeApi.getAll();
      setTypes(response.items || []);
    } catch (err) {
      console.error('Failed to fetch blog types:', err);
    }
  };

  const handleOpenModal = (blog = null) => {
    if (blog) {
      setEditingBlog(blog);
      setFormData({
        title: blog.title,
        slug: blog.slug,
        typeId: blog.typeId?._id || blog.typeId,
        content: blog.content,
        excerpt: blog.excerpt || '',
        author: blog.author || 'Socius Team',
        isPublished: blog.isPublished,
        metaTitle: blog.metaTitle || '',
        metaDescription: blog.metaDescription || '',
      });
      setFeaturedImagePreview(getFullImageUrl(blog.featuredImageUrl));
    } else {
      setEditingBlog(null);
      setFormData({
        title: '',
        slug: '',
        typeId: types[0]?._id || '',
        content: '',
        excerpt: '',
        author: 'Socius Team',
        isPublished: false,
        metaTitle: '',
        metaDescription: '',
      });
      setFeaturedImagePreview(null);
    }
    setFeaturedImageFile(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingBlog(null);
    setFeaturedImageFile(null);
    setFeaturedImagePreview(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFeaturedImageFile(file);
      setFeaturedImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (featuredImageFile) {
        data.featuredImage = featuredImageFile;
      }

      if (editingBlog) {
        await blogApi.update(editingBlog._id, data);
      } else {
        await blogApi.create(data);
      }
      handleCloseModal();
      fetchBlogs();
    } catch (err) {
      alert(err.message || 'Failed to save blog');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;
    try {
      await blogApi.delete(id);
      fetchBlogs();
    } catch (err) {
      alert(err.message || 'Failed to delete blog');
    }
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);
    setFormData({ ...formData, slug });
  };

  const generateExcerpt = () => {
    // Strip HTML tags and take first 160 chars
    const plainText = formData.content.replace(/<[^>]*>/g, '');
    const excerpt = plainText.substring(0, 160) + (plainText.length > 160 ? '...' : '');
    setFormData({ ...formData, excerpt });
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Blog Post
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {blogs.map((blog) => (
              <tr key={blog._id}>
                <td className="px-6 py-4">
                  {blog.featuredImageUrl ? (
                    <img
                      src={getFullImageUrl(blog.featuredImageUrl)}
                      alt={blog.title}
                      className="w-16 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                      No Image
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-medium">{blog.title}</td>
                <td className="px-6 py-4">{blog.typeId?.name || '-'}</td>
                <td className="px-6 py-4">{blog.author}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${blog.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {blog.isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4">{blog.viewCount || 0}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleOpenModal(blog)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(blog._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
            <h2 className="text-xl font-bold mb-4">
              {editingBlog ? 'Edit Blog Post' : 'Add Blog Post'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="auto-generated from title"
                    />
                    <button
                      type="button"
                      onClick={generateSlug}
                      className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blog Type *</label>
                  <select
                    value={formData.typeId}
                    onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Type</option>
                    {types.map((type) => (
                      <option key={type._id} value={type._id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full"
                />
                {featuredImagePreview && (
                  <img
                    src={featuredImagePreview}
                    alt="Preview"
                    className="mt-2 w-32 h-24 object-cover rounded"
                  />
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <div className="border rounded">
                  <CKEditor
                    editor={ClassicEditor}
                    data={formData.content}
                    onChange={(event, editor) => {
                      const data = editor.getData();
                      setFormData({ ...formData, content: data });
                    }}
                    config={{
                      toolbar: [
                        'heading', '|',
                        'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
                        'blockQuote', 'insertTable', 'mediaEmbed', '|',
                        'undo', 'redo'
                      ],
                      placeholder: 'Write your blog content here...',
                    }}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                <div className="flex gap-2">
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Short summary of the blog post"
                    maxLength={500}
                  />
                  <button
                    type="button"
                    onClick={generateExcerpt}
                    className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                  >
                    Auto Generate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">{formData.excerpt.length}/500 characters</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                  <input
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SEO title"
                    maxLength={70}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                  <input
                    type="text"
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SEO description"
                    maxLength={160}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Publish (make visible to users)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingBlog ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogsPage;
