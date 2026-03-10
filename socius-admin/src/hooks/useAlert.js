import { useTheme } from '../context/ThemeContext';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

export const useAlert = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Common SweetAlert2 Configuration
  const swalConfig = {
    background: isDark ? '#1f2937' : '#ffffff', // gray-800 : white
    color: isDark ? '#f3f4f6' : '#111827', // gray-100 : gray-900
    customClass: {
      popup: `rounded-xl shadow-xl border ${isDark ? 'border-gray-700' : 'border-gray-100'}`,
      title: 'text-xl font-bold',
      htmlContainer: 'text-sm',
      confirmButton: 'px-4 py-2 rounded-lg font-medium shadow-sm transition-colors',
      cancelButton: 'px-4 py-2 rounded-lg font-medium shadow-sm transition-colors',
    },
    showClass: {
      popup: 'swal-custom-show',
    },
    hideClass: {
      popup: 'swal-custom-hide',
    },
    buttonsStyling: false, // We will use Tailwind classes
  };

  const confirm = async ({
    title,
    text,
    confirmButtonText = 'Yes, proceed',
    cancelButtonText = 'Cancel',
    icon = 'warning',
    confirmButtonColor = 'bg-blue-600 hover:bg-blue-700 text-white',
    cancelButtonColor = 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
  }) => {
    return Swal.fire({
      ...swalConfig,
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      customClass: {
        ...swalConfig.customClass,
        confirmButton: `${swalConfig.customClass.confirmButton} ${confirmButtonColor} ml-2`,
        cancelButton: `${swalConfig.customClass.cancelButton} ${cancelButtonColor}`,
      },
    });
  };

  const success = ({ title, text }) => {
    return Swal.fire({
      ...swalConfig,
      title,
      text,
      icon: 'success',
      confirmButtonText: 'OK',
      customClass: {
        ...swalConfig.customClass,
        confirmButton: `${swalConfig.customClass.confirmButton} bg-green-600 hover:bg-green-700 text-white`,
      },
    });
  };

  const error = ({ title, text }) => {
    return Swal.fire({
      ...swalConfig,
      title,
      text,
      icon: 'error',
      confirmButtonText: 'Close',
      customClass: {
        ...swalConfig.customClass,
        confirmButton: `${swalConfig.customClass.confirmButton} bg-red-600 hover:bg-red-700 text-white`,
      },
    });
  };

  const info = ({ title, text }) => {
    return Swal.fire({
      ...swalConfig,
      title,
      text,
      icon: 'info',
      confirmButtonText: 'OK',
      customClass: {
        ...swalConfig.customClass,
        confirmButton: `${swalConfig.customClass.confirmButton} bg-blue-600 hover:bg-blue-700 text-white`,
      },
    });
  };

  // Toast wrappers with theme awareness
  const showToast = {
    success: (message) => toast.success(message, {
      style: {
        background: isDark ? '#374151' : '#fff',
        color: isDark ? '#fff' : '#333',
        borderRadius: '10px',
      },
    }),
    error: (message) => toast.error(message, {
      style: {
        background: isDark ? '#374151' : '#fff',
        color: isDark ? '#fff' : '#333',
        borderRadius: '10px',
      },
    }),
    loading: (message) => toast.loading(message, {
      style: {
        background: isDark ? '#374151' : '#fff',
        color: isDark ? '#fff' : '#333',
        borderRadius: '10px',
      },
    }),
    dismiss: toast.dismiss,
  };

  return {
    confirm,
    success,
    error,
    info,
    toast: showToast,
  };
};
