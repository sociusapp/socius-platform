import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAlert } from '../hooks/useAlert';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Enter a valid email address')
    .required('Email is required'),
  password: yup.string().required('Password is required'),
});

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isDeveloperLogin = location.pathname === '/developer-login';
  const { login, loginDeveloper } = useAuth();
  const { toast } = useAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const result = isDeveloperLogin
        ? await loginDeveloper(data.email, data.password)
        : await login(data.email, data.password);
      if (result.ok) {
        toast.success('Successfully logged in');
        navigate(isDeveloperLogin ? '/issue-tracker' : '/dashboard');
      } else {
        toast.error(result.error || 'Invalid email or password');
      }
    } catch (error) {
      toast.error('An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
    <Card className="py-8 px-4 sm:px-10 border-gray-100 dark:border-gray-700 shadow-xl transition-colors duration-200" noPadding>
      <div className="mb-6 text-center">
        <motion.h3 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-gray-800 dark:text-white"
        >
          {isDeveloperLogin ? 'Developer Login' : 'Admin Login'}
        </motion.h3>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-1 text-sm text-gray-500 dark:text-gray-400"
        >
          Authorized access only
        </motion.p>
      </div>
      
      <div className="border-b border-gray-100 dark:border-gray-700 mb-6"></div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            {isDeveloperLogin ? 'Developer Email' : 'Admin Email'}
          </label>
          <div className="mt-1">
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              className={`appearance-none block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-socius-red focus:border-socius-red sm:text-sm dark:text-white transition-colors duration-200`}
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`appearance-none block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-socius-red focus:border-socius-red sm:text-sm dark:text-white transition-colors duration-200`}
              {...register('password')}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center py-3 bg-socius-red hover:bg-[#A03535]"
            loading={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </motion.div>
        
        <div className="flex items-center justify-center">
          <div className="text-sm">
            {!isDeveloperLogin ? (
              <Link to="/forgot-password" size="sm" className="font-medium text-gray-500 hover:text-socius-red dark:text-gray-400 underline decoration-1 underline-offset-2">
                Forgot password?
              </Link>
            ) : (
              <Link to="/login" size="sm" className="font-medium text-gray-500 hover:text-socius-red dark:text-gray-400 underline decoration-1 underline-offset-2">
                Go to Admin Login
              </Link>
            )}
          </div>
        </div>

        {!isDeveloperLogin && (
          <div className="flex items-center justify-center">
            <div className="text-sm">
              <Link to="/developer-login" size="sm" className="font-medium text-gray-500 hover:text-socius-red dark:text-gray-400 underline decoration-1 underline-offset-2">
                Developer Login
              </Link>
            </div>
          </div>
        )}
      </form>
      
      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
         <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              This system is monitored for security and compliance.<br/>
              Unauthorized access is prohibited.
            </p>
         </div>
      </div>
    </Card>
    </motion.div>
  );
};

export default LoginPage;
