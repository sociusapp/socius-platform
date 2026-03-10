import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className = '', noHover = false, noPadding = false, ...props }) => {
  return (
    <motion.div
      whileHover={!noHover ? { y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;
