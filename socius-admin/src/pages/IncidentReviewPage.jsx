import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '../components/common/Table';
import { motion } from 'framer-motion';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api } from '../services/api/client';
import { formatDateTime } from './daily-help/dailyHelpDetailShared';
import { ChevronDown, ExternalLink } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const DATE_PRESETS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All sources' },
  { value: 'presence', label: 'Need presence' },
  { value: 'help', label: 'Daily help' },
];

const OUTCOME_TAGS = [
  { value: '', label: 'All outcomes' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'auto_closed', label: 'Auto closed' },
  { value: 'emergency', label: 'Emergency-related' },
  { value: 'calm_resolution', label: 'Calm resolution' },
];

const PRESENCE_SITUATIONS = [
  { value: '', label: 'All situations' },
  { value: 'need_calm_presence', label: 'Calm presence' },
  { value: 'being_followed', label: 'Being followed' },
  { value: 'feeling_unsafe', label: 'Feeling unsafe' },
  { value: 'other', label: 'Other' },
];

const rangeFromPreset = (preset) => {
  if (preset === 'all') return { from: '', to: '' };
  const days =
    preset === '7d' ? 7 : preset === '30d' ? 30 : preset === '90d' ? 90 : 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
};

const shortId = (id) => {
  const s = String(id || '');
  if (s.length <= 8) return s.toUpperCase();
  return s.slice(-6).toUpperCase();
};

const incidentReviewCsv = (rows) => {
  const headers = ['id', 'source', 'createdAt', 'category', 'scenario', 'outcome', 'status', 'address'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    lines.push(
      [
        esc(r.id),
        esc(r.source),
        esc(r.createdAt),
        esc(r.categoryLabel),
        esc(r.scenarioLabel),
        esc(r.outcomeLabel),
        esc(r.status),
        esc(r.address),
      ].join(',')
    );
  }
  return lines.join('\n');
};

const IncidentReviewPage = () => {
  const { toast } = useAlert();
  const navigate = useNavigate();

  const [datePreset, setDatePreset] = useState('90d');
  const [source, setSource] = useState('all');
  const [situationType, setSituationType] = useState('');
  const [helpCategory, setHelpCategory] = useState('');
  const [outcomeTag, setOutcomeTag] = useState('');
  const [city, setCity] = useState('');
  const [terminalOnly, setTerminalOnly] = useState(true);
  const [applied, setApplied] = useState({
    datePreset: '90d',
    source: 'all',
    situationType: '',
    helpCategory: '',
    outcomeTag: '',
    city: '',
    terminalOnly: true,
  });

  const [listLoading, setListLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listError, setListError] = useState(null);

  const [helpCategories, setHelpCategories] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);

  const [processingAction, setProcessingAction] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get('/admin/help-categories');
        const body = res?.data;
        const list = body?.data?.items || body?.data || [];
        if (!active) return;
        const arr = Array.isArray(list) ? list : [];
        setHelpCategories(arr.filter((c) => c && (c.isActive !== false)));
      } catch {
        if (active) setHelpCategories([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const fetchList = useCallback(async () => {
    const { from, to } = rangeFromPreset(applied.datePreset);
    setListLoading(true);
    setListError(null);
    try {
      const params = {
        page,
        limit: ITEMS_PER_PAGE,
        source: applied.source,
        terminalOnly: applied.terminalOnly ? 'true' : 'false',
      };
      if (from) params.from = from;
      if (to) params.to = to;
      if (applied.situationType) params.situationType = applied.situationType;
      if (applied.helpCategory) params.category = applied.helpCategory;
      if (applied.outcomeTag) params.outcomeTag = applied.outcomeTag;
      if (applied.city.trim()) params.city = applied.city.trim();
      if (debouncedQ) params.q = debouncedQ;

      const res = await api.get('/admin/incident-review', { params });
      const body = res?.data;
      if (!body?.success) {
        setItems([]);
        setTotal(0);
        setListError(body?.message || 'Failed to load incidents');
        return;
      }
      const data = body.data || {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total) || 0);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setListError(e?.response?.data?.message || e?.message || 'Network error');
    } finally {
      setListLoading(false);
    }
  }, [applied, page, debouncedQ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!items.length) {
      setSelected(null);
      return;
    }
    setSelected((prev) => {
      if (prev && items.some((i) => i.id === prev.id && i.source === prev.source)) return prev;
      return { id: items[0].id, source: items[0].source };
    });
  }, [items]);

  useEffect(() => {
    if (!selected?.id || !selected?.source) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    const ac = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);

    const path =
      selected.source === 'presence'
        ? `/admin/presence-requests/${selected.id}`
        : `/admin/help-requests/${selected.id}`;

    (async () => {
      try {
        const res = await api.get(path, { signal: ac.signal });
        const body = res?.data;
        if (!body?.success) {
          setDetailError(body?.message || 'Failed to load details');
          return;
        }
        setDetail(body.data);
      } catch (e) {
        if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
        setDetailError(e?.response?.data?.message || e?.message || 'Network error');
      } finally {
        setDetailLoading(false);
      }
    })();

    return () => ac.abort();
  }, [selected]);

  const handleApplyFilters = () => {
    setApplied({
      datePreset,
      source,
      situationType,
      helpCategory,
      outcomeTag,
      city,
      terminalOnly,
    });
    setPage(1);
  };

  const handleReset = () => {
    setDatePreset('90d');
    setSource('all');
    setSituationType('');
    setHelpCategory('');
    setOutcomeTag('');
    setCity('');
    setSearchInput('');
    setDebouncedQ('');
    setTerminalOnly(true);
    setApplied({
      datePreset: '90d',
      source: 'all',
      situationType: '',
      helpCategory: '',
      outcomeTag: '',
      city: '',
      terminalOnly: true,
    });
    setPage(1);
  };

  const handleAction = async (action, message) => {
    setProcessingAction(action);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setProcessingAction(null);
    toast.success(message);
  };

  const copyIncidentReference = async () => {
    if (!selected) {
      toast.error('Select an incident in the table first');
      return;
    }
    const row = items.find((i) => i.id === selected.id && i.source === selected.source);
    const payload = {
      id: selected.id,
      source: selected.source,
      ...(row
        ? {
            createdAt: row.createdAt,
            categoryLabel: row.categoryLabel,
            scenarioLabel: row.scenarioLabel,
            outcomeLabel: row.outcomeLabel,
            status: row.status,
            address: row.address,
          }
        : {}),
      hasDetail: !!detail,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success('Incident reference copied to clipboard');
    } catch {
      toast.error('Clipboard not available in this browser');
    }
  };

  const openInQueue = () => {
    if (!selected) return;
    const kind = selected.source === 'presence' ? 'presence' : 'help';
    navigate(`/daily-help/${kind}/${selected.id}`);
  };

  const handleExport = async () => {
    setProcessingAction('export');
    try {
      const { from, to } = rangeFromPreset(applied.datePreset);
      const params = {
        page: 1,
        limit: 100,
        source: applied.source,
        terminalOnly: applied.terminalOnly ? 'true' : 'false',
      };
      if (from) params.from = from;
      if (to) params.to = to;
      if (applied.situationType) params.situationType = applied.situationType;
      if (applied.helpCategory) params.category = applied.helpCategory;
      if (applied.outcomeTag) params.outcomeTag = applied.outcomeTag;
      if (applied.city.trim()) params.city = applied.city.trim();
      if (debouncedQ) params.q = debouncedQ;

      const res = await api.get('/admin/incident-review', { params });
      const body = res?.data;
      const rows = body?.success ? body.data?.items || [] : [];
      const csv = incidentReviewCsv(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident-review-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(rows.length ? `Exported ${rows.length} rows (max 100)` : 'No rows to export');
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Export failed');
    } finally {
      setProcessingAction(null);
    }
  };

  const timelineEvents = useMemo(() => {
    const ev = detail?.activityTimeline;
    if (!Array.isArray(ev)) return [];
    return [...ev].sort((a, b) => new Date(a.at) - new Date(b.at)).slice(-40);
  }, [detail]);

  const summaryExtras = useMemo(() => {
    if (!detail?.request) return null;
    const req = detail.request;
    if (selected?.source === 'presence') {
      return {
        respondersNotified: Number(req.totalNotified) || 0,
        respondersAccepted: Number(req.totalAccepted) || 0,
        maxResponders: req.maxHelpers ?? null,
        viewedApprox: detail?.responderSummary?.alerted ?? null,
      };
    }
    const ms = detail?.matchSummary;
    return {
      matches: ms?.total ?? null,
      accepted: ms?.accepted ?? null,
      viewed: ms?.viewedCount ?? null,
    };
  }, [detail, selected]);

  const currentRow = items.find((i) => i.id === selected?.id && i.source === selected?.source);

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      className: 'font-mono text-xs text-gray-900 dark:text-white',
      render: (row) => <span title={row.id}>{shortId(row.id)}</span>,
    },
    {
      header: 'Date & time',
      accessor: 'createdAt',
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      header: 'Source',
      accessor: 'source',
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            row.source === 'presence'
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
              : 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200'
          }`}
        >
          {row.source === 'presence' ? 'Presence' : 'Help'}
        </span>
      ),
    },
    { header: 'Category', accessor: 'categoryLabel', className: 'text-gray-900 dark:text-white' },
    { header: 'Scenario', accessor: 'scenarioLabel' },
    {
      header: 'Outcome',
      accessor: 'outcomeLabel',
      render: (row) => (
        <span
          className={`${
            row.outcomeType === 'negative' ? 'text-red-600 dark:text-red-400' : ''
          } ${row.outcomeType === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : ''} ${
            row.outcomeType === 'neutral' ? 'text-gray-900 dark:text-white' : ''
          }`}
        >
          {row.outcomeLabel}
        </span>
      ),
    },
    { header: 'Status', accessor: 'status' },
  ];

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Incident Review</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Post-event analysis for learning and platform safety (closed need-presence and daily-help requests).
        </p>
      </div>

      <Card className="p-4 mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative w-full sm:w-auto min-w-[10rem]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date range</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full pl-3 pr-8 py-2"
            >
              {DATE_PRESETS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 bottom-2.5 h-4 w-4 text-gray-500" />
          </div>

          <div className="relative w-full sm:w-auto min-w-[10rem]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full pl-3 pr-8 py-2"
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 bottom-2.5 h-4 w-4 text-gray-500" />
          </div>

          <div className="relative w-full sm:w-auto min-w-[11rem]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Situation (presence)</label>
            <select
              value={situationType}
              onChange={(e) => setSituationType(e.target.value)}
              className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full pl-3 pr-8 py-2"
            >
              {PRESENCE_SITUATIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 bottom-2.5 h-4 w-4 text-gray-500" />
          </div>

          <div className="relative w-full sm:w-auto min-w-[11rem]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Help category</label>
            <select
              value={helpCategory}
              onChange={(e) => setHelpCategory(e.target.value)}
              className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full pl-3 pr-8 py-2"
            >
              <option value="">All categories</option>
              {helpCategories.map((c) => (
                <option key={c._id || c.slug} value={c.slug}>
                  {c.name || c.slug}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 bottom-2.5 h-4 w-4 text-gray-500" />
          </div>

          <div className="relative w-full sm:w-auto min-w-[10rem]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Outcome tag</label>
            <select
              value={outcomeTag}
              onChange={(e) => setOutcomeTag(e.target.value)}
              className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full pl-3 pr-8 py-2"
            >
              {OUTCOME_TAGS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 bottom-2.5 h-4 w-4 text-gray-500" />
          </div>

          <div className="w-full sm:w-auto sm:min-w-[12rem] flex-1 max-w-md">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address / city contains</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Kathmandu"
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md px-3 py-2 focus:ring-socius-red focus:border-socius-red"
            />
          </div>

          <div className="w-full sm:flex-1 sm:min-w-[14rem]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Search (description, id, help category)
            </label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Type to search…"
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md px-3 py-2 focus:ring-socius-red focus:border-socius-red"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none mb-1">
            <input
              type="checkbox"
              checked={terminalOnly}
              onChange={(e) => setTerminalOnly(e.target.checked)}
              className="rounded border-gray-300 text-socius-red focus:ring-socius-red"
            />
            Post-event only (closed / cancelled / auto)
          </label>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="text-sm"
              onClick={handleExport}
              loading={processingAction === 'export'}
              disabled={!!processingAction && processingAction !== 'export'}
            >
              Export CSV
            </Button>
            <Button variant="primary" className="text-sm" onClick={handleApplyFilters}>
              Apply filters
            </Button>
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-socius-red font-medium hover:text-red-800 px-2 py-2 transition-colors"
            >
              Reset
            </button>
          </div>
          {listError ? <p className="text-sm text-red-600 dark:text-red-400">{listError}</p> : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <Table
            title="Incident list"
            columns={columns}
            data={items}
            isLoading={listLoading}
            pagination={{
              currentPage: page,
              totalPages,
              totalItems: total,
              itemsPerPage: ITEMS_PER_PAGE,
            }}
            onPageChange={setPage}
            onRowClick={(row) => setSelected({ id: row.id, source: row.source })}
            rowClassName={(row) =>
              row.id === selected?.id && row.source === selected?.source ? 'bg-red-50 dark:bg-red-900/10' : ''
            }
          />
        </div>

        <Card className="lg:col-span-4 flex flex-col p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-xl flex items-start justify-between gap-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Incident summary</h3>
            {selected ? (
              <button
                type="button"
                onClick={openInQueue}
                className="inline-flex items-center gap-1 text-xs font-semibold text-socius-red hover:underline shrink-0"
              >
                Open in queue
                <ExternalLink className="h-3 w-3" />
              </button>
            ) : null}
          </div>

          <div className="p-6 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
            {!selected ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Select a row to load API details.</p>
            ) : detailLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading details…</p>
            ) : detailError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{detailError}</p>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    ID:{' '}
                    <span className="font-mono text-base" title={selected.id}>
                      {shortId(selected.id)}
                    </span>
                  </h2>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Full id:</span>{' '}
                      <span className="font-mono text-xs break-all">{selected.id}</span>
                    </p>
                    {currentRow ? (
                      <>
                        <p>
                          <span className="font-medium text-gray-500 dark:text-gray-400">Date:</span>{' '}
                          {formatDateTime(currentRow.createdAt)}
                        </p>
                        <p>
                          <span className="font-medium text-gray-500 dark:text-gray-400">Source:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {currentRow.source === 'presence' ? 'Need presence' : 'Daily help'}
                          </span>
                        </p>
                        <p>
                          <span className="font-medium text-gray-500 dark:text-gray-400">Category:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">{currentRow.categoryLabel}</span>
                        </p>
                        <p>
                          <span className="font-medium text-gray-500 dark:text-gray-400">Scenario:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">{currentRow.scenarioLabel}</span>
                        </p>
                      </>
                    ) : null}
                  </div>
                </div>

                {summaryExtras && selected.source === 'presence' ? (
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Responder cap:</span>{' '}
                      {summaryExtras.maxResponders ?? '—'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Responders notified:</span>{' '}
                      {summaryExtras.respondersNotified}
                    </p>
                    <p>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Responders accepted:</span>{' '}
                      {summaryExtras.respondersAccepted}
                    </p>
                    {detail?.responderSummary ? (
                      <p>
                        <span className="font-medium text-gray-500 dark:text-gray-400">Pipeline rows:</span>{' '}
                        {detail.responderSummary.total} (alerted {detail.responderSummary.alerted}, accepted{' '}
                        {detail.responderSummary.accepted})
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {summaryExtras && selected.source === 'help' ? (
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Helper matches:</span>{' '}
                      {summaryExtras.matches ?? '—'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Accepted:</span>{' '}
                      {summaryExtras.accepted ?? '—'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Views (helpers):</span>{' '}
                      {summaryExtras.viewed ?? '—'}
                    </p>
                  </div>
                ) : null}

                {detail?.request?.description ? (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Description
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{detail.request.description}</p>
                  </div>
                ) : null}

                <hr className="border-gray-200 dark:border-gray-700" />

                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Activity timeline</h4>
                  {timelineEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No timeline events.</p>
                  ) : (
                    <div className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-4">
                      {timelineEvents.map((event, index) => (
                        <motion.div
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(index * 0.03, 0.4) }}
                          key={`${event.at}-${event.label}-${index}`}
                          className="relative"
                        >
                          <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600" />
                          <p className="text-xs text-gray-500 dark:text-gray-500 font-mono mb-0.5">
                            {formatDateTime(event.at)}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{event.label}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Outcome</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentRow ? (
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          currentRow.outcomeType === 'negative'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : currentRow.outcomeType === 'warning'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {currentRow.outcomeLabel}
                      </span>
                    ) : null}
                    {detail?.request?.closureReason ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        Closure: {String(detail.request.closureReason).replace(/_/g, ' ')}
                      </span>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-700 pt-6">
        <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center sm:text-left">
          Incident reviews use the same admin APIs as the Requests queue. Deep dive opens the full tabbed detail page.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="primary"
            className="px-4 py-2 text-sm font-medium shadow-sm"
            onClick={() => handleAction('policy_review', 'Recorded for internal follow-up (local note only).')}
            loading={processingAction === 'policy_review'}
            disabled={!!processingAction}
          >
            Mark for policy review
          </Button>
          <Button
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 border-transparent text-white text-sm font-medium shadow-sm"
            onClick={() => copyIncidentReference()}
            disabled={!!processingAction}
          >
            Copy incident reference
          </Button>
          <Button
            variant="secondary"
            className="px-4 py-2 text-sm font-medium shadow-sm"
            onClick={handleExport}
            loading={processingAction === 'export'}
            disabled={!!processingAction && processingAction !== 'export'}
          >
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncidentReviewPage;
