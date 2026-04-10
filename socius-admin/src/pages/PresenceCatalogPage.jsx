import React, { useEffect, useMemo, useState } from 'react';
import { Layers, ListTree, Loader2, RefreshCw } from 'lucide-react';
import { api, baseURL } from '../services/api/client';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const apiOrigin = String(baseURL || '').replace(/\/?api\/?$/i, '');

const field =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-900/60 dark:text-gray-100 dark:placeholder-gray-500';

const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5';

const fileBtn =
  'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-950/20';

const PresenceCatalogPage = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryForm, setCategoryForm] = useState({
    title: '',
    slug: '',
    iconName: '',
    sortOrder: 0,
    isActive: true,
  });
  const [itemForm, setItemForm] = useState({
    categoryId: '',
    slug: '',
    title: '',
    description: '',
    tags: '',
    iconName: '',
    sortOrder: 0,
    isActive: true,
  });
  const [iconFile, setIconFile] = useState(null);
  const [itemIconFile, setItemIconFile] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

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

  const mediaUrl = (path) => {
    if (!path) return null;
    const p = String(path).trim();
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    return `${apiOrigin}${p.startsWith('/') ? '' : '/'}${p}`;
  };

  const loadCategories = async () => {
    setLoadingCategories(true);
    setError('');
    try {
      const res = await api.get('/admin/presence-categories', getAuthConfig());
      const list = Array.isArray(res?.data?.data?.items) ? res.data.data.items : [];
      setCategories(list);
      setSelectedCategoryId((prev) => {
        if (list.length === 0) return '';
        const still = prev && list.some((x) => String(x._id) === String(prev));
        return still ? prev : list[0]._id;
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load categories'));
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadItems = async (categoryId) => {
    if (!categoryId) {
      setItems([]);
      return;
    }
    setLoadingItems(true);
    setError('');
    try {
      const res = await api.get(
        '/admin/presence-items',
        getAuthConfig({ params: { categoryId } })
      );
      const list = Array.isArray(res?.data?.data?.items) ? res.data.data.items : [];
      setItems(list);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load items'));
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    loadCategories().catch(() => {});
  }, []);

  useEffect(() => {
    loadItems(selectedCategoryId).catch(() => {});
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!editingItemId && selectedCategoryId) {
      setItemForm((p) => ({ ...p, categoryId: selectedCategoryId }));
    }
  }, [selectedCategoryId, editingItemId]);

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c._id) === String(selectedCategoryId)),
    [categories, selectedCategoryId]
  );

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
      const config = getAuthConfig();
      if (editingCategoryId) {
        await api.patch(`/admin/presence-categories/${editingCategoryId}`, fd, config);
      } else {
        await api.post('/admin/presence-categories', fd, config);
      }
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
      if (itemForm.slug?.trim()) {
        fd.append('slug', itemForm.slug.trim());
      }
      fd.append('title', itemForm.title);
      fd.append('description', itemForm.description || '');
      fd.append(
        'tags',
        String(itemForm.tags || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .join(',')
      );
      fd.append('iconName', itemForm.iconName || '');
      fd.append('sortOrder', String(itemForm.sortOrder || 0));
      fd.append('isActive', String(!!itemForm.isActive));
      if (itemIconFile) fd.append('icon', itemIconFile);
      const config = getAuthConfig();
      if (editingItemId) {
        await api.patch(`/admin/presence-items/${editingItemId}`, fd, config);
      } else {
        await api.post('/admin/presence-items', fd, config);
      }
      setItemForm({
        categoryId: selectedCategoryId,
        slug: '',
        title: '',
        description: '',
        tags: '',
        iconName: '',
        sortOrder: 0,
        isActive: true,
      });
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
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Layers className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Need Presence — catalog</h1>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                Categories and situations shown in the mobile Need Presence flow
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            <strong className="text-gray-800 dark:text-gray-200">Categories</strong> map to “What&apos;s happening right now?”.{' '}
            <strong className="text-gray-800 dark:text-gray-200">Subcategories</strong> are the next-step situations. Stable{' '}
            <code className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              keys
            </code>{' '}
            are sent as{' '}
            <code className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              reason
            </code>{' '}
            (e.g.{' '}
            <code className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              being_followed
            </code>
            ). Seed defaults:{' '}
            <code className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              npm run seed:presence-catalog
            </code>{' '}
            in backend.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 !py-2 !px-3 text-sm"
          onClick={() => {
            loadCategories();
            if (selectedCategoryId) loadItems(selectedCategoryId);
          }}
          disabled={loadingCategories || loadingItems}
        >
          {loadingCategories || loadingItems ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Reload
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/50 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden border border-gray-200 dark:border-gray-700" noHover>
          <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/40">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Categories</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Top-level groups on the home flow</p>
          </div>
          <div className="p-5">
            {loadingCategories ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            ) : (
              <>
                <form onSubmit={submitCategory} className="mb-6 space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Title</label>
                      <input
                        className={field}
                        placeholder="e.g. I need calm presence"
                        value={categoryForm.title}
                        onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Slug</label>
                      <input
                        className={field}
                        placeholder="calm_presence"
                        value={categoryForm.slug}
                        onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Sort order</label>
                      <input
                        className={field}
                        type="number"
                        value={categoryForm.sortOrder}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value || 0) })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Icon name (optional)</label>
                      <input
                        className={field}
                        placeholder="e.g. account-group"
                        value={categoryForm.iconName}
                        onChange={(e) => setCategoryForm({ ...categoryForm, iconName: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Icon image</label>
                      <label className={fileBtn}>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => setIconFile(e.target.files?.[0] || null)}
                        />
                        {iconFile ? iconFile.name : 'Choose file — optional PNG / JPG'}
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                          checked={categoryForm.isActive}
                          onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                        />
                        Active
                      </label>
                      {editingCategoryId ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                          onClick={() => {
                            setEditingCategoryId(null);
                            setCategoryForm({ title: '', slug: '', iconName: '', sortOrder: 0, isActive: true });
                            setIconFile(null);
                          }}
                        >
                          Cancel edit
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <Button type="submit" disabled={saving} loading={saving} className="w-full sm:w-auto">
                    {editingCategoryId ? 'Update category' : 'Create category'}
                  </Button>
                </form>

                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      No categories yet — create one above or run the seed script.
                    </p>
                  ) : (
                    categories.map((cat) => {
                      const selected = String(cat._id) === String(selectedCategoryId);
                      return (
                        <div
                          key={cat._id}
                          className={`flex flex-col gap-3 rounded-xl border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                            selected
                              ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-500/35 dark:bg-indigo-950/25'
                              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-gray-600'
                          }`}
                        >
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                            onClick={() => {
                              setSelectedCategoryId(cat._id);
                              setItemForm((p) => ({ ...p, categoryId: cat._id }));
                            }}
                          >
                            {cat.iconPath ? (
                              <img
                                src={mediaUrl(cat.iconPath)}
                                alt=""
                                className="h-11 w-11 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-600"
                              />
                            ) : (
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                                <Layers className="h-5 w-5" />
                              </span>
                            )}
                            <span className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white">{cat.title}</div>
                              <div className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">{cat.slug}</div>
                              {cat.isActive === false ? (
                                <span className="mt-1 inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                                  Disabled
                                </span>
                              ) : null}
                            </span>
                          </button>
                          <div className="flex shrink-0 flex-wrap gap-1 border-t border-gray-100 pt-2 dark:border-gray-700 sm:border-0 sm:pt-0">
                            <Button
                              type="button"
                              variant="ghost"
                              className="!px-2.5 !py-1.5 text-xs"
                              onClick={() => {
                                setEditingCategoryId(cat._id);
                                setCategoryForm({
                                  title: cat.title || '',
                                  slug: cat.slug || '',
                                  iconName: cat.iconName || '',
                                  sortOrder: cat.sortOrder ?? 0,
                                  isActive: !!cat.isActive,
                                });
                                setIconFile(null);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="!px-2.5 !py-1.5 text-xs text-amber-700 dark:text-amber-400"
                              onClick={async () => {
                                try {
                                  await api.patch(
                                    `/admin/presence-categories/${cat._id}`,
                                    { isActive: !cat.isActive },
                                    getAuthConfig()
                                  );
                                  await loadCategories();
                                } catch (err) {
                                  setError(getErrorMessage(err, 'Failed to toggle category'));
                                }
                              }}
                            >
                              {cat.isActive ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="!px-2.5 !py-1.5 text-xs text-red-600 dark:text-red-400"
                              onClick={async () => {
                                if (window.confirm('Delete this category and all its subcategories?')) {
                                  try {
                                    await api.delete(`/admin/presence-categories/${cat._id}`, getAuthConfig());
                                    await loadCategories();
                                  } catch (err) {
                                    setError(getErrorMessage(err, 'Failed to delete category'));
                                  }
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden border border-gray-200 dark:border-gray-700" noHover>
          <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/40">
            <div className="flex items-center gap-2">
              <ListTree className="h-4 w-4 text-violet-500 dark:text-violet-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Subcategories (situations)</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              For: <span className="font-medium text-gray-800 dark:text-gray-200">{selectedCategory?.title || '—'}</span>
            </p>
          </div>
          <div className="p-5">
            {!selectedCategoryId ? (
              <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Select or create a category first.
              </p>
            ) : loadingItems ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            ) : (
              <>
                <form onSubmit={submitItem} className="mb-6 space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                  <div>
                    <label className={labelCls}>Parent category</label>
                    <select
                      className={field}
                      value={itemForm.categoryId || selectedCategoryId}
                      onChange={(e) => {
                        setSelectedCategoryId(e.target.value);
                        setItemForm({ ...itemForm, categoryId: e.target.value });
                      }}
                      required
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Stable key (optional)</label>
                    <input
                      className={`${field} font-mono text-xs`}
                      placeholder="being_followed"
                      value={itemForm.slug}
                      onChange={(e) => setItemForm({ ...itemForm, slug: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Title</label>
                    <input
                      className={field}
                      placeholder="Shown in the app"
                      value={itemForm.title}
                      onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea
                      className={`${field} min-h-[72px] resize-y`}
                      placeholder="Short description for responders"
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Tags</label>
                    <input
                      className={field}
                      placeholder="Comma-separated filter chips"
                      value={itemForm.tags}
                      onChange={(e) => setItemForm({ ...itemForm, tags: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Icon name</label>
                      <input
                        className={field}
                        placeholder="Optional"
                        value={itemForm.iconName}
                        onChange={(e) => setItemForm({ ...itemForm, iconName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Sort order</label>
                      <input
                        className={field}
                        type="number"
                        value={itemForm.sortOrder}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, sortOrder: Number(e.target.value || 0) })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Icon image</label>
                    <label className={fileBtn}>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => setItemIconFile(e.target.files?.[0] || null)}
                      />
                      {itemIconFile ? itemIconFile.name : 'Choose file — optional'}
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                        checked={itemForm.isActive}
                        onChange={(e) => setItemForm({ ...itemForm, isActive: e.target.checked })}
                      />
                      Active
                    </label>
                    {editingItemId ? (
                      <button
                        type="button"
                        className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        onClick={() => {
                          setEditingItemId(null);
                          setItemForm({
                            categoryId: selectedCategoryId,
                            slug: '',
                            title: '',
                            description: '',
                            tags: '',
                            iconName: '',
                            sortOrder: 0,
                            isActive: true,
                          });
                          setItemIconFile(null);
                        }}
                      >
                        Cancel edit
                      </button>
                    ) : null}
                  </div>
                  <Button type="submit" disabled={saving} loading={saving} className="w-full sm:w-auto">
                    {editingItemId ? 'Update subcategory' : 'Create subcategory'}
                  </Button>
                </form>

                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      No situations in this category yet.
                    </p>
                  ) : (
                    items.map((it) => (
                      <div
                        key={it._id}
                        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/40 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-1 gap-3">
                          {it.iconPath ? (
                            <img
                              src={mediaUrl(it.iconPath)}
                              alt=""
                              className="mt-0.5 h-11 w-11 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-600"
                            />
                          ) : (
                            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                              <ListTree className="h-5 w-5 text-gray-400" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white">{it.title}</div>
                            <div className="truncate font-mono text-xs text-indigo-600 dark:text-indigo-400">
                              {it.slug || '(no key — edit to set)'}
                            </div>
                            {it.description ? (
                              <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{it.description}</p>
                            ) : null}
                            {it.isActive === false ? (
                              <span className="mt-2 inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                                Disabled
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1 border-t border-gray-100 pt-2 dark:border-gray-700 sm:border-0 sm:pt-0">
                          <Button
                            type="button"
                            variant="ghost"
                            className="!px-2.5 !py-1.5 text-xs"
                            onClick={() => {
                              setEditingItemId(it._id);
                              setItemForm({
                                categoryId: it.categoryId?._id || it.categoryId || selectedCategoryId,
                                slug: it.slug || '',
                                title: it.title || '',
                                description: it.description || '',
                                tags: Array.isArray(it.tags) ? it.tags.join(', ') : '',
                                iconName: it.iconName || '',
                                sortOrder: it.sortOrder ?? 0,
                                isActive: !!it.isActive,
                              });
                              setItemIconFile(null);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="!px-2.5 !py-1.5 text-xs text-amber-700 dark:text-amber-400"
                            onClick={async () => {
                              try {
                                await api.patch(
                                  `/admin/presence-items/${it._id}`,
                                  { isActive: !it.isActive },
                                  getAuthConfig()
                                );
                                await loadItems(selectedCategoryId);
                              } catch (err) {
                                setError(getErrorMessage(err, 'Failed to toggle item'));
                              }
                            }}
                          >
                            {it.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="!px-2.5 !py-1.5 text-xs text-red-600 dark:text-red-400"
                            onClick={async () => {
                              if (window.confirm('Delete this subcategory?')) {
                                try {
                                  await api.delete(`/admin/presence-items/${it._id}`, getAuthConfig());
                                  await loadItems(selectedCategoryId);
                                } catch (err) {
                                  setError(getErrorMessage(err, 'Failed to delete item'));
                                }
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PresenceCatalogPage;
