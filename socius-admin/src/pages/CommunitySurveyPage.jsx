import React, { useState, useEffect, useCallback } from 'react';
import { communitySurveyAdminApi } from '../services/api/communitySurvey';

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest vote first' },
  { value: 'location_asc', label: 'Location label A → Z' },
  { value: 'location_desc', label: 'Location label Z → A' },
  { value: 'vote_asc', label: 'Vote: dislike before like' },
  { value: 'vote_desc', label: 'Vote: like before dislike' },
];

const formatCoords = (lat, lng) => {
  if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return '—';
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
};

const formatWhen = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
};

const CommunitySurveyPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ text: '', sortOrder: 0, isActive: true });

  const [filters, setFilters] = useState({
    questionId: '',
    value: '',
    sort: 'date_desc',
  });
  const [locInput, setLocInput] = useState('');
  const [debouncedLoc, setDebouncedLoc] = useState('');
  const [voteRows, setVoteRows] = useState([]);
  const [votesLoading, setVotesLoading] = useState(false);
  const [votesError, setVotesError] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedLoc(locInput.trim()), 450);
    return () => clearTimeout(id);
  }, [locInput]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await communitySurveyAdminApi.list();
      setItems(res.items || []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const loadVotes = useCallback(async () => {
    try {
      setVotesLoading(true);
      const params = { sort: filters.sort, limit: 300 };
      if (filters.questionId) params.questionId = filters.questionId;
      if (filters.value) params.value = filters.value;
      if (debouncedLoc) params.locationSearch = debouncedLoc;
      const res = await communitySurveyAdminApi.listVotes(params);
      setVoteRows(res.items || []);
      setVotesError(null);
    } catch (e) {
      setVotesError(e.message || 'Failed to load votes');
      setVoteRows([]);
    } finally {
      setVotesLoading(false);
    }
  }, [filters.questionId, filters.value, filters.sort, debouncedLoc]);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    loadVotes();
  }, [loadVotes]);

  const openNew = () => {
    setEditing(null);
    setForm({ text: '', sortOrder: items.length, isActive: true });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      text: row.text || '',
      sortOrder: row.sortOrder ?? 0,
      isActive: !!row.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await communitySurveyAdminApi.update(editing._id, form);
      } else {
        await communitySurveyAdminApi.create(form);
      }
      closeModal();
      await loadQuestions();
      await loadVotes();
    } catch (err) {
      alert(err.message || 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question and all votes?')) return;
    try {
      await communitySurveyAdminApi.delete(id);
      await loadQuestions();
      await loadVotes();
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  };

  if (loading && items.length === 0 && !error) {
    return <div className="p-8">Loading…</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Community survey</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Questions on the mobile <strong>Community</strong> screen. Below: who voted, how, and location snapshots.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add question
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden dark:bg-gray-800 dark:border dark:border-gray-700 mb-10">
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
            Questions & totals
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Likes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dislikes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((row) => (
                <tr key={row._id}>
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{row.sortOrder}</td>
                  <td className="px-4 py-3 max-w-md text-gray-800 dark:text-gray-200">{row.text}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      {row.likeCount ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
                      {row.dislikeCount ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        row.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {row.isActive ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row._id)}
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
        {items.length === 0 && (
          <p className="p-6 text-gray-500 text-center">No questions yet.</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow dark:bg-gray-800 dark:border dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
            Vote activity (detail)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Filter by question, reaction, or text in the vote-time location label. Sort by date or location. Up to 300 rows.
          </p>
        </div>

        <div className="p-4 flex flex-wrap gap-3 items-end border-b border-gray-100 dark:border-gray-700">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Question</label>
            <select
              value={filters.questionId}
              onChange={(e) => setFilters((f) => ({ ...f, questionId: e.target.value }))}
              className="px-3 py-2 border rounded text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white min-w-[200px]"
            >
              <option value="">All questions</option>
              {items.map((q) => (
                <option key={q._id} value={q._id}>
                  {q.text?.slice(0, 60)}
                  {q.text?.length > 60 ? '…' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vote</label>
            <select
              value={filters.value}
              onChange={(e) => setFilters((f) => ({ ...f, value: e.target.value }))}
              className="px-3 py-2 border rounded text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white"
            >
              <option value="">All</option>
              <option value="like">Like</option>
              <option value="dislike">Dislike</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Location label contains</label>
            <input
              type="text"
              value={locInput}
              onChange={(e) => setLocInput(e.target.value)}
              placeholder="e.g. Sarlahi, block, street…"
              className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Order</label>
            <select
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              className="px-3 py-2 border rounded text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white min-w-[220px]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => loadVotes()}
            className="px-3 py-2 text-sm border rounded hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>

        {votesError && (
          <div className="mx-4 mt-3 p-3 bg-red-100 text-red-800 text-sm rounded">{votesError}</div>
        )}

        <div className="overflow-x-auto">
          {votesLoading ? (
            <p className="p-8 text-center text-gray-500">Loading votes…</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs font-medium text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 whitespace-nowrap">Last updated</th>
                  <th className="px-3 py-2">Question</th>
                  <th className="px-3 py-2">Vote</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Profile city / area</th>
                  <th className="px-3 py-2 min-w-[180px]">Location at vote</th>
                  <th className="px-3 py-2 whitespace-nowrap">Coords (vote)</th>
                  <th className="px-3 py-2 whitespace-nowrap">Coords (profile)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 dark:text-gray-200">
                {voteRows.map((r) => (
                  <tr key={r._id} className="align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {formatWhen(r.updatedAt)}
                    </td>
                    <td className="px-3 py-2 max-w-[200px] text-gray-800 dark:text-gray-100">
                      {r.question?.text || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          r.value === 'like'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
                        }`}
                      >
                        {r.value === 'like' ? 'Like' : 'Dislike'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{r.user?.fullName || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.user?.phone || '—'}</td>
                    <td className="px-3 py-2 max-w-[140px] break-all">{r.user?.email || '—'}</td>
                    <td className="px-3 py-2 max-w-[140px]">{r.user?.cityArea || '—'}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {r.locationLabel || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {formatCoords(r.latitude, r.longitude)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {r.user?.coordinates
                        ? formatCoords(r.user.coordinates.latitude, r.user.coordinates.longitude)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!votesLoading && voteRows.length === 0 && (
          <p className="p-6 text-gray-500 text-center text-sm">No votes match these filters.</p>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg my-8">
            <h2 className="text-xl font-bold mb-4 dark:text-white">
              {editing ? 'Edit question' : 'New question'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">Question *</label>
                <textarea
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                  rows={3}
                  required
                  maxLength={500}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">Sort order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="mb-6">
                <label className="flex items-center dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  Active (visible in app)
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded dark:border-gray-600 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunitySurveyPage;
