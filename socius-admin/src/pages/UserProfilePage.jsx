import React, { useState, useEffect } from 'react';
import { 
  Lock,
  Ban,
  RefreshCw,
  Unlock,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api } from '../services/api/client';

const UserProfilePage = () => {
  const { userId } = useParams();
  const { confirm, toast } = useAlert();
  const [processingAction, setProcessingAction] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const mapUserDetails = (payload) => {
    if (!payload || !payload.user) return null;
    const { user, stats } = payload;

    const roleLabel = user.isAvailable ? 'Volunteer & User' : 'User';

    let accountStatusLabel = 'Active';
    if (user.accountStatus === 'limited') accountStatusLabel = 'Limited';
    else if (user.accountStatus === 'suspended') accountStatusLabel = 'Suspended';
    else if (user.accountStatus === 'pending_review') accountStatusLabel = 'Pending Review';

    const verificationStatusLabel = user.isIdentityVerified ? 'Approved' : 'Pending';

    const createdAt = user.createdAt ? new Date(user.createdAt) : null;
    const joinedOnLabel = createdAt
      ? createdAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-';

    const displayId =
      typeof user._id === 'string' && user._id.length >= 6
        ? `USR-${user._id.slice(-6).toUpperCase()}`
        : String(user._id || '');

    const safeStats = stats || {};

    return {
      id: displayId,
      role: roleLabel,
      accountStatus: accountStatusLabel,
      verificationStatus: verificationStatusLabel,
      joinedOn: joinedOnLabel,
      capabilities: [
        'Calm presence',
        'Care & support',
        'Elder assistance',
        'Language help',
      ],
      stats: {
        cancellations: 0,
        requestsInitiated: safeStats.helpRequestsSent || 0,
        requestsClosed: safeStats.helpRequestsClosed || 0,
      },
    };
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchUser = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const response = await api.get(`/admin/users/${userId}`);
        const { success, data } = response?.data || {};
        if (success && data && !isCancelled) {
          const mapped = mapUserDetails(data);
          setUser(mapped);
        }
      } catch (error) {
        if (!isCancelled) {
          setUser(null);
          toast.error('Error while fetching user details');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  const handleLimitAccount = async () => {
    const isConfirmed = await confirm({
      title: 'Limit Account?',
      text: "This will restrict the user's ability to accept requests.",
      icon: 'warning',
      confirmButtonText: 'Yes, limit account',
      confirmButtonColor: '#d33',
    });

    if (isConfirmed) {
      setProcessingAction('limit');
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingAction(null);
      toast.success('Account has been limited');
    }
  };

  const handleSuspendAccount = async () => {
    const isConfirmed = await confirm({
      title: 'Suspend Account?',
      text: "The user will not be able to log in. This action is reversible.",
      icon: 'error',
      confirmButtonText: 'Yes, suspend user',
      confirmButtonColor: '#d33',
    });

    if (isConfirmed) {
      setProcessingAction('suspend');
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingAction(null);
      toast.success('Account suspended successfully');
    }
  };

  const handleReVerification = async () => {
    const isConfirmed = await confirm({
      title: 'Require Re-Verification?',
      text: "The user will need to submit documents again.",
      icon: 'info',
      confirmButtonText: 'Yes, require it',
      confirmButtonColor: '#3085d6',
    });

    if (isConfirmed) {
      setProcessingAction('reverify');
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingAction(null);
      toast.success('Re-verification request sent');
    }
  };

  const handleReinstateAccount = () => {
     // Example for disabled button logic, but assuming it's clickable for demo
    toast.custom('Account is already active', {
      icon: 'ℹ️',
    });
  };

  if (isLoading && !user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Profile</h1>
      </motion.div>
    );
  }

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Profile</h1>
        <p className="text-sm text-red-500">User not found or failed to load details.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Administrative view — limited information
        </p>
      </motion.div>

      {/* Account Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
      <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Summary</h2>
          <div className="border rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="grid grid-cols-1 divide-y divide-gray-200 dark:divide-gray-700">
              <div className="px-6 py-4 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 sm:col-span-3 text-sm font-medium text-gray-500 dark:text-gray-400">User ID:</div>
                <div className="col-span-12 sm:col-span-9 text-sm font-bold text-gray-900 dark:text-white">{user.id}</div>
              </div>
              <div className="px-6 py-4 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 sm:col-span-3 text-sm font-medium text-gray-500 dark:text-gray-400">Role:</div>
                <div className="col-span-12 sm:col-span-9 text-sm font-medium text-gray-900 dark:text-white">{user.role}</div>
              </div>
              <div className="px-6 py-4 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 sm:col-span-3 text-sm font-medium text-gray-500 dark:text-gray-400">Account Status:</div>
                <div className="col-span-12 sm:col-span-9 text-sm font-bold text-gray-900 dark:text-white">{user.accountStatus}</div>
              </div>
              <div className="px-6 py-4 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 sm:col-span-3 text-sm font-medium text-gray-500 dark:text-gray-400">Verification Status:</div>
                <div className="col-span-12 sm:col-span-9 text-sm font-medium text-gray-900 dark:text-white">{user.verificationStatus}</div>
              </div>
              <div className="px-6 py-4 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 sm:col-span-3 text-sm font-medium text-gray-500 dark:text-gray-400">Joined On:</div>
                <div className="col-span-12 sm:col-span-9 text-sm font-bold text-gray-900 dark:text-white">{user.joinedOn}</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Declared Interests & Capabilities */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="h-full"
        >
        <Card className="p-6 h-full">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Declared Interests & Capabilities</h2>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-3">
              {user.capabilities.map((cap, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx} 
                  className="flex items-center text-gray-700 dark:text-gray-300"
                >
                  <div className="bg-gray-300 dark:bg-gray-500 rounded-sm p-0.5 mr-3 flex items-center justify-center w-5 h-5">
                     <ChevronDown size={14} className="text-white stroke-[4]" />
                  </div>
                  <span className="text-sm font-medium">{cap}</span>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
              Capabilities are self-declared by the user.
            </p>
          </Card>
          </motion.div>

          {/* Safety Flags & Notes */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="h-full"
          >
          <Card className="p-6 h-full">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Safety Flags & Notes</h2>
            <div className="border rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
               <div className="grid grid-cols-1 divide-y divide-gray-200 dark:divide-gray-700">
                  <div className="px-6 py-4 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Repeated cancellations:</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{user.stats.cancellations}</span>
                  </div>
                  <div className="px-6 py-4 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Awareness requests initiated:</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{user.stats.requestsInitiated}</span>
                  </div>
                  <div className="px-6 py-4 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Requests closed normally:</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{user.stats.requestsClosed}</span>
                  </div>
               </div>
            </div>
          </Card>
          </motion.div>
        </div>

        {/* Administrative Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Administrative Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" className="bg-red-800 hover:bg-red-900" onClick={handleLimitAccount}>
              <Ban size={16} className="mr-2" />
              Limit Account
            </Button>
            <Button variant="danger" className="bg-red-800 hover:bg-red-900" onClick={handleSuspendAccount}>
              <Lock size={16} className="mr-2" />
              Suspend Account
            </Button>
             <Button variant="danger" className="bg-red-800 hover:bg-red-900" onClick={handleReVerification}>
              <RefreshCw size={16} className="mr-2" />
              Require Re-Verification
            </Button>
            <Button variant="secondary" className="bg-gray-100 hover:bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed" onClick={handleReinstateAccount}>
              <Unlock size={16} className="mr-2" />
              Reinstate Account
            </Button>
          </div>
        </Card>
        </motion.div>

        {/* Legal & Access Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
        <Card className="p-6 border-none shadow-none bg-transparent">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Legal & Access Notice</h2>
          <div className="bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md p-4">
             <p className="text-sm italic text-gray-700 dark:text-gray-300">
               Admins do not view private communications, real-time locations, or personal identifiers.
             </p>
          </div>
        </Card>
        </motion.div>
      
      {/* Footer Note */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="px-1"
      >
         <p className="text-xs italic text-gray-500 dark:text-gray-400">
           Administrative access logged for audit
         </p>
      </motion.div>
    </motion.div>
  );
};

export default UserProfilePage;
