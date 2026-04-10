import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutTemplate, Users, MessagesSquare, ListTree, MapPin, ExternalLink } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {
  formatDateTime,
  safeText,
  extractApproxLatLng,
  StatCards,
  ActivityTimeline,
  AdminChatPanel,
} from './dailyHelpDetailShared';
import PresencePeoplePanel from './PresencePeoplePanel';
import HelpPeoplePanel from './HelpPeoplePanel';
import { resolveProfileImageUrl } from '../../components/common/UserAvatar';

const formatCategorySlugLabel = (slug) => {
  const s = String(slug || '').trim();
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const HelpCategoryOverview = ({ req }) => {
  const [imgErr, setImgErr] = useState(false);
  useEffect(() => {
    setImgErr(false);
  }, [req?._id, req?.category, req?.categoryIcon]);
  const iconUrl = resolveProfileImageUrl(req?.categoryIcon);
  const showImg = iconUrl && !imgErr;
  const title = req?.categoryName || formatCategorySlugLabel(req?.category);
  const slug = req?.category;

  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400">Category</dt>
      <dd className="mt-0.5">
        <div className="flex items-center gap-3">
          {showImg ? (
            <img
              src={iconUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-xl object-contain bg-gray-100 dark:bg-gray-800/90 border border-gray-200/90 dark:border-gray-600 p-1"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div
              className="h-11 w-11 shrink-0 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center"
              aria-hidden
            >
              <LayoutTemplate className="h-5 w-5 text-gray-400 dark:text-gray-500" strokeWidth={1.75} />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 dark:text-white leading-snug">{safeText(title)}</div>
            {req?.categoryName && slug ? (
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={slug}>
                {slug}
              </div>
            ) : null}
          </div>
        </div>
      </dd>
    </div>
  );
};

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutTemplate },
  { key: 'people', label: 'People', icon: Users },
  { key: 'messages', label: 'Messages', icon: MessagesSquare },
  { key: 'activity', label: 'Activity', icon: ListTree },
];

const HelpPresenceDetailTabs = ({ data, detailKind }) => {
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    setTab('overview');
  }, [detailKind, data?.request]);

  const req = data.request;
  const timeline = data.activityTimeline || [];
  const chatMeta = data.chatActivity;
  const timelineActivity =
    chatMeta?.sessions?.length > 0 ? timeline.filter((e) => e.kind !== 'message') : timeline;
  const coords = extractApproxLatLng(detailKind, data);
  const mapsUrl = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null;
  const summaryPairs = useMemo(() => {
    if (detailKind === 'help' && data.matchSummary) {
      return [
        { label: 'Matches', value: data.matchSummary.total },
        { label: 'Accepted', value: data.matchSummary.accepted },
        { label: 'Declined', value: data.matchSummary.declined },
        { label: 'Not avail', value: data.matchSummary.notAvailable },
        { label: 'Pending / notified', value: data.matchSummary.pendingOrNotified },
        { label: 'Viewed', value: data.matchSummary.viewedCount },
      ];
    }
    if (detailKind === 'presence' && data.responderSummary) {
      return [
        { label: 'Responders', value: data.responderSummary.total },
        { label: 'Accepted', value: data.responderSummary.accepted },
        { label: 'Declined', value: data.responderSummary.declined },
        { label: 'No response', value: data.responderSummary.notResponded },
        { label: 'Alerted', value: data.responderSummary.alerted },
        { label: 'Closed rows', value: data.responderSummary.closed },
      ];
    }
    return [];
  }, [data, detailKind]);

  const hasChat = !!(chatMeta?.sessions?.length > 0);
  const sessionCount = chatMeta?.sessions?.length || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <StatCards pairs={summaryPairs} />

      <div className="rounded-2xl border border-gray-200/90 dark:border-gray-600/80 bg-gradient-to-b from-gray-100/95 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/70 overflow-hidden shadow-sm">
        <div
          role="tablist"
          className="flex p-1 sm:p-1.5 gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:thin] border-b border-gray-200/70 dark:border-gray-700/80 bg-black/[0.02] dark:bg-black/15"
          aria-label="Request detail sections"
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
                whileHover={{ scale: active ? 1 : 1.02 }}
                onClick={() => setTab(t.key)}
                className={`group flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 min-w-[calc(50%-0.25rem)] sm:min-w-[7.5rem] ${
                  active
                    ? 'bg-socius-red text-white shadow-md shadow-red-900/15 dark:shadow-red-950/50 ring-1 ring-red-900/10 dark:ring-red-400/20 z-10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/85 dark:hover:bg-gray-700/55'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'opacity-100' : 'opacity-70'}`} strokeWidth={active ? 2.25 : 2} />
                <span className="truncate">{t.label}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="px-3 py-4 sm:px-6 sm:py-6 bg-white/75 dark:bg-gray-950/40 min-h-[280px]">
          {tab === 'overview' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
                    Request summary
                  </h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400">Status</dt>
                      <dd className="font-semibold text-gray-900 dark:text-white mt-0.5">{safeText(req?.status)}</dd>
                    </div>
                    {detailKind === 'help' ? <HelpCategoryOverview req={req} /> : null}
                    {detailKind === 'presence' ? (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400">Situation</dt>
                        <dd className="mt-0.5 text-gray-800 dark:text-gray-200">{safeText(req?.situationType)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400">Created</dt>
                      <dd className="mt-0.5 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {formatDateTime(req?.createdAt)}
                      </dd>
                    </div>
                    {sessionCount > 0 ? (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400">Chat sessions</dt>
                        <dd className="mt-0.5 text-lg font-bold tabular-nums text-gray-900 dark:text-white">{sessionCount}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {req?.description ? (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Description</div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {req.description}
                      </p>
                    </div>
                  ) : null}
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                    Requester and helpers / responders are on the <strong className="text-gray-700 dark:text-gray-300">People</strong> tab.
                    Chat is under <strong className="text-gray-700 dark:text-gray-300">Messages</strong>.
                  </p>
                </Card>

                {coords ? (
                  <Card className="p-6 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-socius-red shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Location (approx.)
                        </h3>
                        {coords.label ? (
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{safeText(coords.label)}</p>
                        ) : null}
                        <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                          {String(coords.lat)}, {String(coords.lng)}
                        </p>
                        <Button
                          variant="secondary"
                          className="text-sm w-full sm:w-auto"
                          onClick={() => mapsUrl && window.open(mapsUrl, '_blank')}
                        >
                          <span className="inline-flex items-center gap-2 justify-center">
                            Google Maps
                            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                          </span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6 border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center min-h-[180px]">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No approximate location on file.</p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {tab === 'people' && (
            <div className="animate-[fadeIn_0.2s_ease-out]">
              {detailKind === 'presence' ? (
                <PresencePeoplePanel request={req} presenceMatches={data.presenceMatches || []} />
              ) : (
                <HelpPeoplePanel request={req} matches={data.matches || []} />
              )}
            </div>
          )}

          {tab === 'messages' && (
            <div className="animate-[fadeIn_0.2s_ease-out] space-y-4">
              {hasChat ? (
                <AdminChatPanel chatActivity={chatMeta} />
              ) : (
                <Card className="p-8 border-gray-200 dark:border-gray-700 text-center">
                  <MessagesSquare className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-600 mb-3 opacity-80" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No chat sessions</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 max-w-md mx-auto">
                    When requester and helper exchange messages, the thread will appear here (read-only).
                  </p>
                </Card>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="animate-[fadeIn_0.2s_ease-out] space-y-6">
              <ActivityTimeline
                events={timelineActivity}
                chatMeta={chatMeta}
                variant="full"
                title="Activity"
                showTruncationHint={false}
              />
              <details className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Full API payload (JSON)
                </summary>
                <pre className="text-xs p-4 pt-0 overflow-auto max-h-[28rem] border-t border-gray-200 dark:border-gray-700">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0.85; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default HelpPresenceDetailTabs;
