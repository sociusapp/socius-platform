import React from 'react';
import { 
  Lock, 
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const SystemSettingsPage = () => {
  const { confirm, toast } = useAlert();

  const handleSaveChanges = async () => {
    const isConfirmed = await confirm({
      title: 'Save System Changes?',
      text: "You are about to modify platform-wide safety settings.",
      icon: 'warning',
      confirmButtonText: 'Yes, save changes',
      confirmButtonColor: '#3085d6',
    });

    if (isConfirmed) {
      toast.success('System settings updated successfully');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col min-h-screen pb-10"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings & Safeguards</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Platform-wide limits, safety rules, and non-negotiable boundaries</p>
      </motion.div>

      <div className="space-y-6">
        
        {/* Platform Boundaries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
        <Card className="overflow-hidden p-0">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Platform Boundaries</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {[
                "No dispatching of people",
                "No instruction to intervene",
                "No enforcement authority",
                "No patrols or teams",
                "No live tracking of users",
                "No public incident feeds"
              ].map((boundary, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={index} 
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-socius-red" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{boundary}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 italic">
                    <Lock className="w-3 h-3" />
                    <span>This setting cannot be changed</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
        </motion.div>

        {/* Incident Safety Limits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
        <Card className="overflow-hidden p-0">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Incident Safety Limits</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max volunteers per incident:</label>
                <div className="flex items-center gap-2">
                  <select className="form-select block w-20 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring focus:ring-socius-red focus:ring-opacity-50 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option>5</option>
                    <option>10</option>
                  </select>
                  <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max incident visibility radius:</label>
                <div className="flex items-center gap-2">
                  <select className="form-select block w-20 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring focus:ring-socius-red focus:ring-opacity-50 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option>5 km</option>
                  </select>
                  <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max incident visibility radius:</label>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 font-medium">
                    5 km
                  </div>
                  <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Incident type escalation rules:</label>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 font-medium">
                    Routing-only
                  </div>
                  <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
                </div>
              </div>
              <div className="flex items-center justify-between md:col-span-2">
                 <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Incident auto-close timeout:</label>
                 <div className="flex items-center gap-2">
                  <select className="form-select block w-32 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring focus:ring-socius-red focus:ring-opacity-50 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option>60 minutes</option>
                  </select>
                 </div>
              </div>
            </div>
          </div>
        </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Safeguards */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
          <Card className="overflow-hidden p-0">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Safeguards</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                "Rate-limit notifications per user",
                "Prevent repeated alerts in same cluster",
                "Cool-down period after cancellation",
                "Disable notifications during system stress"
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item}</span>
                  <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
                </div>
              ))}
            </div>
          </Card>
          </motion.div>

          {/* Police Escalation Constraints */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
          <Card className="overflow-hidden p-0">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Police Escalation Constraints</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                "Escalation is user-initiated only",
                "No admin-triggered escalation",
                "Police profiles receive awareness only",
                "No response enforcement"
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-socius-red" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item}</span>
                  </div>
                  <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
                </div>
              ))}
            </div>
          </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Content Safety Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
          <Card className="overflow-hidden p-0">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Content Safety Controls</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Incident categories</span>
                <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Scenario text templates</span>
                </div>
                <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Scenario text templates</span>
                <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Forbidden words list</span>
                </div>
                <span className="text-xs text-gray-500 italic">View-only - Language controls prevent misinterpretation</span>
              </div>
            </div>
          </Card>
          </motion.div>

          {/* Emergency Fail-Safes */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
          <Card className="overflow-hidden p-0">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Emergency Fail-Safes</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-socius-red" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">System-wide pause (multi-admin approval)</span>
                </div>
                <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-socius-red" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Emergency message template</span>
                </div>
                <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
              </div>
            </div>
          </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data & Logging Safeguards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
          <Card className="overflow-hidden p-0">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data & Logging Safeguards</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                "Incident data retention period",
                "Auto-anonymization timeline",
                "Export restrictions"
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item}</span>
                  <span className="text-xs text-gray-500 italic">Caps enforced by system</span>
                </div>
              ))}
            </div>
          </Card>
          </motion.div>
        </div>

      </div>

      {/* Footer Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-700 pt-6"
      >
        <p className="text-xs text-gray-500 dark:text-gray-400">
          These safeguards ensure Socius remains an information-sharing and awareness platform, not an enforcement or response system.
          <span className="ml-2 inline-flex gap-2">
             <span className="flex items-center gap-1 text-socius-red font-medium"><AlertTriangle className="w-3 h-3" /> No real-time controls</span>
             <span className="flex items-center gap-1 text-socius-red font-medium"><AlertTriangle className="w-3 h-3" /> No user targeting</span>
             <span className="flex items-center gap-1 text-socius-red font-medium"><AlertTriangle className="w-3 h-3" /> No authority override</span>
          </span>
        </p>
        <div className="flex gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={handleSaveChanges}>
            Save Changes
          </Button>
          <Button variant="secondary" className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm">
            View Change Log
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SystemSettingsPage;
