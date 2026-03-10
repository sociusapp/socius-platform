import React from 'react';
import { Outlet } from 'react-router-dom';
import logo from '../assets/images/icon-03.png';
import { useTheme } from '../context/ThemeContext';

const AuthLayout = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-between py-12 sm:px-6 lg:px-8 transition-colors duration-200 font-sans">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none transition-colors duration-200"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      <div className="flex-grow flex flex-col justify-center">
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
          <div className="flex flex-col items-center">
             <div className="flex items-center justify-center space-x-3 mb-2">
                <img
                  className="h-10 w-auto"
                  src={logo}
                  alt="Socius"
                />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Socius <span className="font-normal text-gray-500 dark:text-gray-400">— Admin</span>
                </h2>
             </div>
             <p className="text-sm text-gray-500 dark:text-gray-400">
               Community Safety & Awareness Platform
             </p>
          </div>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-[480px]">
           <Outlet />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
         <div className="border-t border-gray-200 dark:border-gray-700 pt-8 flex justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &copy; Socius Platform — Internal Use Only
            </p>
         </div>
      </div>
    </div>
  );
};

export default AuthLayout;
