import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HandHelping, Radio, Shield, ListTodo } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { api } from '../services/api/client';
import { formatDateTime, safeText } from './daily-help/dailyHelpDetailShared';

const TABS = [
  { key: 'help', label: 'Help Requests', shortLabel: 'Help', icon: HandHelping },
  { key: 'presence', label: 'Presence', shortLabel: 'Presence', icon: Radio },
  { key: 'closures', label: 'Closures', shortLabel: 'Closures', icon: Shield },
  { key: 'attempts', label: 'Attempts', shortLabel: 'Attempts', icon: ListTodo },
];

export { extractApproxLatLng } from './daily-help/dailyHelpDetailShared';

const TAB_KEYS = new Set(TABS.map((t) => t.key));

const normalizeListResponse = (body) => {
  const payload = body?.data;
  if (!payload) return { items: [], total: 0 };
  if (Array.isArray(payload.items)) {
    return { items: payload.items, total: Number(payload.total) || payload.items.length };
  }
  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length };
  }
  return { items: [], total: 0 };
};

const DailyHelpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = tabParam && TAB_KEYS.has(tabParam) ? tabParam : 'help';

  const setTab = useCallback((key) => {
    if (!TAB_KEYS.has(key)) return;
    if (key === 'help') setSearchParams({}, { replace: true });
    else setSearchParams({ tab: key }, { replace: true });
  }, [setSearchParams]);

  const [helpStatus, setHelpStatus] = useState('All');
  const [helpCategory, setHelpCategory] = useState('All');
  const [helpPage, setHelpPage] = useState(1);
  const [helpSearch, setHelpSearch] = useState('');
  const [helpSearchDebounced, setHelpSearchDebounced] = useState('');
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
  const [attemptSearchDebounced, setAttemptSearchDebounced] = useState('');

  const itemsPerPage = 20;

  useEffect(() => {
    const t = location.state?.fromTab;
    if (!t || !TAB_KEYS.has(t)) return;
    if (t === 'help') setSearchParams({}, { replace: true });
    else setSearchParams({ tab: t }, { replace: true });
  }, [location.state?.fromTab, setSearchParams]);

  useEffect(() => {
    const t = setTimeout(() => setHelpSearchDebounced(helpSearch.trim()), 320);
    return () => clearTimeout(t);
  }, [helpSearch]);

  useEffect(() => {
    const t = setTimeout(() => setAttemptSearchDebounced(attemptSearch.trim()), 320);
    return () => clearTimeout(t);
  }, [attemptSearch]);

  const openDetail = useCallback(
    (type, id) => {
      navigate(`/daily-help/${type}/${id}`, { state: { fromTab: tab } });
    },
    [navigate, tab]
  );

  useEffect(() => {
    if (tab !== 'help') return undefined;

    const ac = new AbortController();
    let active = true;

    const load = async () => {
      setHelpLoading(true);
      try {
        const params = {
          page: helpPage,
          limit: itemsPerPage,
        };
        if (helpStatus !== 'All') params.status = helpStatus;
        if (helpCategory !== 'All') params.category = helpCategory;
        if (helpSearchDebounced) params.q = helpSearchDebounced;

        const res = await api.get('/admin/help-requests', { params, signal: ac.signal });
        const body = res?.data;
        if (!active) return;
        if (body?.success) {
          const { items: list, total } = normalizeListResponse(body);
          const normalized = list.map((r) => ({
            ...r,
            id: r?.id != null ? String(r.id) : String(r?._id ?? ''),
          }));
          setHelpItems(normalized);
          setHelpTotal(total);
        } else {
          setHelpItems([]);
          setHelpTotal(0);
          toast.error(body?.message || 'Failed to load help requests');
        }
      } catch (e) {
        if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
        if (!active) return;
        setHelpItems([]);
        setHelpTotal(0);
        toast.error(e?.response?.data?.message || 'Failed to load help requests');
      } finally {
        if (active) setHelpLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      ac.abort();
    };
  }, [tab, helpPage, helpStatus, helpCategory, helpSearchDebounced, itemsPerPage]);

  useEffect(() => {
    if (tab !== 'presence') return undefined;

    const ac = new AbortController();
    let active = true;

    const load = async () => {
      setPresenceLoading(true);
      try {
        const params = { page: presencePage, limit: itemsPerPage };
        if (presenceStatus !== 'All') params.status = presenceStatus;
        const res = await api.get('/admin/presence-requests', { params, signal: ac.signal });
        const body = res?.data;
        if (!active) return;
        if (body?.success) {
          const { items: list, total } = normalizeListResponse(body);
          const normalized = list.map((r) => ({
            ...r,
            id: r?.id != null ? String(r.id) : String(r?._id ?? ''),
          }));
          setPresenceItems(normalized);
          setPresenceTotal(total);
        } else {
          setPresenceItems([]);
          setPresenceTotal(0);
          toast.error(body?.message || 'Failed to load presence requests');
        }
      } catch (e) {
        if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
        if (!active) return;
        setPresenceItems([]);
        setPresenceTotal(0);
        toast.error(e?.response?.data?.message || 'Failed to load presence requests');
      } finally {
        if (active) setPresenceLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      ac.abort();
    };
  }, [tab, presencePage, presenceStatus, itemsPerPage]);

  useEffect(() => {
    if (tab !== 'closures') return undefined;

    const ac = new AbortController();
    let active = true;

    const load = async () => {
      setClosureLoading(true);
      try {
        const params = { page: closurePage, limit: itemsPerPage };
        if (closureStatus !== 'All') params.status = closureStatus;
        const res = await api.get('/admin/closures', { params, signal: ac.signal });
        const body = res?.data;
        if (!active) return;
        if (body?.success) {
          const { items: list, total } = normalizeListResponse(body);
          const normalized = list.map((r) => ({
            ...r,
            id: r?.id != null ? String(r.id) : String(r?._id ?? ''),
          }));
          setClosureItems(normalized);
          setClosureTotal(total);
        } else {
          setClosureItems([]);
          setClosureTotal(0);
          toast.error(body?.message || 'Failed to load closures');
        }
      } catch (e) {
        if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
        if (!active) return;
        setClosureItems([]);
        setClosureTotal(0);
        toast.error(e?.response?.data?.message || 'Failed to load closures');
      } finally {
        if (active) setClosureLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      ac.abort();
    };
  }, [tab, closurePage, closureStatus, itemsPerPage]);

  useEffect(() => {
    if (tab !== 'attempts') return undefined;

    const ac = new AbortController();
    let active = true;

    const load = async () => {
      setAttemptLoading(true);
      try {
        const params = { page: attemptPage, limit: itemsPerPage };
        if (attemptSearchDebounced) {
          if (/^[a-f0-9]{24}$/i.test(attemptSearchDebounced)) {
            params.requesterId = attemptSearchDebounced;
          }
          if (attemptSearchDebounced === 'help_request' || attemptSearchDebounced === 'presence_request') {
            params.requestKind = attemptSearchDebounced;
          }
        }
        const res = await api.get('/admin/request-attempts', { params, signal: ac.signal });
        const body = res?.data;
        if (!active) return;
        if (body?.success) {
          const { items: list, total } = normalizeListResponse(body);
          setAttemptItems(list);
          setAttemptTotal(total);
        } else {
          setAttemptItems([]);
          setAttemptTotal(0);
          toast.error(body?.message || 'Failed to load request attempts');
        }
      } catch (e) {
        if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
        if (!active) return;
        setAttemptItems([]);
        setAttemptTotal(0);
        toast.error(e?.response?.data?.message || 'Failed to load request attempts');
      } finally {
        if (active) setAttemptLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      ac.abort();
    };
  }, [tab, attemptPage, attemptSearchDebounced, itemsPerPage]);
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

  return (
    <div className="flex flex-col pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Request queues</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Help (Daily Help), Need Presence, session closures, and match attempts — one place, separate tabs (admin read-only)
        </p>
      </div>

      <Card className="p-4 sm:p-5 mb-6 border-gray-200/90 dark:border-gray-700/90 shadow-sm">
        <div
          className="rounded-2xl border border-gray-200/90 dark:border-gray-600/80 bg-gradient-to-b from-gray-100/95 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/70 overflow-hidden"
          aria-label="Request queue views"
        >
          <div
            role="tablist"
            className="flex p-1 sm:p-1.5 gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [-webkit-overflow-scrolling:touch] border-b border-gray-200/70 dark:border-gray-700/80 bg-black/[0.02] dark:bg-black/15"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <motion.button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: active ? 1 : 1.01 }}
                  onClick={() => setTab(t.key)}
                  className={`group relative flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 min-w-[calc(50%-0.25rem)] sm:min-w-[8.5rem] md:min-w-[9.25rem] ${
                    active
                      ? 'bg-socius-red text-white shadow-md shadow-red-900/15 dark:shadow-red-950/50 ring-1 ring-red-900/10 dark:ring-red-400/20 z-10'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/85 dark:hover:bg-gray-700/55'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-opacity ${active ? 'opacity-100' : 'opacity-65 group-hover:opacity-90'}`}
                    strokeWidth={active ? 2.25 : 2}
                  />
                  <span className="truncate sm:hidden">{t.shortLabel}</span>
                  <span className="truncate hidden sm:inline">{t.label}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="px-3 py-3 sm:px-4 sm:py-3.5 bg-white/70 dark:bg-gray-950/35">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400 lg:max-w-[40%] order-2 lg:order-1">
                {tab === 'attempts'
                  ? 'Filters for this tab: use the table search below.'
                  : 'Choose a tab above, then narrow the list with these filters.'}
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 w-full lg:w-auto lg:justify-end order-1 lg:order-2">
                {tab === 'help' ? (
                  <>
                    <select
                      value={helpStatus}
                      onChange={(e) => {
                        setHelpStatus(e.target.value);
                        setHelpPage(1);
                      }}
                      className="block w-full sm:w-48 pl-3 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-socius-red/40 focus:border-socius-red dark:bg-gray-800 dark:border-gray-600 dark:text-white"
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
                      className="block w-full sm:w-56 pl-3 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-socius-red/40 focus:border-socius-red dark:bg-gray-800 dark:border-gray-600 dark:text-white"
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
                  </>
                ) : null}
                {tab === 'presence' ? (
                  <select
                    value={presenceStatus}
                    onChange={(e) => {
                      setPresenceStatus(e.target.value);
                      setPresencePage(1);
                    }}
                    className="block w-full sm:w-56 pl-3 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-socius-red/40 focus:border-socius-red dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    {['All', 'active', 'helpers_notified', 'helpers_accepted', 'closed', 'cancelled', 'auto_closed'].map((s) => (
                      <option key={s} value={s === 'All' ? 'All' : s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : null}
                {tab === 'closures' ? (
                  <select
                    value={closureStatus}
                    onChange={(e) => {
                      setClosureStatus(e.target.value);
                      setClosurePage(1);
                    }}
                    className="block w-full sm:w-64 pl-3 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-socius-red/40 focus:border-socius-red dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    {['All', 'initiated', 'awaiting_other_party', 'evidence_required', 'auto_closed_penalty', 'closed', 'disputed'].map((s) => (
                      <option key={s} value={s === 'All' ? 'All' : s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </div>
          </div>
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
    </div>
  );
};

export default DailyHelpPage;
