import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  ChevronDown, 
  AlertTriangle 
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { useAlert } from '../hooks/useAlert';

const AuditLogsPage = () => {
  const { confirm, toast } = useAlert();
  const [isComplianceChecked, setIsComplianceChecked] = useState(true);
  const [selectedLog, setSelectedLog] = useState({
    id: 1,
    timestamp: '01/15/2022 14:45',
    category: 'Incident Lifecycle',
    entity: 'User',
    summary: 'Incident created.',
    details: 'Incident ID: INC-56789.',
    relatedId: 'Account ID: ACC-78234',
    referenceId: 'INC-56789'
  });

  const logs = [
    {
      id: 1,
      timestamp: '01/15/2022 14:45',
      logType: 'Incident Lifecycle',
      entity: 'User',
      actionSummary: 'Incident created',
      referenceId: 'INC-56789',
      details: 'Incident created. Incident ID: INC-56789.',
      relatedId: 'Account ID: ACC-78234'
    },
    {
      id: 2,
      timestamp: '01/15/2022 11:20',
      logType: 'Account Actions',
      entity: 'Volunteer',
      actionSummary: 'Volunteer marked availability',
      referenceId: 'ACC-34567',
      details: 'Volunteer status changed to available.',
      relatedId: 'Account ID: ACC-34567'
    },
    {
      id: 3,
      timestamp: '01/14/2022 09:55',
      logType: 'Verification Events',
      entity: 'Admin',
      actionSummary: 'Profile verification approved',
      referenceId: 'ACC-12345',
      details: 'Identity verification approved by admin.',
      relatedId: 'Request ID: REQ-9988'
    },
    {
      id: 4,
      timestamp: '01/13/2022 16:30',
      logType: 'Incident Lifecycle',
      entity: 'User',
      actionSummary: 'Incident closed by user',
      referenceId: 'INC-45632',
      details: 'Incident marked as resolved by reporter.',
      relatedId: 'Account ID: ACC-11223'
    }
  ];

  const exportHistory = [
    {
      date: '02/01/2022',
      requestedBy: 'Admin User',
      legalBasis: 'Court Order',
      scope: 'INC-56789',
      status: 'Generated'
    },
    {
      date: '01/20/2022',
      requestedBy: 'Admin User',
      legalBasis: 'Police Requisition',
      scope: 'ACC-98765',
      status: 'Downloaded'
    }
  ];

  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 5;

  const logColumns = [
    { header: 'Timestamp', accessor: 'timestamp' },
    { header: 'Log Type', accessor: 'logType', className: 'font-medium text-gray-900 dark:text-white' },
    { header: 'Entity', accessor: 'entity' },
    { header: 'Action Summary', accessor: 'actionSummary', className: 'text-gray-900 dark:text-white' },
    { header: 'Reference ID', accessor: 'referenceId', className: 'font-mono' },
  ];

  const exportColumns = [
    { header: 'Export Date', accessor: 'date' },
    { header: 'Requested By', accessor: 'requestedBy' },
    { header: 'Legal Basis', accessor: 'legalBasis' },
    { header: 'Scope', accessor: 'scope' },
    { header: 'Status', accessor: 'status', render: (row) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        row.status === 'Generated' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' :
        'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
      }`}>
        {row.status}
      </span>
    )},
  ];

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.actionSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.logType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const handleGenerateExport = async () => {
    if (!isComplianceChecked) {
      toast.error('You must confirm compliance with applicable law.');
      return;
    }

    const result = await confirm({
      title: 'Generate Export?',
      text: "This will generate a downloadable file containing sensitive data.",
      icon: 'warning',
      confirmButtonText: 'Yes, generate export',
      confirmButtonColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    });
    
    if (result.isConfirmed) {
      setIsExporting(true);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate generation time
      setIsExporting(false);
      toast.success('Export generation started');
    }
  };

  const handleSearch = () => {
    toast.success('Search filters applied');
  };

  const handlePreview = () => {
    toast.success('📄 Export preview generated');
  };

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs & Legal Exports</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          System records for compliance, review, and lawful disclosure
        </p>
      </motion.div>

      {/* Audit Log Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Audit Log Filters</h3>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="01/01/2022 - 01/31/2022"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-socius-red focus:border-socius-red sm:text-sm"
              />
            </div>
            
            <select className="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-socius-red focus:border-socius-red sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Account Actions</option>
              <option>Incident Lifecycle</option>
              <option>Verification Events</option>
            </select>

            <select className="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-socius-red focus:border-socius-red sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>User</option>
              <option>Volunteer</option>
              <option>Admin</option>
            </select>

            <select className="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-socius-red focus:border-socius-red sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Incident ID:</option>
              <option>Reference ID:</option>
            </select>

            <Button variant="secondary" className="bg-gray-600 hover:bg-gray-700 text-white border-transparent" onClick={handleSearch}>
              Search
            </Button>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audit Log Records Table */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 overflow-hidden flex flex-col"
        >
          <Table 
            title="Audit Log Records"
            columns={logColumns}
            data={paginatedLogs}
            onSearch={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search logs..."
            pagination={{
              currentPage,
              totalPages: Math.ceil(filteredLogs.length / itemsPerPage),
              totalItems: filteredLogs.length,
              itemsPerPage
            }}
            onPageChange={setCurrentPage}
            onRowClick={(log) => setSelectedLog({
              ...log,
              category: log.logType,
              summary: log.actionSummary
            })}
          />
        </motion.div>

        {/* Log Details Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="h-fit"
        >
        <Card className="overflow-hidden h-fit p-0">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-600 text-white flex justify-between items-center">
            <h3 className="text-sm font-semibold">Log Details</h3>
            <ChevronDown className="w-4 h-4" />
          </div>
          
          <AnimatePresence mode="wait">
            {selectedLog ? (
              <motion.div
                key={selectedLog.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="p-4 space-y-4"
              >
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Timestamp:</span>
                  <span className="col-span-2 text-gray-900 dark:text-white">{selectedLog.timestamp}</span>
                  
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Category:</span>
                  <span className="col-span-2 text-gray-900 dark:text-white">{selectedLog.category}</span>
                  
                  <span className="font-semibold text-gray-500 dark:text-gray-400 self-start">Summary:</span>
                  <div className="col-span-2 text-gray-900 dark:text-white">
                    <p>{selectedLog.summary}</p>
                    <p className="font-semibold mt-1">{selectedLog.details}</p>
                  </div>
                  
                  <span className="font-semibold text-gray-500 dark:text-gray-400 mt-2">Related IDs:</span>
                  <span className="col-span-2 text-gray-900 dark:text-white mt-2 font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded w-fit">
                    {selectedLog.relatedId}
                  </span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 italic">
                    This log is system-generated and non-editable.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                Select a log record to view details.
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generate Legal Export */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Generate Legal Export</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Legal Basis:</label>
                <select className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-socius-red focus:border-socius-red rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>Court Order</option>
                  <option>Police Requisition</option>
                  <option>Internal Audit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Number:</label>
                <input
                  type="text"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-socius-red focus:border-socius-red sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Scope:</label>
                <select className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-socius-red focus:border-socius-red rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>Specific Incident (INC-56789)</option>
                  <option>User History</option>
                  <option>All System Logs</option>
                </select>
              </div>
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  defaultValue="01/01/2022 to 01/15/2022"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-socius-red focus:border-socius-red sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <input
                  id="anonymize"
                  name="anonymize"
                  type="checkbox"
                  className="h-4 w-4 text-socius-red focus:ring-socius-red border-gray-300 rounded"
                  defaultChecked
                />
                <label htmlFor="anonymize" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  Export anonymized data only
                </label>
              </div>
              <Button variant="secondary" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600" onClick={handlePreview}>
                Preview Export
              </Button>
            </div>
          </div>
        </Card>
        </motion.div>

        {/* Export Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="h-full"
        >
        <Card className="p-6 flex flex-col justify-between h-full">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 bg-gray-100 dark:bg-gray-700 p-2 rounded">Export Summary</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 ml-1">
              <li className="flex items-start gap-2">
                <span className="font-bold text-gray-800 dark:text-gray-200">• Included:</span> 
                <span>Incident Details, User Actions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-gray-800 dark:text-gray-200">• Excluded:</span> 
                <span>User Identifiers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-gray-800 dark:text-gray-200">• Anonymization:</span> 
                <span>Data anonymized</span>
              </li>
            </ul>
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="flex items-start">
              <input
                id="compliance"
                name="compliance"
                type="checkbox"
                className="h-4 w-4 text-socius-red focus:ring-socius-red border-gray-300 rounded mt-0.5"
                checked={isComplianceChecked}
                onChange={(e) => setIsComplianceChecked(e.target.checked)}
              />
              <label htmlFor="compliance" className="ml-2 block text-sm text-gray-900 dark:text-white font-medium">
                I confirm this export complies with applicable law.
              </label>
            </div>
            <Button 
              className="w-full bg-gray-600 hover:bg-gray-700 text-white" 
              onClick={handleGenerateExport}
              loading={isExporting}
              disabled={isExporting}
            >
              {isExporting ? 'Generating Export...' : 'Generate Export'}
            </Button>
          </div>
        </Card>
        </motion.div>
      </div>

      {/* Export History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Table
          title="Export History"
          columns={exportColumns}
          data={exportHistory}
        />
      </motion.div>

      {/* Warning Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
      >
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-red-800 dark:text-red-300">
            Audit logs exist for accountability and lawful compliance only.
          </h4>
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">
            Socius does not monitor users or incidents in real time.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
            All exports are logged and auditable. Misuse of this function may result in administrative action.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AuditLogsPage;