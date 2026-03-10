import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { api } from '../services/api/client';

// Icons
const RedFlagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
  </svg>
);

const GreenFlagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
  </svg>
);

const YellowAlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const LiveAwarenessPage = () => {
  const [timeRange, setTimeRange] = useState('Last 6h');
  const [category, setCategory] = useState('All'); // Default to All for better UX
  const [status, setStatus] = useState('All'); // Default to All for better UX
  const [isLoading, setIsLoading] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const navigate = useNavigate();

  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 5;

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  const mapPresenceToIncident = (item) => {
    const rawId = String(item.id || item._id || '');
    const createdAt = item.createdAt ? new Date(item.createdAt) : null;
    const now = new Date();
    const diffMs = createdAt ? now - createdAt : 0;
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    let timeActive = '-';
    if (createdAt) {
      if (hours <= 0) {
        timeActive = `${minutes || 0} min`;
      } else {
        timeActive = `${hours} hr${hours > 1 ? 's' : ''}${remainingMinutes ? ` ${remainingMinutes} min` : ''}`;
      }
    }

    let categoryLabel = 'Calm Presence';
    if (item.situationType === 'being_followed') categoryLabel = 'Routing';
    else if (item.situationType === 'feeling_unsafe') categoryLabel = 'Care';
    else if (item.situationType === 'other') categoryLabel = 'Prevent';

    const statusRaw = item.status;
    let statusLabel = 'Open';
    if (['closed', 'cancelled', 'auto_closed'].includes(statusRaw)) {
      statusLabel = 'Closed';
    }

    const displayId = rawId.slice(-8).toUpperCase() || '-';

    return {
      id: displayId,
      rawId,
      category: categoryLabel,
      status: statusLabel,
      viewers: item.totalNotified ?? 0,
      timeActive,
      flags: 'none',
    };
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchIncidents = async () => {
      setIsLoading(true);
      try {
        const rangeHours =
          timeRange === 'Last 1h' ? 1 : timeRange === 'Last 6h' ? 6 : 24;

        const response = await api.get('/admin/live-awareness', {
          params: { rangeHours },
        });

        const { success, data } = response?.data || {};
        if (success && data && !isCancelled) {
          const mapped =
            Array.isArray(data.items) ? data.items.map(mapPresenceToIncident) : [];
          setIncidents(mapped);
        }
      } catch (error) {
        if (!isCancelled) {
          setIncidents([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchIncidents();

    return () => {
      isCancelled = true;
    };
  }, [timeRange]);

  // Filter Data
  const filteredData = useMemo(() => {
    return incidents.filter(incident => {
      const matchesCategory =
        category === 'All' || incident.category === category;
      const matchesStatus =
        status === 'All' || incident.status === status;
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        incident.id.toLowerCase().includes(search) ||
        (incident.rawId && incident.rawId.toLowerCase().includes(search)) ||
        incident.category.toLowerCase().includes(search);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [incidents, category, status, searchTerm]);

  // Paginate Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const columns = [
    { header: 'Incident ID', accessor: 'id', className: 'font-medium text-gray-900 dark:text-white' },
    { header: 'Category', accessor: 'category', className: 'text-gray-500 dark:text-gray-400' },
    { 
      header: 'Status', 
      accessor: 'status', 
      render: (incident) => (
        incident.status === 'Open' ? (
          <span className="text-sm font-bold text-gray-900 dark:text-white">Open</span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {incident.status}
          </span>
        )
      )
    },
    { header: 'Volunteers Viewing', accessor: 'viewers', className: 'text-center font-medium' },
    { header: 'Time Active', accessor: 'timeActive' },
    { 
      header: 'Flags', 
      accessor: 'flags', 
      render: (incident) => (
        <>
          {incident.flags === 'red' && <RedFlagIcon />}
          {incident.flags === 'yellow' && <YellowAlertIcon />}
          {incident.flags === 'green' && <GreenFlagIcon />}
        </>
      )
    },
    { 
      header: 'Action', 
      accessor: 'action', 
      className: 'text-center',
      render: (incident) => (
        <Button 
          variant="secondary"
          onClick={() => navigate(`/live-awareness/${incident.rawId || incident.id}`)}
          className="text-xs px-3 py-1.5"
        >
          View Details
        </Button>
      )
    },
  ];

  return (
    <div className="flex flex-col pb-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Live Awareness</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Currently open awareness requests (information only)
        </p>
      </div>

      {/* Filters */}
      <Card className="flex flex-col md:flex-row flex-wrap items-start md:items-center gap-4 mb-6 p-4">
        {/* Category Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <label htmlFor="category" className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Category:
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full md:w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-socius-red focus:border-socius-red sm:text-sm rounded-md border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option>All</option>
            <option>Calm Presence</option>
            <option>Care</option>
            <option>Routing</option>
            <option>Prevent</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <label htmlFor="status" className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Status:
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => handleFilterChange(setStatus, e.target.value)}
            disabled={isLoading}
            className="block w-full md:w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-socius-red focus:border-socius-red sm:text-sm rounded-md border dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
          >
            <option>All</option>
            <option>Open</option>
            <option>Frozen</option>
            <option>Merged</option>
            <option>Closed</option>
          </select>
        </div>

        {/* Time Range Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto md:ml-auto">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 sm:mr-2">Time Range:</span>
          <div className="inline-flex rounded-md shadow-sm w-full sm:w-auto" role="group">
            {['Last 1h', 'Last 6h', 'Last 24h'].map((range, idx) => (
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                key={range}
                type="button"
                onClick={() => handleFilterChange(setTimeRange, range)}
                disabled={isLoading}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium border ${
                  idx === 0 ? 'rounded-l-lg' : ''
                } ${idx === 2 ? 'rounded-r-lg' : ''} ${
                  timeRange === range
                    ? 'z-10 bg-gray-100 text-blue-600 border-gray-200 dark:bg-gray-700 dark:text-white dark:border-gray-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {range}
              </motion.button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Table 
        columns={columns}
        data={paginatedData}
        isLoading={isLoading}
        onSearch={(value) => setSearchTerm(value)}
        searchPlaceholder="Search by ID or Category..."
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredData.length,
          itemsPerPage
        }}
        onPageChange={setCurrentPage}
      />

      {/* Footer Disclaimer */}
      <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
          Live awareness data is limited to aggregated indicators. No live tracking, messaging, or intervention tools are available.
        </p>
      </div>
    </div>
  );
};

export default LiveAwarenessPage;
