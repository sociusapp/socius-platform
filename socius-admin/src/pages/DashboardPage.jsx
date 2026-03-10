import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api } from '../services/api/client';

const MetricCard = ({ title, value, subtitle, delay = 0 }) => (
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
        <span className="text-6xl font-bold text-gray-800 dark:text-white tracking-tight">
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

const SystemStatusCard = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="h-full"
  >
    <Card className="flex flex-col h-full">
    <div className="p-5">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">System Status</h3>
      <div className="border-b border-gray-100 dark:border-gray-700 mb-4"></div>
      <div className="space-y-4 pl-2">
        <StatusItem label="Notifications" status="OK" />
        <StatusItem label="Database" status="OK" />
        <StatusItem label="Location Services" status="OK" />
      </div>
    </div></Card>
  </motion.div>
);

const StatusItem = ({ label, status }) => (
  <div className="flex items-center">
    <div className="h-2.5 w-2.5 rounded-full bg-green-600 mr-3"></div>
    <p className="text-sm text-gray-700 dark:text-gray-300">
      {label}: <span className="font-bold text-green-700 dark:text-green-500">{status}</span>
    </p>
  </div>
);

const DashboardPage = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    activeAwarenessRequests: 0,
    resolvedToday: 0,
    volunteersAvailableNow: 0,
    pendingVerifications: 0,
    safetyFlags: 0,
  });

  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      const response = await api.get('/admin/dashboard');
      const { success, data } = response?.data || {};
      if (success && data) {
        setStats({
          activeAwarenessRequests: data.activeAwarenessRequests ?? 0,
          resolvedToday: data.resolvedToday ?? 0,
          volunteersAvailableNow: data.volunteersAvailableNow ?? 0,
          pendingVerifications: data.pendingVerifications ?? 0,
          safetyFlags: data.safetyFlags ?? 0,
        });
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
    <div className="flex flex-col h-full justify-between">
      <div className="flex justify-end mb-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Row 1 */}
        <MetricCard 
          title="Active Awareness Requests" 
          value={stats.activeAwarenessRequests} 
          subtitle="Currently open"
          delay={0.1}
        />
        <MetricCard 
          title="Resolved Today" 
          value={stats.resolvedToday} 
          subtitle="Calm or cancelled"
          delay={0.2}
        />
        <MetricCard 
          title="Volunteers Available Now" 
          value={stats.volunteersAvailableNow} 
          subtitle="Self-reported availability"
          delay={0.3}
        />

        {/* Row 2 */}
        <MetricCard 
          title="Pending Verifications" 
          value={stats.pendingVerifications} 
          subtitle="Identity & profile review"
          delay={0.4}
        />
        <MetricCard 
          title="Safety Flags" 
          value={stats.safetyFlags} 
          subtitle="System or user-generated"
          delay={0.5}
        />
        <SystemStatusCard delay={0.6} />
      </div>

      <div className="mt-8 text-center pb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          This dashboard provides high-level visibility only. All user actions remain voluntary and independent.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
