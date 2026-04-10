import React, { useEffect, useMemo, useState } from 'react';
import { Shield, AlertTriangle, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import { api } from '../services/api/client';

const RiskTiersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [riskTierPayload, setRiskTierPayload] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/admin/system-safeguards');
        const payload = res?.data?.data?.riskTierPage;
        if (!cancelled) {
          if (payload) setRiskTierPayload(payload);
          else toast.error('Risk tier snapshot missing from server');
        }
      } catch (e) {
        if (!cancelled) toast.error(e?.response?.data?.message || 'Failed to load risk tier data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const riskTierData = useMemo(() => {
    const rows = riskTierPayload?.comparisonRows;
    if (!Array.isArray(rows)) return [];
    return rows.map((row, i) => ({
      id: i + 1,
      feature: row.feature,
      low: row.low,
      medium: row.medium,
      high: row.high,
    }));
  }, [riskTierPayload]);

  const columns = [
    {
      header: 'Feature / rule',
      accessor: 'feature',
      className: 'font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50',
      headerClassName: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    },
    {
      header: 'Low risk (deployed)',
      accessor: 'low',
      headerClassName: 'bg-emerald-600 text-white border-r border-emerald-700',
      className: 'text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700',
    },
    {
      header: 'Medium risk (deployed)',
      accessor: 'medium',
      headerClassName: 'bg-amber-400 text-gray-900 border-r border-amber-500',
      className: 'text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700',
    },
    {
      header: 'High risk (deployed)',
      accessor: 'high',
      headerClassName: 'bg-red-700 text-white',
      className: 'text-gray-700 dark:text-gray-300',
    },
  ];

  const filteredData = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return riskTierData;
    return riskTierData.filter(
      (item) =>
        item.feature.toLowerCase().includes(q) ||
        item.low.toLowerCase().includes(q) ||
        item.medium.toLowerCase().includes(q) ||
        item.high.toLowerCase().includes(q)
    );
  }, [searchTerm, riskTierData]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const safeguards = riskTierPayload?.nonNegotiableSafeguards;
  const legalFraming = riskTierPayload?.legalFraming;
  const changeControl = riskTierPayload?.changeControl;

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Risk Tier Rules &amp; System Safeguards</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400 italic">
          Live limits from this deployment&apos;s constants. Columns match for every tier — see note below.
        </p>
      </div>

      {riskTierPayload?.enforcementExplanation ? (
        <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/90 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-900 dark:text-blue-100/90">
          {riskTierPayload.enforcementExplanation}
        </div>
      ) : null}

      <Card className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">What risk tiers are</h2>
        <div className="bg-gray-100 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600 p-4">
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            We classify situations for calmer UX and alarms, not for separate numeric enforcement in this backend.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Values in the table are the real caps and timers your users hit today — repeated in each column because the
            server applies one policy to all.
          </p>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300 list-disc list-inside">
            <li>
              <span className="font-semibold">Tier labels are internal / product</span>
            </li>
            <li>End users are not shown &quot;low / medium / high risk&quot; badges as enforcement states</li>
            <li>Admins cannot override per-incident numeric limits from the dashboard</li>
          </ul>
        </div>
      </Card>

      <div className="mb-8">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400 py-8 text-center">Loading deployment snapshot…</p>
        ) : !riskTierPayload ? (
          <p className="text-red-600 dark:text-red-400 py-8 text-center">Could not load risk tier snapshot.</p>
        ) : (
          <Table
            title="Deployment limits (constants)"
            data={paginatedData}
            columns={columns}
            onSearch={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search rules..."
            pagination={{
              currentPage,
              totalPages: Math.max(1, Math.ceil(filteredData.length / itemsPerPage)),
              totalItems: filteredData.length,
              itemsPerPage,
            }}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="h-full p-0 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Non-negotiable safeguards</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {(Array.isArray(safeguards) ? safeguards : []).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 bg-gray-200 dark:bg-gray-600 rounded p-0.5">
                      <CheckSquare className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-500 italic">Product rules; always verify against latest counsel.</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-50 dark:bg-gray-800/30 p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Legal framing</h3>
            {(Array.isArray(legalFraming) ? legalFraming : []).map((para, i) => (
              <p key={i} className="text-sm text-gray-700 dark:text-gray-300 mb-2 last:mb-0">
                {para}
              </p>
            ))}
          </Card>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-4"
          >
            <AlertTriangle className="w-6 h-6 text-red-700 dark:text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-800 dark:text-red-300 mb-1">
                {changeControl?.title || 'Change control'}
              </h3>
              {(Array.isArray(changeControl?.lines) ? changeControl.lines : []).map((line, i) => (
                <p key={i} className="text-sm text-gray-800 dark:text-gray-200 italic mb-1 last:mb-0">
                  {line}
                </p>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {riskTierPayload?.footerNote ? (
        <div className="mt-12 text-center border-t border-gray-200 dark:border-gray-700 pt-6 space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">{riskTierPayload.footerNote}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Reference only — not a substitute for policy docs.</p>
        </div>
      ) : (
        <div className="mt-12 text-center border-t border-gray-200 dark:border-gray-700 pt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">This screen is for reference only.</p>
        </div>
      )}
    </div>
  );
};

export default RiskTiersPage;
