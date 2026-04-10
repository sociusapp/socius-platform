import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ArrowLeft } from 'lucide-react';
import Card from '../components/common/Card';

/**
 * Socius admin login uses env-configured credentials on the server (see auth.service adminPasswordLogin).
 * There is no self-service email OTP reset in this stack yet — avoid misleading mock flows.
 */
const ForgotPasswordPage = () => (
  <div className="w-full max-w-md mx-auto">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="py-8 px-4 sm:px-10 border-gray-100 dark:border-gray-700 shadow-xl" noPadding>
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-socius-red" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Admin password</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-left">
            Admin sign-in is validated on the API using <span className="font-mono text-xs">ADMIN_EMAIL</span> and{' '}
            <span className="font-mono text-xs">ADMIN_PASSWORD</span> (see <span className="font-mono text-xs">socius-backend</span>{' '}
            env). To change access, update those variables (or your host&apos;s secrets), redeploy, and share credentials
            through your usual secure channel.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-950 dark:text-amber-100/90 text-left mb-6">
          Self-service &quot;forgot password&quot; with email OTP is not implemented for the admin panel. If you need it,
          add a mailer + token store on the backend first.
        </div>
        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-2 py-3 rounded-lg bg-socius-red hover:bg-[#A03535] text-white font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </Card>
    </motion.div>
  </div>
);

export default ForgotPasswordPage;
