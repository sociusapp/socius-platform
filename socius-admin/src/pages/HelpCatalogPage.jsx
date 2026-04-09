import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api/client';

const HelpCatalogPage = () => {
  const [helpCategories, setHelpCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [itemForm, setItemForm] = useState({ categoryId: '', title: '', description: '', tags: '', iconName: '', sortOrder: 0, isActive: true });
  const [itemIconFile, setItemIconFile] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const getAuthConfig = (extra = {}) => {
    try {
      const raw = localStorage.getItem('socius_user');
      const parsed = raw ? JSON.parse(raw) : null;
      const token = parsed?.accessToken;
      if (!token) return extra;
      return {
        ...extra,
        headers: {
          ...(extra.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      };
    } catch {
      return extra;
    }
  };

  const getErrorMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

  const loadCategories = async () => {
    const res = await api.get('/admin/help-categories', getAuthConfig());
    const list = Array.isArray(res?.data?.data?.items) ? res.data.data.items : [];
    setHelpCategories(list);
    if (!selectedCategoryId && list[0]?._id) {
      setSelectedCategoryId(list[0]._id);
      setItemForm((prev) => ({ ...prev, categoryId: prev.categoryId || list[0]._id }));
    }
  };

  const loadItems = async (categoryId) => {
    const res = await api.get('/admin/help-catalog-items', getAuthConfig({ params: categoryId ? { categoryId } : undefined }));
    const list = Array.isArray(res?.data?.data?.items) ? res.data.data.items : [];
    setItems(list);
  };

  useEffect(() => {
    loadCategories().catch((err) => setError(getErrorMessage(err, 'Failed to load help categories')));
  }, []);

  useEffect(() => {
    if (selectedCategoryId) loadItems(selectedCategoryId).catch((err) => setError(getErrorMessage(err, 'Failed to load items')));
  }, [selectedCategoryId]);

  const filteredItems = useMemo(() => items, [items]);

  const submitItem = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const effectiveCategoryId = itemForm.categoryId || selectedCategoryId || helpCategories[0]?._id || '';
      if (!effectiveCategoryId || !itemForm.title?.trim()) {
        setError('Please select a help category and enter item title.');
        setSaving(false);
        return;
      }
      const fd = new FormData();
      fd.append('categoryId', effectiveCategoryId);
      fd.append('title', itemForm.title);
      fd.append('description', itemForm.description || '');
      fd.append('tags', String(itemForm.tags || '').split(',').map((t) => t.trim()).filter(Boolean).join(','));
      fd.append('iconName', itemForm.iconName || '');
      fd.append('sortOrder', String(itemForm.sortOrder || 0));
      fd.append('isActive', String(!!itemForm.isActive));
      if (itemIconFile) fd.append('icon', itemIconFile);
      const config = getAuthConfig({ headers: { 'Content-Type': 'multipart/form-data' } });
      if (editingItemId) await api.patch(`/admin/help-catalog-items/${editingItemId}`, fd, config);
      else await api.post('/admin/help-catalog-items', fd, config);
      setItemForm({ categoryId: selectedCategoryId, title: '', description: '', tags: '', iconName: '', sortOrder: 0, isActive: true });
      setItemIconFile(null);
      setEditingItemId(null);
      await loadItems(selectedCategoryId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save help item'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Help — request reasons</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          Items shown under each Help Category on the mobile “Daily Help” flow only. Presence catalog is separate.
        </p>
      </div>
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 max-w-3xl">
        <h2 className="font-semibold mb-3">Help catalog items</h2>
        <p className="text-xs text-gray-500 mb-4">
          Manage help categories under DailyHelp / existing admin tools. Here you add the second-step list (title + description + tags) per category.
        </p>
        <form onSubmit={submitItem} className="space-y-2 mb-6">
          <select
            className="w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white"
            value={itemForm.categoryId || selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setItemForm({ ...itemForm, categoryId: e.target.value });
            }}
            required
          >
            <option value="" disabled>Select help category</option>
            {helpCategories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.slug})
              </option>
            ))}
          </select>
          <input className="w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white" placeholder="Title" value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} required />
          <textarea className="w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white" placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
          <input className="w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white" placeholder="Tags (comma separated)" value={itemForm.tags} onChange={(e) => setItemForm({ ...itemForm, tags: e.target.value })} />
          <input className="w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white" placeholder="Icon name (optional)" value={itemForm.iconName} onChange={(e) => setItemForm({ ...itemForm, iconName: e.target.value })} />
          <input type="file" accept="image/*" onChange={(e) => setItemIconFile(e.target.files?.[0] || null)} />
          <div className="flex gap-2">
            <input className="border rounded px-3 py-2 w-28 dark:bg-gray-900 dark:text-white" type="number" value={itemForm.sortOrder} onChange={(e) => setItemForm({ ...itemForm, sortOrder: Number(e.target.value || 0) })} />
            <label className="flex items-center gap-2 text-sm dark:text-gray-300">
              <input type="checkbox" checked={itemForm.isActive} onChange={(e) => setItemForm({ ...itemForm, isActive: e.target.checked })} />
              Active
            </label>
          </div>
          <button disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60" type="submit">{editingItemId ? 'Update item' : 'Create item'}</button>
        </form>

        <div className="space-y-2">
          {filteredItems.map((it) => (
            <div key={it._id} className="flex items-center justify-between border rounded px-3 py-2 dark:border-gray-600">
              <div className="flex-1">
                <div className="font-medium dark:text-white">{it.title}</div>
                <div className="text-xs text-gray-500">{it.description}</div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button type="button" className="text-blue-600" onClick={() => { setEditingItemId(it._id); setItemForm({ categoryId: it.categoryId?._id || it.categoryId, title: it.title || '', description: it.description || '', tags: Array.isArray(it.tags) ? it.tags.join(', ') : '', iconName: it.iconName || '', sortOrder: it.sortOrder || 0, isActive: !!it.isActive }); setItemIconFile(null); }}>Edit</button>
                <button type="button" className="text-amber-600" onClick={async () => { try { await api.patch(`/admin/help-catalog-items/${it._id}`, { isActive: !it.isActive }, getAuthConfig()); await loadItems(selectedCategoryId); } catch (err) { setError(getErrorMessage(err, 'Failed to toggle')); } }}>{it.isActive ? 'Disable' : 'Enable'}</button>
                <button type="button" className="text-red-600" onClick={async () => { if (window.confirm('Delete this item?')) { try { await api.delete(`/admin/help-catalog-items/${it._id}`, getAuthConfig()); await loadItems(selectedCategoryId); } catch (err) { setError(getErrorMessage(err, 'Failed to delete')); } } }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HelpCatalogPage;
