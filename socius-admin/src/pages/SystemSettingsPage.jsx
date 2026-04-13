import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Shield,
  MapPin,
  Clock,
  KeyRound,
  Scale,
  Users,
  Server,
  ArrowRight,
  BookOpen,
  Bell,
  Volume2,
  Minus,
  Plus,
} from 'lucide-react';
import Card from '../components/common/Card';
import { api } from '../services/api/client';
import {
  ADMIN_UI_CLICK_VOLUME_MAX,
  ADMIN_UI_CLICK_VOLUME_MIN,
  ADMIN_UI_CLICK_VOLUME_STEP,
  getAdminUiClickSoundVolume,
  isAdminUiClickSoundEnabled,
  playAdminUiClickSound,
  setAdminUiClickSoundEnabled,
  stepAdminUiClickSoundBy,
} from '../utils/adminUiClickSound';

const fmtMinutes = (m) => {
  const n = Number(m);
  if (!Number.isFinite(n)) return '—';
  if (n >= 60 && n % 60 === 0) return `${n / 60} hr`;
  return `${n} min`;
};

const Stat = ({ label, value, hint }) => (
  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-4 py-3">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white tabular-nums">{value}</p>
    {hint ? <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
  </div>
);

const Shortcut = ({ to, title, desc, icon: Icon }) => (
  <Link
    to={to}
    className="group flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-4 transition hover:border-socius-red/60 hover:bg-red-50/30 dark:hover:bg-red-950/20"
  >
    <div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-2 text-gray-600 dark:text-gray-300 group-hover:bg-socius-red/10 group-hover:text-socius-red">
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1 font-medium text-gray-900 dark:text-white">
        {title}
        <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100 text-socius-red shrink-0" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
    </div>
  </Link>
);

const SystemSettingsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uiClickSound, setUiClickSound] = useState(() => isAdminUiClickSoundEnabled());
  const [uiClickVolume, setUiClickVolume] = useState(() => getAdminUiClickSoundVolume());

  useEffect(() => {
    const sync = () => {
      setUiClickSound(isAdminUiClickSoundEnabled());
      setUiClickVolume(getAdminUiClickSoundVolume());
    };
    window.addEventListener('admin-ui-click-sound-prefs-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('admin-ui-click-sound-prefs-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/admin/system-safeguards');
        const payload = res?.data?.data;
        if (!cancelled && payload) setData(payload);
        else if (!cancelled) toast.error('Invalid response from server');
      } catch (e) {
        if (!cancelled) toast.error(e?.response?.data?.message || 'Failed to load system snapshot');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const op = data?.operational;
  const env = data?.environment;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col max-w-6xl mx-auto pb-12"
    >
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings &amp; Safeguards</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400 max-w-3xl">
          Live values from this deployment: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">constants.js</code>{' '}
          and non-secret environment hints. Use the shortcuts to edit content and policies that have their own admin
          screens.
        </p>
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-lg px-3 py-2 inline-block">
          Operational numbers are read-only here. To change them, update{' '}
          <span className="font-mono">socius-backend/src/utils/constants.js</span> or env and redeploy.
        </p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.02 }}
        className="mb-8"
      >
        <Card className="overflow-hidden p-0">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-socius-red" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Admin panel</h2>
          </div>
          <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white">UI click sound</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
                Short feedback when you use buttons, sidebar links, and menus. Volume {Math.round(ADMIN_UI_CLICK_VOLUME_MIN * 100)}–
                {Math.round(ADMIN_UI_CLICK_VOLUME_MAX * 100)}% in steps of {Math.round(ADMIN_UI_CLICK_VOLUME_STEP * 100)}%. Stored only in
                this browser.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 p-1">
                <button
                  type="button"
                  data-no-ui-click-sound
                  disabled={uiClickVolume <= ADMIN_UI_CLICK_VOLUME_MIN}
                  onClick={() => {
                    const prev = getAdminUiClickSoundVolume();
                    const next = stepAdminUiClickSoundBy(-1);
                    if (next === prev) return;
                    setUiClickVolume(next);
                    if (uiClickSound) playAdminUiClickSound();
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-socius-red"
                  aria-label="Decrease click sound volume"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2.75rem] text-center text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                  {Math.round(uiClickVolume * 100)}%
                </span>
                <button
                  type="button"
                  data-no-ui-click-sound
                  disabled={uiClickVolume >= ADMIN_UI_CLICK_VOLUME_MAX}
                  onClick={() => {
                    const prev = getAdminUiClickSoundVolume();
                    const next = stepAdminUiClickSoundBy(1);
                    if (next === prev) return;
                    setUiClickVolume(next);
                    if (uiClickSound) playAdminUiClickSound();
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-socius-red"
                  aria-label="Increase click sound volume"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                  {uiClickSound ? 'On' : 'Off'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={uiClickSound}
                  data-no-ui-click-sound
                  onClick={() => {
                    const next = !uiClickSound;
                    setUiClickSound(next);
                    setAdminUiClickSoundEnabled(next);
                    if (next) playAdminUiClickSound();
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-socius-red focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                    uiClickSound ? 'bg-socius-red' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span className="sr-only">Toggle UI click sound</span>
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${
                      uiClickSound ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </Card>
      </motion.section>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 py-12 text-center">Loading snapshot…</p>
      ) : !data ? (
        <p className="text-red-600 dark:text-red-400 py-12 text-center">Could not load system snapshot.</p>
      ) : (
        <div className="space-y-8">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden p-0">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center gap-2">
                <Shield className="w-5 h-5 text-socius-red" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Product principles</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data.productPrinciples || []).map((p, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-100 dark:border-gray-700/80 p-4 bg-gray-50/50 dark:bg-gray-900/20"
                  >
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{p.title}</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{p.body}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Operational parameters
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Geo &amp; matching</span>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Stat label="Default radius" value={`${op?.geo?.defaultRadiusMeters ?? '—'} m`} hint="Daily Help nearby" />
                  <Stat label="Presence alert radius" value={`${op?.geo?.presenceRadiusMeters ?? '—'} m`} />
                  <Stat label="Max radius" value={`${op?.geo?.maxRadiusMeters ?? '—'} m`} hint="Upper cap" />
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Auto-close &amp; retention</span>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Stat
                    label="Help request (open/matching)"
                    value={fmtMinutes(op?.autoClose?.helpRequestMinutes)}
                    hint="Before match"
                  />
                  <Stat
                    label="After helper accepts"
                    value={fmtMinutes(op?.autoClose?.helpMatchedExtensionMinutes)}
                    hint="Extension window"
                  />
                  <Stat label="Presence request idle" value={fmtMinutes(op?.autoClose?.presenceRequestMinutes)} />
                  <Stat label="Chat cleanup" value={`${op?.autoClose?.chatDeleteAfterHours ?? '—'} hr`} hint="After session close" />
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Need presence helpers</span>
                </div>
                <div className="p-5 grid grid-cols-3 gap-3">
                  <Stat label="Min" value={op?.presenceHelpers?.min ?? '—'} />
                  <Stat label="Max" value={op?.presenceHelpers?.max ?? '—'} />
                  <Stat label="Default target" value={op?.presenceHelpers?.default ?? '—'} />
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                  <Scale className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Community balance nudges</span>
                </div>
                <div className="p-5 grid grid-cols-2 gap-3">
                  <Stat label="Threshold (delta)" value={op?.communityBalance?.nudgeThreshold ?? '—'} hint="helps sent − given" />
                  <Stat label="Cooldown" value={`${op?.communityBalance?.nudgeCooldownDays ?? '—'} days`} />
                </div>
              </Card>

              <Card className="p-0 overflow-hidden lg:col-span-2">
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                  <KeyRound className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">OTP (phone login)</span>
                </div>
                <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Expiry" value={`${op?.otp?.expiryMinutes ?? '—'} min`} />
                  <Stat label="Length" value={op?.otp?.length ?? '—'} />
                  <Stat label="Max attempts" value={op?.otp?.maxAttempts ?? '—'} />
                  <Stat label="Resend after" value={`${op?.otp?.resendAfterSeconds ?? '—'} sec`} />
                </div>
              </Card>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Environment (non-secret)
            </h2>
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                <Server className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-white">Deployment hints</span>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="NODE_ENV" value={env?.nodeEnv ?? '—'} />
                <Stat
                  label="PUBLIC_ORIGIN / SOCIUS_PUBLIC_ORIGIN"
                  value={env?.publicOriginConfigured ? 'Set' : 'Not set'}
                  hint="FCM image URLs, absolute links"
                />
                <Stat
                  label="UPLOADS_ROOT"
                  value={env?.uploadsRootConfigured ? 'Set' : 'Default path'}
                />
                <Stat
                  label="Notification image TTL"
                  value={`${env?.notificationCampaignImageTtlDays ?? '—'} days`}
                  hint="Admin campaign uploads"
                />
              </div>
            </Card>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Where to configure related policies
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Shortcut to="/risk-tiers" title="Risk tiers & safeguards" desc="Governance rules surfaced in their own flow." icon={Shield} />
              <Shortcut to="/notifications" title="FCM broadcasts" desc="Admin campaigns, deep links, images." icon={Bell} />
              <Shortcut to="/prepare-cards" title="Prepare cards & Learn more" desc="Preparedness copy and learn-more chips." icon={BookOpen} />
              <Shortcut to="/presence-catalog" title="Situations catalog" desc="Need Presence tiles and copy." icon={MapPin} />
              <Shortcut to="/subscriptions" title="Subscription plans" desc="Pricing and feature flags per plan." icon={Users} />
              <Shortcut to="/verification" title="Verification queue" desc="Identity review and appeals queue." icon={KeyRound} />
              <Shortcut to="/audit-logs" title="Audit logs" desc="Administrative actions trail." icon={Clock} />
            </div>
          </motion.section>
        </div>
      )}
    </motion.div>
  );
};

export default SystemSettingsPage;
