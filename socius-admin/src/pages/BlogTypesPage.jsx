import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogTypeApi, getFullImageUrl } from '../services/api/blog';
import Button from '../components/common/Button';

const inputClass =
  'w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-socius-red focus:border-transparent text-sm';

const BlogTypesPage = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    iconName: '',
    color: '#C84D59',
    sortOrder: 0,
    isActive: true,
    iconType: 'image',
  });
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await blogTypeApi.getAll();
      setTypes(response.items || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch blog types');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type = null) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        slug: type.slug,
        description: type.description || '',
        iconName: type.iconName || '',
        color: type.color || '#C84D59',
        sortOrder: type.sortOrder || 0,
        isActive: type.isActive,
        iconType: type.iconType || 'image',
      });
      setIconPreview(getFullImageUrl(type.iconPath));
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        iconName: '',
        color: '#C84D59',
        sortOrder: 0,
        isActive: true,
        iconType: 'image',
      });
      setIconPreview(null);
    }
    setIconFile(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingType(null);
    setIconFile(null);
    setIconPreview(null);
  };

  const handleIconChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (iconFile) {
        data.icon = iconFile;
      }

      if (editingType) {
        await blogTypeApi.update(editingType._id, data);
      } else {
        await blogTypeApi.create(data);
      }
      handleCloseModal();
      fetchTypes();
    } catch (err) {
      alert(err.message || 'Failed to save blog type');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog type?')) return;
    try {
      await blogTypeApi.delete(id);
      fetchTypes();
    } catch (err) {
      alert(err.message || 'Failed to delete blog type');
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData({ ...formData, slug });
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 text-gray-500 dark:text-gray-400 animate-pulse">
        Loading blog types…
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog types</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-2xl leading-relaxed">
            <strong className="text-gray-800 dark:text-gray-200">Blog types</strong> are the topic tiles on the mobile{' '}
            <strong className="text-gray-800 dark:text-gray-200">Community</strong> screen (only <em>Active</em> types
            show). Each type can have one or more{' '}
            <Link to="/blogs" className="text-socius-red font-medium hover:underline">
              blog posts
            </Link>{' '}
            — the actual articles users open when they tap a topic.
          </p>
        </div>
        <Button variant="primary" type="button" onClick={() => handleOpenModal()} className="shrink-0">
          + Add blog type
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
                  Icon
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Slug
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Sort
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {types.map((type) => (
                <tr key={type._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30 transition-colors">
                  <td className="px-5 py-4">
                    {type.iconUrl ? (
                      <img
                        src={getFullImageUrl(type.iconUrl)}
                        alt={type.name}
                        className="w-12 h-12 object-cover rounded-lg ring-1 ring-gray-200 dark:ring-gray-600"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 text-center px-1">
                        No icon
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">{type.name}</td>
                  <td className="px-5 py-4 text-sm font-mono text-gray-600 dark:text-gray-300 break-all max-w-[12rem]">
                    {type.slug}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 tabular-nums">{type.sortOrder}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        type.isActive
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {type.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(type)}
                      className="text-socius-red hover:text-red-700 dark:hover:text-red-400 font-medium mr-4"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(type._id)}
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
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingType ? 'Edit blog type' : 'Add blog type'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="bt-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  id="bt-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="bt-slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug *
                </label>
                <div className="flex gap-2">
                  <input
                    id="bt-slug"
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className={`${inputClass} flex-1 font-mono text-xs`}
                    required
                  />
                  <Button type="button" variant="secondary" onClick={generateSlug} className="shrink-0">
                    Generate
                  </Button>
                </div>
              </div>

              <div>
                <label htmlFor="bt-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="bt-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputClass}
                  rows={2}
                />
              </div>

              <div>
                <label htmlFor="bt-iconName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mobile icon (optional)
                </label>
                <input
                  id="bt-iconName"
                  type="text"
                  value={formData.iconName}
                  onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. hand-heart"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">When no image is uploaded.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon image</label>
                <input type="file" accept="image/*" onChange={handleIconChange} className="w-full text-sm text-gray-600 dark:text-gray-300" />
                {iconPreview ? (
                  <img src={iconPreview} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded-lg ring-1 ring-gray-200 dark:ring-gray-600" />
                ) : null}
              </div>

              <div>
                <label htmlFor="bt-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <input
                  id="bt-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
              </div>

              <div>
                <label htmlFor="bt-sort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sort order
                </label>
                <input
                  id="bt-sort"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-socius-red focus:ring-socius-red"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingType ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BlogTypesPage;
