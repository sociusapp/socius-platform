import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, AlertTriangle, Download, FileJson } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import toast from 'react-hot-toast';
import { useAlert } from '../hooks/useAlert';
import { api, baseURL, getBearer } from '../services/api/client';

const ITEMS_PER_PAGE = 10;

const defaultEndDate = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const defaultStartDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
};

const AuditLogsPage = () => {
  const { confirm, toast: swalToast } = useAlert();

  const [logs, setLogs] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [filterLevel, setFilterLevel] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [selectedLog, setSelectedLog] = useState(null);

  const [exportHistory, setExportHistory] = useState([]);
  const [exportHistoryLoading, setExportHistoryLoading] = useState(true);
  const [exportHistoryPage, setExportHistoryPage] = useState(1);
  const [exportHistoryTotal, setExportHistoryTotal] = useState(0);

  const [isComplianceChecked, setIsComplianceChecked] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [legalBasis, setLegalBasis] = useState('internal_audit');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [exportStart, setExportStart] = useState(defaultStartDate);
  const [exportEnd, setExportEnd] = useState(defaultEndDate);
  const [exportAnonymize, setExportAnonymize] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchLogs = useCallback(async () => {
    setListLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(filterLevel ? { level: filterLevel } : {}),
        ...(filterFrom ? { from: `${filterFrom}T00:00:00.000Z` } : {}),
        ...(filterTo ? { to: `${filterTo}T23:59:59.999Z` } : {}),
      };
      const res = await api.get('/admin/audit-logs', { params });
      const data = res?.data?.data;
      if (data && Array.isArray(data.items)) {
        setLogs(data.items);
        setTotalItems(data.total ?? data.items.length);
        setSelectedLog((prev) => {
          if (!prev) return null;
          return data.items.find((x) => x.id === prev.id) ? prev : null;
        });
      } else {
        setLogs([]);
        setTotalItems(0);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load audit logs');
      setLogs([]);
      setTotalItems(0);
    } finally {
      setListLoading(false);
    }
  }, [currentPage, debouncedSearch, filterLevel, filterFrom, filterTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const fetchExportHistory = useCallback(async () => {
    setExportHistoryLoading(true);
    try {
      const res = await api.get('/admin/legal-exports', {
        params: { page: exportHistoryPage, limit: 10 },
      });
      const data = res?.data?.data;
      if (data && Array.isArray(data.items)) {
        setExportHistory(data.items);
        setExportHistoryTotal(data.total ?? data.items.length);
      } else {
        setExportHistory([]);
        setExportHistoryTotal(0);
      }
    } catch {
      toast.error('Failed to load export history');
      setExportHistory([]);
    } finally {
      setExportHistoryLoading(false);
    }
  }, [exportHistoryPage]);

  useEffect(() => {
    fetchExportHistory();
  }, [fetchExportHistory]);

  const applyFilters = () => {
    setCurrentPage(1);
    fetchLogs();
  };

  const downloadLegalExport = async () => {
    const root = String(baseURL || '').replace(/\/+$/, '');
    const token = getBearer();
    const res = await fetch(`${root}/admin/legal-exports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        legalBasis,
        referenceNumber: referenceNumber.trim(),
        startDate: `${exportStart}T00:00:00.000Z`,
        endDate: `${exportEnd}T23:59:59.999Z`,
        anonymized: exportAnonymize,
      }),
    });
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        const err = await res.json();
        if (err?.message) msg = err.message;
      } catch {
        /* binary */
      }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `socius-legal-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleGenerateExport = async () => {
    if (!isComplianceChecked) {
      swalToast.error('Confirm compliance with applicable law before exporting.');
      return;
    }

    const result = await confirm({
      title: 'Generate legal export?',
      text: 'This downloads application log rows (errors and captured requests) for the selected period. Rows are capped and may be incomplete due to DB retention.',
      icon: 'warning',
      confirmButtonText: 'Download JSON',
      confirmButtonColor: 'bg-socius-red hover:bg-red-700 text-white',
    });

    if (!result.isConfirmed) return;

    setIsExporting(true);
    try {
      await downloadLegalExport();
      swalToast.success('Export downloaded');
      await fetchExportHistory();
    } catch (e) {
      swalToast.error(e?.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const logColumns = [
    { header: 'Timestamp', accessor: 'timestamp' },
    { header: 'Level', accessor: 'logType', className: 'font-medium text-gray-900 dark:text-white' },
    { header: 'Origin', accessor: 'entity' },
    { header: 'Message', accessor: 'actionSummary', className: 'text-gray-900 dark:text-white max-w-xs truncate' },
    { header: 'Request', accessor: 'referenceId', className: 'font-mono text-xs max-w-[10rem] truncate' },
  ];

  const exportColumns = [
    { header: 'Date', accessor: 'date' },
    { header: 'Requested by', accessor: 'requestedBy' },
    { header: 'Legal basis', accessor: 'legalBasis' },
    { header: 'Ref #', accessor: 'referenceNumber', className: 'font-mono text-xs' },
    { header: 'Scope', accessor: 'scope' },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.status === 'Completed'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const exportTotalPages = Math.max(1, Math.ceil(exportHistoryTotal / 10));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs &amp; Legal Exports</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
          <strong>Application logs:</strong> persisted errors and request context from the API logger (typically retained ~7
          days by MongoDB TTL). <strong>Legal export:</strong> JSON dump of those log rows for a date range you choose;
          each download is recorded below.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Log filters</h3>
          <div className="flex flex-col xl:flex-row flex-wrap gap-3 items-stretch xl:items-end">
            <div className="relative flex-1 min-w-[10rem]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">From (optional)</span>
            </div>
            <div className="relative flex-1 min-w-[10rem]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">To (optional)</span>
            </div>
            <div className="flex-1 min-w-[10rem]">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="block w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            <Button variant="secondary" className="shrink-0" onClick={applyFilters}>
              Apply filters
            </Button>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 overflow-hidden flex flex-col"
        >
          <Table
            title="Application log records"
            columns={logColumns}
            data={logs}
            isLoading={listLoading}
            onSearch={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search message, URL, method…"
            pagination={{
              currentPage,
              totalPages,
              totalItems,
              itemsPerPage: ITEMS_PER_PAGE,
            }}
            onPageChange={setCurrentPage}
            onRowClick={(log) =>
              setSelectedLog({
                ...log,
                category: log.logType,
                summary: log.actionSummary,
              })
            }
            rowClassName={(row) =>
              selectedLog?.id === row.id ? 'bg-blue-50 dark:bg-blue-900/15 border-l-4 border-blue-500' : ''
            }
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="h-fit"
        >
          <Card className="overflow-hidden h-fit p-0">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-600 text-white flex justify-between items-center">
              <h3 className="text-sm font-semibold">Log details</h3>
              <ChevronDown className="w-4 h-4 opacity-70" />
            </div>

            <AnimatePresence mode="wait">
              {selectedLog ? (
                <motion.div
                  key={selectedLog.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 space-y-3 max-h-[70vh] overflow-y-auto text-sm"
                >
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-semibold text-gray-500 dark:text-gray-400">Time</span>
                    <span className="col-span-2 text-gray-900 dark:text-white">{selectedLog.timestamp}</span>

                    <span className="font-semibold text-gray-500 dark:text-gray-400">Level</span>
                    <span className="col-span-2 text-gray-900 dark:text-white">{selectedLog.category}</span>

                    <span className="font-semibold text-gray-500 dark:text-gray-400 self-start">Message</span>
                    <div className="col-span-2 text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                      {selectedLog.details}
                    </div>

                    {selectedLog.method || selectedLog.url ? (
                      <>
                        <span className="font-semibold text-gray-500 dark:text-gray-400">HTTP</span>
                        <span className="col-span-2 font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
                          {selectedLog.method} {selectedLog.url}
                        </span>
                      </>
                    ) : null}

                    {selectedLog.userId ? (
                      <>
                        <span className="font-semibold text-gray-500 dark:text-gray-400">User</span>
                        <span className="col-span-2 font-mono text-xs">{selectedLog.userId}</span>
                      </>
                    ) : null}

                    {selectedLog.ip ? (
                      <>
                        <span className="font-semibold text-gray-500 dark:text-gray-400">IP</span>
                        <span className="col-span-2 font-mono text-xs">{selectedLog.ip}</span>
                      </>
                    ) : null}

                    {selectedLog.stack ? (
                      <>
                        <span className="font-semibold text-gray-500 dark:text-gray-400 self-start">Stack</span>
                        <pre className="col-span-2 text-[10px] bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {selectedLog.stack}
                        </pre>
                      </>
                    ) : null}

                    {selectedLog.body != null ? (
                      <>
                        <span className="font-semibold text-gray-500 dark:text-gray-400 self-start">Body</span>
                        <pre className="col-span-2 text-[10px] bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {typeof selectedLog.body === 'string'
                            ? selectedLog.body
                            : JSON.stringify(selectedLog.body, null, 2)}
                        </pre>
                      </>
                    ) : null}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                    Read-only technical log. Not a full audit of every admin button — extend logging if you need finer
                    granularity.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Select a row to view details.
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2"
        >
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileJson className="w-5 h-5 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Generate legal export (JSON)</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Legal basis</label>
                  <select
                    value={legalBasis}
                    onChange={(e) => setLegalBasis(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="internal_audit">Internal audit</option>
                    <option value="court_order">Court order / lawful demand</option>
                    <option value="law_enquiry">Law-enforcement enquiry (documented)</option>
                    <option value="other">Other (describe in reference)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reference / ticket # (optional)
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. LEG-2026-0142"
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                  <input
                    type="date"
                    value={exportStart}
                    onChange={(e) => setExportStart(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                  <input
                    type="date"
                    value={exportEnd}
                    onChange={(e) => setExportEnd(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="h-full"
        >
          <Card className="p-6 flex flex-col h-full justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export summary
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>
                  <span className="font-medium text-gray-800 dark:text-gray-200">Includes:</span> Log rows in range (max
                  2000), method, URL, message.
                </li>
                <li>
                  <span className="font-medium text-gray-800 dark:text-gray-200">Anonymize:</span> Redacts userId, IP,
                  body, stack when enabled.
                </li>
                <li>
                  <span className="font-medium text-gray-800 dark:text-gray-200">Range:</span> Up to 31 days per export.
                </li>
              </ul>
            </div>

            <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-socius-red focus:ring-socius-red"
                  checked={isComplianceChecked}
                  onChange={(e) => setIsComplianceChecked(e.target.checked)}
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  I confirm this export is authorised under applicable law and internal policy.
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-socius-red focus:ring-socius-red"
                  checked={exportAnonymize}
                  onChange={(e) => setExportAnonymize(e.target.checked)}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Anonymize sensitive fields in file</span>
              </label>
              <Button
                className="w-full bg-socius-red hover:opacity-95 text-white"
                onClick={handleGenerateExport}
                loading={isExporting}
                disabled={isExporting}
              >
                {isExporting ? 'Generating…' : 'Download export'}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Table
          title="Export history (recorded on server)"
          columns={exportColumns}
          data={exportHistory}
          isLoading={exportHistoryLoading}
          pagination={{
            currentPage: exportHistoryPage,
            totalPages: exportTotalPages,
            totalItems: exportHistoryTotal,
            itemsPerPage: 10,
          }}
          onPageChange={setExportHistoryPage}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
      >
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-red-800 dark:text-red-300">Scope limitation</h4>
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">
            These logs reflect API error-handler and logger output — not every user or admin action in the product.
            Retention is limited (typically ~7 days). For dedicated admin-action auditing, add explicit audit events in
        code.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AuditLogsPage;
