import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Eye, RefreshCw, Users } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { api } from '../services/api/client';

const SITUATION_LABELS = {
  need_calm_presence: 'Calm presence',
  being_followed: 'Being followed',
  feeling_unsafe: 'Feeling unsafe',
  other: 'Other',
};

const STATUS_LABELS = {
  active: 'Active',
  helpers_notified: 'Notified',
  helpers_accepted: 'Accepted',
  closed: 'Closed',
  cancelled: 'Cancelled',
  auto_closed: 'Auto-closed',
};

const CATEGORY_FILTERS = [
  { value: 'All', label: 'All situations' },
  ...Object.entries(SITUATION_LABELS).map(([value, label]) => ({ value: label, label })),
];

const YellowAlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

function binCreatedCounts(items, rangeHours) {
  const n = rangeHours <= 1 ? 6 : rangeHours <= 6 ? 6 : 8;
  const spanMs = rangeHours * 60 * 60 * 1000;
  const start = Date.now() - spanMs;
  const binSize = spanMs / n;
  const counts = Array(n).fill(0);
  items.forEach((it) => {
    const t = new Date(it.createdAt).getTime();
    if (Number.isNaN(t) || t < start || t > Date.now()) return;
    const idx = Math.min(n - 1, Math.floor((t - start) / binSize));
    counts[idx] += 1;
  });
  return counts;
}

function ActivitySparkline({ counts = [], rangeHours = 6 }) {
  const W = 320;
  const H = 88;
  const pad = { t: 8, r: 6, b: 20, l: 6 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const maxC = Math.max(1, ...counts);
  const n = Math.max(1, counts.length - 1);
  const pts = counts.map((c, i) => {
    const x = pad.l + (i / n) * innerW;
    const y = pad.t + innerH * (1 - c / maxC);
    return [x, y];
  });
  const lineD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const baseY = pad.t + innerH;
  const areaD = `${lineD} L ${pts[pts.length - 1][0].toFixed(1)} ${baseY} L ${pts[0][0].toFixed(1)} ${baseY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm h-24 text-indigo-500 dark:text-indigo-400" aria-hidden>
      <defs>
        <linearGradient id="presenceLiveSpark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#presenceLiveSpark)" />
      <path d={lineD} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="currentColor" />
      ))}
      <text x={pad.l} y={H - 4} className="fill-gray-500 dark:fill-gray-400" style={{ fontSize: 9 }}>
        New requests over last {rangeHours}h (by time)
      </text>
    </svg>
  );
}

const LiveAwarenessPage = () => {
  const [timeRange, setTimeRange] = useState('Last 6h');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [apiTotal, setApiTotal] = useState(0);
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 8;

  const rangeHoursNum = timeRange === 'Last 1h' ? 1 : timeRange === 'Last 6h' ? 6 : 24;

  const mapPresenceToRow = (item) => {
    const rawId = String(item.id ?? item._id ?? '');
    const createdAt = item.createdAt ? new Date(item.createdAt) : null;
    const now = new Date();
    const diffMs = createdAt ? now - createdAt : 0;
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    let timeActive = '—';
    if (createdAt) {
      if (hours <= 0) {
        timeActive = `${minutes || 0} min`;
      } else {
        timeActive = `${hours} hr${hours > 1 ? 's' : ''}${remainingMinutes ? ` ${remainingMinutes} min` : ''}`;
      }
    }

    const situationKey = item.situationType || 'other';
    const categoryLabel = SITUATION_LABELS[situationKey] || situationKey;

    const statusKey = item.status || 'active';
    const statusLabel = STATUS_LABELS[statusKey] || statusKey;

    const openLike = ['active', 'helpers_notified', 'helpers_accepted'].includes(statusKey);
    let flags = 'none';
    if (item.totalAccepted > 0) flags = 'green';
    else if (item.totalNotified > 0) flags = 'yellow';

    const displayId = rawId.length >= 8 ? rawId.slice(-8).toUpperCase() : rawId || '—';

    return {
      id: displayId,
      rawId,
      category: categoryLabel,
      situationKey,
      status: statusLabel,
      statusKey,
      viewers: item.totalNotified ?? 0,
      accepted: item.totalAccepted ?? 0,
      timeActive,
      flags,
      createdAt: item.createdAt,
    };
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await api.get('/admin/live-awareness', {
        params: {
          rangeHours: rangeHoursNum,
          limit: 200,
          page: 1,
        },
      });

      const { success, data, message } = response?.data || {};
      if (!success) {
        setFetchError(message || 'Could not load live presence data.');
        setIncidents([]);
        setApiTotal(0);
        return;
      }

      const rawItems = Array.isArray(data?.items) ? data.items : [];
      setApiTotal(Number(data?.total) || rawItems.length);
      setIncidents(rawItems.map(mapPresenceToRow));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Network error — check API URL and admin session.';
      setFetchError(msg);
      setIncidents([]);
      setApiTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [rangeHoursNum]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesCategory =
        category === 'All' || incident.category === category;
      const matchesStatus = status === 'All' || incident.statusKey === status;
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        incident.id.toLowerCase().includes(search) ||
        (incident.rawId && incident.rawId.toLowerCase().includes(search)) ||
        incident.category.toLowerCase().includes(search) ||
        incident.status.toLowerCase().includes(search);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [incidents, category, status, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const chartBins = useMemo(() => binCreatedCounts(incidents, rangeHoursNum), [incidents, rangeHoursNum]);

  const summary = useMemo(() => {
    const notified = incidents.filter((i) => i.statusKey === 'helpers_notified').length;
    const accepted = incidents.filter((i) => i.statusKey === 'helpers_accepted').length;
    const activeOnly = incidents.filter((i) => i.statusKey === 'active').length;
    return { notified, accepted, activeOnly };
  }, [incidents]);

  const columns = [
    { header: 'Request ID', accessor: 'id', className: 'font-medium text-gray-900 dark:text-white font-mono text-xs' },
    { header: 'Situation', accessor: 'category', className: 'text-gray-700 dark:text-gray-300' },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.statusKey === 'active'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
              : row.statusKey === 'helpers_accepted'
                ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
                : row.statusKey === 'helpers_notified'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Reach',
      accessor: 'viewers',
      className: 'text-center text-sm',
      render: (row) => (
        <span className="tabular-nums text-gray-800 dark:text-gray-200">
          {row.viewers} notified
          {row.accepted > 0 ? (
            <span className="text-gray-500 dark:text-gray-400"> · {row.accepted} accepted</span>
          ) : null}
        </span>
      ),
    },
    { header: 'Age', accessor: 'timeActive', className: 'text-gray-600 dark:text-gray-400' },
    {
      header: 'Flags',
      accessor: 'flags',
      render: (row) => (
        <span className="flex justify-center">
          {row.flags === 'yellow' ? <YellowAlertIcon /> : null}
          {row.flags === 'green' ? <span title="Helpers accepted"><Users className="h-5 w-5 text-emerald-500" /></span> : null}
          {row.viewers === 0 && row.flags === 'none' ? <span className="text-gray-400">—</span> : null}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      className: 'text-center',
      render: (row) => (
        <Button
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/live-awareness/${row.rawId}`);
          }}
          className="text-xs px-3 py-1.5"
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Need Presence — Live monitor</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Open presence requests in the selected window (same data as <code className="text-xs rounded bg-gray-100 px-1 dark:bg-gray-800">GET /api/admin/live-awareness</code>).
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => loadData()}
          disabled={isLoading}
          icon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {fetchError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Eye className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">In time range</div>
                <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{apiTotal}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">total open requests (server count)</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 border-l border-gray-200 pl-6 dark:border-gray-700">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active</div>
                <div className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{summary.activeOnly}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Notified</div>
                <div className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{summary.notified}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Helpers accepted</div>
                <div className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{summary.accepted}</div>
              </div>
            </div>
          </div>
        </Card>
        <Card className="flex flex-col justify-center p-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Activity className="h-3.5 w-3.5" />
            Volume
          </div>
          <ActivitySparkline counts={chartBins} rangeHours={rangeHoursNum} />
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-4 md:flex-row md:flex-wrap md:items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Situation
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => handleFilterChange(setCategory, e.target.value)}
            disabled={isLoading}
            className="block w-full min-w-[11rem] rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white md:w-48 disabled:opacity-50"
          >
            {CATEGORY_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => handleFilterChange(setStatus, e.target.value)}
            disabled={isLoading}
            className="block w-full min-w-[11rem] rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white md:w-44 disabled:opacity-50"
          >
            <option value="All">All statuses</option>
            <option value="active">Active</option>
            <option value="helpers_notified">Notified</option>
            <option value="helpers_accepted">Accepted</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 md:ml-auto">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Time window</span>
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-600" role="group">
            {['Last 1h', 'Last 6h', 'Last 24h'].map((range) => (
              <motion.button
                key={range}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFilterChange(setTimeRange, range)}
                disabled={isLoading}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  timeRange === range
                    ? 'bg-gray-900 text-white shadow-sm dark:bg-indigo-600 dark:text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {range.replace('Last ', '')}
              </motion.button>
            ))}
          </div>
        </div>
      </Card>

      <Table
        columns={columns}
        data={paginatedData}
        isLoading={isLoading}
        onSearch={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search ID, situation, status…"
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredData.length,
          itemsPerPage,
        }}
        onPageChange={setCurrentPage}
      />

      {!isLoading && !fetchError && filteredData.length === 0 ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          No requests match your filters in this time window. If the database has no active presence requests, this table stays empty.
        </p>
      ) : null}

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 sm:text-left">
          Read-only monitor: aggregated counts and statuses only. No live maps or messaging from this screen.
        </p>
      </div>
    </div>
  );
};

export default LiveAwarenessPage;
