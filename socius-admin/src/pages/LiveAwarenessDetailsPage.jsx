import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api } from '../services/api/client';

const SITUATION_LABELS = {
  need_calm_presence: 'Calm presence',
  being_followed: 'Being followed',
  feeling_unsafe: 'Feeling unsafe',
  other: 'Other',
};

const STATUS_LABELS = {
  active: 'Active',
  helpers_notified: 'Helpers notified',
  helpers_accepted: 'Helpers accepted',
  closed: 'Closed',
  cancelled: 'Cancelled',
  auto_closed: 'Auto-closed',
};

const CLOSURE_OPTIONS = [
  { value: 'situation_changed', label: 'Situation changed' },
  { value: 'no_longer_needed', label: 'No longer needed' },
  { value: 'calm_mediation', label: 'Calm mediation' },
  { value: 'chose_to_step_away', label: 'Chose to step away' },
  { value: 'emergency_services_called', label: 'Emergency services involved' },
];

const formatTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
};

const LiveAwarenessDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [closing, setClosing] = useState(false);
  const [closureReason, setClosureReason] = useState('situation_changed');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admin/presence-requests/${encodeURIComponent(id)}`);
      const body = res?.data;
      if (body?.success && body.data) setDetail(body.data);
      else {
        setDetail(null);
        setError(body?.message || 'Could not load presence request');
      }
    } catch (e) {
      setDetail(null);
      setError(e?.response?.data?.message || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const request = detail?.request;
  const timeline = useMemo(() => {
    const ev = detail?.activityTimeline;
    if (!Array.isArray(ev)) return [];
    return [...ev].sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [detail]);

  const summary = useMemo(() => {
    if (!request) return null;
    const st = request.situationType ? SITUATION_LABELS[request.situationType] || request.situationType : '—';
    const stat = request.status ? STATUS_LABELS[request.status] || request.status : '—';
    return { situationLabel: st, statusLabel: stat };
  }, [request]);

  const handleAdminClose = async () => {
    if (!id || !request) return;
    const isTerminal = ['closed', 'cancelled', 'auto_closed'].includes(String(request.status || ''));
    if (isTerminal) {
      toast.error('This request is already closed');
      return;
    }
    if (!window.confirm('Close this presence request for the requester? Responders and chats will be wound down.')) {
      return;
    }
    setClosing(true);
    try {
      await api.post(`/admin/presence-requests/${encodeURIComponent(id)}/close`, {
        closureReason,
      });
      toast.success('Presence request closed');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Close failed');
    } finally {
      setClosing(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-gray-500 dark:text-gray-400">Loading…</div>
    );
  }

  if (error || !request) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <p className="text-red-600 dark:text-red-400">{error || 'Not found'}</p>
        <Link to="/live-awareness" className="text-socius-red underline text-sm">
          Back to live monitor
        </Link>
      </div>
    );
  }

  const rs = detail?.responderSummary || {};
  const reqId = request._id || id;
  const isClosed = ['closed', 'cancelled', 'auto_closed'].includes(String(request.status || ''));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Need Presence · details</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono break-all">{String(reqId)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Data from{' '}
            <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">GET /api/admin/presence-requests/:id</code>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="text-sm" onClick={() => navigate('/live-awareness')}>
            Back to list
          </Button>
          <Button
            variant="secondary"
            className="text-sm"
            onClick={() => navigate(`/daily-help/presence/${id}`)}
          >
            Open in request queues
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-bold text-socius-red mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">Situation</span>
            <span className="font-semibold text-gray-800 dark:text-white">{summary?.situationLabel}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">Status</span>
            <span className="font-semibold text-gray-800 dark:text-white">{summary?.statusLabel}</span>
          </div>
          <div className="flex gap-2 md:col-span-2">
            <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">Created</span>
            <span className="text-gray-800 dark:text-white">{formatTime(request.createdAt)}</span>
          </div>
          {request.description ? (
            <div className="flex gap-2 md:col-span-2">
              <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">Note</span>
              <span className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{request.description}</span>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold text-socius-red mb-4">Activity timeline</h2>
        <div className="space-y-0">
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-500">No timeline events.</p>
          ) : (
            timeline.map((item, index) => (
              <motion.div
                key={`${item.at}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.4) }}
                className="flex items-start border-b border-gray-100 dark:border-gray-700 last:border-0 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex-shrink-0 mr-4 mt-1.5">
                  <div
                    className={`h-3 w-3 rounded-full border-2 ${
                      item.kind === 'message'
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-500'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{formatTime(item.at)}</div>
                  <div className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{item.label}</div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4">Responder overview</h2>
          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white">{Number(request.totalNotified) || 0}</div>
              <div className="text-xs text-gray-500 mt-1">Notified</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white">{Number(request.totalAccepted) || 0}</div>
              <div className="text-xs text-gray-500 mt-1">Accepted</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white">{rs.total ?? 0}</div>
              <div className="text-xs text-gray-500 mt-1">Match rows</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white">{rs.accepted ?? 0}</div>
              <div className="text-xs text-gray-500 mt-1">Active accepts</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-socius-red mb-4">Safety signals</h2>
          {request.emergencyServicesCalled ? (
            <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-100">
              Emergency services flagged on this request.
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">No emergency-services flag recorded.</p>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4">Admin actions</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Freeze / merge are not implemented. You can close the request (same effect as operational closure) or open the
          full tabbed view in Request queues.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
          {!isClosed ? (
            <>
              <div className="min-w-[12rem]">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Closure reason</label>
                <select
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm p-2 text-gray-900 dark:text-white"
                >
                  {CLOSURE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="primary" onClick={handleAdminClose} loading={closing} disabled={closing} className="bg-red-700 hover:bg-red-800 border-transparent">
                Close presence request
              </Button>
            </>
          ) : (
            <p className="text-sm text-gray-500">This request is already in a terminal state.</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LiveAwarenessDetailsPage;
