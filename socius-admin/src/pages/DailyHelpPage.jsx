import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { useAlert } from '../hooks/useAlert';
import { api } from '../services/api/client';

const TABS = [
  { key: 'help', label: 'Help Requests' },
  { key: 'presence', label: 'Presence Requests' },
  { key: 'closures', label: 'Closures' },
  { key: 'attempts', label: 'Request Attempts' },
];

const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  } catch {
    return '-';
  }
};

const safeText = (value) => {
  const s = String(value || '').trim();
  return s || '-';
};

const DailyHelpPage = () => {
  const { toast } = useAlert();

  const [tab, setTab] = useState('help');

  const [helpStatus, setHelpStatus] = useState('All');
  const [helpCategory, setHelpCategory] = useState('All');
  const [helpPage, setHelpPage] = useState(1);
  const [helpSearch, setHelpSearch] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpItems, setHelpItems] = useState([]);
  const [helpTotal, setHelpTotal] = useState(0);

  const [presenceStatus, setPresenceStatus] = useState('All');
  const [presencePage, setPresencePage] = useState(1);
  const [presenceLoading, setPresenceLoading] = useState(false);
  const [presenceItems, setPresenceItems] = useState([]);
  const [presenceTotal, setPresenceTotal] = useState(0);

  const [closureStatus, setClosureStatus] = useState('All');
  const [closurePage, setClosurePage] = useState(1);
  const [closureLoading, setClosureLoading] = useState(false);
  const [closureItems, setClosureItems] = useState([]);
  const [closureTotal, setClosureTotal] = useState(0);

  const [attemptPage, setAttemptPage] = useState(1);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [attemptItems, setAttemptItems] = useState([]);
  const [attemptTotal, setAttemptTotal] = useState(0);
  const [attemptSearch, setAttemptSearch] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const itemsPerPage = 20;

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailType(null);
    setDetailId(null);
    setDetailLoading(false);
    setDetailData(null);
  }, []);

  const openDetail = useCallback(async (type, id) => {
    setDetailOpen(true);
    setDetailType(type);
    setDetailId(id);
    setDetailLoading(true);
    setDetailData(null);

    try {
      if (type === 'help') {
        const res = await api.get(`/admin/help-requests/${encodeURIComponent(id)}`);
        const body = res?.data;
        if (body?.success) {
          setDetailData(body.data);
        } else {
          toast.error(body?.message || 'Failed to load help request');
        }
      } else if (type === 'presence') {
        const res = await api.get(`/admin/presence-requests/${encodeURIComponent(id)}`);
        const body = res?.data;
        if (body?.success) {
          setDetailData(body.data);
        } else {
          toast.error(body?.message || 'Failed to load presence request');
        }
      } else if (type === 'closure') {
        const res = await api.get(`/admin/closures/${encodeURIComponent(id)}`);
        const body = res?.data;
        if (body?.success) {
          setDetailData(body.data);
        } else {
          toast.error(body?.message || 'Failed to load closure');
        }
      } else {
        toast.error('Unsupported detail type');
      }
    } catch (e) {
      toast.error('Network error while loading details');
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setHelpLoading(true);
      try {
        const params = {
          page: helpPage,
          limit: itemsPerPage,
        };
        if (helpStatus !== 'All') params.status = helpStatus;
        if (helpCategory !== 'All') params.category = helpCategory;
        if (helpSearch) params.q = helpSearch;

        const res = await api.get('/admin/help-requests', { params });
        const body = res?.data;
        if (!cancelled) {
          if (body?.success && body?.data) {
            setHelpItems(body.data.items || []);
            setHelpTotal(body.data.total || 0);
          } else {
            setHelpItems([]);
            setHelpTotal(0);
          }
        }
      } catch {
        if (!cancelled) {
          setHelpItems([]);
          setHelpTotal(0);
          toast.error('Failed to load help requests');
        }
      } finally {
        if (!cancelled) setHelpLoading(false);
      }
    };

    if (tab === 'help') load();
    return () => {
      cancelled = true;
    };
  }, [tab, helpPage, helpStatus, helpCategory, helpSearch, toast]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPresenceLoading(true);
      try {
        const params = { page: presencePage, limit: itemsPerPage };
        if (presenceStatus !== 'All') params.status = presenceStatus;
        const res = await api.get('/admin/presence-requests', { params });
        const body = res?.data;
        if (!cancelled) {
          if (body?.success && body?.data) {
            setPresenceItems(body.data.items || []);
            setPresenceTotal(body.data.total || 0);
          } else {
            setPresenceItems([]);
            setPresenceTotal(0);
          }
        }
      } catch {
        if (!cancelled) {
          setPresenceItems([]);
          setPresenceTotal(0);
          toast.error('Failed to load presence requests');
        }
      } finally {
        if (!cancelled) setPresenceLoading(false);
      }
    };

    if (tab === 'presence') load();
    return () => {
      cancelled = true;
    };
  }, [tab, presencePage, presenceStatus, toast]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setClosureLoading(true);
      try {
        const params = { page: closurePage, limit: itemsPerPage };
        if (closureStatus !== 'All') params.status = closureStatus;
        const res = await api.get('/admin/closures', { params });
        const body = res?.data;
        if (!cancelled) {
          if (body?.success && body?.data) {
            setClosureItems(body.data.items || []);
            setClosureTotal(body.data.total || 0);
          } else {
            setClosureItems([]);
            setClosureTotal(0);
          }
        }
      } catch {
        if (!cancelled) {
          setClosureItems([]);
          setClosureTotal(0);
          toast.error('Failed to load closures');
        }
      } finally {
        if (!cancelled) setClosureLoading(false);
      }
    };

    if (tab === 'closures') load();
    return () => {
      cancelled = true;
    };
  }, [tab, closurePage, closureStatus, toast]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setAttemptLoading(true);
      try {
        const params = { page: attemptPage, limit: itemsPerPage };
        if (attemptSearch) {
          if (/^[a-f0-9]{24}$/i.test(attemptSearch)) params.requesterId = attemptSearch;
          if (attemptSearch === 'help_request' || attemptSearch === 'presence_request') params.requestKind = attemptSearch;
        }
        const res = await api.get('/admin/request-attempts', { params });
        const body = res?.data;
        if (!cancelled) {
          if (body?.success && body?.data) {
            setAttemptItems(body.data.items || []);
            setAttemptTotal(body.data.total || 0);
          } else {
            setAttemptItems([]);
            setAttemptTotal(0);
          }
        }
      } catch {
        if (!cancelled) {
          setAttemptItems([]);
          setAttemptTotal(0);
          toast.error('Failed to load request attempts');
        }
      } finally {
        if (!cancelled) setAttemptLoading(false);
      }
    };

    if (tab === 'attempts') load();
    return () => {
      cancelled = true;
    };
  }, [tab, attemptPage, attemptSearch, toast]);

  const helpColumns = useMemo(
    () => [
      {
        header: 'Created',
        accessor: 'createdAt',
        render: (r) => formatDateTime(r.createdAt),
      },
      {
        header: 'Status',
        accessor: 'status',
        render: (r) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {safeText(r.status)}
          </span>
        ),
      },
      { header: 'Category', accessor: 'category', render: (r) => safeText(r.category) },
      {
        header: 'Requester',
        accessor: 'requester',
        render: (r) => safeText(r?.requester?.fullName || r?.requester?.phone),
      },
      {
        header: 'Accepted Helper',
        accessor: 'acceptedHelper',
        render: (r) => safeText(r?.acceptedHelper?.fullName || r?.acceptedHelper?.phone),
      },
      {
        header: 'Area',
        accessor: 'location',
        render: (r) =>
          safeText(r?.location?.address || r?.location?.whereToFindText || ''),
      },
      {
        header: 'Action',
        accessor: 'action',
        className: 'text-center',
        render: (r) => (
          <Button
            variant="secondary"
            className="text-xs px-3 py-1.5"
            onClick={(e) => {
              e.stopPropagation();
              openDetail('help', r.id);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [openDetail]
  );

  const presenceColumns = useMemo(
    () => [
      { header: 'Created', accessor: 'createdAt', render: (r) => formatDateTime(r.createdAt) },
      {
        header: 'Status',
        accessor: 'status',
        render: (r) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {safeText(r.status)}
          </span>
        ),
      },
      { header: 'Type', accessor: 'situationType', render: (r) => safeText(r.situationType) },
      { header: 'Requester', accessor: 'requester', render: (r) => safeText(r?.requester?.fullName || r?.requester?.phone) },
      {
        header: 'Notified',
        accessor: 'totals',
        render: (r) => String(r?.totals?.totalNotified ?? 0),
        className: 'text-center',
      },
      {
        header: 'Accepted',
        accessor: 'totals',
        render: (r) => String(r?.totals?.totalAccepted ?? 0),
        className: 'text-center',
      },
      {
        header: 'Action',
        accessor: 'action',
        className: 'text-center',
        render: (r) => (
          <Button
            variant="secondary"
            className="text-xs px-3 py-1.5"
            onClick={(e) => {
              e.stopPropagation();
              openDetail('presence', r.id);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [openDetail]
  );

  const closureColumns = useMemo(
    () => [
      { header: 'Created', accessor: 'createdAt', render: (r) => formatDateTime(r.createdAt) },
      {
        header: 'Status',
        accessor: 'status',
        render: (r) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {safeText(r.status)}
          </span>
        ),
      },
      { header: 'Request', accessor: 'request', render: (r) => safeText(r?.request?.category) },
      { header: 'Requester', accessor: 'requester', render: (r) => safeText(r?.requester?.fullName || r?.requester?.phone) },
      { header: 'Helper', accessor: 'helper', render: (r) => safeText(r?.helper?.fullName || r?.helper?.phone) },
      {
        header: 'Action',
        accessor: 'action',
        className: 'text-center',
        render: (r) => (
          <Button
            variant="secondary"
            className="text-xs px-3 py-1.5"
            onClick={(e) => {
              e.stopPropagation();
              openDetail('closure', r.id);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [openDetail]
  );

  const attemptColumns = useMemo(
    () => [
      { header: 'Time', accessor: 'createdAt', render: (r) => formatDateTime(r.createdAt) },
      { header: 'Kind', accessor: 'requestKind', render: (r) => safeText(r.requestKind) },
      { header: 'Outcome', accessor: 'outcome', render: (r) => safeText(r.outcome) },
      { header: 'Category', accessor: 'category', render: (r) => safeText(r.category || r.situationType) },
      {
        header: 'Requester',
        accessor: 'requesterId',
        render: (r) => safeText(r?.requesterId?.fullName || r?.requesterId?.phone || r?.requesterId?._id),
      },
      {
        header: 'Helpers',
        accessor: 'helpersFound',
        render: (r) => String(r.helpersFound ?? '-'),
        className: 'text-center',
      },
    ],
    []
  );

  const currentTable = useMemo(() => {
    if (tab === 'help') {
      return {
        title: 'Help Requests',
        columns: helpColumns,
        data: helpItems,
        isLoading: helpLoading,
        onSearch: (v) => {
          setHelpSearch(v);
          setHelpPage(1);
        },
        pagination: {
          currentPage: helpPage,
          totalPages: Math.max(1, Math.ceil(helpTotal / itemsPerPage)),
          totalItems: helpTotal,
          itemsPerPage,
        },
        onPageChange: (p) => setHelpPage(p),
      };
    }
    if (tab === 'presence') {
      return {
        title: 'Presence Requests',
        columns: presenceColumns,
        data: presenceItems,
        isLoading: presenceLoading,
        pagination: {
          currentPage: presencePage,
          totalPages: Math.max(1, Math.ceil(presenceTotal / itemsPerPage)),
          totalItems: presenceTotal,
          itemsPerPage,
        },
        onPageChange: (p) => setPresencePage(p),
      };
    }
    if (tab === 'closures') {
      return {
        title: 'Closures',
        columns: closureColumns,
        data: closureItems,
        isLoading: closureLoading,
        pagination: {
          currentPage: closurePage,
          totalPages: Math.max(1, Math.ceil(closureTotal / itemsPerPage)),
          totalItems: closureTotal,
          itemsPerPage,
        },
        onPageChange: (p) => setClosurePage(p),
      };
    }
    return {
      title: 'Request Attempts',
      columns: attemptColumns,
      data: attemptItems,
      isLoading: attemptLoading,
      onSearch: (v) => {
        setAttemptSearch(v);
        setAttemptPage(1);
      },
      searchPlaceholder: 'Search requesterId / kind...',
      pagination: {
        currentPage: attemptPage,
        totalPages: Math.max(1, Math.ceil(attemptTotal / itemsPerPage)),
        totalItems: attemptTotal,
        itemsPerPage,
      },
      onPageChange: (p) => setAttemptPage(p),
    };
  }, [
    tab,
    helpColumns,
    helpItems,
    helpLoading,
    helpPage,
    helpTotal,
    presenceColumns,
    presenceItems,
    presenceLoading,
    presencePage,
    presenceTotal,
    closureColumns,
    closureItems,
    closureLoading,
    closurePage,
    closureTotal,
    attemptColumns,
    attemptItems,
    attemptLoading,
    attemptPage,
    attemptTotal,
  ]);

  const detailTitle = useMemo(() => {
    if (detailType === 'help') return 'Help Request Details';
    if (detailType === 'presence') return 'Presence Request Details';
    if (detailType === 'closure') return 'Closure Details';
    return 'Details';
  }, [detailType]);

  const detailBody = useMemo(() => {
    if (detailLoading) {
      return (
        <div className="p-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3" />
        </div>
      );
    }

    if (!detailData) {
      return (
        <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
          No details available.
        </div>
      );
    }

    return (
      <div className="p-6 space-y-4">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          ID: <span className="font-mono">{safeText(detailId)}</span>
        </div>
        <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-auto">
          {JSON.stringify(detailData, null, 2)}
        </pre>
      </div>
    );
  }, [detailData, detailId, detailLoading]);

  return (
    <div className="flex flex-col pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">DailyHelp</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Help requests, presence requests, closures, and matching telemetry (admin read-only)
        </p>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="inline-flex rounded-md shadow-sm w-full md:w-auto" role="group">
            {TABS.map((t, idx) => (
              <motion.button
                key={t.key}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.01 }}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium border ${
                  idx === 0 ? 'rounded-l-lg' : ''
                } ${idx === TABS.length - 1 ? 'rounded-r-lg' : ''} ${
                  tab === t.key
                    ? 'bg-socius-red text-white border-socius-red'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {t.label}
              </motion.button>
            ))}
          </div>

          {tab === 'help' ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={helpStatus}
                onChange={(e) => {
                  setHelpStatus(e.target.value);
                  setHelpPage(1);
                }}
                className="block w-full sm:w-48 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-socius-red focus:border-socius-red rounded-md border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {['All', 'open', 'matching', 'matched', 'active', 'closing', 'closed', 'cancelled', 'auto_closed'].map((s) => (
                  <option key={s} value={s === 'All' ? 'All' : s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={helpCategory}
                onChange={(e) => {
                  setHelpCategory(e.target.value);
                  setHelpPage(1);
                }}
                className="block w-full sm:w-56 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-socius-red focus:border-socius-red rounded-md border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="All">All categories</option>
                {[
                  'print_document',
                  'tool_repair',
                  'carry_lift',
                  'transport_help',
                  'household_help',
                  'study_office_help',
                  'tech_help',
                  'general_help',
                  'calm_presence',
                  'care_support',
                  'medical_awareness',
                  'language_support',
                  'elder_assistance',
                  'community_upkeep',
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ) : tab === 'presence' ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={presenceStatus}
                onChange={(e) => {
                  setPresenceStatus(e.target.value);
                  setPresencePage(1);
                }}
                className="block w-full sm:w-56 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-socius-red focus:border-socius-red rounded-md border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {['All', 'active', 'helpers_notified', 'helpers_accepted', 'closed', 'cancelled', 'auto_closed'].map((s) => (
                  <option key={s} value={s === 'All' ? 'All' : s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ) : tab === 'closures' ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={closureStatus}
                onChange={(e) => {
                  setClosureStatus(e.target.value);
                  setClosurePage(1);
                }}
                className="block w-full sm:w-64 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-socius-red focus:border-socius-red rounded-md border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {['All', 'initiated', 'awaiting_other_party', 'evidence_required', 'auto_closed_penalty', 'closed', 'disputed'].map((s) => (
                  <option key={s} value={s === 'All' ? 'All' : s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </Card>

      <Table
        title={currentTable.title}
        columns={currentTable.columns}
        data={currentTable.data}
        isLoading={currentTable.isLoading}
        onSearch={currentTable.onSearch}
        searchPlaceholder={currentTable.searchPlaceholder}
        pagination={currentTable.pagination}
        onPageChange={currentTable.onPageChange}
      />

      {detailOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeDetail}
          />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {detailTitle}
                </h3>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {safeText(detailType)} · {safeText(detailId)}
                </div>
              </div>
              <Button variant="ghost" onClick={closeDetail}>
                Close
              </Button>
            </div>
            {detailBody}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DailyHelpPage;
