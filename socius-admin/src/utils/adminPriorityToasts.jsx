import React from 'react';
import toast from 'react-hot-toast';
import { X, ShieldAlert, UserCheck, Bug } from 'lucide-react';

const SESSION_KEY = 'socius-admin-combined-priority-alert';

/** Clear so next session can show alerts again (call on logout). */
export function clearAdminPriorityToastSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * One themed toast (top-right via global Toaster) when there is important backlog.
 * Shows at most once while any problem exists; clearing all counts resets for next wave.
 */
export function syncAdminPriorityToast(snapshot, { navigate, theme, isDeveloper, isAdmin }) {
  const dark = theme === 'dark';
  const bg = dark ? 'bg-gray-900' : 'bg-white';
  const border = dark ? 'border-gray-700' : 'border-gray-200';
  const text = dark ? 'text-gray-100' : 'text-gray-900';
  const sub = dark ? 'text-gray-400' : 'text-gray-600';
  const mutedLine = dark ? 'border-gray-700/80' : 'border-gray-100';

  const verificationTotal =
    Number(snapshot.pendingVerification || 0) + Number(snapshot.reviewRequested || 0);

  const rows = [];
  if (!isDeveloper && Number(snapshot.openReports || 0) > 0) {
    rows.push({
      key: 'reports',
      to: '/reports',
      icon: ShieldAlert,
      label: 'Open safety reports',
      count: Number(snapshot.openReports),
      accent: 'text-red-600 dark:text-red-400',
      pill: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200',
    });
  }
  if (!isDeveloper && isAdmin && verificationTotal > 0) {
    rows.push({
      key: 'verification',
      to: '/verification',
      icon: UserCheck,
      label: 'Verification queue',
      count: verificationTotal,
      accent: 'text-amber-700 dark:text-amber-300',
      pill: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100',
    });
  }
  if (Number(snapshot.openIssues || 0) > 0) {
    rows.push({
      key: 'issues',
      to: '/issue-tracker',
      icon: Bug,
      label: 'Issue tracker (open)',
      count: Number(snapshot.openIssues),
      accent: 'text-sky-700 dark:text-sky-300',
      pill: 'bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
    });
  }

  const hasAny = rows.length > 0;

  try {
    if (!hasAny) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    if (!hasAny) return;
  }

  toast.custom(
    (t) => (
      <div
        className={`pointer-events-auto w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border shadow-2xl ${border} ${bg}`}
        role="alert"
      >
        <div
          className={`flex items-start justify-between gap-2 border-b px-4 py-3 ${mutedLine} ${
            dark ? 'bg-gray-800/80' : 'bg-gradient-to-r from-red-50 to-amber-50'
          }`}
        >
          <div>
            <p className={`text-sm font-semibold ${text}`}>Needs attention</p>
            <p className={`text-xs mt-0.5 ${sub}`}>Important admin backlog — tap to open</p>
          </div>
          <button
            type="button"
            data-no-ui-click-sound
            className={`rounded-lg p-1.5 transition ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-black/5 text-gray-500'}`}
            aria-label="Dismiss"
            onClick={() => toast.dismiss(t.id)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className={`divide-y ${mutedLine}`}>
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <li key={row.key}>
                <button
                  type="button"
                  data-no-ui-click-sound
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    dark ? 'hover:bg-gray-800/90' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    navigate(row.to);
                    toast.dismiss(t.id);
                  }}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${row.pill}`}>
                    <Icon className={`h-4 w-4 ${row.accent}`} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-medium ${text}`}>{row.label}</span>
                    <span className={`text-xs ${sub}`}>Open in admin</span>
                  </span>
                  <span className={`tabular-nums text-lg font-bold ${row.accent}`}>{row.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ),
    {
      duration: 12000,
      id: 'admin-priority-alert',
    }
  );
}
