import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Shield, Users, Zap, Edit2, Save, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api } from '../services/api/client';

const periodLabel = (p) => {
  if (p === 'forever') return 'forever';
  if (p === 'year') return 'year';
  return 'month';
};

const SubscriptionSettingsPage = () => {
  const { confirm, toast: swalToast } = useAlert();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePlanKey, setActivePlanKey] = useState('premium');
  const [form, setForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/subscription-plans');
      const items = res?.data?.data?.items;
      if (Array.isArray(items)) {
        setPlans(items);
        setActivePlanKey((prev) =>
          items.some((p) => p.planKey === prev) ? prev : items[0]?.planKey || 'premium'
        );
      } else {
        setPlans([]);
        toast.error('Invalid plans response');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load subscription plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const activePlan = plans.find((p) => p.planKey === activePlanKey) || null;

  useEffect(() => {
    if (!activePlan) {
      setForm(null);
      return;
    }
    setForm({
      name: activePlan.name || '',
      description: activePlan.description || '',
      priceAmount: typeof activePlan.priceAmount === 'number' ? activePlan.priceAmount : Number(activePlan.priceAmount) || 0,
      billingPeriod: activePlan.billingPeriod || 'month',
      features: (activePlan.features || []).map((f) => ({
        key: f.key || '',
        name: f.name || '',
        enabled: f.enabled !== false && f.included !== false,
        limit: f.limit != null ? String(f.limit) : '',
      })),
    });
  }, [activePlanKey, activePlan]);

  const handleSaveChanges = async () => {
    if (!form || !activePlanKey) return;
    const result = await confirm({
      title: 'Save subscription changes?',
      text: `Update “${form.name}” on the server?`,
      icon: 'question',
      confirmButtonText: 'Yes, save',
      confirmButtonColor: 'bg-socius-red hover:bg-red-700 text-white',
    });

    if (!result.isConfirmed) return;

    setIsSaving(true);
    try {
      await api.patch(`/admin/subscription-plans/${activePlanKey}`, {
        name: form.name.trim(),
        description: form.description,
        priceAmount: form.priceAmount,
        billingPeriod: form.billingPeriod,
        features: form.features.map((f) => ({
          key: f.key,
          name: f.name,
          enabled: f.enabled,
          limit: f.limit?.trim() ? f.limit.trim() : null,
        })),
      });
      swalToast.success('Plan saved');
      await fetchPlans();
    } catch (e) {
      swalToast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const updateFeature = (index, patch) => {
    setForm((prev) => {
      if (!prev) return prev;
      const features = prev.features.map((f, i) => (i === index ? { ...f, ...patch } : f));
      return { ...prev, features };
    });
  };

  if (loading && plans.length === 0) {
    return (
      <div className="max-w-7xl mx-auto pb-10 text-center py-20 text-gray-500 dark:text-gray-400">
        Loading subscription plans…
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto pb-10"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Settings</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage user subscription plans, pricing, and feature availability (stored in the database).
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {plans.map((plan, index) => (
          <Card
            key={plan.planKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className={`relative border-2 transition-all cursor-pointer overflow-hidden p-0 ${
              activePlanKey === plan.planKey
                ? 'border-socius-red ring-1 ring-socius-red'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => setActivePlanKey(plan.planKey)}
            whileHover={{ y: -5 }}
          >
            {activePlanKey === plan.planKey && (
              <div className="absolute top-0 right-0 bg-socius-red text-white text-xs font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Editing
              </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{plan.description}</p>
                </div>
                {plan.planKey === 'premium' && <Zap className="w-5 h-5 text-amber-500 shrink-0" />}
                {plan.planKey === 'family' && <Users className="w-5 h-5 text-blue-500 shrink-0" />}
                {plan.planKey === 'free' && <Shield className="w-5 h-5 text-gray-400 shrink-0" />}
              </div>

              <div className="flex items-baseline mb-4">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{plan.priceAmount ?? 0}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  /{periodLabel(plan.billingPeriod)}
                </span>
              </div>

              <div className="space-y-3">
                {(plan.features || []).slice(0, 3).map((feature, idx) => (
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

      {form && activePlan ? (
        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="overflow-hidden p-0"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Plan: <span className="text-socius-red">{form.name || activePlan.name}</span>
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
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                  General Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => (p ? { ...p, name: e.target.value } : p))}
                    disabled={isSaving}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring focus:ring-socius-red focus:ring-opacity-50 dark:bg-gray-700 dark:text-white sm:text-sm p-2 border disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => (p ? { ...p, description: e.target.value } : p))}
                    disabled={isSaving}
                    rows={3}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring focus:ring-socius-red focus:ring-opacity-50 dark:bg-gray-700 dark:text-white sm:text-sm p-2 border disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (INR)</label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <IndianRupee className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={form.priceAmount}
                        onChange={(e) =>
                          setForm((p) =>
                            p ? { ...p, priceAmount: Math.max(0, Number(e.target.value) || 0) } : p
                          )
                        }
                        disabled={isSaving}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 pl-10 focus:border-socius-red focus:ring-socius-red sm:text-sm p-2 border dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Billing period
                    </label>
                    <select
                      value={form.billingPeriod}
                      onChange={(e) => setForm((p) => (p ? { ...p, billingPeriod: e.target.value } : p))}
                      disabled={isSaving}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring focus:ring-socius-red focus:ring-opacity-50 dark:bg-gray-700 dark:text-white sm:text-sm p-2 border disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                      <option value="forever">Forever (free tier)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                  Feature availability
                </h3>

                <div className="space-y-4">
                  {form.features.map((feature, idx) => (
                    <div
                      key={`${feature.key || feature.name}-${idx}`}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {feature.enabled ? (
                          <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full shrink-0">
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="bg-gray-100 dark:bg-gray-600 p-1.5 rounded-full shrink-0">
                            <X className="w-4 h-4 text-gray-400 dark:text-gray-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{feature.name}</p>
                          <input
                            type="text"
                            placeholder="Limit (e.g. Unlimited, 3 contacts)"
                            value={feature.limit}
                            onChange={(e) => updateFeature(idx, { limit: e.target.value })}
                            disabled={isSaving || !feature.enabled}
                            className="mt-1 w-full max-w-xs text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0 self-end sm:self-center">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={feature.enabled}
                          onChange={(e) => updateFeature(idx, { enabled: e.target.checked })}
                          disabled={isSaving}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-socius-red/50 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-socius-red" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Select a plan to edit.</p>
      )}
    </motion.div>
  );
};

export default SubscriptionSettingsPage;
