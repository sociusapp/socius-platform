import React from 'react';
import Card from '../../components/common/Card';
import UserAvatar from '../../components/common/UserAvatar';
import { formatDateTime, safeText } from './dailyHelpDetailShared';

const STATUS_LABEL = {
  alerted: 'Alerted',
  accepted: 'Accepted',
  en_route: 'En route',
  arrived: 'Arrived',
  closed: 'Closed',
  declined: 'Declined',
  not_responded: 'No response',
};

const STATUS_BADGE = {
  alerted: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  en_route: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
  arrived: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  closed: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  not_responded: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
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

const PresencePeoplePanel = ({ request, presenceMatches = [] }) => {
  const requester =
    request?.requesterId && typeof request.requesterId === 'object' ? request.requesterId : null;
  const rName = safeText(requester?.fullName);
  const rPhone = safeText(requester?.phone);
  const rStatus = safeText(requester?.accountStatus);

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
                <div className="flex flex-wrap gap-2 mt-3">
                  {rStatus && rStatus !== '-' ? (
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      Account: {rStatus}
                    </span>
                  ) : null}
                  {requester.isIdentityVerified ? (
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/35 text-emerald-800 dark:text-emerald-200">
                      ID verified
                    </span>
                  ) : null}
                </div>
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
              Responders (joined / notified)
            </h3>
            <span className="text-xs font-mono text-gray-400 tabular-nums">{presenceMatches.length}</span>
          </div>
          {!presenceMatches.length ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No responder rows yet.</p>
          ) : (
            <ul className="space-y-3 max-h-[min(340px,50vh)] overflow-y-auto pr-1">
              {presenceMatches.map((m, idx) => {
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
                      {h?.accountStatus ? (
                        <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">Account: {safeText(h.accountStatus)}</p>
                      ) : null}
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-gray-500 dark:text-gray-500 font-mono">
                        {m.alertedAt ? <span>Alerted {formatDateTime(m.alertedAt)}</span> : null}
                        {m.acceptedAt ? <span>Accepted {formatDateTime(m.acceptedAt)}</span> : null}
                        {m.arrivedAt ? <span>Arrived {formatDateTime(m.arrivedAt)}</span> : null}
                        {m.closedAt ? <span>Closed {formatDateTime(m.closedAt)}</span> : null}
                        {m.distanceMeters != null && Number.isFinite(Number(m.distanceMeters)) ? (
                          <span>{Math.round(Number(m.distanceMeters))} m away (at alert)</span>
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

export default PresencePeoplePanel;
