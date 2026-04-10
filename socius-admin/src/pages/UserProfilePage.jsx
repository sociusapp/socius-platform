import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Lock,
  Ban,
  RefreshCw,
  Unlock,
  CheckCircle2,
  Shield,
  Activity,
  Flag,
  Award,
  ChevronRight,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api, baseURL as sociusApiBase } from '../services/api/client';
import UserAvatar from '../components/common/UserAvatar';
import { formatDateTime } from './daily-help/dailyHelpDetailShared';

const OPEN_TO_LABELS = {
  calm_presence: 'Calm presence',
  care_support: 'Care & support',
  medical_awareness: 'Medical awareness',
  language_support: 'Language help',
  elder_assistance: 'Elder assistance',
  community_upkeep: 'Community upkeep',
};

const NOTIFICATION_PREF_LABELS = {
  calm_presence: 'Calm presence alerts',
  community_safety: 'Community safety',
  elder_support: 'Elder support',
  womens_safety: "Women's safety",
  medical_assistance: 'Medical assistance',
  language_help: 'Language help',
  blood_donation: 'Blood donation',
  general_support: 'General support',
};

const ROLE_LABELS = {
  community_member: 'Community member',
  available_to_help: 'Available to help',
  both: 'Member & helper',
};

const BADGE_LABELS = {
  closes_properly: 'Closes properly',
  returns_on_time: 'Returns on time',
  also_helps_others: 'Also helps others',
  occasional_requester: 'Occasional requester',
};

const GOV_DOC_LABELS = {
  aadhaar: 'Aadhaar',
  driving_license: 'Driving licence',
  voter_id: 'Voter ID',
  other: 'Other ID',
};

/** Admin API base is …/api; uploaded files are served from the same origin without /api. */
const uploadsOrigin = () => String(sociusApiBase || '').replace(/\/+$/, '').replace(/\/api$/i, '');

const resolvePublicFileUrl = (path) => {
  if (!path) return null;
  const s = String(path).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const rel = s.startsWith('/') ? s : `/${s}`;
  return `${uploadsOrigin()}${rel}`;
};

const isProbablyImage = (fileType, fileName, url) => {
  const t = String(fileType || '').toLowerCase();
  if (t.startsWith('image/')) return true;
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].some((x) => t.includes(x))) return true;
  const n = String(fileName || url || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|heic)$/i.test(n);
};

const VerificationAssetRow = ({ label, meta, url, fileType, fileName }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const href = resolvePublicFileUrl(url);
  if (!href) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-600 p-4 text-sm text-gray-500 dark:text-gray-400">
        {label}: not uploaded
      </div>
    );
  }
  const tryImage = isProbablyImage(fileType, fileName, url) && !imgFailed;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800/40">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">{label}</span>
        {meta ? <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{meta}</span> : null}
      </div>
      <div className="p-3">
        {tryImage ? (
          <img
            src={href}
            alt={label}
            className="max-h-72 w-full object-contain rounded-lg bg-black/5 dark:bg-black/20"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
            <FileText className="h-8 w-8 text-gray-400 shrink-0" />
            <span className="break-all">{fileName || 'Document file'}</span>
          </div>
        )}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-socius-red hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open / download
        </a>
      </div>
    </div>
  );
};

const verificationLabel = (status, isIdentityFlag) => {
  const s = String(status || '').toLowerCase();
  const map = {
    not_submitted: 'Not submitted',
    pending: 'Pending review',
    approved: 'Approved',
    failed: 'Rejected',
    review_requested: 'Resubmission requested',
  };
  if (map[s]) return map[s];
  if (isIdentityFlag) return 'Approved (flag)';
  return s || '—';
};

const statTone = (value, warnAt, dangerAt) => {
  const n = Number(value) || 0;
  if (n >= dangerAt) return 'text-red-600 dark:text-red-400';
  if (n >= warnAt) return 'text-amber-600 dark:text-amber-400';
  return 'text-gray-900 dark:text-white';
};

const UserProfilePage = () => {
  const { userId } = useParams();
  const { confirm, toast } = useAlert();
  /** useAlert() returns a new `toast` object each render; do not put it in useCallback deps or fetch runs in a loop. */
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [processingAction, setProcessingAction] = useState(null);
  const [raw, setRaw] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await api.get(`/admin/users/${userId}`);
      const { success, data, message } = response?.data || {};
      if (success && data) {
        setRaw(data);
      } else {
        setRaw(null);
        setLoadError(message || 'Invalid response from server');
        toastRef.current?.error(message || 'Could not load user profile');
      }
    } catch (e) {
      setRaw(null);
      const msg =
        e?.response?.data?.message || e?.message || 'Could not load user profile';
      setLoadError(msg);
      toastRef.current?.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const view = useMemo(() => {
    if (!raw?.user) return null;
    const { user, stats, activity, safety, verification, badges } = raw;

    let accountStatusLabel = 'Active';
    if (user.accountStatus === 'limited') accountStatusLabel = 'Limited';
    else if (user.accountStatus === 'suspended') accountStatusLabel = 'Suspended';
    else if (user.accountStatus === 'pending_review') accountStatusLabel = 'Pending review';

    const phoneDisplay = [user.countryCode || '', user.phone || ''].filter(Boolean).join(' ') || user.phone || '—';

    const openToList = (user.openTo || [])
      .map((k) => OPEN_TO_LABELS[k] || String(k).replace(/_/g, ' '))
      .filter(Boolean);
    const notifyList = (user.notificationPreferences || [])
      .map((k) => NOTIFICATION_PREF_LABELS[k] || String(k).replace(/_/g, ' '))
      .filter(Boolean);

    const roleLabel =
      user.isAvailable || user.role === 'available_to_help' || user.role === 'both'
        ? ROLE_LABELS[user.role] || 'Helper eligible'
        : ROLE_LABELS[user.role] || 'Community member';

    const displayId =
      user._id && String(user._id).length >= 6
        ? `USR-${String(user._id).slice(-6).toUpperCase()}`
        : String(user._id || '');

    const verificationStatusLabel = verificationLabel(verification?.status, user.isIdentityVerified);

    const badgeList = (badges || []).map((b) => BADGE_LABELS[b.type] || b.type);

    return {
      user,
      displayId,
      fullName: user.fullName || '—',
      phoneDisplay,
      email: user.email || null,
      roleLabel,
      accountStatusLabel,
      verificationStatusLabel,
      openToList,
      notifyList,
      stats: stats || {},
      activity: activity || {},
      safety: safety || {},
      verification,
      badgeList,
      cityArea: user.cityArea || null,
      age: user.age ?? null,
      gender: user.gender || null,
      subscriptionStatus: user.subscriptionStatus || 'none',
      limitedReason: user.accountLimitedReason || null,
      adminNotes: user.adminNotes || null,
    };
  }, [raw]);

  const handleLimitAccount = async () => {
    const result = await confirm({
      title: 'Limit account?',
      text: "Restricts the user's ability to participate. Optional reason is stored internally.",
      icon: 'warning',
      confirmButtonText: 'Limit account',
      confirmButtonColor: 'bg-red-700 hover:bg-red-800 text-white',
    });
    if (!result.isConfirmed) return;
    setProcessingAction('limit');
    try {
      await api.patch(`/admin/users/${userId}/limit`, { reason: 'Limited by admin' });
      toast.success('Account limited');
      await loadUser();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Request failed');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSuspendAccount = async () => {
    const result = await confirm({
      title: 'Suspend account?',
      text: 'The user will not be able to use the app. You can restore later.',
      icon: 'error',
      confirmButtonText: 'Suspend',
      confirmButtonColor: 'bg-red-700 hover:bg-red-800 text-white',
    });
    if (!result.isConfirmed) return;
    setProcessingAction('suspend');
    try {
      await api.patch(`/admin/users/${userId}/suspend`, { reason: 'Suspended by admin' });
      toast.success('Account suspended');
      await loadUser();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Request failed');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRestoreAccount = async () => {
    const result = await confirm({
      title: 'Restore account?',
      text: 'Sets account to active and clears limited/suspended status.',
      icon: 'question',
      confirmButtonText: 'Restore',
      confirmButtonColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    });
    if (!result.isConfirmed) return;
    setProcessingAction('restore');
    try {
      await api.patch(`/admin/users/${userId}/restore`, {});
      toast.success('Account restored');
      await loadUser();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Request failed');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReVerification = async () => {
    const result = await confirm({
      title: 'Require re-verification?',
      text: 'User must submit identity documents again.',
      icon: 'info',
      confirmButtonText: 'Request resubmission',
      confirmButtonColor: 'bg-socius-red hover:bg-red-800 text-white',
    });
    if (!result.isConfirmed) return;
    setProcessingAction('reverify');
    try {
      await api.patch(`/admin/verifications/${userId}/request-resubmission`, {});
      toast.success('Resubmission requested');
      await loadUser();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Request failed');
    } finally {
      setProcessingAction(null);
    }
  };

  if (isLoading && !view) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-64 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="space-y-4 max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User profile</h1>
        <p className="text-sm text-red-600 dark:text-red-400">
          User not found or failed to load.
        </p>
        {loadError ? (
          <p className="text-sm text-gray-600 dark:text-gray-300 font-mono break-words max-w-2xl">
            {loadError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => loadUser()}>
            Retry
          </Button>
          <Link to="/users" className="inline-flex items-center text-sm text-socius-red font-medium hover:underline">
            ← Back to users
          </Link>
        </div>
      </div>
    );
  }

  const { user } = view;
  const canRestore = user.accountStatus === 'limited' || user.accountStatus === 'suspended';
  const cancelTone = statTone(view.activity.cancellationsTotal, 3, 8);
  const reportsTone = statTone(view.safety.reportsOpen, 1, 3);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-6xl pb-10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/users" className="text-xs font-medium text-socius-red hover:underline mb-2 inline-block">
            ← Users & volunteers
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Admin view — identity and activity summaries from live API data.
          </p>
        </div>
      </div>

      {/* Hero */}
      <Card className="overflow-hidden border-gray-200 dark:border-gray-700 p-0 shadow-sm">
        <div className="bg-gradient-to-r from-gray-100/90 to-white dark:from-gray-800 dark:to-gray-900/80 border-b border-gray-200 dark:border-gray-700 px-6 py-6 sm:px-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <UserAvatar src={user.profileImage} name={view.fullName} size="xl" className="ring-4 ring-white dark:ring-gray-900 shadow-md" />
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{view.fullName}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <span className="font-medium text-gray-500 dark:text-gray-400">Phone:</span>{' '}
                  <span className="font-mono">{view.phoneDisplay}</span>
                </p>
                {view.email ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium text-gray-500 dark:text-gray-400">Email:</span> {view.email}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                  {view.roleLabel}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${
                    user.accountStatus === 'active'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                      : user.accountStatus === 'limited'
                      ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800'
                      : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900'
                  }`}
                >
                  {view.accountStatusLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                  <Shield className="h-3.5 w-3.5" />
                  {view.verificationStatusLabel}
                </span>
              </div>
              {view.badgeList.length ? (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <Award className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  {view.badgeList.map((b) => (
                    <span
                      key={b}
                      className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-900 dark:bg-amber-900/35 dark:text-amber-100"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-100 dark:border-gray-700">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">User id</div>
            <div className="mt-1 font-mono font-semibold text-gray-900 dark:text-white">{view.displayId}</div>
            <div className="mt-2 text-[11px] text-gray-500 break-all">{String(user._id)}</div>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-100 dark:border-gray-700">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Joined</div>
            <div className="mt-1 font-medium text-gray-900 dark:text-white">{formatDateTime(user.createdAt)}</div>
            <div className="text-xs text-gray-500 mt-1">Updated {formatDateTime(user.updatedAt)}</div>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-100 dark:border-gray-700">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Area & profile</div>
            <div className="mt-1 text-gray-900 dark:text-white">{view.cityArea || '—'}</div>
            <div className="text-xs text-gray-500 mt-1">
              {view.age != null ? `Age ${view.age}` : 'Age —'} · {view.gender || 'Gender —'}
            </div>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-100 dark:border-gray-700">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Subscription</div>
            <div className="mt-1 font-medium text-gray-900 dark:text-white capitalize">{view.subscriptionStatus}</div>
            <div className="text-xs text-gray-500 mt-1">Phone verified: {user.isPhoneVerified ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </Card>

      {/* Activity strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Help given (volunteer)', value: view.stats.helpGiven ?? 0, icon: Activity },
          { label: 'Presence given', value: view.stats.presenceGiven ?? 0, icon: Activity },
          { label: 'Help requests (sent)', value: view.stats.helpRequestsSent ?? 0, icon: ChevronRight },
          { label: 'Help closed normally', value: view.stats.helpRequestsClosed ?? 0, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide">
              <Icon className="h-4 w-4" />
              {label}
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 border-gray-200 dark:border-gray-700 h-full">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-socius-red" />
            Open to (declared)
          </h2>
          {view.openToList.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No capabilities declared.</p>
          ) : (
            <ul className="space-y-2">
              {view.openToList.map((cap) => (
                <li
                  key={cap}
                  className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800/40 px-3 py-2 border border-gray-100 dark:border-gray-700"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {cap}
                </li>
              ))}
            </ul>
          )}
          {view.notifyList.length > 0 ? (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Notification interests
              </h3>
              <ul className="flex flex-wrap gap-2">
                {view.notifyList.map((n) => (
                  <li
                    key={n}
                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-sky-100/90 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100"
                  >
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
            Preferences are self-declared in the mobile app.
          </p>
        </Card>

        <Card className="p-6 border-gray-200 dark:border-gray-700 h-full">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Flag className="h-5 w-5 text-socius-red" />
            Safety & activity signals
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Cancellations (help + presence)</span>
              <span className={`text-sm font-bold tabular-nums ${cancelTone}`}>{view.activity.cancellationsTotal ?? 0}</span>
            </div>
            <div className="flex justify-between items-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Presence requests (as requester)</span>
              <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                {view.activity.presenceRequestsAsRequester ?? 0}
              </span>
            </div>
            <div className="flex justify-between items-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Help requests (as requester)</span>
              <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                {view.activity.helpRequestsAsRequester ?? 0}
              </span>
            </div>
            <div className="flex justify-between items-center rounded-lg border border-red-200/80 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 px-4 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Open reports (about this user)</span>
              <span className={`text-sm font-bold tabular-nums ${reportsTone}`}>{view.safety.reportsOpen ?? 0}</span>
            </div>
            <div className="flex justify-between items-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Reports total (lifetime)</span>
              <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{view.safety.reportsTotal ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Verification uploads (from mobile) */}
      <Card className="p-6 border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <FileText className="h-5 w-5 text-socius-red shrink-0" />
          Uploaded documents
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
          Government ID and selfie from the member&apos;s verification flow. If images don&apos;t load, open the link
          in a new tab (same host as the API, without <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">/api</code>).
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <VerificationAssetRow
            label="Government ID"
            meta={
              [
                view.verification?.governmentId?.documentType
                  ? GOV_DOC_LABELS[view.verification.governmentId.documentType] ||
                    String(view.verification.governmentId.documentType).replace(/_/g, ' ')
                  : null,
                view.verification?.governmentId?.uploadedAt
                  ? formatDateTime(view.verification.governmentId.uploadedAt)
                  : null,
              ]
                .filter(Boolean)
                .join(' · ') || null
            }
            url={view.verification?.governmentId?.fileUrl}
            fileType={view.verification?.governmentId?.fileType}
            fileName={view.verification?.governmentId?.fileName}
          />
          <VerificationAssetRow
            label="Verification selfie"
            meta={
              view.verification?.selfie?.uploadedAt
                ? formatDateTime(view.verification.selfie.uploadedAt)
                : null
            }
            url={view.verification?.selfie?.fileUrl}
            fileType="image/jpeg"
            fileName={view.verification?.selfie?.fileName}
          />
        </div>

        {view.verification?.reviewRequest?.isRequested &&
        (view.verification.reviewRequest.updatedDocUrl || view.verification.reviewRequest.updatedSelfieUrl) ? (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Resubmission files</h3>
            {view.verification.reviewRequest.userExplanation ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 border border-gray-100 dark:border-gray-700">
                <span className="font-medium text-gray-500 dark:text-gray-400">Member note: </span>
                {view.verification.reviewRequest.userExplanation}
              </p>
            ) : null}
            <div className="grid md:grid-cols-2 gap-4">
              <VerificationAssetRow
                label="Updated ID"
                meta={
                  view.verification.reviewRequest.requestedAt
                    ? formatDateTime(view.verification.reviewRequest.requestedAt)
                    : null
                }
                url={view.verification.reviewRequest.updatedDocUrl}
                fileType={null}
                fileName={null}
              />
              <VerificationAssetRow
                label="Updated selfie"
                meta={
                  view.verification.reviewRequest.requestedAt
                    ? formatDateTime(view.verification.reviewRequest.requestedAt)
                    : null
                }
                url={view.verification.reviewRequest.updatedSelfieUrl}
                fileType="image/jpeg"
                fileName={null}
              />
            </div>
          </div>
        ) : null}
      </Card>

      {/* Verification detail */}
      <Card className="p-6 border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Verification status</h2>
        <div className="grid sm:grid-cols-2 gap-4 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Queue status</span>
            <p className="font-medium text-gray-900 dark:text-white">{view.verificationStatusLabel}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Last updated</span>
            <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(view.verification?.updatedAt)}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">First submitted</span>
            <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(view.verification?.submittedAt)}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Retries</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {view.verification?.retryCount ?? 0}
              {view.verification?.lastRetryAt ? ` · last ${formatDateTime(view.verification.lastRetryAt)}` : ''}
            </p>
          </div>
          {view.verification?.adminNote ? (
            <div className="sm:col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Reviewer note</span>
              <p className="text-gray-800 dark:text-gray-200 mt-1 whitespace-pre-wrap">{view.verification.adminNote}</p>
            </div>
          ) : null}
        </div>
        {view.verification?.failureReasons?.length ? (
          <div className="mt-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 px-4 py-3">
            <div className="text-xs font-semibold uppercase text-red-800 dark:text-red-200 mb-1">
              Recorded failure reasons
            </div>
            <ul className="text-sm text-red-900 dark:text-red-100 list-disc pl-5 space-y-1">
              {view.verification.failureReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {view.verification?.reviewHistory?.length ? (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Review history (latest first)
            </h3>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
              {[...view.verification.reviewHistory].reverse().map((h, i) => (
                <li key={`${h.reviewedAt}-${i}`} className="border-l-2 border-gray-200 dark:border-gray-600 pl-3">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {formatDateTime(h.reviewedAt)} · {h.action} ({h.status})
                  </span>
                  {h.adminNote ? (
                    <span className="block mt-0.5 text-gray-500 dark:text-gray-500 whitespace-pre-wrap">{h.adminNote}</span>
                  ) : null}
                  {h.failureReasons?.length ? (
                    <span className="block mt-1 text-red-700 dark:text-red-300">{h.failureReasons.join('; ')}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {(view.limitedReason || view.adminNotes) && (
        <Card className="p-6 border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Internal notes</h2>
          {view.limitedReason ? (
            <p className="text-sm text-gray-800 dark:text-gray-200">
              <span className="font-medium">Limit reason:</span> {view.limitedReason}
            </p>
          ) : null}
          {view.adminNotes ? (
            <p className="text-sm text-gray-800 dark:text-gray-200 mt-2 whitespace-pre-wrap">
              <span className="font-medium">Admin notes:</span> {view.adminNotes}
            </p>
          ) : null}
        </Card>
      )}

      <Card className="p-6 border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Administrative actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="danger"
            className="bg-red-800 hover:bg-red-900"
            onClick={handleLimitAccount}
            loading={processingAction === 'limit'}
            disabled={!!processingAction}
          >
            <Ban size={16} className="mr-2" />
            Limit account
          </Button>
          <Button
            variant="danger"
            className="bg-red-800 hover:bg-red-900"
            onClick={handleSuspendAccount}
            loading={processingAction === 'suspend'}
            disabled={!!processingAction}
          >
            <Lock size={16} className="mr-2" />
            Suspend account
          </Button>
          <Button
            variant="danger"
            className="bg-socius-red hover:bg-red-800"
            onClick={handleReVerification}
            loading={processingAction === 'reverify'}
            disabled={!!processingAction}
          >
            <RefreshCw size={16} className="mr-2" />
            Request re-verification
          </Button>
          <Button
            variant="secondary"
            className={!canRestore ? 'opacity-50 cursor-not-allowed' : ''}
            onClick={handleRestoreAccount}
            loading={processingAction === 'restore'}
            disabled={!!processingAction || !canRestore}
          >
            <Unlock size={16} className="mr-2" />
            Restore account
          </Button>
        </div>
      </Card>

      <Card className="p-6 border-none shadow-none bg-transparent px-0">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Access notice</h2>
        <div className="bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Contact details shown here are for authorized admin operations only. Chat content, live locations, and other
            session data are not loaded on this screen. Administrative actions are logged.
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default UserProfilePage;
