import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import { AlertTriangle, CheckCircle, Shield, Image as ImageIcon, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAlert } from '../hooks/useAlert';
import { api, baseURL } from '../services/api/client';

const ITEMS_PER_PAGE = 8;

const FAILURE_REASON_OPTIONS = [
  { value: '', label: 'Select reason (required for reject / resubmit)' },
  { value: 'image_unclear', label: 'Image blurry or unclear' },
  { value: 'information_mismatch', label: 'Name or information mismatch' },
  { value: 'missing_required_detail', label: 'Missing or invalid document' },
  { value: 'selfie_invalid', label: 'Selfie invalid' },
  { value: 'document_not_visible', label: 'Document not visible' },
  { value: 'other', label: 'Other' },
];

const mapFailureLabels = (reasons) => {
  if (!Array.isArray(reasons) || reasons.length === 0) return '-';
  const labels = {
    image_unclear: 'Image unclear',
    document_not_visible: 'Document not visible',
    information_mismatch: 'Information mismatch',
    missing_required_detail: 'Missing required detail',
    selfie_invalid: 'Selfie invalid',
    other: 'Other',
  };
  return reasons.map((r) => labels[r] || r).join(', ');
};

const mapActionLabel = (action) => {
  if (action === 'approved') return 'Approved';
  if (action === 'rejected') return 'Rejected';
  if (action === 'submitted') return 'Submitted';
  if (action === 'resubmitted') return 'Resubmitted';
  return action || '-';
};

const buildAssetUrl = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string') return null;
  const value = rawPath.trim();
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const normalized = value.replace(/\\/g, '/');
  const uploadsIdx = normalized.indexOf('/uploads/');
  const uploadsNoSlashIdx = normalized.indexOf('uploads/');
  let assetPath = normalized;
  if (uploadsIdx !== -1) assetPath = normalized.slice(uploadsIdx);
  else if (uploadsNoSlashIdx !== -1) assetPath = `/${normalized.slice(uploadsNoSlashIdx)}`;
  if (!assetPath.startsWith('/')) assetPath = `/${assetPath}`;
  const root = String(baseURL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
  return `${root}${assetPath}`;
};

const extractFilePath = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.fileUrl || value.url || value.path || null;
};

const maskPhone = (phone) => {
  const s = String(phone || '').replace(/\s/g, '');
  if (s.length < 4) return s || '—';
  return `${'·'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
};

const DocThumb = ({ url, label }) => {
  const [broken, setBroken] = useState(false);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block w-28 shrink-0 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-700 hover:opacity-90"
    >
      <div className="aspect-[4/3] flex items-center justify-center bg-gray-200 dark:bg-gray-600">
        {broken ? (
          <ImageIcon className="w-8 h-8 text-gray-400" />
        ) : (
          <img
            src={url}
            alt={label}
            className="max-h-full max-w-full object-contain"
            onError={() => setBroken(true)}
          />
        )}
      </div>
      <div className="text-[10px] text-center py-1 px-1 text-gray-600 dark:text-gray-300">{label}</div>
    </a>
  );
};

const mapQueueItemToRow = (item) => {
  if (!item) return null;
  const rawUser = item.userId;
  const user = rawUser && typeof rawUser === 'object' && !Array.isArray(rawUser) ? rawUser : {};
  const userId = user._id || (typeof rawUser === 'string' ? rawUser : null);
  if (!userId) return null;

  const vStatus = item.status;
  let caseType = 'Verification submitted';
  if (vStatus === 'review_requested') caseType = 'Manual review request';
  else if (vStatus === 'not_submitted') caseType = 'Account pending review (no documents)';
  else if (Number(item.retryCount) > 0) caseType = `Re-verification · retry #${item.retryCount}`;

  let uiStatus = 'Pending review';
  if (vStatus === 'not_submitted') uiStatus = 'Awaiting documents';

  const submittedAt =
    item.submittedAt || item.reviewRequest?.requestedAt || item.lastRetryAt || item.createdAt;
  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const accountStatus = user.accountStatus || '—';

  return {
    userId: String(userId),
    id: String(userId),
    displayId: `···${String(userId).slice(-6)}`,
    accountType: user.isAvailable ? 'Volunteer' : 'User',
    caseType,
    reason: caseType,
    status: uiStatus,
    currentStatus: accountStatus,
    submitted: submittedLabel,
    name: user.fullName || '—',
    phone: user.phone || '—',
    rawVerificationStatus: vStatus,
  };
};

const AppealsPage = () => {
  const navigate = useNavigate();
  const { confirm, toast: swalToast } = useAlert();

  const [listLoading, setListLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const [decision, setDecision] = useState('approve');
  const [rejectReason, setRejectReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [policyOk, setPolicyOk] = useState(true);
  const [processingAction, setProcessingAction] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const response = await api.get('/admin/verifications', {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          status: 'pending',
          order: sortOrder,
          search: debouncedSearch || undefined,
        },
      });
      const { success, data } = response?.data || {};
      if (success && data && Array.isArray(data.items)) {
        const mapped = data.items.map(mapQueueItemToRow).filter(Boolean);
        setRows(mapped);
        setTotalItems(data.total ?? mapped.length);
      } else {
        setRows([]);
        setTotalItems(0);
      }
    } catch {
      toast.error('Failed to load appeals queue');
      setRows([]);
      setTotalItems(0);
    } finally {
      setListLoading(false);
    }
  }, [currentPage, debouncedSearch, sortOrder]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const idsOnPage = useMemo(() => new Set(rows.map((r) => r.userId)), [rows]);

  useEffect(() => {
    if (!rows.length) {
      if (selectedUserId) setSelectedUserId(null);
      return;
    }
    if (!selectedUserId || !idsOnPage.has(selectedUserId)) {
      setSelectedUserId(rows[0].userId);
    }
  }, [rows, selectedUserId, idsOnPage]);

  const loadDetail = useCallback(async () => {
    if (!selectedUserId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const response = await api.get(`/admin/verifications/${selectedUserId}`);
      const { success, data } = response?.data || {};
      if (!success || !data) {
        setDetail(null);
        return;
      }
      const user = data.userId || {};
      const rr = data.reviewRequest;
      const history = Array.isArray(data.reviewHistory) ? data.reviewHistory : [];

      const timeline = history.map((entry, index) => ({
        id: String(entry._id || index),
        label: mapActionLabel(entry.action),
        at: entry.reviewedAt
          ? new Date(entry.reviewedAt).toLocaleString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—',
        note: entry.adminNote || null,
      }));

      if (rr?.isRequested && rr.requestedAt) {
        timeline.push({
          id: 'review-req',
          label: 'User requested manual review',
          at: new Date(rr.requestedAt).toLocaleString(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          note: rr.userExplanation || null,
        });
      }

      const materials = [];
      const gov = buildAssetUrl(extractFilePath(data.governmentId));
      const selfie = buildAssetUrl(extractFilePath(data.selfie));
      if (gov) materials.push({ url: gov, label: 'Government ID' });
      if (selfie) materials.push({ url: selfie, label: 'Selfie' });
      const upDoc = buildAssetUrl(rr?.updatedDocUrl);
      const upSelfie = buildAssetUrl(rr?.updatedSelfieUrl);
      if (upDoc) materials.push({ url: upDoc, label: 'Updated document' });
      if (upSelfie) materials.push({ url: upSelfie, label: 'Updated selfie' });

      let caseType = 'Verification submitted';
      if (data.status === 'review_requested') caseType = 'Manual review request';
      else if (data.status === 'not_submitted') caseType = 'Account pending review';
      else if (Number(data.retryCount) > 0) caseType = `Re-verification · retry #${data.retryCount}`;

      setDetail({
        userId: String(user._id || selectedUserId),
        name: user.fullName || '—',
        phone: user.phone || '—',
        phoneMasked: maskPhone(user.phone),
        accountStatus: user.accountStatus || '—',
        caseType,
        rawStatus: data.status,
        explanation: rr?.userExplanation || null,
        failureReasonsText: mapFailureLabels(data.failureReasons),
        retryCount: data.retryCount || 0,
        submittedAt: data.submittedAt
          ? new Date(data.submittedAt).toLocaleString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : null,
        reviewRequestStatus: rr?.status || null,
        materials,
        timeline: [...timeline].reverse(),
        adminNoteExisting: data.adminNote || null,
      });
    } catch (err) {
      if (err?.response?.status === 404) setDetail(null);
      else toast.error('Failed to load case details');
    } finally {
      setDetailLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const selectedRow = useMemo(
    () => rows.find((r) => r.userId === selectedUserId) || null,
    [rows, selectedUserId]
  );

  const canActOnVerification =
    detail?.rawStatus && !(detail.rawStatus === 'not_submitted');

  const runDecision = async () => {
    if (!detail?.userId) return;
    if (!policyOk) {
      swalToast.error('Confirm that the decision follows Socius policy');
      return;
    }

    if (decision === 'approve') {
      const result = await confirm({
        title: 'Approve verification?',
        text: 'User will be marked identity-verified and account set to active where applicable.',
        icon: 'question',
        confirmButtonText: 'Approve',
        confirmButtonColor: 'bg-green-700 hover:bg-green-800 text-white',
      });
      if (!result.isConfirmed) return;
      if (!canActOnVerification) {
        swalToast.error('No documents to approve — use full verification review for override.');
        return;
      }
      try {
        setProcessingAction('approve');
        await api.patch(`/admin/verifications/${detail.userId}/approve`);
        swalToast.success('Verification approved');
        await fetchList();
        await loadDetail();
      } catch (e) {
        swalToast.error(e?.response?.data?.message || 'Approve failed');
      } finally {
        setProcessingAction(null);
      }
      return;
    }

    let reasonToSend = rejectReason;
    const noteTrimmed = adminNote.trim();
    if (!reasonToSend && noteTrimmed) reasonToSend = 'other';
    if (!reasonToSend) {
      swalToast.error('Pick a failure reason (or add a note and use Other)');
      return;
    }

    if (decision === 'reject') {
      const result = await confirm({
        title: 'Reject verification?',
        text: 'User will see the rejection and must resubmit or appeal again.',
        icon: 'warning',
        confirmButtonText: 'Reject',
        confirmButtonColor: 'bg-red-600 hover:bg-red-700 text-white',
      });
      if (!result.isConfirmed) return;
      if (!canActOnVerification) {
        swalToast.error('Nothing to reject — user has not submitted verification yet.');
        return;
      }
      try {
        setProcessingAction('reject');
        await api.patch(`/admin/verifications/${detail.userId}/reject`, {
          failureReasons: [reasonToSend],
          adminNote: noteTrimmed || undefined,
        });
        swalToast.success('Verification rejected');
        setRejectReason('');
        setAdminNote('');
        await fetchList();
        await loadDetail();
      } catch (e) {
        swalToast.error(e?.response?.data?.message || 'Reject failed');
      } finally {
        setProcessingAction(null);
      }
      return;
    }

    if (decision === 'resubmit') {
      const result = await confirm({
        title: 'Request resubmission?',
        text: 'User will be asked to upload new documents with your notes.',
        icon: 'question',
        confirmButtonText: 'Request resubmission',
        confirmButtonColor: 'bg-amber-600 hover:bg-amber-700 text-white',
      });
      if (!result.isConfirmed) return;
      if (!canActOnVerification) {
        swalToast.error('Use full review flow for users without a submitted packet.');
        return;
      }
      try {
        setProcessingAction('resubmit');
        await api.patch(`/admin/verifications/${detail.userId}/request-resubmission`, {
          failureReasons: [reasonToSend],
          adminNote: noteTrimmed || undefined,
        });
        swalToast.success('Resubmission requested');
        setRejectReason('');
        setAdminNote('');
        await fetchList();
        await loadDetail();
      } catch (e) {
        swalToast.error(e?.response?.data?.message || 'Request failed');
      } finally {
        setProcessingAction(null);
      }
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Awaiting documents') {
      return (
        <span className="px-3 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-100 dark:bg-amber-900/25 dark:text-amber-200 dark:border-amber-900/40">
          Awaiting documents
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/50">
        Pending review
      </span>
    );
  };

  const columns = [
    {
      header: 'User',
      accessor: 'name',
      className: 'font-medium text-gray-900 dark:text-white',
      render: (row) => (
        <div>
          <div>{row.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{row.displayId}</div>
        </div>
      ),
    },
    { header: 'Case', accessor: 'caseType', className: 'max-w-[10rem] sm:max-w-none' },
    { header: 'Account', accessor: 'currentStatus' },
    {
      header: 'Queue status',
      accessor: 'status',
      render: (row) => getStatusBadge(row.status),
    },
    { header: 'Activity', accessor: 'submitted', className: 'text-right whitespace-nowrap' },
  ];

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border-b border-gray-200 dark:border-gray-700 pb-4"
      >
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Appeals &amp; Re-verification Review
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
          Same queue as verification: manual review requests, retries after rejection, and accounts
          pending review. Actions match the verification API (approve, reject, request resubmission).
        </p>
      </motion.div>

      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 h-auto lg:h-[calc(100vh-180px)] min-h-[600px]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 h-full flex flex-col"
        >
          <Table
            title="Queue"
            columns={columns}
            data={rows}
            isLoading={listLoading}
            onSearch={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search name, phone, or user id…"
            pagination={{
              currentPage,
              totalPages,
              totalItems,
              itemsPerPage: ITEMS_PER_PAGE,
            }}
            onPageChange={setCurrentPage}
            onRowClick={(row) => setSelectedUserId(row.userId)}
            rowClassName={(row) =>
              selectedUserId === row.userId ? 'bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500' : ''
            }
            actions={
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 ml-2 whitespace-nowrap">
                <span className="font-medium hidden sm:inline">Sort:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent border border-gray-200 dark:border-gray-600 rounded-md text-sm px-2 py-1 dark:bg-gray-800"
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </label>
            }
          />

          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Outcome timeline (selected case)
            </h3>
            {!selectedRow || detailLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : !detail?.timeline?.length ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No history entries yet.</p>
            ) : (
              <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 max-h-40 overflow-y-auto">
                {detail.timeline.map((item) => (
                  <li key={item.id} className="flex gap-2 border-b border-gray-100 dark:border-gray-700/80 pb-2 last:border-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-socius-red shrink-0 mt-1.5" />
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white">{item.label}</div>
                      <div className="text-gray-500 dark:text-gray-400">{item.at}</div>
                      {item.note ? (
                        <div className="text-gray-600 dark:text-gray-300 mt-1 italic">&ldquo;{item.note}&rdquo;</div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>

        <div
          className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pb-6"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          <AnimatePresence mode="wait">
            {selectedUserId && selectedRow ? (
              <motion.div
                key={selectedUserId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Card className="flex flex-col h-full p-0 overflow-hidden">
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start gap-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Case summary</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedRow.caseType}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/verification/${selectedUserId}`)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-socius-red hover:underline shrink-0"
                      >
                        Full review <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">User</h3>
                      {detailLoading || !detail ? (
                        <p className="text-sm text-gray-500">Loading…</p>
                      ) : (
                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Name</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{detail.name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Phone</span>
                            <span className="font-mono text-gray-900 dark:text-white">{detail.phoneMasked}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-gray-500 dark:text-gray-400">User ID</span>
                            <span className="font-mono text-xs break-all text-gray-900 dark:text-white">
                              {detail.userId}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Account status</span>
                            <span className="font-medium text-gray-900 dark:text-white">{detail.accountStatus}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Retries</span>
                            <span className="text-gray-900 dark:text-white">{detail.retryCount}</span>
                          </div>
                          {detail.failureReasonsText !== '-' ? (
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500 dark:text-gray-400">Last rejection</span>
                              <span className="text-amber-700 dark:text-amber-300 text-xs">{detail.failureReasonsText}</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">User message</h3>
                      {detailLoading || !detail ? (
                        <p className="text-sm text-gray-500">Loading…</p>
                      ) : detail.explanation ? (
                        <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-sm text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                          {detail.explanation}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No written explanation submitted.</p>
                      )}
                      {detail?.submittedAt ? (
                        <p className="text-xs text-gray-400 mt-2">Last submission: {detail.submittedAt}</p>
                      ) : null}
                    </div>

                    {detail?.materials?.length > 0 && (
                      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Documents</h3>
                        <div className="flex flex-wrap gap-3">
                          {detail.materials.map((m) => (
                            <DocThumb key={`${m.label}-${m.url}`} url={m.url} label={m.label} />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Admin actions</h3>
                      {!canActOnVerification && detail?.rawStatus === 'not_submitted' ? (
                        <div className="mb-4 flex gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-lg p-3">
                          <AlertTriangle className="w-5 h-5 shrink-0" />
                          <p>
                            This user has not submitted documents yet. Use <strong>Full review</strong> for manual
                            override, or wait until they upload.
                          </p>
                        </div>
                      ) : null}

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                            Decision
                          </label>
                          <select
                            value={decision}
                            onChange={(e) => setDecision(e.target.value)}
                            disabled={!!processingAction}
                            className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-socius-red focus:border-socius-red"
                          >
                            <option value="approve">Approve verification</option>
                            <option value="reject">Reject verification</option>
                            <option value="resubmit">Request resubmission (more info)</option>
                          </select>
                        </div>

                        {decision !== 'approve' ? (
                          <>
                            <div>
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                                Reason (for reject / resubmit)
                              </label>
                              <select
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                disabled={!!processingAction}
                                className="block w-full pl-3 py-2 text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                {FAILURE_REASON_OPTIONS.map((o) => (
                                  <option key={o.value || 'empty'} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Admin note
                              </label>
                              <textarea
                                rows={3}
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                disabled={!!processingAction}
                                placeholder="Internal note sent with the decision context"
                                className="block w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                              />
                            </div>
                          </>
                        ) : null}

                        <div className="flex items-center">
                          <input
                            id="policy-appeals"
                            type="checkbox"
                            checked={policyOk}
                            onChange={(e) => setPolicyOk(e.target.checked)}
                            disabled={!!processingAction}
                            className="h-4 w-4 rounded border-gray-300 text-socius-red focus:ring-socius-red"
                          />
                          <label htmlFor="policy-appeals" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Decision follows Socius policy &amp; safeguards
                          </label>
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button
                            className="px-6"
                            onClick={runDecision}
                            loading={!!processingAction}
                            disabled={!!processingAction || detailLoading}
                          >
                            Submit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      Actions use the same verification endpoints as the main queue; they are logged and auditable.
                    </p>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <Card className="p-10 flex flex-col items-center justify-center h-full text-center min-h-[280px]">
                  <Shield className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No cases in this page</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                    Adjust search or pagination, or open the verification queue for the full list.
                  </p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default AppealsPage;
