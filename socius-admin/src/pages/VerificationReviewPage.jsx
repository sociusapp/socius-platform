import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Maximize2, 
  ZoomIn, 
  ChevronDown,
  User,
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api, baseURL } from '../services/api/client';

const VerificationReviewPage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { confirm, toast } = useAlert();
  const [rejectReason, setRejectReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [idPreviewOpen, setIdPreviewOpen] = useState(false);
  const [idZoom, setIdZoom] = useState(false);

  const mapAccountStatus = (status) => {
    if (status === 'limited') return 'Limited';
    if (status === 'suspended') return 'Suspended';
    if (status === 'pending_review') return 'Pending Review';
    return 'Active';
  };

  const mapVerificationStatus = (status) => {
    if (status === 'approved') return 'Approved';
    if (status === 'failed') return 'Rejected';
    if (status === 'review_requested') return 'Pending';
    if (status === 'pending') return 'Pending';
    if (status === 'not_submitted') return 'Not Submitted';
    return 'Pending';
  };

  const mapFailureReasons = (reasons) => {
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

  const buildAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const root = baseURL.replace(/\/api\/?$/, '');
    return `${root}/${path}`;
  };

  const loadDetails = async () => {
    if (!requestId) return;
    setIsLoading(true);
    try {
      const response = await api.get(`/admin/verifications/${requestId}`);
      const { success, data } = response?.data || {};
      if (success && data) {
        const user = data.userId || {};
        const submittedAt = data.submittedAt || null;
        const roleLabel = user.isAvailable ? 'Volunteer' : 'User';
        const history = Array.isArray(data.reviewHistory)
          ? data.reviewHistory.map((entry, index) => {
              const actionLabel = mapVerificationStatus(entry.status)
              const reviewedAtText = entry.reviewedAt
                ? new Date(entry.reviewedAt).toLocaleString(undefined, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-';
              return {
                id: String(entry._id || index),
                action: actionLabel,
                reviewedBy: entry.reviewedBy?.fullName || '-',
                reviewedAt: reviewedAtText,
                failureReasons: mapFailureReasons(entry.failureReasons),
                adminNote: entry.adminNote || '-',
              };
            })
          : [];
        const latestStatusRaw =
          history.length > 0
            ? data.reviewHistory[data.reviewHistory.length - 1]?.status
            : data.status;
        const submittedOn =
          latestStatusRaw === 'not_submitted' || !submittedAt
            ? '-'
            : new Date(submittedAt).toLocaleString(undefined, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
        setData({
          userId: String(user._id || data.userId || ''),
          role: roleLabel,
          submittedOn,
          name: user.fullName || '-',
          phone: user.phone || '-',
          accountStatus: mapAccountStatus(user.accountStatus),
          verificationStatus: mapVerificationStatus(latestStatusRaw),
          rawStatus: latestStatusRaw || 'pending',
          createdOn: user.createdAt
            ? new Date(user.createdAt).toLocaleDateString(undefined, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : '-',
          retryCount: typeof data.retryCount === 'number' ? data.retryCount : 0,
          failureReasonsText: mapFailureReasons(data.failureReasons),
          reviewedByName: data.reviewedBy?.fullName || '-',
          reviewedAt:
            data.reviewedAt
              ? new Date(data.reviewedAt).toLocaleString(undefined, {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '-',
          adminNote: data.adminNote || '-',
          reviewHistory: history,
          governmentIdUrl: buildAssetUrl(data.governmentId?.fileUrl),
          selfieUrl: buildAssetUrl(data.selfie?.fileUrl),
        });
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        setData(null);
        return;
      }
      toast.error('Failed to load verification details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [requestId]);

  const handleApprove = async () => {
    const status = data?.rawStatus;
    if (!status || (status === 'not_submitted' && !overrideEnabled)) {
      toast.error('User ne abhi verification submit nahi kiya');
      return;
    }
    const result = await confirm({
      title: 'Approve Verification?',
      text: "This will verify the user's identity and grant full access.",
      icon: 'question',
      confirmButtonText: 'Yes, approve',
      confirmButtonColor: 'bg-green-700 hover:bg-green-800 text-white',
    });
    
    if (result.isConfirmed) {
      try {
        setProcessingAction('approve');
        if (!data || !data.userId) {
          throw new Error('Missing user for approval');
        }
        const res = await api.patch(`/admin/verifications/${data.userId}/approve`);
        const msg = res?.data?.message || 'Verification approved successfully';
        toast.success(msg);
        toast.success('Verification approved successfully');
        await loadDetails();
      } catch (error) {
        const apiMessage =
          error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.message;
        toast.error(apiMessage || 'Failed to approve verification');
      } finally {
        setProcessingAction(null);
      }
    }
  };

  const handleReject = async () => {
    const status = data?.rawStatus;
    if (!status || (status === 'not_submitted' && !overrideEnabled)) {
      toast.error('User ne abhi verification submit nahi kiya');
      return;
    }
    let reasonToSend = rejectReason;
    const noteTrimmed = adminNote?.trim() || '';
    if (!reasonToSend && noteTrimmed) {
      reasonToSend = 'other';
    }
    if (!reasonToSend && !noteTrimmed) {
      toast.error('Please select a reason or add admin note');
      return;
    }
    
    const result = await confirm({
      title: 'Reject Verification?',
      text: "User will be notified of the rejection reason.",
      icon: 'error',
      confirmButtonText: 'Yes, reject',
      confirmButtonColor: 'bg-red-700 hover:bg-red-800 text-white',
    });
    
    if (result.isConfirmed) {
      try {
        setProcessingAction('reject');
        if (!data || !data.userId) {
          throw new Error('Missing user for rejection');
        }
        const res = await api.patch(`/admin/verifications/${data.userId}/reject`, {
          failureReasons: [reasonToSend],
          adminNote: adminNote?.trim() || undefined,
        });
        const msg = res?.data?.message || 'Verification rejected';
        toast.success(msg);
        setRejectReason('');
        setAdminNote('');
        await loadDetails();
      } catch (error) {
        const apiMessage =
          error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.message;
        toast.error(apiMessage || 'Failed to reject verification');
      } finally {
        setProcessingAction(null);
      }
    }
  };

  const handleResubmit = async () => {
    const status = data?.rawStatus;
    if (!status || (status === 'not_submitted' && !overrideEnabled)) {
      toast.error('User ne abhi verification submit nahi kiya');
      return;
    }

    let reasonToSend = rejectReason;
    const noteTrimmed = adminNote?.trim() || '';
    if (!reasonToSend && noteTrimmed) {
      reasonToSend = 'other';
    }
    if (!reasonToSend && !noteTrimmed) {
      toast.error('Please select a reason or add admin note');
      return;
    }

    const result = await confirm({
      title: 'Request Resubmission?',
      text: "User will be asked to upload new documents.",
      icon: 'warning',
      confirmButtonText: 'Yes, request resubmission',
      confirmButtonColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    });
    
    if (result.isConfirmed) {
      try {
        setProcessingAction('resubmit');
        if (!data || !data.userId) {
          throw new Error('Missing user for resubmission');
        }
        const res = await api.patch(
          `/admin/verifications/${data.userId}/request-resubmission`,
          {
            failureReasons: [reasonToSend],
            adminNote: adminNote?.trim() || undefined,
          }
        );
        const msg = res?.data?.message || 'Resubmission requested';
        toast.success(msg);
        setRejectReason('');
        setAdminNote('');
        await loadDetails();
        navigate('/verification');
      } catch (error) {
        const apiMessage =
          error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.message;
        toast.error(apiMessage || 'Failed to request resubmission');
      } finally {
        setProcessingAction(null);
      }
    }
  };

  return (
    <div className="pb-80 lg:pb-40">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Identity confirmation for platform access
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Submitted Information */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-700">
              Submitted Information
            </h2>

            {/* Account Details */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="overflow-hidden p-0">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Account Details</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {data?.userId || ''}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Role Requested:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {data?.role || ''}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {data?.phone || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Status:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {data?.accountStatus || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Verification Status:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {data?.verificationStatus || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Reviewed By:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {data?.reviewedByName || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Reviewed On:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {data?.reviewedAt || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Submitted On:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {data?.submittedOn || ''}
                  </span>
                </div>
              </div>
            </Card>
            </motion.div>

            {/* Declared Basic Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="overflow-hidden p-0">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Declared Basic Info</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Name:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {data?.name || ''}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Created:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {data?.createdOn || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Retry Count:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {typeof data?.retryCount === 'number' ? data.retryCount : 0}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Failure Reasons:</span>
                  <span className="col-span-2 text-sm font-bold text-gray-900 dark:text-white">
                    {data?.failureReasonsText || '-'}
                  </span>
                </div>
              </div>
            </Card>
            </motion.div>

            {/* Review History */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="overflow-hidden p-0">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Review History</h3>
              </div>
              <div className="p-4 space-y-3">
                {!data?.reviewHistory || data.reviewHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No review actions yet. Approve or reject to create history.
                  </p>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-4 bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-600 dark:text-gray-300 px-3 py-2">
                      <span>Action</span>
                      <span>Reviewed By</span>
                      <span>Reviewed On</span>
                      <span>Details</span>
                    </div>
                    {data.reviewHistory.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-4 text-xs text-gray-800 dark:text-gray-100 px-3 py-2 border-t border-gray-200 dark:border-gray-700"
                      >
                        <span className="font-semibold">{row.action}</span>
                        <span>{row.reviewedBy}</span>
                        <span>{row.reviewedAt}</span>
                        <span className="truncate" title={row.adminNote || row.failureReasons}>
                          {row.adminNote || row.failureReasons || '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
            </motion.div>
          </div>

          {/* Right Column: Verification Materials */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-700">
              Verification Materials
            </h2>

            {/* Government-issued ID */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="overflow-hidden p-0">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Government-issued ID</h3>
              </div>
              <div className="p-4 flex flex-col items-center">
                {/* ID Card Image */}
                <div className="w-full max-w-md bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-xl p-4 flex items-center justify-center mb-3">
                   <img 
                     src={data?.governmentIdUrl || 'https://placehold.co/600x400/374151/FFFFFF?text=Government+ID'} 
                     alt="Government ID" 
                     className="w-full h-48 object-cover rounded-lg shadow-sm"
                   />
                </div>
                
                <div className="flex space-x-6">
                  <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-0 h-auto" onClick={() => setIdPreviewOpen(true)}>
                    <Maximize2 size={16} className="mr-1.5" />
                    <span className="underline">View full size</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-0 h-auto" onClick={() => setIdZoom((z) => !z)}>
                    <ZoomIn size={16} className="mr-1.5" />
                    <span className="underline">Zoom</span>
                  </Button>
                </div>
              </div>
            </Card>
            </motion.div>
            
            {idPreviewOpen && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 flex items-center justify-center">
                <div className="relative max-w-4xl w-full mx-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Government ID</h4>
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => setIdZoom((z) => !z)}>
                          <ZoomIn size={16} className="mr-1.5" />
                          {idZoom ? 'Reset Zoom' : 'Zoom'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => { setIdZoom(false); setIdPreviewOpen(false); }}>
                          Close
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-auto max-h-[70vh] border border-gray-200 dark:border-gray-700 rounded-md">
                      <img
                        src={data?.governmentIdUrl || 'https://placehold.co/1200x800/374151/FFFFFF?text=Government+ID'}
                        alt="Government ID"
                        className={`w-full object-contain ${idZoom ? 'scale-125' : 'scale-100'} transition-transform`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Selfie Verification */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="overflow-hidden p-0">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Selfie Verification</h3>
              </div>
              <div className="p-4 flex flex-col items-center">
                {/* Selfie Image */}
                <div className="w-full bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-xl p-4 flex items-center justify-center mb-3">
                  <img 
                    src={data?.selfieUrl || 'https://i.pravatar.cc/300?img=33'} 
                    alt="Selfie Verification" 
                    className="h-48 w-48 object-cover rounded-lg shadow-sm"
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Selfie is used only to confirm document ownership.
                </p>
              </div>
            </Card>
            </motion.div>
          </div>
        </div>

      {/* Action Footer */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 120, damping: 20 }}
        className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-10"
      >
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center sm:text-left">
            Approval confirms identity submission completeness only.
          </p>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                variant="primary"
                onClick={handleApprove}
                loading={processingAction === 'approve'}
                disabled={
                  processingAction !== null ||
                  (data?.rawStatus === 'not_submitted' && !overrideEnabled)
                }
                className="bg-green-700 hover:bg-green-800 border-transparent focus:ring-green-500"
              >
                Approve Verification
              </Button>
              
              <div className="flex items-stretch">
                <Button 
                  variant="outline"
                  onClick={handleReject}
                  loading={processingAction === 'reject'}
                  disabled={
                    processingAction !== null ||
                    (data?.rawStatus === 'not_submitted' && !overrideEnabled)
                  }
                  className="rounded-r-none border-red-200 text-red-800 bg-red-50 hover:bg-red-100 hover:border-red-300"
                >
                  Reject Verification
                </Button>
                <div className="relative border-t border-b border-r border-red-200 rounded-r bg-white hover:bg-gray-50 transition-colors w-44">
                  <select 
                    className="appearance-none bg-transparent pl-3 pr-8 py-2 h-full text-sm text-gray-700 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    disabled={
                      processingAction !== null ||
                      (data?.rawStatus === 'not_submitted' && !overrideEnabled)
                    }
                  >
                    <option value="">Select Reason</option>
                    <option value="image_unclear">Image Blurry or unclear</option>
                    <option value="information_mismatch">Name or information mismatch</option>
                    <option value="missing_required_detail">Missing or invalid document</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Admin note (optional)"
                  disabled={
                    processingAction !== null ||
                    (data?.rawStatus === 'not_submitted' && !overrideEnabled)
                  }
                  className="min-w-[200px] w-64 border border-red-200 rounded-md px-3 py-2 text-sm ml-2"
                />
              </div>
              </div>

              <Button 
                variant="secondary"
                onClick={handleResubmit}
                loading={processingAction === 'resubmit'}
                disabled={processingAction !== null}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 border-transparent w-full sm:w-auto"
              >
                Request Resubmission
              </Button>
            
            {data?.rawStatus === 'not_submitted' && (
              <div className="text-xs flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overrideEnabled}
                    onChange={(e) => setOverrideEnabled(e.target.checked)}
                  />
                  <span className="text-gray-600 dark:text-gray-300">
                    Enable manual override (no documents present)
                  </span>
                </label>
              </div>
            )}
            </div>
          </div>
          
          <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-4">
            Verification actions are logged and auditable. Documents are stored securely and access is limited.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default VerificationReviewPage;
