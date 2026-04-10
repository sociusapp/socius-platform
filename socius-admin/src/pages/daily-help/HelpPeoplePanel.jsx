import React from 'react';
import Card from '../../components/common/Card';
import UserAvatar from '../../components/common/UserAvatar';
import { formatDateTime, safeText } from './dailyHelpDetailShared';

const STATUS_LABEL = {
  pending: 'Pending',
  notified: 'Notified',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
  not_available: 'Not available',
};

const STATUS_BADGE = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  notified: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  cancelled: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  completed: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  not_available: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
};

const statusPill = (status) => {
  const s = String(status || '').toLowerCase();
  const label = STATUS_LABEL[s] || safeText(s || '—');
  const cls = STATUS_BADGE[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
};

const HelpPeoplePanel = ({ request, matches = [] }) => {
  const requester =
    request?.requesterId && typeof request.requesterId === 'object' ? request.requesterId : null;
  const rName = safeText(requester?.fullName);
  const rPhone = safeText(requester?.phone);

  return (
    <Card className="p-0 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">
        <section className="p-6 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-900/80">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-socius-red dark:text-red-400 mb-4">
            Who requested help
          </h3>
          {requester ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <UserAvatar src={requester.profileImage} name={rName} size="xl" className="shrink-0 ring-socius-red/20 dark:ring-red-900/40" />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{rName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rPhone}</p>
                {requester.accountStatus ? (
                  <p className="text-xs font-medium mt-2 text-gray-600 dark:text-gray-400">
                    Account: {safeText(requester.accountStatus)}
                  </p>
                ) : null}
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Request created {formatDateTime(request?.createdAt)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No requester linked.</p>
          )}
        </section>

        <section className="p-6 bg-white dark:bg-gray-900/50">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Helpers (matches)
            </h3>
            <span className="text-xs font-mono text-gray-400 tabular-nums">{matches.length}</span>
          </div>
          {!matches.length ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No helper matches recorded.</p>
          ) : (
            <ul className="space-y-3 max-h-[min(340px,50vh)] overflow-y-auto pr-1">
              {matches.map((m, idx) => {
                const h = m.helperId && typeof m.helperId === 'object' ? m.helperId : null;
                const hName = safeText(h?.fullName);
                const hPhone = safeText(h?.phone);
                const mid = String(m._id ?? idx);
                return (
                  <li
                    key={mid}
                    className="flex gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/40"
                  >
                    <UserAvatar src={h?.profileImage} name={hName} size="md" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{hName || 'Unknown'}</p>
                        {statusPill(m.status)}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{hPhone}</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-gray-500 dark:text-gray-500 font-mono">
                        {m.notifiedAt ? <span>Notified {formatDateTime(m.notifiedAt)}</span> : null}
                        {m.viewedAt ? <span>Viewed {formatDateTime(m.viewedAt)}</span> : null}
                        {m.acceptedAt ? <span>Accepted {formatDateTime(m.acceptedAt)}</span> : null}
                        {m.completedAt ? <span>Completed {formatDateTime(m.completedAt)}</span> : null}
                        {m.distanceMeters != null && Number.isFinite(Number(m.distanceMeters)) ? (
                          <span>{Math.round(Number(m.distanceMeters))} m (at match)</span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Card>
  );
};

export default HelpPeoplePanel;
