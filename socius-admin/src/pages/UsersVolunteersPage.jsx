import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { api } from '../services/api/client';

const UsersVolunteersPage = () => {
  const navigate = useNavigate();
  const { toast } = useAlert();
  const [roleFilter, setRoleFilter] = useState('All');
  const [accountStatusFilter, setAccountStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 5;

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsExporting(false);
    toast.success('User list exported successfully');
  };

  const handleClearFilters = async () => {
    setIsFiltering(true);
    setRoleFilter('All');
    setAccountStatusFilter('');
    setVerificationFilter('');
    setSearchTerm('');
    setCurrentPage(1);
    setIsFiltering(false);
    toast.success('Filters cleared');
  };

  const mapUser = (item) => {
    const id = String(item._id || item.id || '');
    const name = item.fullName || '-';
    const isAvailable = !!item.isAvailable;
    const roleLabel = isAvailable ? 'Volunteer' : 'User';

    let accountStatusLabel = 'Active';
    if (item.accountStatus === 'limited') accountStatusLabel = 'Limited';
    else if (item.accountStatus === 'suspended') accountStatusLabel = 'Suspended';
    else if (item.accountStatus === 'pending_review') accountStatusLabel = 'Pending Review';

    let verificationLabel = 'Pending';
    const v = item.verificationStatus;
    if (v === 'approved' || item.isIdentityVerified === true) verificationLabel = 'Approved';
    else if (v === 'failed') verificationLabel = 'Rejected';
    else if (v === 'pending' || v === 'review_requested' || v === 'not_submitted') verificationLabel = 'Pending';

    return {
      id,
      name,
      role: roleLabel,
      accountStatus: accountStatusLabel,
      verification: verificationLabel,
      flags: 0,
      lastActivity: '-',
    };
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: itemsPerPage,
        };
        if (searchTerm) params.search = searchTerm;
        if (accountStatusFilter) {
          params.accountStatus =
            accountStatusFilter === 'Active'
              ? 'active'
              : accountStatusFilter === 'Limited'
              ? 'limited'
              : accountStatusFilter === 'Suspended'
              ? 'suspended'
              : undefined;
        }
        if (verificationFilter) {
          params.verification =
            verificationFilter === 'Approved'
              ? 'approved'
              : verificationFilter === 'Rejected'
              ? 'failed'
              : verificationFilter === 'Pending'
              ? 'pending'
              : undefined;
        }

        const response = await api.get('/admin/users', { params });
        const { success, data } = response?.data || {};
        if (success && data && !isCancelled) {
          const mapped = Array.isArray(data.items) ? data.items.map(mapUser) : [];
          setUsers(mapped);
          setTotalItems(data.total || mapped.length);
        }
      } catch (error) {
        if (!isCancelled) {
          setUsers([]);
          setTotalItems(0);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, searchTerm]);

  // Helper for Status Dots
  const StatusDot = ({ status, type }) => {
    let colorClass = 'bg-gray-400';
    
    if (type === 'account') {
      if (status === 'Active') colorClass = 'bg-green-500';
      if (status === 'Limited') colorClass = 'bg-yellow-500';
      if (status === 'Suspended') colorClass = 'bg-red-500';
    } else if (type === 'verification') {
      if (status === 'Approved') colorClass = 'bg-green-500';
      if (status === 'Pending') colorClass = 'bg-yellow-500';
      if (status === 'Rejected') colorClass = 'bg-red-500';
    }

    return (
      <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${colorClass}`}></span>
    );
  };

  // Helper for text color based on status
  const getStatusTextColor = (status) => {
     if (status === 'Suspended' || status === 'Rejected') return 'text-red-600';
     return 'text-gray-700 dark:text-gray-200';
  };

  // Filter Data
  const filteredData = useMemo(() => {
    return users.filter(user => {
      const matchesRole = roleFilter === 'All' || user.role === roleFilter;
      const matchesAccount =
        !accountStatusFilter || user.accountStatus === accountStatusFilter;
      const matchesVerification =
        !verificationFilter || user.verification === verificationFilter;
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        user.id.includes(searchTerm) ||
        user.name.toLowerCase().includes(search) ||
        user.role.toLowerCase().includes(search);

      return matchesRole && matchesAccount && matchesVerification && matchesSearch;
    });
  }, [users, roleFilter, accountStatusFilter, verificationFilter, searchTerm]);

  // Paginate Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const columns = [
    { header: 'User ID', accessor: 'id', className: 'font-medium text-gray-900 dark:text-white' },
    { header: 'Name', accessor: 'name', className: 'text-gray-700 dark:text-gray-300' },
    { header: 'Role', accessor: 'role', className: 'text-gray-700 dark:text-gray-300' },
    { 
      header: 'Account Status', 
      accessor: 'accountStatus', 
      render: (user) => (
        <div className={`flex items-center ${getStatusTextColor(user.accountStatus)}`}>
           <StatusDot status={user.accountStatus} type="account" />
           {user.accountStatus}
        </div>
      )
    },
    { 
      header: 'Verification', 
      accessor: 'verification', 
      render: (user) => (
        <div className={`flex items-center ${getStatusTextColor(user.verification)}`}>
           <StatusDot status={user.verification} type="verification" />
           {user.verification}
        </div>
      )
    },
    { header: 'Flags', accessor: 'flags', className: 'text-center' },
    { header: 'Last Activity', accessor: 'lastActivity' },
    { 
      header: 'Action', 
      accessor: 'action', 
      className: 'text-center',
      render: (user) => (
        <Button 
          variant="secondary"
          onClick={() => navigate(`/users/${user.id}`)}
          className="text-blue-700 dark:text-blue-400 text-xs px-3 py-1.5 shadow-sm"
        >
          View Profile
        </Button>
      )
    },
  ];

  return (
    <div className="flex flex-col pb-10">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Users & Volunteers</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Account overview for safety and compliance
          </p>
        </div>
        <Button 
          variant="primary"
          onClick={handleExport}
          loading={isExporting}
          disabled={isExporting}
          className="w-full md:w-auto"
        >
          {isExporting ? 'Exporting...' : 'Export List'}
        </Button>
      </div>

      {/* Filters Section */}
      <Card className="p-5 mb-6">
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            <div className="flex flex-col gap-4 w-full lg:w-auto">
              
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Role Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[100px]">Role:</span>
                  <div className="inline-flex rounded-md shadow-sm flex-1 sm:flex-none overflow-x-auto">
                    {['All', 'User', 'Volunteer', 'Both'].map((r, idx) => (
                      <button
                        key={r}
                        onClick={() => handleFilterChange(setRoleFilter, r)}
                        disabled={isFiltering}
                        className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium border whitespace-nowrap ${
                          idx === 0 ? 'rounded-l-md' : ''
                        } ${idx === 3 ? 'rounded-r-md' : ''} ${
                          roleFilter === r
                            ? 'bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700'
                        } ${idx !== 0 ? '-ml-px' : ''} ${isFiltering ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Status Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[100px]">Account Status:</span>
                  <div className="inline-flex rounded-md shadow-sm flex-1 sm:flex-none overflow-x-auto">
                    {['Active', 'Limited', 'Suspended'].map((s, idx) => (
                      <button
                        key={s}
                        onClick={() => handleFilterChange(setAccountStatusFilter, accountStatusFilter === s ? '' : s)}
                        disabled={isFiltering}
                        className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium border whitespace-nowrap ${
                          idx === 0 ? 'rounded-l-md' : ''
                        } ${idx === 2 ? 'rounded-r-md' : ''} ${
                          accountStatusFilter === s
                            ? 'bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700'
                        } ${idx !== 0 ? '-ml-px' : ''} ${isFiltering ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Verification Status Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[100px]">Verification:</span>
                <div className="inline-flex rounded-md shadow-sm flex-1 sm:flex-none overflow-x-auto">
                  {['Approved', 'Pending', 'Rejected'].map((v, idx) => (
                    <button
                      key={v}
                      onClick={() => handleFilterChange(setVerificationFilter, verificationFilter === v ? '' : v)}
                      disabled={isFiltering}
                      className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium border whitespace-nowrap ${
                        idx === 0 ? 'rounded-l-md' : ''
                      } ${idx === 2 ? 'rounded-r-md' : ''} ${
                        verificationFilter === v
                          ? 'bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700'
                      } ${idx !== 0 ? '-ml-px' : ''} ${isFiltering ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="w-full lg:w-auto mt-4 lg:mt-0">
               <Button 
                variant="secondary"
                onClick={handleClearFilters}
                className="w-full lg:w-auto px-6 py-2.5 shadow-sm"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Table 
        columns={columns}
        data={paginatedData}
        isLoading={isLoading || isFiltering}
        onSearch={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search by ID or Role..."
        pagination={{
          currentPage,
          totalPages,
          totalItems: totalItems || filteredData.length,
          itemsPerPage
        }}
        onPageChange={setCurrentPage}
      />

      {/* Footer Disclaimer */}
      <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This list provides high-level account information only.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Private communications and real-time activity are not visible.
        </p>
      </div>
    </div>
  );
};

export default UsersVolunteersPage;
