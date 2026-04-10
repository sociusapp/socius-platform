import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Table from '../components/common/Table';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api } from '../services/api/client';
import { formatDateTime } from './daily-help/dailyHelpDetailShared';
import { ChevronDown } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

const DATE_PRESETS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'New (pending)' },
  { value: 'under_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'felt_uncomfortable', label: 'Felt uncomfortable' },
  { value: 'personal_boundaries_crossed', label: 'Personal boundaries crossed' },
  { value: 'misuse_of_platform', label: 'Misuse of platform' },
  { value: 'false_unnecessary_request', label: 'False / unnecessary request' },
  { value: 'something_else', label: 'Something else' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All severity' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const rangeFromPreset = (preset) => {
  if (preset === 'all') return { from: '', to: '' };
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
};

const shortId = (id) => {
  const s = String(id || '');
  if (s.length <= 8) return s.toUpperCase();
  return `R-${s.slice(-6).toUpperCase()}`;
};

const categoryLabel = (key) => {
  const row = CATEGORY_OPTIONS.find((o) => o.value === key);
  return row?.label || String(key || '-').replace(/_/g, ' ');
};

const severityForCategory = (cat) => {
  if (cat === 'personal_boundaries_crossed' || cat === 'misuse_of_platform') return 'High';
  if (cat === 'felt_uncomfortable' || cat === 'something_else') return 'Medium';
  if (cat === 'false_unnecessary_request') return 'Low';
  return '—';
};

const statusLabel = (s) => {
  if (s === 'pending') return 'New';
  if (s === 'under_review') return 'In review';
  if (s === 'resolved') return 'Closed';
  if (s === 'dismissed') return 'Dismissed';
  return s || '—';
};

const sourceLabel = (row) => {
  if (row.reporterRole === 'requester') return 'Requester';
  if (row.reporterRole === 'helper') return 'Helper / volunteer';
  return 'User report';
};

const actionTakenLabel = (a) => {
  if (!a || a === 'no_action') return 'No action recorded';
  return String(a).replace(/_/g, ' ');
};

const buildActionLogLines = (row) => {
  const lines = [];
  if (row?.reviewedAt) {
    lines.push(
      `${formatDateTime(row.reviewedAt)} — Last review update (status: ${statusLabel(row.status)})`
    );
  }
  if (row?.actionTaken && row.actionTaken !== 'no_action') {
    lines.push(`Action: ${actionTakenLabel(row.actionTaken)}`);
  }
  if (row?.adminNote && String(row.adminNote).trim()) {
    lines.push(`Note: ${String(row.adminNote).trim()}`);
  }
  if (!lines.length) return ['No admin actions logged yet for this report.'];
  return lines;
};

const requestKindFromReport = (type) => {
  if (type === 'HelpRequest') return 'help';
  if (type === 'PresenceRequest') return 'presence';
  return null;
};

const linkedIssueLabel = (req, reqType) => {
  if (!req) return '—';
  if (reqType === 'HelpRequest') {
    return req.categoryName || req.category || 'Help request';
  }
  if (reqType === 'PresenceRequest') {
    return String(req.situationType || 'Awareness request').replace(/_/g, ' ');
  }
  return '—';
};

const ReportsSafetyFlagsPage = () => {
  const { confirm, toast, info } = useAlert();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [tableKey, setTableKey] = useState(0);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedQ, setDebouncedQ] = useState('');

  const [datePreset, setDatePreset] = useState('30d');
  const [fromTo, setFromTo] = useState(() => rangeFromPreset('30d'));

  const [filterCategory, setFilterCategory] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadReports = useCallback(async () => {
    setListLoading(true);
    setLoadError(null);
    try {
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };
      if (debouncedQ) params.q = debouncedQ;
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (filterSeverity && !filterCategory) params.severity = filterSeverity;
      if (fromTo.from) params.from = fromTo.from;
      if (fromTo.to) params.to = fromTo.to;

      const res = await api.get('/admin/reports', { params });
      const { success, data } = res?.data || {};
      if (!success || !data) {
        setItems([]);
        setTotal(0);
        return;
      }
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);
      setTotal(Number(data.total) || 0);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load reports';
      setLoadError(msg);
      setItems([]);
      setTotal(0);
      toastRef.current?.error?.(msg);
    } finally {
      setListLoading(false);
    }
  }, [
    currentPage,
    debouncedQ,
    filterStatus,
    filterCategory,
    filterSeverity,
    fromTo.from,
    fromTo.to,
  ]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    if (currentPage > maxPage) setCurrentPage(maxPage);
  }, [total, currentPage]);

  useEffect(() => {
    if (!items.length) {
      if (selectedId) setSelectedId(null);
      return;
    }
    const exists = items.some((r) => String(r._id) === String(selectedId));
    if (!selectedId || !exists) {
      setSelectedId(items[0]._id);
    }
  }, [items, selectedId]);

  const selected = useMemo(
    () => items.find((r) => String(r._id) === String(selectedId)) || null,
    [items, selectedId]
  );

  const qTimer = useRef(null);
  const onSearch = useCallback((value) => {
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => {
      setDebouncedQ(String(value || '').trim());
      setCurrentPage(1);
    }, 320);
  }, []);

  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    setFromTo(rangeFromPreset(preset));
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadReports();
  };

  const resetFilters = () => {
    setFilterCategory('');
    setFilterSeverity('');
    setFilterStatus('');
    setDatePreset('30d');
    setFromTo(rangeFromPreset('30d'));
    setDebouncedQ('');
    setCurrentPage(1);
    setTableKey((k) => k + 1);
  };

  const columns = useMemo(
    () => [
      {
        header: 'ID',
        accessor: 'short',
        className: 'font-bold text-gray-900 dark:text-white',
      },
      { header: 'Source', accessor: 'source', className: 'text-gray-600 dark:text-gray-300' },
      { header: 'Type', accessor: 'type', className: 'font-medium text-gray-900 dark:text-white' },
      {
        header: 'Severity',
        accessor: 'severity',
        render: (row) => (
          <span
            className={
              row.severity === 'High'
                ? 'text-red-600 dark:text-red-400 font-medium'
                : row.severity === 'Medium'
                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400'
            }
          >
            {row.severity}
          </span>
        ),
      },
      {
        header: 'Submitted',
        accessor: 'submitted',
        className: 'text-gray-600 dark:text-gray-400 text-sm',
      },
      { header: 'Status', accessor: 'status', className: 'text-gray-900 dark:text-white' },
    ],
    []
  );

  const tableRows = useMemo(
    () =>
      items.map((r) => ({
        ...r,
        id: r._id,
        short: shortId(r._id),
        source: sourceLabel(r),
        type: categoryLabel(r.category),
        severity: severityForCategory(r.category),
        submitted: formatDateTime(r.createdAt),
        status: statusLabel(r.status),
      })),
    [items]
  );

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const getSeverityColor = (severity) => {
    switch (String(severity || '').toLowerCase()) {
      case 'high':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
      case 'low':
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const handleMarkReviewed = async () => {
    if (!selected?._id) return;
    const result = await confirm({
      title: 'Mark as in review?',
      text: 'This sets the report to “in review” and records you as the reviewer.',
      icon: 'question',
      confirmButtonText: 'Yes, mark in review',
      confirmButtonColor: '#3085d6',
    });
    if (!result.isConfirmed) return;
    setProcessingAction('reviewed');
    try {
      await api.patch(`/admin/reports/${encodeURIComponent(selected._id)}/status`, {
        status: 'under_review',
      });
      toastRef.current?.success?.('Report marked in review');
      await loadReports();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Update failed';
      toastRef.current?.error?.(msg);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSendWarning = async () => {
    if (!selected?._id) return;
    const result = await confirm({
      title: 'Record warning & close?',
      text: 'This resolves the report with action “user warned” (shown in history).',
      icon: 'warning',
      confirmButtonText: 'Yes, record warning',
      confirmButtonColor: '#d33',
    });
    if (!result.isConfirmed) return;
    setProcessingAction('warning');
    try {
      await api.patch(`/admin/reports/${encodeURIComponent(selected._id)}/resolve`, {
        actionTaken: 'user_warned',
      });
      toastRef.current?.success?.('Report resolved — user warned');
      await loadReports();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Resolve failed';
      toastRef.current?.error?.(msg);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDismiss = async () => {
    if (!selected?._id) return;
    const result = await confirm({
      title: 'Dismiss report?',
      text: 'Marks the report dismissed without escalating.',
      icon: 'warning',
      confirmButtonText: 'Dismiss',
      confirmButtonColor: '#64748b',
    });
    if (!result.isConfirmed) return;
    setProcessingAction('dismiss');
    try {
      await api.patch(`/admin/reports/${encodeURIComponent(selected._id)}/resolve`, {
        actionTaken: 'dismissed',
      });
      toastRef.current?.success?.('Report dismissed');
      await loadReports();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Dismiss failed';
      toastRef.current?.error?.(msg);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRequireReAcceptance = async () => {
    await info({
      title: 'Not in API yet',
      text:
        'Code-of-conduct re-acceptance is not wired to the backend yet. Use account actions from the user profile if you need to limit or guide the member.',
    });
  };

  const linked = selected?.reportedRequestId;
  const linkedType = selected?.reportedRequestType;
  const kind = requestKindFromReport(linkedType);
  const canReview = selected?.status === 'pending';
  const canResolve = selected && ['pending', 'under_review'].includes(selected.status);
  const actionLines = selected ? buildActionLogLines(selected) : [];

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Safety Flags</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          In-app user reports (Daily Help & presence). Data from{' '}
          <code className="text-xs rounded bg-gray-100 dark:bg-gray-800 px-1">GET /api/admin/reports</code>.
        </p>
      </div>

      <Card className="p-4 mb-6 flex flex-wrap gap-4 items-start">
        <div className="relative w-full md:w-auto">
          <select
            value={datePreset}
            onChange={(e) => applyDatePreset(e.target.value)}
            className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full md:w-44 pl-3 pr-8 py-2"
          >
            {DATE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>

        <div className="relative w-full md:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full md:w-48 pl-3 pr-8 py-2"
          >
            {CATEGORY_OPTIONS.map((p) => (
              <option key={p.value || 'all'} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>

        <div className="relative w-full md:w-auto">
          <select
            value={filterSeverity}
            onChange={(e) => {
              setFilterSeverity(e.target.value);
              setCurrentPage(1);
            }}
            className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full md:w-40 pl-3 pr-8 py-2"
            disabled={Boolean(filterCategory)}
            title={filterCategory ? 'Clear report type to filter by severity' : ''}
          >
            {SEVERITY_OPTIONS.map((p) => (
              <option key={p.value || 'all-sev'} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>

        <div className="relative w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full md:w-44 pl-3 pr-8 py-2"
          >
            {STATUS_OPTIONS.map((p) => (
              <option key={p.value || 'all-st'} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>

        <div className="flex flex-wrap items-center gap-4 ml-0 md:ml-2 text-sm text-gray-700 dark:text-gray-300 w-full md:w-auto">
          <span className="font-medium w-full md:w-auto">Legend</span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
            New
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-slate-500" />
            In review
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-red-600" />
            Closed / dismissed
          </span>
        </div>

        <div className="flex w-full md:w-auto gap-2 ml-auto">
          <Button
            variant="primary"
            type="button"
            className="flex-1 md:flex-none px-4 py-2 text-sm font-medium shadow-sm"
            onClick={applyFilters}
          >
            Apply filters
          </Button>
          <button
            type="button"
            className="flex-1 md:flex-none px-4 py-2 text-socius-red text-sm font-medium hover:text-red-800 border border-gray-200 dark:border-gray-700 md:border-0 rounded-md md:rounded-none transition-colors"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
      </Card>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 flex flex-col h-full">
          <Table
            key={tableKey}
            title="Reports"
            columns={columns}
            data={tableRows}
            isLoading={listLoading}
            onSearch={onSearch}
            searchPlaceholder="Search details or paste report id…"
            pagination={{
              currentPage,
              totalPages,
              totalItems: total,
              itemsPerPage: ITEMS_PER_PAGE,
            }}
            onPageChange={setCurrentPage}
            onRowClick={(row) => setSelectedId(row._id)}
            rowClassName={(row) =>
              String(row._id) === String(selectedId)
                ? 'bg-gray-50 dark:bg-gray-700/80'
                : ''
            }
          />

          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-b-0 border-gray-200 dark:border-gray-700 rounded-t-lg">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                Admin action log
              </h4>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg border border-gray-200 dark:border-gray-700 space-y-1">
              {actionLines.map((line, idx) => (
                <p key={idx} className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center text-gray-500 dark:text-gray-400"
              >
                {listLoading ? 'Loading…' : 'No reports match the current filters.'}
              </motion.div>
            ) : (
              <motion.div
                key={selected._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="flex flex-col p-0 overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-none dark:bg-gray-800/80">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/90 rounded-t-xl">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Report details
                    </h3>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                        Summary
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                        <div className="flex">
                          <span className="w-28 text-gray-500 dark:text-gray-400 font-medium">
                            Report ID:
                          </span>
                          <span className="text-gray-900 dark:text-white font-bold font-mono text-xs">
                            {String(selected._id)}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="w-28 text-gray-500 dark:text-gray-400 font-medium">
                            Submitted:
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatDateTime(selected.createdAt)}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="w-28 text-gray-500 dark:text-gray-400 font-medium">
                            Source:
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {sourceLabel(selected)}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="w-28 text-gray-500 dark:text-gray-400 font-medium">
                            Category:
                          </span>
                          <span className="text-gray-900 dark:text-white font-bold">
                            {categoryLabel(selected.category)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-28 text-gray-500 dark:text-gray-400 font-medium">
                            Severity:
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(
                              severityForCategory(selected.category)
                            )}`}
                          >
                            {severityForCategory(selected.category)}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="w-28 text-gray-500 dark:text-gray-400 font-medium">
                            Reporter:
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {selected.reporterId?.fullName || '—'}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="w-28 text-gray-500 dark:text-gray-400 font-medium">
                            Reported user:
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {selected.reportedUserId?.fullName || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                        Linked request
                      </h4>
                      {linked && kind ? (
                        <div className="grid grid-cols-1 gap-y-2 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-28 text-gray-500 dark:text-gray-400 font-medium">
                              Open in Daily Help:
                            </span>
                            <Link
                              to={`/daily-help/${kind}/${linked._id || linked}`}
                              className="text-socius-red hover:underline font-semibold"
                            >
                              {shortId(linked._id || linked)}
                            </Link>
                          </div>
                          <div className="flex">
                            <span className="w-28 text-gray-500 dark:text-gray-400 font-medium">
                              Context:
                            </span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {linkedIssueLabel(linked, linkedType)}
                            </span>
                          </div>
                          <div className="flex">
                            <span className="w-28 text-gray-500 dark:text-gray-400 font-medium">
                              Request status:
                            </span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {linked.status || '—'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          No help or presence request linked to this report.
                        </p>
                      )}
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                        Description
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {selected.status === 'pending' && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Pending review:{' '}
                          </span>
                        )}
                        {selected.details?.trim() || '—'}
                      </p>
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                        Pattern signals
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No automated cluster signals are attached yet (placeholder for future analytics).
                      </p>
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />

                    <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                        Admin review
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Checklist is local only; resolving the report updates the database via{' '}
                        <code className="rounded bg-gray-200 dark:bg-gray-800 px-1">/resolve</code> or{' '}
                        <code className="rounded bg-gray-200 dark:bg-gray-800 px-1">/status</code>.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-socius-red border-gray-300 rounded focus:ring-socius-red"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                            Boundary issue confirmed
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-socius-red border-gray-300 rounded focus:ring-socius-red"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                            Misuse suspected
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-socius-red border-gray-300 rounded focus:ring-socius-red"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                            Education required
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-socius-red border-gray-300 rounded focus:ring-socius-red"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                            Temporary limitation recommended
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-socius-red border-gray-300 rounded focus:ring-socius-red"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                            No action needed
                          </span>
                        </label>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button
                          onClick={handleMarkReviewed}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded shadow-sm uppercase tracking-wide"
                          loading={processingAction === 'reviewed'}
                          disabled={processingAction !== null || !canReview}
                        >
                          {processingAction === 'reviewed' ? 'Processing…' : 'Mark in review'}
                        </Button>
                        <Button
                          onClick={handleSendWarning}
                          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded shadow-sm uppercase tracking-wide"
                          loading={processingAction === 'warning'}
                          disabled={processingAction !== null || !canResolve}
                        >
                          {processingAction === 'warning' ? 'Saving…' : 'Resolve: user warned'}
                        </Button>
                        <Button
                          onClick={handleDismiss}
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded shadow-sm uppercase tracking-wide"
                          loading={processingAction === 'dismiss'}
                          disabled={processingAction !== null || !canResolve}
                        >
                          {processingAction === 'dismiss' ? 'Saving…' : 'Dismiss report'}
                        </Button>
                        <Button
                          onClick={handleRequireReAcceptance}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded shadow-sm uppercase tracking-wide"
                          disabled={processingAction !== null}
                        >
                          Require CoC (soon)
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center sm:text-left">
          Reports improve safety and platform integrity. Admin actions are stored on the report record
          (status, action taken, notes).
        </p>
      </div>
    </div>
  );
};

export default ReportsSafetyFlagsPage;
