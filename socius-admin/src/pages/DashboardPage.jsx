import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Bell,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api } from '../services/api/client';

const MetricCard = ({ title, value, subtitle, delay = 0, tone = 'neutral' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="h-full"
  >
    <Card className="flex flex-col h-full">
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{title}</h3>
        <div className="flex-1 flex items-center justify-center mt-2 mb-2">
          <span className={`text-5xl font-bold tracking-tight ${
            tone === 'danger'
              ? 'text-red-600 dark:text-red-400'
              : tone === 'success'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-800 dark:text-white'
          }`}>
            {value}
          </span>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-t border-gray-100 dark:border-gray-700 rounded-b-xl">
        <div className="text-sm text-center text-gray-500 dark:text-gray-400">
          {subtitle}
        </div>
      </div>
    </Card>
  </motion.div>
);

const KpiPill = ({ icon, label, value, tone = 'neutral' }) => (
  <div className={`rounded-xl border px-3 py-2 ${
    tone === 'danger'
      ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20'
        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60'
  }`}>
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      {icon}
      <span>{label}</span>
    </div>
    <div className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{value}</div>
  </div>
);

const FlowCard = ({ title, data, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
  >
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Flow Metrics</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <KpiPill icon={<Activity className="w-3.5 h-3.5" />} label="Active" value={data.active ?? 0} />
          <KpiPill icon={<Clock3 className="w-3.5 h-3.5" />} label="Created Today" value={data.createdToday ?? 0} />
          <KpiPill icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Resolved Today" value={data.resolvedToday ?? 0} tone="success" />
          <KpiPill icon={<Users className="w-3.5 h-3.5" />} label="Matched 24h" value={data.matchedLast24h ?? 0} />
          <KpiPill icon={<Activity className="w-3.5 h-3.5" />} label="Created 7d" value={data.createdLast7d ?? 0} />
          <KpiPill icon={<ShieldAlert className="w-3.5 h-3.5" />} label="No-helper 24h" value={data.noHelperOutcomesLast24h ?? 0} tone="danger" />
        </div>
      </div>
    </Card>
  </motion.div>
);

const GenderSegmentBar = ({ male = 0, female = 0, preferNotToSay = 0, unspecified = 0 }) => {
  const m = Number(male) || 0;
  const f = Number(female) || 0;
  const p = Number(preferNotToSay) || 0;
  const u = Number(unspecified) || 0;
  const t = m + f + p + u || 1;
  const segs = [
    { key: 'm', pct: (m / t) * 100, className: 'bg-sky-500' },
    { key: 'f', pct: (f / t) * 100, className: 'bg-pink-500' },
    { key: 'p', pct: (p / t) * 100, className: 'bg-violet-400' },
    { key: 'u', pct: (u / t) * 100, className: 'bg-gray-300 dark:bg-gray-600' },
  ];
  return (
    <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
      {segs.map((s) =>
        s.pct > 0 ? (
          <div
            key={s.key}
            className={`h-full min-w-[2px] transition-[width] duration-500 ${s.className}`}
            style={{ width: `${s.pct}%` }}
          />
        ) : null
      )}
    </div>
  );
};

/** Active community + volunteers online, gender mix from User.gender (DB-backed) */
const GenderDemographicsCard = ({ gender = {}, delay = 0 }) => {
  const c = gender.community || {};
  const v = gender.volunteersOnline || {};
  const mfKnown = c.male + c.female;
  const mfVol = v.male + v.female;
  const splitC = mfKnown ? `${gender.maleFemaleSplitCommunity ?? 0}% male · ${100 - (gender.maleFemaleSplitCommunity ?? 0)}% female` : '—';
  const splitV = mfVol ? `${gender.maleFemaleSplitVolunteersOnline ?? 0}% male · ${100 - (gender.maleFemaleSplitVolunteersOnline ?? 0)}% female` : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.34 }}
      className="lg:col-span-2"
    >
      <Card className="h-full">
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Gender snapshot</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Active community members and volunteers marked available now
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Community</div>
              <GenderSegmentBar
                male={c.male}
                female={c.female}
                preferNotToSay={c.preferNotToSay}
                unspecified={c.unspecified}
              />
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                <span><span className="inline-block w-2 h-2 rounded-full bg-sky-500 align-middle mr-1" />Male <strong className="text-gray-900 dark:text-gray-100">{c.male ?? 0}</strong></span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-pink-500 align-middle mr-1" />Female <strong className="text-gray-900 dark:text-gray-100">{c.female ?? 0}</strong></span>
                <span>Prefer not <strong className="text-gray-900 dark:text-gray-100">{c.preferNotToSay ?? 0}</strong></span>
                <span>Not set <strong className="text-gray-900 dark:text-gray-100">{c.unspecified ?? 0}</strong></span>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Among male + female only: <span className="font-medium text-gray-700 dark:text-gray-200">{splitC}</span>
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Volunteers online</div>
              <GenderSegmentBar
                male={v.male}
                female={v.female}
                preferNotToSay={v.preferNotToSay}
                unspecified={v.unspecified}
              />
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                <span><span className="inline-block w-2 h-2 rounded-full bg-sky-500 align-middle mr-1" />Male <strong className="text-gray-900 dark:text-gray-100">{v.male ?? 0}</strong></span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-pink-500 align-middle mr-1" />Female <strong className="text-gray-900 dark:text-gray-100">{v.female ?? 0}</strong></span>
                <span>Prefer not <strong className="text-gray-900 dark:text-gray-100">{v.preferNotToSay ?? 0}</strong></span>
                <span>Not set <strong className="text-gray-900 dark:text-gray-100">{v.unspecified ?? 0}</strong></span>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Among male + female only: <span className="font-medium text-gray-700 dark:text-gray-200">{splitV}</span>
              </p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const OpsDetailCard = ({ title, items = [], delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
  >
    <Card className="h-full">
      <div className="p-5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.label} className={`rounded-xl border px-3 py-2 ${item.tone || 'border-gray-200 dark:border-gray-700'}`}>
              <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
              <div className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  </motion.div>
);

const QuickLink = ({ to, title, sub }) => (
  <Link
    to={to}
    className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 hover:border-socius-red hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors"
  >
    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
    <div className="text-xs text-gray-500 dark:text-gray-400">{sub}</div>
  </Link>
);

const HELP_LINE = '#3b82f6';
const PRESENCE_LINE = '#8b5cf6';

/** Line chart: Daily Help vs Need Presence across the same flow metrics (SVG, no extra deps) */
const GroupedFlowBarChart = ({ dailyHelp = {}, presence = {} }) => {
  const rows = [
    { label: 'Created (24h)', help: dailyHelp.createdLast24h ?? 0, presence: presence.createdLast24h ?? 0 },
    { label: 'Resolved (24h)', help: dailyHelp.resolvedLast24h ?? 0, presence: presence.resolvedLast24h ?? 0 },
    { label: 'Matched (24h)', help: dailyHelp.matchedLast24h ?? 0, presence: presence.matchedLast24h ?? 0 },
    { label: 'Created (7d)', help: dailyHelp.createdLast7d ?? 0, presence: presence.createdLast7d ?? 0 },
  ];

  const W = 520;
  const H = 292;
  const padL = 44;
  const padR = 20;
  const padT = 20;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxVal = Math.max(1, ...rows.flatMap((r) => [r.help, r.presence]));
  const maxY = maxVal * 1.08;

  const xAt = (i) => padL + (i / Math.max(1, rows.length - 1)) * innerW;
  const yAt = (v) => padT + innerH * (1 - Number(v) / maxY);

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => (maxY * i) / (yTickCount - 1));

  const linePathD = (vals) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ');

  const helpD = linePathD(rows.map((r) => r.help));
  const presenceD = linePathD(rows.map((r) => r.presence));
  const baseY = padT + innerH;
  const xFirst = xAt(0);
  const xLast = xAt(rows.length - 1);
  const helpAreaD = `${helpD} L ${xLast.toFixed(1)} ${baseY} L ${xFirst.toFixed(1)} ${baseY} Z`;

  return (
    <Card className="min-h-[320px] h-full">
      <div className="p-5 h-full flex flex-col">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Flow comparison</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Daily Help — solid line with fill; Need Presence — dotted line (values at each point)
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-700 dark:text-gray-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-full bg-gradient-to-r from-blue-500/80 to-blue-500 shadow-sm shadow-blue-500/30" /> Daily Help
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="28" height="6" className="shrink-0 text-slate-400 dark:text-slate-400" aria-hidden>
              <line x1="0" y1="3" x2="28" y2="3" stroke="currentColor" strokeWidth="1.25" strokeDasharray="4 4" strokeLinecap="round" />
            </svg>
            Need Presence
          </span>
        </div>
        <div className="mt-2 w-full flex-1 min-h-[260px]">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-full text-gray-300 dark:text-gray-600"
            role="img"
            aria-label="Flow comparison line chart"
          >
            <title>Flow comparison: Daily Help and Need Presence across four metrics</title>
            <defs>
              <linearGradient id="flowHelpAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={HELP_LINE} stopOpacity="0.4" />
                <stop offset="100%" stopColor={HELP_LINE} stopOpacity="0" />
              </linearGradient>
              <filter id="flowHelpLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.65" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {yTicks.map((tv, i) => {
              const y = yAt(tv);
              return (
                <g key={`grid-${i}`}>
                  <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-gray-500 dark:fill-gray-400"
                    style={{ fontSize: 11 }}
                  >
                    {Math.round(tv)}
                  </text>
                </g>
              );
            })}
            <line
              x1={padL}
              x2={padL}
              y1={padT}
              y2={padT + innerH}
              className="stroke-gray-400 dark:stroke-gray-500"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={padL}
              x2={W - padR}
              y1={padT + innerH}
              y2={padT + innerH}
              className="stroke-gray-400 dark:stroke-gray-500"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <path d={helpAreaD} fill="url(#flowHelpAreaGrad)" />
            <path
              d={helpD}
              fill="none"
              stroke={HELP_LINE}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#flowHelpLineGlow)"
            />
            <g className="text-zinc-500 dark:text-zinc-300">
              <path
                d={presenceD}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="5 4"
                opacity={0.95}
              />
            </g>
            {rows.map((row, i) => {
              const xh = xAt(i);
              const yh = yAt(row.help);
              const yp = yAt(row.presence);
              const split = row.label.indexOf(' (');
              const xLine1 = split >= 0 ? row.label.slice(0, split) : row.label;
              const xLine2 = split >= 0 ? row.label.slice(split + 1) : '';
              const valuesClose = Math.abs(yh - yp) < 16;
              const helpLabelY = valuesClose && yh <= yp ? yh - 14 : yh - 11;
              const presLabelY = valuesClose && yh <= yp ? yp + 20 : yp + 16;
              return (
                <g key={row.label}>
                  <circle cx={xh} cy={yh} r="4" fill={HELP_LINE} className="dark:opacity-95" />
                  <circle
                    cx={xh}
                    cy={yp}
                    r="3.5"
                    fill="none"
                    stroke="currentColor"
                    className="text-zinc-500 dark:text-zinc-300"
                    strokeWidth="1.35"
                  />
                  <text x={xh} y={helpLabelY} textAnchor="middle" className="fill-blue-600 dark:fill-blue-400" style={{ fontSize: 10, fontWeight: 600 }}>
                    {row.help}
                  </text>
                  <text x={xh} y={presLabelY} textAnchor="middle" className="fill-zinc-600 dark:fill-zinc-300" style={{ fontSize: 10, fontWeight: 600 }}>
                    {row.presence}
                  </text>
                  <text x={xh} textAnchor="middle" className="fill-gray-600 dark:fill-gray-300" style={{ fontSize: 9 }}>
                    <tspan x={xh} y={H - 30}>
                      {xLine1}
                    </tspan>
                    {xLine2 ? (
                      <tspan x={xh} dy="11">
                        {xLine2}
                      </tspan>
                    ) : null}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </Card>
  );
};

/** SVG donut — share by flow (DB-backed only) */
const VolumeDonutChart = ({ dailyHelp = 0, presence = 0, title, subtitle, compact = false }) => {
  const h = Number(dailyHelp) || 0;
  const p = Number(presence) || 0;
  const total = h + p;
  const helpPct = total > 0 ? (h / total) * 100 : 0;
  const presencePct = total > 0 ? (p / total) * 100 : 0;
  const helpColor = '#3b82f6';
  const presenceColor = '#8b5cf6';
  const ring = compact ? 'w-28 h-28' : 'w-40 h-40';
  const sw = compact ? '5' : '6';

  return (
    <Card className={compact ? '' : 'min-h-[240px]'}>
      <div className={`${compact ? 'p-4' : 'p-5'} h-full flex flex-col`}>
        <h3 className={`font-semibold text-gray-900 dark:text-gray-100 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
        {subtitle ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        ) : null}
        <div className={`mt-3 flex-1 flex flex-col items-center justify-center ${compact ? 'min-h-[130px]' : 'min-h-[170px]'}`}>
          <div className={`relative ${ring} shrink-0`}>
            <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="15.915"
                fill="transparent"
                stroke="currentColor"
                strokeWidth={sw}
                className="text-gray-100 dark:text-gray-800"
              />
              {total > 0 ? (
                <>
                  <circle
                    cx="20"
                    cy="20"
                    r="15.915"
                    fill="transparent"
                    stroke={helpColor}
                    strokeWidth={sw}
                    strokeLinecap="round"
                    strokeDasharray={`${helpPct} ${100 - helpPct}`}
                    strokeDashoffset="0"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="15.915"
                    fill="transparent"
                    stroke={presenceColor}
                    strokeWidth={sw}
                    strokeLinecap="round"
                    strokeDasharray={`${presencePct} ${100 - presencePct}`}
                    strokeDashoffset={`-${helpPct}`}
                  />
                </>
              ) : (
                <circle
                  cx="20"
                  cy="20"
                  r="15.915"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth={sw}
                  strokeDasharray="1 99"
                  className="text-gray-300 dark:text-gray-600"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`font-bold text-gray-900 dark:text-gray-100 ${compact ? 'text-lg' : 'text-2xl'}`}>{total}</span>
              <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">total</span>
            </div>
          </div>
          <div className={`mt-3 grid grid-cols-2 gap-2 w-full ${compact ? 'max-w-[220px]' : 'max-w-xs'}`}>
            <div className="text-center rounded-lg border border-gray-200 dark:border-gray-700 py-1.5 px-2">
              <div className="text-[10px] text-gray-500 dark:text-gray-400">Daily Help</div>
              <div className={`font-bold text-blue-500 ${compact ? 'text-xs' : 'text-sm'}`}>
                {h}
                <span className="text-gray-500 font-normal text-xs ml-1">{total ? `${Math.round(helpPct)}%` : '—'}</span>
              </div>
            </div>
            <div className="text-center rounded-lg border border-gray-200 dark:border-gray-700 py-1.5 px-2">
              <div className="text-[10px] text-gray-500 dark:text-gray-400">Need Presence</div>
              <div className={`font-bold text-violet-500 ${compact ? 'text-xs' : 'text-sm'}`}>
                {p}
                <span className="text-gray-500 font-normal text-xs ml-1">{total ? `${Math.round(presencePct)}%` : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const DashboardPage = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    activeAwarenessRequests: 0,
    activeHelpRequests: 0,
    activeRequestsNow: 0,
    resolvedToday: 0,
    createdToday: 0,
    volunteersAvailableNow: 0,
    totalCommunityMembers: 0,
    totalVolunteers: 0,
    pendingVerifications: 0,
    reviewRequestedVerifications: 0,
    safetyFlags: 0,
    reportsToday: 0,
    unresolvedReportsToday: 0,
    limitedAccounts: 0,
    suspendedAccounts: 0,
    performance: {
      matchedRateLast24h: 0,
      resolutionRateToday: 0,
      resolutionRateLast24h: 0,
      resolutionRateLast7d: 0,
      noHelperRateLast24h: 0,
    },
    flows: {
      dailyHelp: {},
      presence: {},
    },
    gender: {
      community: { male: 0, female: 0, preferNotToSay: 0, unspecified: 0 },
      volunteersOnline: { male: 0, female: 0, preferNotToSay: 0, unspecified: 0 },
      maleFemaleSplitCommunity: 0,
      maleFemaleSplitVolunteersOnline: 0,
    },
  });

  const performanceRows = useMemo(() => ([
    { label: 'Match rate (24h)', value: `${stats.performance?.matchedRateLast24h ?? 0}%` },
    { label: 'Resolution rate (today)', value: `${stats.performance?.resolutionRateToday ?? 0}%` },
    { label: 'Resolution rate (24h)', value: `${stats.performance?.resolutionRateLast24h ?? 0}%` },
    { label: 'Resolution rate (7d)', value: `${stats.performance?.resolutionRateLast7d ?? 0}%` },
    { label: 'No-helper rate (24h)', value: `${stats.performance?.noHelperRateLast24h ?? 0}%` },
  ]), [stats.performance]);

  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      const response = await api.get('/admin/dashboard');
      const { success, data } = response?.data || {};
      if (success && data) {
        setStats((prev) => ({
          ...prev,
          ...data,
          performance: { ...prev.performance, ...(data.performance || {}) },
          flows: {
            dailyHelp: { ...(prev.flows?.dailyHelp || {}), ...(data.flows?.dailyHelp || {}) },
            presence: { ...(prev.flows?.presence || {}), ...(data.flows?.presence || {}) },
          },
          gender: data.gender
            ? {
                ...prev.gender,
                ...data.gender,
                community: { ...(prev.gender?.community || {}), ...(data.gender.community || {}) },
                volunteersOnline: { ...(prev.gender?.volunteersOnline || {}), ...(data.gender.volunteersOnline || {}) },
              }
            : prev.gender,
        }));
      }
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Operations Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Unified visibility across Daily Help and Need Presence flows.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchStats}
          loading={isRefreshing}
          disabled={isRefreshing}
          icon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Total Active Requests" value={stats.activeRequestsNow} subtitle="Daily Help + Need Presence currently active" delay={0.05} />
        <MetricCard title="Resolved Today" value={stats.resolvedToday} subtitle={`Out of ${stats.createdToday} created today`} delay={0.1} tone="success" />
        <MetricCard title="Pending Verifications" value={stats.pendingVerifications} subtitle={`${stats.reviewRequestedVerifications} requested re-submissions`} delay={0.15} />
        <MetricCard title="Safety Flags" value={stats.safetyFlags} subtitle={`${stats.unresolvedReportsToday} unresolved reported today`} delay={0.2} tone="danger" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FlowCard title="Daily Help Flow" data={stats.flows?.dailyHelp || {}} delay={0.25} />
          <FlowCard title="Need Presence Flow" data={stats.flows?.presence || {}} delay={0.3} />
          <GenderDemographicsCard gender={stats.gender} delay={0.32} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
        >
          <Card className="h-full">
            <div className="p-5 h-full flex flex-col">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Performance Overview</h3>
              <div className="mt-4 space-y-2">
                {performanceRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800/60">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{row.label}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <KpiPill icon={<Users className="w-3.5 h-3.5" />} label="Volunteers online" value={stats.volunteersAvailableNow} />
                <KpiPill icon={<Users className="w-3.5 h-3.5" />} label="Total volunteers" value={stats.totalVolunteers} />
                <KpiPill icon={<Users className="w-3.5 h-3.5" />} label="Community members" value={stats.totalCommunityMembers} />
                <KpiPill icon={<ShieldAlert className="w-3.5 h-3.5" />} label="Limited + suspended" value={`${stats.limitedAccounts} + ${stats.suspendedAccounts}`} tone="danger" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <OpsDetailCard
          title="Community & Volunteer Snapshot"
          delay={0.36}
          items={[
            { label: 'Volunteers online', value: stats.volunteersAvailableNow ?? 0 },
            { label: 'Total volunteers', value: stats.totalVolunteers ?? 0 },
            { label: 'Community members', value: stats.totalCommunityMembers ?? 0 },
            { label: 'Pending verification', value: stats.pendingVerifications ?? 0 },
            { label: 'Review requested', value: stats.reviewRequestedVerifications ?? 0 },
            { label: 'Suspended accounts', value: stats.suspendedAccounts ?? 0, tone: 'border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10' },
          ]}
        />
        <OpsDetailCard
          title="Safety & Resolution Snapshot"
          delay={0.37}
          items={[
            { label: 'Safety flags open', value: stats.safetyFlags ?? 0, tone: 'border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10' },
            { label: 'Reports today', value: stats.reportsToday ?? 0 },
            { label: 'Unresolved today', value: stats.unresolvedReportsToday ?? 0, tone: 'border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10' },
            { label: 'Matched rate (24h)', value: `${stats.performance?.matchedRateLast24h ?? 0}%`, tone: 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/10' },
            { label: 'Resolution rate (24h)', value: `${stats.performance?.resolutionRateLast24h ?? 0}%`, tone: 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/10' },
            { label: 'No-helper rate (24h)', value: `${stats.performance?.noHelperRateLast24h ?? 0}%`, tone: 'border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-900/10' },
          ]}
        />
      </div>

      {/* Important visuals only: one comparison chart + one donut */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.35 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-4"
      >
        <div className="xl:col-span-2 min-h-[300px]">
          <GroupedFlowBarChart
            dailyHelp={stats.flows?.dailyHelp || {}}
            presence={stats.flows?.presence || {}}
          />
        </div>
        <div className="xl:col-span-1 min-h-[300px]">
          <VolumeDonutChart
            dailyHelp={stats.flows?.dailyHelp?.createdLast24h ?? 0}
            presence={stats.flows?.presence?.createdLast24h ?? 0}
            title="New requests (24h)"
            subtitle="Donut: share by flow"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.46, duration: 0.35 }}
      >
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-socius-red" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <QuickLink to="/live-awareness" title="Need Presence — Live" sub="Monitor active presence sessions" />
              <QuickLink to="/daily-help" title="Request queues" sub="Help vs Need Presence — closures & attempts on the same page" />
              <QuickLink to="/verification" title="Verification Queue" sub="Review pending identities quickly" />
              <QuickLink to="/reports" title="Reports & Exports" sub="Handle safety flags and reports" />
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="text-center pt-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          This dashboard provides operational visibility only. User actions remain voluntary and independent.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
