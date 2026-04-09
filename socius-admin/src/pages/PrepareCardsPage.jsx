import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../services/api/client';

const emptyChipForm = () => ({
  label: '',
  icon: 'help-circle-outline',
  navigate_to: 'SafetyTips',
  content: '',
  is_active: true,
});

const PrepareCardsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [learnSettings, setLearnSettings] = useState({ section_title: 'Learn more', footer_text: '' });
  const [learnItems, setLearnItems] = useState([]);
  /** null | 'new' | Mongo _id — inline add/edit only (no fixed footer form). */
  const [chipEditing, setChipEditing] = useState(null);
  const [chipDraft, setChipDraft] = useState(() => emptyChipForm());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [learnReordering, setLearnReordering] = useState(false);
  const [savingLearnSettings, setSavingLearnSettings] = useState(false);
  const [savingChip, setSavingChip] = useState(false);

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

  const appendUniqueError = (prev, msg) => {
    const m = String(msg || '').trim();
    if (!m) return prev || '';
    if (!prev) return m;
    const parts = String(prev)
      .split(' · ')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.includes(m)) return parts.join(' · ');
    return [...parts, m].join(' · ');
  };

  const loadItems = useCallback(async () => {
    const res = await api.get('/admin/prepare-cards', getAuthConfig());
    const list = Array.isArray(res?.data?.data?.items) ? res.data.data.items : [];
    setItems(list);
  }, []);

  const loadLearn = useCallback(async () => {
    const res = await api.get('/admin/prepare-cards/learn-more', getAuthConfig());
    const payload = res?.data;
    if (payload && payload.success === false) {
      throw new Error(payload.message || 'Learn more request failed');
    }
    const d = payload?.data;
    if (!d || typeof d !== 'object') {
      throw new Error('Unexpected response from learn-more (missing data). Is the API up to date?');
    }
    if (d.settings) {
      setLearnSettings({
        section_title: d.settings.section_title || 'Learn more',
        footer_text: d.settings.footer_text || '',
      });
    }
    const rawItems = Array.isArray(d.items) ? d.items : Array.isArray(d.chips) ? d.chips : [];
    setLearnItems(
      rawItems.map((row) => ({
        ...row,
        _id: row?._id != null ? String(row._id) : '',
      }))
    );
  }, []);

  const loadAll = useCallback(async () => {
    setError('');
    try {
      await loadItems();
    } catch (err) {
      setError((prev) => appendUniqueError(prev, getErrorMessage(err, 'Failed to load topic cards')));
    }
    try {
      await loadLearn();
    } catch (err) {
      setError((prev) => appendUniqueError(prev, getErrorMessage(err, 'Learn more failed to load')));
      setLearnItems([]);
    }
  }, [loadItems, loadLearn]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadAll();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  const handleDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (chipEditing !== null && source.droppableId === 'prepare-learn-chips') return;

    if (source.droppableId === 'prepare-cards-list' && destination.droppableId === 'prepare-cards-list') {
      if (source.index === destination.index) return;
      const next = Array.from(items);
      const [removed] = next.splice(source.index, 1);
      next.splice(destination.index, 0, removed);
      setItems(next);

      const ids = next.map((row) => row.prepareId ?? row.id).filter((n) => n != null && Number.isFinite(Number(n)));
      if (ids.length !== next.length) {
        setError('Could not reorder: missing card ids.');
        await loadItems();
        return;
      }

      setReordering(true);
      setError('');
      try {
        await api.post('/admin/prepare-cards/reorder', { ids }, getAuthConfig());
        await loadItems();
      } catch (err) {
        setError(getErrorMessage(err, 'Reorder failed'));
        await loadItems();
      } finally {
        setReordering(false);
      }
      return;
    }

    if (source.droppableId === 'prepare-learn-chips' && destination.droppableId === 'prepare-learn-chips') {
      if (source.index === destination.index) return;
      const next = Array.from(learnItems);
      const [removed] = next.splice(source.index, 1);
      next.splice(destination.index, 0, removed);
      setLearnItems(next);
      setLearnReordering(true);
      setError('');
      try {
        const ids = next.map((r) => String(r._id));
        await api.post('/admin/prepare-cards/learn-more/chips/reorder', { ids }, getAuthConfig());
        await loadLearn();
      } catch (err) {
        setError(getErrorMessage(err, 'Learn more: reorder failed'));
        await loadLearn();
      } finally {
        setLearnReordering(false);
      }
    }
  };

  const removeCard = async (mongoId) => {
    if (!window.confirm('Delete this card permanently? This cannot be undone.')) return;
    setError('');
    try {
      await api.delete(`/admin/prepare-cards/${mongoId}`, getAuthConfig());
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed'));
    }
  };

  const setActive = async (mongoId, isActive) => {
    setError('');
    try {
      await api.patch(
        `/admin/prepare-cards/${mongoId}`,
        { is_active: isActive },
        getAuthConfig({ headers: { 'Content-Type': 'application/json' } })
      );
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err, 'Update failed'));
    }
  };

  const saveLearnSettings = async () => {
    setSavingLearnSettings(true);
    setError('');
    try {
      await api.patch(
        '/admin/prepare-cards/learn-more/settings',
        {
          section_title: learnSettings.section_title.trim(),
          footer_text: learnSettings.footer_text.trim(),
        },
        getAuthConfig({ headers: { 'Content-Type': 'application/json' } })
      );
      await loadLearn();
    } catch (err) {
      setError(getErrorMessage(err, 'Learn more: save failed'));
    } finally {
      setSavingLearnSettings(false);
    }
  };

  const closeChipEditor = () => {
    setChipEditing(null);
    setChipDraft(emptyChipForm());
  };

  const openEditChip = (row) => {
    setChipEditing(String(row._id));
    setChipDraft({
      label: row.label || '',
      icon: row.icon || 'help-circle-outline',
      navigate_to: row.navigate_to || 'SafetyTips',
      content: row.content != null ? String(row.content) : '',
      is_active: !!row.is_active,
    });
  };

  const saveChipDraft = async () => {
    if (!chipDraft.label.trim()) {
      setError('Chip label is required');
      return;
    }
    setSavingChip(true);
    setError('');
    const body = {
      label: chipDraft.label.trim(),
      icon: chipDraft.icon.trim() || 'help-circle-outline',
      navigate_to: chipDraft.navigate_to.trim() || 'SafetyTips',
      content: chipDraft.content != null ? String(chipDraft.content) : '',
      is_active: !!chipDraft.is_active,
    };
    try {
      if (chipEditing === 'new') {
        await api.post('/admin/prepare-cards/learn-more/chips', body, getAuthConfig({ headers: { 'Content-Type': 'application/json' } }));
      } else if (chipEditing) {
        await api.patch(
          `/admin/prepare-cards/learn-more/chips/${chipEditing}`,
          body,
          getAuthConfig({ headers: { 'Content-Type': 'application/json' } })
        );
      }
      closeChipEditor();
      await loadLearn();
    } catch (err) {
      setError(getErrorMessage(err, chipEditing === 'new' ? 'Learn more: add failed' : 'Learn more: save failed'));
    } finally {
      setSavingChip(false);
    }
  };

  const chipEditorFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="block text-sm col-span-1 sm:col-span-2">
        <span className="text-gray-600 dark:text-gray-300">Label</span>
        <input
          className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          value={chipDraft.label}
          onChange={(e) => setChipDraft((d) => ({ ...d, label: e.target.value }))}
          placeholder="Shown on the mobile pill"
        />
      </label>
      <label className="block text-sm">
        <span className="text-gray-600 dark:text-gray-300">Icon (MaterialCommunityIcons)</span>
        <input
          className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          value={chipDraft.icon}
          onChange={(e) => setChipDraft((d) => ({ ...d, icon: e.target.value }))}
          placeholder="e.g. brain"
        />
      </label>
      <label className="block text-sm">
        <span className="text-gray-600 dark:text-gray-300">Navigate to (screen name)</span>
        <input
          className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          value={chipDraft.navigate_to}
          onChange={(e) => setChipDraft((d) => ({ ...d, navigate_to: e.target.value }))}
          placeholder="SafetyTips"
        />
        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
          Used only when “Full article” is empty. If you add a full article below, the app opens that instead.
        </span>
      </label>
      <label className="block text-sm col-span-1 sm:col-span-2">
        <span className="text-gray-600 dark:text-gray-300">Full article (mobile detail)</span>
        <textarea
          rows={8}
          className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white border-gray-300 dark:border-gray-600 font-mono text-sm"
          value={chipDraft.content}
          onChange={(e) => setChipDraft((d) => ({ ...d, content: e.target.value }))}
          placeholder="Shown when the user taps this chip. Use blank lines between paragraphs."
        />
      </label>
      <label className="inline-flex gap-2 text-sm items-center text-gray-700 dark:text-gray-200 col-span-1 sm:col-span-2">
        <input
          type="checkbox"
          checked={chipDraft.is_active}
          onChange={(e) => setChipDraft((d) => ({ ...d, is_active: e.target.checked }))}
        />
        Active (visible on mobile)
      </label>
      <div className="flex flex-wrap gap-2 col-span-1 sm:col-span-2">
        <button
          type="button"
          disabled={savingChip}
          onClick={saveChipDraft}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {savingChip ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={closeChipEditor}
          className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const toggleChip = async (row) => {
    setError('');
    try {
      await api.patch(
        `/admin/prepare-cards/learn-more/chips/${row._id}`,
        { is_active: !row.is_active },
        getAuthConfig({ headers: { 'Content-Type': 'application/json' } })
      );
      await loadLearn();
    } catch (err) {
      setError(getErrorMessage(err, 'Learn more: update failed'));
    }
  };

  const deleteChip = async (chipId) => {
    if (!window.confirm('Delete this chip?')) return;
    setError('');
    try {
      await api.delete(`/admin/prepare-cards/learn-more/chips/${chipId}`, getAuthConfig());
      await loadLearn();
    } catch (err) {
      setError(getErrorMessage(err, 'Learn more: delete failed'));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prepare &amp; Stay Ready</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mt-1">
            Topic cards: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">GET /api/prepare-cards</code>
            . Learn more block:{' '}
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">GET /api/prepare-cards/learn-more</code>
            . Drag rows to reorder.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/prepare-cards/new')}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          Add card
        </button>
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="font-semibold text-gray-900 dark:text-white">Topic cards</span>
          </div>
          <div className="p-8 text-center text-gray-500">Loading…</div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">Topic cards</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {items.length} total
                {reordering ? ' · Saving order…' : ''}
              </span>
            </div>
            <div className="p-2 sm:p-4">
              {!items.length ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <p className="mb-3">No cards yet.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/prepare-cards/new')}
                    className="text-blue-600 dark:text-blue-400 font-medium"
                  >
                    Add your first card
                  </button>
                </div>
              ) : (
                <Droppable droppableId="prepare-cards-list">
                  {(droppableProvided) => (
                    <ul
                      className="space-y-2"
                      ref={droppableProvided.innerRef}
                      {...droppableProvided.droppableProps}
                    >
                      {items.map((row, index) => (
                        <Draggable key={row._id} draggableId={String(row._id)} index={index}>
                          {(dragProvided, snapshot) => (
                            <li
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5 ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400/50' : ''
                              }`}
                            >
                              <button
                                type="button"
                                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1"
                                aria-label="Drag to reorder"
                                {...dragProvided.dragHandleProps}
                              >
                                ⋮⋮
                              </button>
                              <div className="w-12 h-12 shrink-0 rounded-md bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                                {row.image_url ? (
                                  <img src={row.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[10px] text-gray-500 text-center px-1">No image</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 dark:text-white truncate" title={row.title}>
                                  {row.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  #{row.prepareId ?? row.id} · position {row.position ?? index}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <span
                                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                                    row.is_active
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {row.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                  type="button"
                                  className="text-blue-600 dark:text-blue-400 text-sm font-medium"
                                  onClick={() => navigate(`/prepare-cards/edit/${row._id}`, { state: { row } })}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="text-sm font-medium text-amber-700 dark:text-amber-400"
                                  onClick={() => setActive(row._id, !row.is_active)}
                                >
                                  {row.is_active ? 'Hide' : 'Show'}
                                </button>
                                <button
                                  type="button"
                                  className="text-red-600 dark:text-red-400 text-sm font-medium"
                                  onClick={() => removeCard(row._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {droppableProvided.placeholder}
                    </ul>
                  )}
                </Droppable>
              )}
            </div>
          </div>

          <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Learn more (mobile footer)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Section under the topic cards: title, pill chips, footer line. Managed here with the same Prepare tab.
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Section copy</h3>
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-300">Section title</span>
              <input
                className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                value={learnSettings.section_title}
                onChange={(e) => setLearnSettings((s) => ({ ...s, section_title: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-300">Footer text (below chips)</span>
              <textarea
                rows={2}
                className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                value={learnSettings.footer_text}
                onChange={(e) => setLearnSettings((s) => ({ ...s, footer_text: e.target.value }))}
              />
            </label>
            <button
              type="button"
              disabled={savingLearnSettings}
              onClick={saveLearnSettings}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {savingLearnSettings ? 'Saving…' : 'Save section copy'}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Chips</h3>
              <span className="text-sm text-gray-500">
                {learnReordering ? 'Saving order…' : `${learnItems.length} items`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  if (chipEditing === 'new') {
                    closeChipEditor();
                  } else {
                    setChipEditing('new');
                    setChipDraft(emptyChipForm());
                  }
                }}
                className="inline-flex items-center rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {chipEditing === 'new' ? 'Cancel new item' : '+ Add learn item'}
              </button>
              {chipEditing !== null ? (
                <span className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded">
                  Save or cancel to drag-reorder chips.
                </span>
              ) : null}
            </div>

            {chipEditing === 'new' ? (
              <div className="mb-4 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">New learn item</h4>
                {chipEditorFields}
              </div>
            ) : null}

            <Droppable droppableId="prepare-learn-chips">
              {(provided) => (
                <ul className="space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
                  {learnItems.map((row, index) => (
                    <Draggable
                      key={row._id}
                      draggableId={`learn-${row._id}`}
                      index={index}
                      isDragDisabled={chipEditing !== null}
                    >
                      {(dragProvided, snapshot) => (
                        <li
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`rounded-lg border text-sm dark:border-gray-600 ${
                            snapshot.isDragging ? 'border-blue-400 shadow-md bg-gray-50 dark:bg-gray-900' : 'border-gray-200 dark:border-gray-700'
                          } ${chipEditing === String(row._id) ? 'bg-gray-50/80 dark:bg-gray-900/50 p-4' : 'px-3 py-2'}`}
                        >
                          {chipEditing === String(row._id) ? (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Edit learn item</h4>
                              {chipEditorFields}
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className="text-gray-400 cursor-grab px-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                {...dragProvided.dragHandleProps}
                                aria-label="Drag"
                                disabled={chipEditing !== null}
                              >
                                ⋮⋮
                              </button>
                              <span className="font-medium text-gray-900 dark:text-white flex-1 min-w-[120px]">{row.label}</span>
                              <code className="text-xs text-gray-500">{row.icon}</code>
                              <code className="text-xs text-gray-500 truncate max-w-[100px]" title={row.navigate_to}>
                                → {row.navigate_to}
                              </code>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  row.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/40' : 'bg-gray-200 dark:bg-gray-600'
                                }`}
                              >
                                {row.is_active ? 'On' : 'Off'}
                              </span>
                              <button
                                type="button"
                                className="text-blue-600 dark:text-blue-400 text-xs font-medium"
                                onClick={() => openEditChip(row)}
                              >
                                Edit
                              </button>
                              <button type="button" className="text-amber-600 text-xs" onClick={() => toggleChip(row)}>
                                Toggle
                              </button>
                              <button type="button" className="text-red-600 text-xs" onClick={() => deleteChip(row._id)}>
                                Delete
                              </button>
                            </div>
                          )}
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </div>
        </div>
        </DragDropContext>
      )}
    </div>
  );
};

export default PrepareCardsPage;
