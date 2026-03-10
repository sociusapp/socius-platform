import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Check, 
  X, 
  Shield, 
  Users, 
  Zap,
  Edit2,
  Save,
  IndianRupee
} from 'lucide-react';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const SubscriptionSettingsPage = () => {
  const { confirm, toast } = useAlert();
  const [activePlan, setActivePlan] = useState('premium');
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSaveChanges = async () => {
    const result = await confirm({
      title: 'Save Subscription Changes?',
      text: `Are you sure you want to update the ${plans.find(p => p.id === activePlan)?.name}?`,
      icon: 'question',
      confirmButtonText: 'Yes, update plan',
      confirmButtonColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    });
    
    if (result.isConfirmed) {
      setIsSaving(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSaving(false);
      toast.success('Subscription plan updated successfully');
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Basic / Free',
      price: '0',
      period: 'forever',
      description: 'Essential safety features for everyone.',
      color: 'gray',
      features: [
        { name: 'Live Awareness', included: true },
        { name: 'Emergency Contacts', limit: '3 contacts' },
        { name: 'Incident History', limit: '7 days' },
        { name: 'Real-time Alerts', included: true },
        { name: 'Offline Mode', included: false },
        { name: 'Family Group', included: false },
      ]
    },
    {
      id: 'premium',
      name: 'Socius Premium',
      price: '499',
      period: 'month',
      description: 'Advanced protection and unlimited history.',
      color: 'socius-red',
      features: [
        { name: 'Live Awareness', included: true },
        { name: 'Emergency Contacts', limit: 'Unlimited' },
        { name: 'Incident History', limit: 'Unlimited' },
        { name: 'Real-time Alerts', included: true },
        { name: 'Offline Mode', included: true },
        { name: 'Family Group', included: false },
      ]
    },
    {
      id: 'family',
      name: 'Family Plan',
      price: '1299',
      period: 'month',
      description: 'Complete safety for the whole family.',
      color: 'blue',
      features: [
        { name: 'Live Awareness', included: true },
        { name: 'Emergency Contacts', limit: 'Unlimited' },
        { name: 'Incident History', limit: 'Unlimited' },
        { name: 'Real-time Alerts', included: true },
        { name: 'Offline Mode', included: true },
        { name: 'Family Group', limit: 'Up to 6 members' },
      ]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto pb-10"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Settings</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Manage user subscription plans, pricing, and feature availability.</p>
      </motion.div>

      {/* Plans Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {plans.map((plan, index) => (
          <Card 
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className={`relative border-2 transition-all cursor-pointer overflow-hidden p-0 ${
              activePlan === plan.id 
                ? 'border-socius-red ring-1 ring-socius-red' 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => setActivePlan(plan.id)}
            whileHover={{ y: -5 }}
          >
            {activePlan === plan.id && (
              <div className="absolute top-0 right-0 bg-socius-red text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
                Editing
              </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
                </div>
                {plan.id === 'premium' && <Zap className="w-5 h-5 text-amber-500" />}
                {plan.id === 'family' && <Users className="w-5 h-5 text-blue-500" />}
                {plan.id === 'free' && <Shield className="w-5 h-5 text-gray-400" />}
              </div>
              
              <div className="flex items-baseline mb-4">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{plan.price}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/{plan.period}</span>
              </div>

              <div className="space-y-3">
                {plan.features.slice(0, 3).map((feature, idx) => (
                  <div key={idx} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>{feature.limit || feature.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Section */}
      <Card 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="overflow-hidden p-0"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit Plan: <span className="text-socius-red">{plans.find(p => p.id === activePlan)?.name}</span>
            </h2>
          </div>
          <Button 
            variant="primary" 
            className="flex items-center gap-2" 
            onClick={handleSaveChanges}
            loading={isSaving}
            disabled={isSaving}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* General Settings */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                General Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan Name</label>
                <input 
                  type="text" 
                  disabled={isSaving}
                  defaultValue={plans.find(p => p.id === activePlan)?.name}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring focus:ring-socius-red focus:ring-opacity-50 dark:bg-gray-700 dark:text-white sm:text-sm p-2 border disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea 
                  disabled={isSaving}
                  defaultValue={plans.find(p => p.id === activePlan)?.description}
                  rows={3}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring focus:ring-socius-red focus:ring-opacity-50 dark:bg-gray-700 dark:text-white sm:text-sm p-2 border disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <IndianRupee className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      disabled={isSaving}
                      defaultValue={plans.find(p => p.id === activePlan)?.price}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 pl-10 focus:border-socius-red focus:ring-socius-red sm:text-sm p-2 border dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Period</label>
                  <select 
                    disabled={isSaving}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring focus:ring-socius-red focus:ring-opacity-50 dark:bg-gray-700 dark:text-white sm:text-sm p-2 border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                    <option value="forever">Forever (Free)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                Feature Availability
              </h3>

              <div className="space-y-4">
                {plans.find(p => p.id === activePlan)?.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      {feature.included !== false ? (
                        <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full">
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                      ) : (
                        <div className="bg-gray-100 dark:bg-gray-600 p-1.5 rounded-full">
                          <X className="w-4 h-4 text-gray-400 dark:text-gray-300" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{feature.name}</p>
                        {feature.limit && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Limit: {feature.limit}</p>
                        )}
                      </div>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={feature.included !== false} />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-socius-red/50 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-socius-red"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default SubscriptionSettingsPage;
