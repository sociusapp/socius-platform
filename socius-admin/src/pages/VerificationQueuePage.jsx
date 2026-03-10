import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { api } from '../services/api/client';

const VerificationQueuePage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [dateFilter, setDateFilter] = useState('Today');
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  const StatusDot = ({ status }) => {
    let colorClass = 'bg-gray-400';
    if (status === 'Approved') colorClass = 'bg-green-500';
    else if (status === 'Pending') colorClass = 'bg-yellow-500';
    else if (status === 'Rejected') colorClass = 'bg-red-500';
    return (
      <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${colorClass}`}></span>
    );
  };

  const getStatusTextColor = (status) => {
    if (status === 'Rejected') return 'text-red-600';
    return 'text-gray-700 dark:text-gray-200';
  };

  const mapVerificationToQueueRow = (item) => {
    if (!item) return null;

    const rawUser = item.userId;
    const user =
      rawUser && typeof rawUser === 'object' && !Array.isArray(rawUser)
        ? rawUser
        : {};
    const userId =
      user._id ||
      (typeof rawUser === 'string' || typeof rawUser === 'number'
        ? rawUser
        : null);
    if (!userId) return null;

    const id = String(userId);
    const name = user.fullName || '-';
    const roleLabel = user.isAvailable ? 'Volunteer' : 'User';
    let statusLabel = 'Pending';
    if (item.status === 'approved') statusLabel = 'Approved';
    else if (item.status === 'failed') statusLabel = 'Rejected';
    else if (item.status === 'not_submitted') statusLabel = 'Not Submitted';
    const submittedAt = item.submittedAt || item.createdAt;
    const submittedOn =
      item.status === 'not_submitted'
        ? '-'
        :
      submittedAt
        ? new Date(submittedAt).toLocaleString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '-';
    return {
      id,
      name,
      role: roleLabel,
      submittedOn,
      status: statusLabel,
    };
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchVerifications = async () => {
      setIsLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: itemsPerPage,
          status:
            statusFilter === 'Pending'
              ? 'pending'
              : statusFilter === 'Approved'
              ? 'approved'
              : statusFilter === 'Rejected'
              ? 'failed'
              : undefined,
          rangeDays:
            dateFilter === 'Today'
              ? 1
              : dateFilter === 'Last 7 days'
              ? 7
              : dateFilter === 'Last 30 days'
              ? 30
              : undefined,
        };

        const response = await api.get('/admin/verifications', { params });
        const { success, data } = response?.data || {};
        if (success && data && !isCancelled) {
          const mapped = Array.isArray(data.items)
            ? data.items.map(mapVerificationToQueueRow).filter(Boolean)
            : [];
          setRequests(mapped);
          setTotalItems(data.total || mapped.length);
        }
      } catch (error) {
        if (!isCancelled) {
          const status = error?.response?.status;
          const message =
            error?.response?.data?.message ||
            error?.message ||
            'Failed to load verification queue';
          setRequests([]);
          setTotalItems(0);
          if (status === 401 || status === 403) {
            navigate('/login');
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchVerifications();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, statusFilter]);

  // Simple filter component to match the text-based design
  const FilterGroup = ({ label, options, selected, onSelect }) => (
    <div className="flex flex-col sm:flex-row sm:items-center text-sm gap-2 sm:gap-0">
      <span className="font-bold text-gray-800 dark:text-gray-200 mr-2 whitespace-nowrap">{label}:</span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {options.map((option, idx) => (
          <React.Fragment key={option}>
            <button
              onClick={() => onSelect(option)}
              className={`${
                selected === option
                  ? 'text-red-800 font-medium'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              } transition-colors whitespace-nowrap`}
            >
              {option}
            </button>
            {idx < options.length - 1 && (
              <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const columns = [
    { header: 'User ID', accessor: 'id', className: 'font-medium text-gray-900 dark:text-white' },
    { header: 'Name', accessor: 'name', className: 'text-gray-700 dark:text-gray-300' },
    { header: 'Role Requested', accessor: 'role', className: 'text-gray-700 dark:text-gray-300' },
    { header: 'Submitted On', accessor: 'submittedOn', className: 'text-gray-700 dark:text-gray-300' },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <div className={`flex items-center ${getStatusTextColor(row.status)}`}>
          <StatusDot status={row.status} />
          {row.status}
        </div>
      ),
    },
    {
        header: 'Action',
        accessor: 'action',
        className: 'text-center',
        render: (row) => (
            <Button
                variant="secondary"
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/verification/${row.id}`);
                }}
                className="px-4 py-1 text-sm shadow-sm"
            >
                Review
            </Button>
        )
    }
  ];

  const filteredData = useMemo(() => {
    return requests.filter(item => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        item.id.toLowerCase().includes(search) ||
        item.role.toLowerCase().includes(search) ||
        item.status.toLowerCase().includes(search);
      
      const matchesStatus =
        statusFilter === 'Pending'
          ? (item.status === 'Pending' || item.status === 'Not Submitted')
          : statusFilter === 'Approved'
          ? item.status === 'Approved'
          : statusFilter === 'Rejected'
          ? item.status === 'Rejected'
          : true;
      
      const matchesDate = true;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [requests, searchTerm, statusFilter, dateFilter]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Queue</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pending identity reviews for platform access
        </p>
      </motion.div>

      {/* Filters Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-4 border-0">
          <div className="flex flex-wrap gap-6 items-center">
            <FilterGroup 
              label="Status" 
              options={['Pending', 'Approved', 'Rejected']} 
              selected={statusFilter} 
              onSelect={(val) => handleFilterChange(setStatusFilter, val)} 
            />
            
            <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            
            <FilterGroup 
              label="Submission Date" 
              options={['Today', 'Last 7 days', 'Last 30 days']} 
              selected={dateFilter} 
              onSelect={(val) => handleFilterChange(setDateFilter, val)} 
            />
          </div>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Table
            data={paginatedData}
            columns={columns}
            isLoading={isLoading}
            onSearch={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
            }}
            searchPlaceholder="Search verification requests..."
            pagination={{
                currentPage,
                totalPages: Math.ceil(filteredData.length / itemsPerPage) || 1,
                totalItems: totalItems || filteredData.length,
                itemsPerPage
            }}
            onPageChange={setCurrentPage}
            onRowClick={(row) => navigate(`/verification/${row.id}`)}
        />
      </motion.div>

      {/* Footer Disclaimer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="pt-2"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Verification is used only to confirm account authenticity.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Socius does not assess character, intent, or behavior.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default VerificationQueuePage;
