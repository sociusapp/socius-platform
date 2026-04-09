import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api, fetchFormData } from '../services/api/client';

const emptyForm = () => ({
  title: '',
  description: '',
  content: '',
  isActive: true,
});

const PrepareCardEditorPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isNew = !id;

  const [form, setForm] = useState(emptyForm());
  const [editingMongoId, setEditingMongoId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const previewObjectUrl = useRef(null);
  const fileInputRef = useRef(null);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

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

  const applyRow = useCallback((row) => {
    if (!row) return;
    setEditingMongoId(row._id || null);
    setForm({
      title: row.title || '',
      description: row.description || '',
      content: row.content || '',
      isActive: !!(row.is_active ?? row.isActive),
    });
    setImagePreview(row.image_url || '');
    setImageFile(null);
  }, []);

  useEffect(() => {
    return () => {
      if (previewObjectUrl.current) {
        URL.revokeObjectURL(previewObjectUrl.current);
        previewObjectUrl.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isNew) {
      setForm(emptyForm());
      setEditingMongoId(null);
      setImageFile(null);
      setImagePreview('');
      setLoading(false);
      return;
    }

    const fromList = location.state?.row;
    if (fromList && String(fromList._id) === String(id)) {
      applyRow(fromList);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/admin/prepare-cards/${encodeURIComponent(id)}`, getAuthConfig());
        const item = res?.data?.data?.item;
        if (!cancelled && item) applyRow(item);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load card'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, location.state?.row, applyRow]);

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (previewObjectUrl.current) {
      URL.revokeObjectURL(previewObjectUrl.current);
      previewObjectUrl.current = null;
    }
    previewObjectUrl.current = URL.createObjectURL(f);
    setImageFile(f);
    setImagePreview(previewObjectUrl.current);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const title = form.title.trim();
    const description = form.description.trim();
    if (!title) {
      setError('Title is required.');
      return;
    }
    if (!description) {
      setError('Short summary is required (one or two lines for the list).');
      return;
    }
    const content = form.content.trim();
    const fileFromInput = fileInputRef.current?.files?.[0];
    const uploadFile = imageFile || fileFromInput;
    if (isNew && !uploadFile) {
      setError('Please choose an image file (JPG, PNG, or WebP).');
      return;
    }

    setSaving(true);
    try {
      const baseCfg = getAuthConfig();

      if (isNew) {
        const fd = new FormData();
        fd.append('title', title);
        fd.append('description', description);
        fd.append('content', content);
        fd.append('is_active', form.isActive ? 'true' : 'false');
        fd.append('image', uploadFile, uploadFile.name || 'image');
        await fetchFormData('POST', '/admin/prepare-cards', fd);
      } else {
        const mongoId = editingMongoId || id;
        if (uploadFile) {
          const fd = new FormData();
          fd.append('title', title);
          fd.append('description', description);
          fd.append('content', content);
          fd.append('is_active', form.isActive ? 'true' : 'false');
          fd.append('image', uploadFile, uploadFile.name || 'image');
          await fetchFormData('PUT', `/admin/prepare-cards/${mongoId}`, fd);
        } else {
          await api.patch(
            `/admin/prepare-cards/${mongoId}`,
            {
              title,
              description,
              content,
              is_active: form.isActive,
            },
            { ...baseCfg, headers: { ...baseCfg.headers, 'Content-Type': 'application/json' } }
          );
        }
      }
      navigate('/prepare-cards');
    } catch (err) {
      setError(getErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/prepare-cards')}
            className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1"
          >
            ← Back to all cards
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isNew ? 'Add card' : 'Edit card'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Order is set on the list page via drag-and-drop. Public list:{' '}
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">GET /api/prepare-cards</code>
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-gray-600 dark:text-gray-300">Title *</span>
            <input
              required
              className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600 dark:text-gray-300">Short summary *</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-1">
              Shown on the app list under the title and as the subtitle on the detail screen.
            </span>
            <textarea
              required
              rows={2}
              className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-600 dark:text-gray-300">Full article</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-1">
              Long text users see after opening the card (below the short summary). Optional but recommended.
            </span>
            <textarea
              rows={10}
              className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Full guidance, paragraphs, bullet points…"
            />
          </label>

          <div className="block text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              Image * {isNew ? '' : '(optional — leave unchanged to keep current)'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className="mt-1 w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              onChange={onPickImage}
            />
            {imagePreview ? (
              <div className="mt-3 flex items-start gap-3">
                <div className="w-28 h-28 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                  <img src={imagePreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">JPG, PNG, or WebP · max 3MB</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">JPG, PNG, or WebP · max 3MB</p>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active (show in app when enabled)
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : isNew ? 'Create' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/prepare-cards')}
              className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrepareCardEditorPage;
