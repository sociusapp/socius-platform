import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { blogApi, blogTypeApi, getFullImageUrl } from '../services/api/blog';
import Button from '../components/common/Button';

const inputClass =
  'w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-socius-red focus:border-transparent text-sm';

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
      setError(null);
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
    const file = e.target.files?.[0];
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
    const plainText = formData.content.replace(/<[^>]*>/g, '');
    const excerpt = plainText.substring(0, 160) + (plainText.length > 160 ? '...' : '');
    setFormData({ ...formData, excerpt });
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 text-gray-500 dark:text-gray-400 animate-pulse">
        Loading blog posts…
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog posts</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-2xl leading-relaxed">
            <strong className="text-gray-800 dark:text-gray-200">Blog posts</strong> are the long-form articles users read
            after choosing a topic. Each post is linked to one{' '}
            <Link to="/blog-types" className="text-socius-red font-medium hover:underline">
              blog type
            </Link>{' '}
            (Community tile). Create types first if the dropdown is empty.
          </p>
        </div>
        <Button variant="primary" type="button" onClick={() => handleOpenModal()} className="shrink-0">
          + Add blog post
        </Button>
      </div>

      {error ? (
        <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900/60 text-sm">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Image
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Title
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Author
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Views
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {blogs.map((blog) => (
                <tr key={blog._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30 transition-colors">
                  <td className="px-5 py-4">
                    {blog.featuredImageUrl ? (
                      <img
                        src={getFullImageUrl(blog.featuredImageUrl)}
                        alt={blog.title}
                        className="w-16 h-12 object-cover rounded-lg ring-1 ring-gray-200 dark:ring-gray-600"
                      />
                    ) : (
                      <div className="w-16 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400">
                        None
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white max-w-[14rem] truncate">
                    {blog.title}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{blog.typeId?.name || '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{blog.author}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        blog.isPublished
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                      }`}
                    >
                      {blog.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm tabular-nums text-gray-700 dark:text-gray-300">{blog.viewCount || 0}</td>
                  <td className="px-5 py-4 text-sm">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(blog)}
                      className="text-socius-red hover:text-red-700 dark:hover:text-red-400 font-medium mr-4"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(blog._id)}
                      className="text-red-600 dark:text-red-400 hover:underline font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 w-full max-w-4xl my-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingBlog ? 'Edit blog post' : 'Add blog post'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className={`${inputClass} flex-1 font-mono text-xs`}
                      placeholder="auto-generated from title"
                    />
                    <Button type="button" variant="secondary" onClick={generateSlug} className="shrink-0 text-xs">
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blog type *</label>
                  <select
                    value={formData.typeId}
                    onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="">Select type</option>
                    {types.map((type) => (
                      <option key={type._id} value={type._id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Featured image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm text-gray-600 dark:text-gray-300" />
                {featuredImagePreview ? (
                  <img
                    src={featuredImagePreview}
                    alt="Preview"
                    className="mt-2 w-32 h-24 object-cover rounded-lg ring-1 ring-gray-200 dark:ring-gray-600"
                  />
                ) : null}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content *</label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden bg-white">
                  <CKEditor
                    editor={ClassicEditor}
                    data={formData.content}
                    onChange={(event, editor) => {
                      const data = editor.getData();
                      setFormData({ ...formData, content: data });
                    }}
                    config={{
                      toolbar: [
                        'heading',
                        '|',
                        'bold',
                        'italic',
                        'link',
                        'bulletedList',
                        'numberedList',
                        '|',
                        'blockQuote',
                        'insertTable',
                        'mediaEmbed',
                        '|',
                        'undo',
                        'redo',
                      ],
                      placeholder: 'Write your blog content here...',
                    }}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Excerpt</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    className={`${inputClass} flex-1`}
                    rows={2}
                    placeholder="Short summary of the blog post"
                    maxLength={500}
                  />
                  <Button type="button" variant="secondary" onClick={generateExcerpt} className="shrink-0 self-start sm:self-stretch">
                    Auto generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formData.excerpt.length}/500 characters</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta title</label>
                  <input
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    className={inputClass}
                    placeholder="SEO title"
                    maxLength={70}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta description</label>
                  <input
                    type="text"
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                    className={inputClass}
                    placeholder="SEO description"
                    maxLength={160}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="rounded border-gray-300 text-socius-red focus:ring-socius-red"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Publish (visible to users)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingBlog ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BlogsPage;
