import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fetchFormData } from '../services/api/client';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import Card from '../components/common/Card';
import UserAvatar from '../components/common/UserAvatar';
import { toast } from 'react-hot-toast';

const ITEMS_PER_PAGE = 20;

const CAMPAIGN_TYPES = [
  {
    value: 'notice',
    label: 'General notice',
    desc: 'Service updates, downtime, policy reminders.',
    group: 'Notice & safety',
  },
  {
    value: 'safety_reminder',
    label: 'Safety reminder',
    desc: 'Important safety copy — uses updates channel (not an emergency alarm).',
    group: 'Notice & safety',
  },
  {
    value: 'community',
    label: 'Community',
    desc: 'Events, surveys, local asks.',
    group: 'Community & product',
  },
  {
    value: 'product',
    label: 'Product',
    desc: 'Features, tips, how-tos.',
    group: 'Community & product',
  },
  {
    value: 'marketing',
    label: 'Marketing',
    desc: 'Softer tray — Android “nudge” channel.',
    group: 'Marketing',
  },
  {
    value: 'promo',
    label: 'Promo',
    desc: 'Same delivery as marketing.',
    group: 'Marketing',
  },
  {
    value: 'volunteer_recruitment',
    label: 'Volunteer call-out',
    desc: 'Ask people to turn on availability.',
    group: 'Volunteers',
  },
];

const DEEP_LINKS = [
  { value: '', label: 'Default (open app)' },
  { value: 'home', label: 'Home' },
  { value: 'daily_help', label: 'Daily Help' },
  { value: 'need_presence', label: 'Need presence' },
  { value: 'verification', label: 'Verification' },
  { value: 'profile', label: 'Profile' },
];

const groupOrder = ['Notice & safety', 'Community & product', 'Marketing', 'Volunteers'];

const NotificationCenterPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [listSearch, setListSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [listAvailability, setListAvailability] = useState('');
  const [listAccountStatus, setListAccountStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [campaignType, setCampaignType] = useState('notice');
  const [imageUrl, setImageUrl] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [priority, setPriority] = useState('normal');

  const [recipientMode, setRecipientMode] = useState('pick');
  const [audienceSegment, setAudienceSegment] = useState('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState('active');
  const [identityVerifiedOnly, setIdentityVerifiedOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deviceCounts, setDeviceCounts] = useState({});

  const campaignMeta = useMemo(
    () => CAMPAIGN_TYPES.find((c) => c.value === campaignType) || CAMPAIGN_TYPES[0],
    [campaignType]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(listSearch.trim()), 350);
    return () => clearTimeout(t);
  }, [listSearch]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch || undefined,
      };
      if (listAvailability) params.availability = listAvailability;
      if (listAccountStatus) params.accountStatus = listAccountStatus;

      const response = await api.get('/admin/users', { params });
      const { success, data } = response?.data || {};
      if (success && data && Array.isArray(data.items)) {
        const mapped = data.items.map((u) => ({
          id: String(u._id),
          name: u.fullName || '-',
          phone: u.phone || '-',
          profileImage: u.profileImage || null,
          role: u.isAvailable ? 'Volunteer' : 'User',
          accountStatus: u.accountStatus || '-',
          verificationStatus: u.verificationStatus || 'not_submitted',
        }));
        setUsers(mapped);
        setTotalItems(data.total || mapped.length);

        const ids = mapped.map((u) => u.id).join(',');
        if (ids) {
          try {
            const dc = await api.get('/admin/device-tokens', { params: { userIds: ids } });
            const list = dc?.data?.data || [];
            const map = {};
            list.forEach((d) => {
              map[String(d.userId)] = Number(d.count) || 0;
            });
            setDeviceCounts(map);
          } catch {
            setDeviceCounts({});
          }
        } else {
          setDeviceCounts({});
        }
      } else {
        setUsers([]);
        setTotalItems(0);
        setDeviceCounts({});
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, listAvailability, listAccountStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onTableSearch = (value) => {
    setListSearch(value);
    setPage(1);
    setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const imagePreviewOk = useMemo(() => {
    const u = imageUrl.trim();
    if (!u) return false;
    try {
      const x = new URL(u);
      if (x.protocol === 'https:') return true;
      const host = (x.hostname || '').toLowerCase();
      const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2';
      if (isLocal && x.protocol === 'http:' && x.pathname.startsWith('/uploads/notification-campaigns/')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [imageUrl]);

  const handleNotificationImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const json = await fetchFormData('POST', '/admin/notifications/upload-image', fd);
      const payload = json?.data;
      if (json?.success && payload?.imageUrl) {
        setImageUrl(payload.imageUrl);
        const ttl = payload.ttlDays ?? 7;
        toast.success(`Image uploaded — removed automatically after about ${ttl} days.`);
      } else {
        toast.error(json?.message || 'Upload failed');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSend = async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      toast.error('Title and message are required');
      return;
    }

    if (imageUrl.trim() && !imagePreviewOk) {
      toast.error('Image must be https:// or an uploaded campaign image from this panel.');
      return;
    }

    if (recipientMode === 'pick' && selectedIds.length === 0) {
      toast.error('Select at least one user, or switch to “Segment broadcast”.');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        title: trimmedTitle,
        body: trimmedBody,
        priority,
        campaignType,
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
        ...(deepLink ? { deepLink } : {}),
      };

      if (recipientMode === 'pick') {
        payload.userIds = selectedIds;
      } else {
        payload.audienceSegment = audienceSegment;
        payload.accountStatusFilter = accountStatusFilter;
        payload.identityVerifiedOnly = identityVerifiedOnly;
      }

      const response = await api.post('/admin/notifications', payload);
      const { success, message, data } = response?.data || {};
      if (success) {
        const successCount = data?.successCount ?? 0;
        const tokensFound = data?.tokensFound ?? 0;
        const targetedUserCount = data?.targetedUserCount ?? 0;

        if (tokensFound === 0) {
          toast.error('No active devices for this audience');
          return;
        }
        if (successCount === 0) {
          toast.error(
            `Failed (0/${tokensFound}). ${data?.errorCode || ''} ${data?.errorMessage || ''}`.trim()
          );
          return;
        }

        toast.success(
          `Delivered: ${successCount}/${tokensFound} devices · ~${targetedUserCount} users · ${data?.campaignType || campaignType}`
        );
        setTitle('');
        setBody('');
        setImageUrl('');
      } else {
        toast.error(message || 'Notification could not be sent.');
      }
    } catch (err) {
      const backendMsg =
        err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || '';
      toast.error(backendMsg || err?.message || 'Request failed');
    } finally {
      setIsSending(false);
    }
  };

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={users.length > 0 && selectedIds.length === users.length}
          onChange={toggleSelectAll}
          aria-label="Select all on page"
        />
      ),
      accessor: 'select',
      className: 'w-10 text-center',
      render: (user) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(user.id)}
          onChange={() => toggleSelect(user.id)}
          aria-label={`Select ${user.name}`}
        />
      ),
    },
    {
      header: 'Name',
      accessor: 'name',
      className: 'min-w-0',
      render: (user) => (
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar src={user.profileImage} name={user.name} size="sm" shape="rounded" className="shrink-0" />
          <span className="truncate font-medium text-gray-900 dark:text-white" title={user.name}>
            {user.name}
          </span>
        </div>
      ),
    },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Role', accessor: 'role' },
    {
      header: 'Devices',
      accessor: 'devices',
      className: 'text-center',
      render: (user) => {
        const n = deviceCounts[user.id] ?? 0;
        if (n > 0) {
          return (
            <span className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {n}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
            0
          </span>
        );
      },
    },
    { header: 'Account', accessor: 'accountStatus' },
    { header: 'Verification', accessor: 'verificationStatus' },
  ];

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const campaignGroups = useMemo(() => {
    const byGroup = {};
    CAMPAIGN_TYPES.forEach((c) => {
      if (!byGroup[c.group]) byGroup[c.group] = [];
      byGroup[c.group].push(c);
    });
    return groupOrder.map((g) => ({ label: g, items: byGroup[g] || [] })).filter((x) => x.items.length);
  }, []);

  return (
    <div className="flex flex-col pb-10 max-w-[1600px] mx-auto w-full">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">
            Send notification
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
            FCM to Android (rich image + type). Pick recipients or broadcast a segment — composer stays on the
            right on large screens.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/users')} className="shrink-0 self-start">
          Users directory
        </Button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Audience — wider column */}
        <div className="xl:col-span-7 space-y-4 order-2 xl:order-1">
          <Card className="p-4 sm:p-6 border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/40 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Audience</h2>
              <div
                className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 p-0.5 bg-gray-50 dark:bg-gray-800/80"
                role="radiogroup"
                aria-label="Recipient mode"
              >
                <button
                  type="button"
                  onClick={() => setRecipientMode('pick')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    recipientMode === 'pick'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Table selection
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('broadcast')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    recipientMode === 'broadcast'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Segment broadcast
                </button>
              </div>
            </div>

            {recipientMode === 'broadcast' && (
              <div className="mb-5 p-4 rounded-xl bg-amber-950/10 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Segment
                    </label>
                    <select
                      value={audienceSegment}
                      onChange={(e) => setAudienceSegment(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white p-2"
                    >
                      <option value="all">All members</option>
                      <option value="volunteers">Volunteers only</option>
                      <option value="community">Not on duty</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Accounts
                    </label>
                    <select
                      value={accountStatusFilter}
                      onChange={(e) => setAccountStatusFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white p-2"
                    >
                      <option value="active">Active only</option>
                      <option value="all">All non-deleted</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={identityVerifiedOnly}
                        onChange={(e) => setIdentityVerifiedOnly(e.target.checked)}
                        className="rounded border-gray-400"
                      />
                      ID-verified only
                    </label>
                  </div>
                </div>
                <p className="mt-3 text-xs text-amber-800/90 dark:text-amber-200/80">
                  Sends to everyone matching rules — not limited to users visible in the table below.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mb-4">
              <div className="min-w-[10rem] flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  List: role
                </label>
                <select
                  value={listAvailability}
                  onChange={(e) => {
                    setListAvailability(e.target.value);
                    setPage(1);
                    setSelectedIds([]);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm p-2 text-gray-900 dark:text-white"
                >
                  <option value="">Everyone</option>
                  <option value="volunteer">Volunteers</option>
                  <option value="community">Not on duty</option>
                </select>
              </div>
              <div className="min-w-[10rem] flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  List: account
                </label>
                <select
                  value={listAccountStatus}
                  onChange={(e) => {
                    setListAccountStatus(e.target.value);
                    setPage(1);
                    setSelectedIds([]);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm p-2 text-gray-900 dark:text-white"
                >
                  <option value="">Any status</option>
                  <option value="active">Active</option>
                  <option value="limited">Limited</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending_review">Pending review</option>
                </select>
              </div>
            </div>

            <Table
              columns={columns}
              data={users}
              isLoading={isLoading}
              onSearch={onTableSearch}
              searchPlaceholder="Search name or phone…"
              pagination={{
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: ITEMS_PER_PAGE,
              }}
              onPageChange={setPage}
            />

            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/80 pt-3">
              {recipientMode === 'pick' ? (
                <>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{selectedIds.length}</span> selected
                  (persists across pages; search clears selection).
                </>
              ) : (
                <>Segment mode: row checkboxes are not used when sending.</>
              )}
            </p>
          </Card>
        </div>

        {/* Composer — sticky on xl */}
        <div className="xl:col-span-5 order-1 xl:order-2 xl:sticky xl:top-6 space-y-4">
          <Card className="border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/40 backdrop-blur-sm overflow-hidden flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-700/90 bg-gray-50/80 dark:bg-gray-800/50">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Message &amp; delivery</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Compose first, then confirm audience on the left.
              </p>
            </div>

            <div className="p-4 sm:p-6 flex flex-col gap-5">
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Content
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-800 dark:text-white p-2.5 border"
                    placeholder="Short headline"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message
                  </label>
                  <textarea
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-800 dark:text-white p-2.5 border resize-y min-h-[5rem]"
                    placeholder="Body text — no emergency instructions."
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  FCM type &amp; behaviour
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Campaign type
                  </label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm p-2.5 text-gray-900 dark:text-white"
                  >
                    {campaignGroups.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.items.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-snug">{campaignMeta.desc}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm p-2.5 text-gray-900 dark:text-white"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Deep link
                    </label>
                    <select
                      value={deepLink}
                      onChange={(e) => setDeepLink(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm p-2.5 text-gray-900 dark:text-white"
                    >
                      {DEEP_LINKS.map((d) => (
                        <option key={d.value || 'default'} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Image (optional)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                  Upload a JPG/PNG/WebP (max 2MB). Files are removed after several days so storage stays
                  small — or paste any public <span className="font-mono">https://</span> image URL.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={imageUploading}
                      onChange={handleNotificationImageUpload}
                    />
                    <span
                      className={`inline-flex justify-center rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer transition ${
                        imageUploading
                          ? 'border-gray-200 text-gray-400 dark:border-gray-700 cursor-not-allowed'
                          : 'border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                      }`}
                    >
                      {imageUploading ? 'Uploading…' : 'Upload image'}
                    </span>
                  </label>
                  {imageUrl.trim().startsWith('http') && imagePreviewOk && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-xs text-gray-500 hover:text-socius-red dark:text-gray-400 dark:hover:text-red-400"
                    >
                      Clear image
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-800 dark:text-white p-2.5 border"
                  placeholder="https://… (public HTTPS) or use upload above"
                />
                {imageUrl.trim() && !imagePreviewOk && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Use a secure https:// URL, or upload so the link is generated for you.
                  </p>
                )}
              </section>

              {(title.trim() || body.trim()) && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-3 bg-gray-950 text-gray-100">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Preview</p>
                  <div className="rounded-lg bg-gray-900 px-3 py-2.5 flex gap-3">
                    {imagePreviewOk ? (
                      <img
                        src={imageUrl.trim()}
                        alt=""
                        className="h-12 w-12 rounded-md object-cover shrink-0 bg-gray-800"
                        onError={(e) => {
                          e.target.style.visibility = 'hidden';
                        }}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full border border-gray-600 shrink-0 flex items-center justify-center text-[10px] text-gray-400">
                        S
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-gray-500">
                        Socius · {campaignType}
                      </div>
                      <div className="text-sm font-semibold truncate">{title.trim() || 'Title'}</div>
                      {body.trim() && (
                        <div className="text-xs text-gray-400 line-clamp-3 mt-0.5">{body.trim()}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-1 border-t border-gray-100 dark:border-gray-700/90">
                <Button
                  variant="primary"
                  onClick={handleSend}
                  loading={isSending}
                  disabled={isSending}
                  className="w-full justify-center"
                >
                  Send FCM notification
                </Button>
                <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Informational / engagement only.{' '}
                  <code className="rounded bg-gray-200 dark:bg-gray-800 px-1">POST /api/admin/notifications</code>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenterPage;
