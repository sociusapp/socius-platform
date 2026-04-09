import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api/client';

const PresenceCatalogPage = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryForm, setCategoryForm] = useState({ title: '', slug: '', iconName: '', sortOrder: 0, isActive: true });
  const [itemForm, setItemForm] = useState({ categoryId: '', title: '', description: '', tags: '', iconName: '', sortOrder: 0, isActive: true });
  const [iconFile, setIconFile] = useState(null);
  const [itemIconFile, setItemIconFile] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
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

  const getErrorMessage = (err, fallback) => {
    const status = err?.response?.status;
    const apiMessage = err?.response?.data?.message;
    if (status === 401) {
      return 'Session expired. Please login again.';
    }
    return apiMessage || err?.message || fallback;
  };

  const loadCategories = async () => {
    const res = await api.get('/admin/presence-categories', getAuthConfig());
    const list = Array.isArray(res?.data?.data?.items) ? res.data.data.items : [];
    setCategories(list);
    if (selectedCategoryId && !list.find((x) => x._id === selectedCategoryId)) {
      setSelectedCategoryId('');
    }
    if (!selectedCategoryId && list[0]?._id) {
      setSelectedCategoryId(list[0]._id);
      setItemForm((prev) => ({ ...prev, categoryId: prev.categoryId || list[0]._id }));
    }
  };

  const loadItems = async (categoryId) => {
    const res = await api.get('/admin/presence-items', getAuthConfig({ params: categoryId ? { categoryId } : undefined }));
    const list = Array.isArray(res?.data?.data?.items) ? res.data.data.items : [];
    setItems(list);
  };

  useEffect(() => {
    loadCategories().catch((err) => setError(getErrorMessage(err, 'Failed to load categories')));
  }, []);

  useEffect(() => {
    loadItems(selectedCategoryId).catch((err) => setError(getErrorMessage(err, 'Failed to load items')));
  }, [selectedCategoryId]);

  const filteredItems = useMemo(() => items, [items]);

  const submitCategory = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', categoryForm.title);
      fd.append('slug', categoryForm.slug || categoryForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      fd.append('iconName', categoryForm.iconName || '');
      fd.append('sortOrder', String(categoryForm.sortOrder || 0));
      fd.append('isActive', String(!!categoryForm.isActive));
      if (iconFile) fd.append('icon', iconFile);
      const config = getAuthConfig({ headers: { 'Content-Type': 'multipart/form-data' } });
      if (editingCategoryId) await api.patch(`/admin/presence-categories/${editingCategoryId}`, fd, config);
      else await api.post('/admin/presence-categories', fd, config);
      setCategoryForm({ title: '', slug: '', iconName: '', sortOrder: 0, isActive: true });
      setIconFile(null);
      setEditingCategoryId(null);
      await loadCategories();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save category'));
    } finally {
      setSaving(false);
    }
  };

  const submitItem = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const effectiveCategoryId = itemForm.categoryId || selectedCategoryId || categories[0]?._id || '';
      if (!effectiveCategoryId || !itemForm.title?.trim()) {
        setError('Please select category and enter item title.');
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
      const config = getAuthConfig();
      if (editingItemId) await api.patch(`/admin/presence-items/${editingItemId}`, fd, { ...config, headers: { ...(config.headers || {}), 'Content-Type': 'multipart/form-data' } });
      else await api.post('/admin/presence-items', fd, { ...config, headers: { ...(config.headers || {}), 'Content-Type': 'multipart/form-data' } });
      setItemForm({ categoryId: selectedCategoryId, title: '', description: '', tags: '', iconName: '', sortOrder: 0, isActive: true });
      setItemIconFile(null);
      setEditingItemId(null);
      await loadItems(selectedCategoryId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save presence item'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Presence Catalog</h1>
      </div>
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-4 border">
          <h2 className="font-semibold mb-3">Categories</h2>
          <form onSubmit={submitCategory} className="space-y-2 mb-4">
            <input className="w-full border rounded px-3 py-2" placeholder="Title" value={categoryForm.title} onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })} required />
            <input className="w-full border rounded px-3 py-2" placeholder="Slug" value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} />
            <input className="w-full border rounded px-3 py-2" placeholder="Icon name (optional)" value={categoryForm.iconName} onChange={(e) => setCategoryForm({ ...categoryForm, iconName: e.target.value })} />
            <input type="file" accept="image/*" onChange={(e) => setIconFile(e.target.files?.[0] || null)} />
            <div className="flex gap-2">
              <input className="border rounded px-3 py-2 w-28" type="number" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value || 0) })} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={categoryForm.isActive} onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })} />Active</label>
            </div>
            <button disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60" type="submit">{editingCategoryId ? 'Update Category' : 'Create Category'}</button>
          </form>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat._id} className="flex items-center justify-between border rounded px-3 py-2">
                <button className="text-left flex-1" onClick={() => { setSelectedCategoryId(cat._id); setItemForm((p) => ({ ...p, categoryId: cat._id })); }}>
                  <div className="font-medium">{cat.title}</div>
                  <div className="text-xs text-gray-500">{cat.slug}</div>
                </button>
                <div className="flex gap-2">
                  <button className="text-blue-600" onClick={() => { setEditingCategoryId(cat._id); setCategoryForm({ title: cat.title || '', slug: cat.slug || '', iconName: cat.iconName || '', sortOrder: cat.sortOrder || 0, isActive: !!cat.isActive }); }}>Edit</button>
                  <button className="text-amber-600" onClick={async () => { try { await api.patch(`/admin/presence-categories/${cat._id}`, { isActive: !cat.isActive }, getAuthConfig()); await loadCategories(); } catch (err) { setError(getErrorMessage(err, 'Failed to toggle category')); } }}>{cat.isActive ? 'Disable' : 'Enable'}</button>
                  <button className="text-red-600" onClick={async () => { if (window.confirm('Delete this category and its items?')) { try { await api.delete(`/admin/presence-categories/${cat._id}`, getAuthConfig()); await loadCategories(); await loadItems(selectedCategoryId); } catch (err) { setError(getErrorMessage(err, 'Failed to delete category')); } } }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <h2 className="font-semibold mb-3">Presence Items</h2>
          <form onSubmit={submitItem} className="space-y-2 mb-4">
            <select className="w-full border rounded px-3 py-2" value={itemForm.categoryId || selectedCategoryId} onChange={(e) => { setSelectedCategoryId(e.target.value); setItemForm({ ...itemForm, categoryId: e.target.value }); }} required>
              <option value="" disabled>Select category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
            <input className="w-full border rounded px-3 py-2" placeholder="Title" value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} required />
            <textarea className="w-full border rounded px-3 py-2" placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
            <input className="w-full border rounded px-3 py-2" placeholder="Tags (comma separated)" value={itemForm.tags} onChange={(e) => setItemForm({ ...itemForm, tags: e.target.value })} />
            <input className="w-full border rounded px-3 py-2" placeholder="Icon name (optional)" value={itemForm.iconName} onChange={(e) => setItemForm({ ...itemForm, iconName: e.target.value })} />
            <input type="file" accept="image/*" onChange={(e) => setItemIconFile(e.target.files?.[0] || null)} />
            <div className="flex gap-2">
              <input className="border rounded px-3 py-2 w-28" type="number" value={itemForm.sortOrder} onChange={(e) => setItemForm({ ...itemForm, sortOrder: Number(e.target.value || 0) })} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={itemForm.isActive} onChange={(e) => setItemForm({ ...itemForm, isActive: e.target.checked })} />Active</label>
            </div>
            <button disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60" type="submit">{editingItemId ? 'Update Item' : 'Create Item'}</button>
          </form>
          <div className="space-y-2">
            {filteredItems.map((it) => (
              <div key={it._id} className="flex items-center justify-between border rounded px-3 py-2">
                <div className="flex-1">
                  <div className="font-medium">{it.title}</div>
                  <div className="text-xs text-gray-500">{it.description}</div>
                </div>
                <div className="flex gap-2">
                  <button className="text-blue-600" onClick={() => { setEditingItemId(it._id); setItemForm({ categoryId: it.categoryId?._id || it.categoryId, title: it.title || '', description: it.description || '', tags: Array.isArray(it.tags) ? it.tags.join(', ') : '', iconName: it.iconName || '', sortOrder: it.sortOrder || 0, isActive: !!it.isActive }); setItemIconFile(null); }}>Edit</button>
                  <button className="text-amber-600" onClick={async () => { try { await api.patch(`/admin/presence-items/${it._id}`, { isActive: !it.isActive }, getAuthConfig()); await loadItems(selectedCategoryId); } catch (err) { setError(getErrorMessage(err, 'Failed to toggle item')); } }}>{it.isActive ? 'Disable' : 'Enable'}</button>
                  <button className="text-red-600" onClick={async () => { if (window.confirm('Delete this item?')) { try { await api.delete(`/admin/presence-items/${it._id}`, getAuthConfig()); await loadItems(selectedCategoryId); } catch (err) { setError(getErrorMessage(err, 'Failed to delete item')); } } }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresenceCatalogPage;

