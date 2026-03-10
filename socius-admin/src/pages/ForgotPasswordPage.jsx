import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Mail, Lock, ShieldCheck, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

// Validation Schemas
const emailSchema = yup.object().shape({
  email: yup.string().email('Please enter a valid email address').required('Email address is required'),
});

const otpSchema = yup.object().shape({
  otp: yup.string().length(6, 'OTP must be exactly 6 digits').required('OTP is required'),
});

const passwordSchema = yup.object().shape({
  password: yup.string().min(6, 'Password must be at least 6 characters').required('New Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm Password is required'),
});

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useAlert();

  // Step 1: Email Form
  const { register: registerEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors } } = useForm({
    resolver: yupResolver(emailSchema)
  });

  // Step 2: OTP Form
  const { register: registerOtp, handleSubmit: handleOtpSubmit, formState: { errors: otpErrors } } = useForm({
    resolver: yupResolver(otpSchema)
  });

  // Step 3: New Password Form
  const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors } } = useForm({
    resolver: yupResolver(passwordSchema)
  });

  const onEmailSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Mock API Call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setEmail(data.email);
      setStep(2);
      toast.success('OTP has been sent to your email address');
    } catch (error) {
      toast.error('Something went wrong, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Mock API Call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep(3);
      toast.success('OTP verified successfully');
    } catch (error) {
      toast.error('Invalid OTP, please check again');
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Mock API Call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep(4);
      toast.success('Password updated successfully');
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="py-8 px-4 sm:px-10 border-gray-100 dark:border-gray-700 shadow-xl" noPadding>
          <AnimatePresence mode="wait">
            {/* Step 1: Email */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="text-center mb-8">
                  <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                    <Mail className="w-8 h-8 text-socius-red" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Forgot Password?</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Enter your registered email address and we'll send you an OTP.
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        placeholder="admin@socius.org"
                        className={`appearance-none block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border ${emailErrors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-socius-red focus:border-socius-red sm:text-sm dark:text-white transition-all`}
                        {...registerEmail('email')}
                      />
                    </div>
                    {emailErrors.email && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailErrors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full justify-center py-3 bg-socius-red hover:bg-[#A03535]"
                    loading={isLoading}
                  >
                    Send OTP
                  </Button>

                  <div className="text-center">
                    <Link to="/login" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-socius-red dark:text-gray-400">
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
                    </Link>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="text-center mb-8">
                  <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Verify OTP</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    We've sent a 6-digit code to <span className="font-bold text-gray-700 dark:text-gray-200">{email}</span>.
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      6-Digit OTP
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        maxLength="6"
                        placeholder="000000"
                        className={`appearance-none block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border ${otpErrors.otp ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-socius-red focus:border-socius-red sm:text-sm dark:text-white text-center tracking-[0.5em] font-bold transition-all`}
                        {...registerOtp('otp')}
                      />
                    </div>
                    {otpErrors.otp && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{otpErrors.otp.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full justify-center py-3 bg-socius-red hover:bg-[#A03535]"
                    loading={isLoading}
                  >
                    Verify OTP
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm font-medium text-gray-500 hover:text-socius-red dark:text-gray-400"
                    >
                      Incorrect email? Resend OTP
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="text-center mb-8">
                  <div className="mx-auto w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Create New Password</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Choose a strong password that you'll remember.
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className={`appearance-none block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${passwordErrors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-socius-red focus:border-socius-red sm:text-sm dark:text-white transition-all`}
                        {...registerPassword('password')}
                      />
                      {passwordErrors.password && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordErrors.password.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className={`appearance-none block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${passwordErrors.confirmPassword ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-socius-red focus:border-socius-red sm:text-sm dark:text-white transition-all`}
                        {...registerPassword('confirmPassword')}
                      />
                      {passwordErrors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordErrors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full justify-center py-3 bg-socius-red hover:bg-[#A03535]"
                    loading={isLoading}
                  >
                    Update Password
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <motion.div
                key="step4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="text-center"
              >
                <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Success!</h3>
                <p className="mt-3 text-gray-500 dark:text-gray-400 mb-8">
                  Your password has been successfully updated. You can now log in with your new password.
                </p>

                <Button
                  onClick={() => navigate('/login')}
                  variant="primary"
                  className="w-full justify-center py-3 bg-socius-red hover:bg-[#A03535]"
                >
                  Go to Login
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
