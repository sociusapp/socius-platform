import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api } from '../services/api/client';
import { formatDateTime, safeText, extractApproxLatLng } from './daily-help/dailyHelpDetailShared';
import HelpPresenceDetailTabs from './daily-help/HelpPresenceDetailTabs';

const DETAIL_TITLE = {
  help: 'Help request',
  presence: 'Presence request',
  closure: 'Closure',
};

const DailyHelpRequestDetailPage = () => {
  const { kind, id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const detailKind = ['help', 'presence', 'closure'].includes(kind) ? kind : null;

  const listPath =
    detailKind === 'presence' ? '/daily-help?tab=presence' : detailKind === 'closure' ? '/daily-help?tab=closures' : '/daily-help';
  const listLabel =
    detailKind === 'presence' ? 'Presence queue' : detailKind === 'closure' ? 'Closures' : 'Help requests';

  const load = useCallback(async () => {
    if (!detailKind || !id) return;
    setLoading(true);
    setData(null);
    try {
      if (detailKind === 'help') {
        const res = await api.get(`/admin/help-requests/${encodeURIComponent(id)}`);
        const body = res?.data;
        if (body?.success) setData(body.data);
        else toast.error(body?.message || 'Failed to load help request');
      } else if (detailKind === 'presence') {
        const res = await api.get(`/admin/presence-requests/${encodeURIComponent(id)}`);
        const body = res?.data;
        if (body?.success) setData(body.data);
        else toast.error(body?.message || 'Failed to load presence request');
      } else if (detailKind === 'closure') {
        const res = await api.get(`/admin/closures/${encodeURIComponent(id)}`);
        const body = res?.data;
        if (body?.success) setData(body.data);
        else toast.error(body?.message || 'Failed to load closure');
      }
    } catch {
      toast.error('Network error while loading details');
    } finally {
      setLoading(false);
    }
  }, [detailKind, id]);

  useEffect(() => {
    if (!detailKind) {
      navigate('/daily-help', { replace: true });
      return;
    }
    load();
  }, [detailKind, load, navigate]);

  const pageTitle = DETAIL_TITLE[detailKind] || 'Request';

  const mainContent = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-4 max-w-6xl mx-auto px-4 py-8">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse w-2/3" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      );
    }

    if (!data) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-12 text-center text-gray-500 dark:text-gray-400">
          No details available.
        </div>
      );
    }

    if (detailKind === 'closure') {
      const c = data;
      const coords = extractApproxLatLng('closure', data);
      const mapsUrl = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null;
      return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <Card className="p-6 space-y-4 border-gray-200 dark:border-gray-700">
            <div>
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Status</span>
              <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{safeText(c.status)}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <span className="font-semibold text-gray-500 dark:text-gray-400">Created</span>
                <div>{formatDateTime(c.createdAt)}</div>
              </div>
              <div>
                <span className="font-semibold text-gray-500 dark:text-gray-400">Closed</span>
                <div>{formatDateTime(c.closedAt)}</div>
              </div>
            </div>
            {c.requesterId && typeof c.requesterId === 'object' ? (
              <div className="text-sm">
                <span className="font-semibold text-gray-500 dark:text-gray-400">Requester</span>
                <div>
                  {safeText(c.requesterId.fullName)} · {safeText(c.requesterId.phone)}
                </div>
              </div>
            ) : null}
            {c.helperId && typeof c.helperId === 'object' ? (
              <div className="text-sm">
                <span className="font-semibold text-gray-500 dark:text-gray-400">Helper</span>
                <div>
                  {safeText(c.helperId.fullName)} · {safeText(c.helperId.phone)}
                </div>
              </div>
            ) : null}
            {c.requestId && typeof c.requestId === 'object' ? (
              <div className="text-sm border-t border-gray-100 dark:border-gray-800 pt-4">
                <span className="font-semibold text-gray-500 dark:text-gray-400">Linked request</span>
                <div className="mt-1">
                  {safeText(c.requestId.category)} — {safeText(c.requestId.status)} ·{' '}
                  {formatDateTime(c.requestId.createdAt)}
                </div>
                {c.requestId.description ? (
                  <div className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{c.requestId.description}</div>
                ) : null}
              </div>
            ) : null}
          </Card>
          {coords ? (
            <Card className="p-6 border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-socius-red shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location (approx.)
                  </div>
                  {coords.label ? (
                    <div className="text-sm text-gray-800 dark:text-gray-200">{safeText(coords.label)}</div>
                  ) : null}
                  <div className="text-sm font-mono text-gray-600 dark:text-gray-300">
                    {String(coords.lat)}, {String(coords.lng)}
                  </div>
                  <Button variant="secondary" className="text-sm" onClick={() => mapsUrl && window.open(mapsUrl, '_blank')}>
                    <span className="inline-flex items-center gap-2">
                      Open in Google Maps
                      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                    </span>
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}
          <details className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Full JSON payload
            </summary>
            <pre className="text-xs p-4 pt-0 overflow-auto max-h-96 border-t border-gray-200 dark:border-gray-700">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      );
    }

    return <HelpPresenceDetailTabs data={data} detailKind={detailKind} />;
  }, [data, detailKind, loading]);

  if (!detailKind) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-16 bg-gradient-to-b from-gray-50/90 to-white dark:from-gray-950 dark:to-gray-900 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8">
      <div className="border-b border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link
              to={listPath}
              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
              aria-label={`Back to ${listLabel}`}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                <Link to={listPath} className="hover:text-socius-red">
                  {listLabel}
                </Link>
                <span className="mx-1.5 opacity-50">/</span>
                <span className="text-gray-400">Details</span>
              </p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
                {pageTitle}
              </h1>
              <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1 truncate">{safeText(id)}</p>
            </div>
          </div>
          <Button variant="secondary" className="shrink-0 self-start sm:self-center" onClick={() => navigate(listPath)}>
            Back to queue
          </Button>
        </div>
      </div>

      {mainContent}
    </div>
  );
};

export default DailyHelpRequestDetailPage;
