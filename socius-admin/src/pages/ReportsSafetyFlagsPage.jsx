import React, { useState, useMemo } from 'react';
import Table from '../components/common/Table';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { 
  ChevronDown, 
  Search, 
  Filter, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  FileText,
  AlertOctagon
} from 'lucide-react';

const ReportsSafetyFlagsPage = () => {
  const { confirm, toast } = useAlert();
  const [selectedReportId, setSelectedReportId] = useState('R1018');
  const [processingAction, setProcessingAction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Mock Data for Reports List
  const reports = [
    { id: 'R1023', source: 'Volunteer', type: 'Boundary Conc', severity: 'Medium', submitted: '04/21/2024', status: 'In Review' },
    { id: 'R1018', source: 'User', type: 'Safety Risk', severity: 'High', submitted: '04/20/2024', status: 'New' },
    { id: 'R1004', source: 'System', type: 'Harassment', severity: 'Low', submitted: '04/19/2024', status: 'Closed' },
    { id: 'R0997', source: 'User', type: 'Misuse', severity: 'Medium', submitted: '04/18/2024', status: 'In Review' },
    { id: 'R0982', source: 'Volunteer', type: 'False Reporting', severity: 'Low', submitted: '04/17/2024', status: 'Closed' },
  ];

  const columns = [
    { header: 'ID', accessor: 'id', className: 'font-bold text-gray-900 dark:text-white' },
    { header: 'Source', accessor: 'source', className: 'text-gray-600 dark:text-gray-300' },
    { header: 'Type', accessor: 'type', className: 'font-medium text-gray-900 dark:text-white' },
    { 
      header: 'Severity', 
      accessor: 'severity',
      render: (row) => (
        <span className={row.severity === 'High' ? 'text-red-600 font-medium' : row.severity === 'Medium' ? 'text-red-600 font-medium' : 'text-gray-600'}>
          {row.severity}
        </span>
      )
    },
    { header: 'Submitted', accessor: 'submitted', className: 'text-gray-600 dark:text-gray-400' },
    { header: 'Status', accessor: 'status', className: 'text-gray-900 dark:text-white' }
  ];

  const filteredData = useMemo(() => {
    return reports.filter(item => 
      item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.source.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reports, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  // Mock Data for Selected Report Details
  const reportDetails = {
    id: 'R1018',
    submitted: '04/20/2024 15:37',
    source: 'User Report',
    category: 'Safety Risk',
    severity: 'High',
    linkedIncident: {
      id: 'INC0456',
      issue: 'Repeated Violations',
      status: 'Resolved'
    },
    description: "User was making disturbing statements in the chat. I'm worried this could escalate further.",
    isUnverified: true,
    patternSignals: [
      'Multiple reports in same cluster',
      'Previously flagged for concerning behavior'
    ],
    actionLog: '04/20/2024 15:45 - Set to "New Report" status.'
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'text-emerald-600';
      case 'In Review': return 'text-blue-600';
      case 'Closed': return 'text-gray-500';
      default: return 'text-gray-600';
    }
  };

  const handleMarkReviewed = async () => {
    const isConfirmed = await confirm({
      title: 'Mark as Reviewed?',
      text: "This will update the report status and log your action.",
      icon: 'question',
      confirmButtonText: 'Yes, mark reviewed',
      confirmButtonColor: '#3085d6',
    });

    if (isConfirmed) {
      setProcessingAction('reviewed');
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingAction(null);
      toast.success('Report marked as reviewed');
    }
  };

  const handleSendWarning = async () => {
    const isConfirmed = await confirm({
      title: 'Send Warning?',
      text: "This will send a formal warning message to the user.",
      icon: 'warning',
      confirmButtonText: 'Yes, send warning',
      confirmButtonColor: '#d33',
    });

    if (isConfirmed) {
      setProcessingAction('warning');
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingAction(null);
      toast.success('Warning message sent to user');
    }
  };

  const handleRequireReAcceptance = async () => {
    const isConfirmed = await confirm({
      title: 'Require CoC Re-Acceptance?',
      text: "User will be forced to re-accept the Code of Conduct on next login.",
      icon: 'warning',
      confirmButtonText: 'Yes, require re-acceptance',
      confirmButtonColor: '#d33',
    });

    if (isConfirmed) {
      setProcessingAction('reacceptance');
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingAction(null);
      toast.success('User flagged for CoC re-acceptance');
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Safety Flags</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Review potential safety concerns and platform misuse</p>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative w-full md:w-auto">
          <select className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full md:w-40 pl-3 pr-8 py-2">
            <option>Date Range</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>
        
        <div className="relative w-full md:w-auto">
          <select className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full md:w-40 pl-3 pr-8 py-2">
            <option>Report Type</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>

        <div className="relative w-full md:w-auto">
          <select className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full md:w-40 pl-3 pr-8 py-2">
            <option>Severity</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>

        <div className="flex flex-wrap items-center gap-4 ml-0 md:ml-2 text-sm text-gray-700 dark:text-gray-300 w-full md:w-auto">
          <span className="font-medium w-full md:w-auto">Status</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
            <span>New</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="w-3 h-3 rounded-sm bg-slate-700"></div>
            <span>In Review</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="w-3 h-3 rounded-sm bg-red-600"></div>
            <span>Closed</span>
          </label>
        </div>

        <div className="flex w-full md:w-auto gap-2 ml-auto">
          <Button variant="primary" className="flex-1 md:flex-none px-4 py-2 text-sm font-medium shadow-sm">
            Apply Filters
          </Button>
          <button className="flex-1 md:flex-none px-4 py-2 text-socius-red text-sm font-medium hover:text-red-800 border border-gray-200 dark:border-gray-700 md:border-0 rounded-md md:rounded-none transition-colors">
            Reset
          </button>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Reports List */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <Table
            title="Reports"
            columns={columns}
            data={paginatedData}
            onSearch={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search reports..."
            pagination={{
              currentPage,
              totalPages: Math.ceil(filteredData.length / itemsPerPage),
              totalItems: filteredData.length,
              itemsPerPage
            }}
            onPageChange={setCurrentPage}
            onRowClick={(row) => setSelectedReportId(row.id)}
            rowClassName={(row) => row.id === selectedReportId ? 'bg-gray-50 dark:bg-gray-700' : ''}
          />

          {/* Admin Action Log Section at the bottom of left column in design, but structurally fits better here for responsive */}
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Admin Action Log</h4>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {reportDetails.actionLog}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Report Details */}
        <div className="lg:col-span-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedReportId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="flex flex-col p-0">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-xl">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Report Details</h3>
              </div>
              
              <div className="p-6 space-y-6">
                
                {/* Report Summary */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Report Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                    <div className="flex">
                      <span className="w-24 text-gray-500 dark:text-gray-400 font-medium">Report ID:</span>
                      <span className="text-gray-900 dark:text-white font-bold">{reportDetails.id}</span>
                    </div>
                    <div className="flex">
                      <span className="w-24 text-gray-500 dark:text-gray-400 font-medium">Submitted:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{reportDetails.submitted}</span>
                    </div>
                    <div className="flex">
                      <span className="w-24 text-gray-500 dark:text-gray-400 font-medium">Source:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{reportDetails.source}</span>
                    </div>
                    <div className="flex">
                      <span className="w-24 text-gray-500 dark:text-gray-400 font-medium">Category:</span>
                      <span className="text-gray-900 dark:text-white font-bold">{reportDetails.category}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-24 text-gray-500 dark:text-gray-400 font-medium">Severity:</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-600 text-white">
                        {reportDetails.severity}
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* Linked Incident */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Linked Incident</h4>
                  <div className="grid grid-cols-1 gap-y-2 text-sm">
                    <div className="flex">
                      <span className="w-24 text-gray-500 dark:text-gray-400 font-medium">Incident ID:</span>
                      <span className="text-gray-900 dark:text-white font-bold">{reportDetails.linkedIncident.id}</span>
                    </div>
                    <div className="flex">
                      <span className="w-24 text-gray-500 dark:text-gray-400 font-medium">Related Issue:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{reportDetails.linkedIncident.issue}</span>
                    </div>
                    <div className="flex">
                      <span className="w-24 text-gray-500 dark:text-gray-400 font-medium">Status:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{reportDetails.linkedIncident.status}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* Report Description */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Report Description</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-red-600 font-medium">Unverified:</span> {reportDetails.description}
                  </p>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* Pattern Signals */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Pattern Signals</h4>
                  <div className="space-y-2">
                    {reportDetails.patternSignals.map((signal, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{signal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* Admin Review Checklist */}
                <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Admin Review Checklist</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-socius-red border-gray-300 rounded focus:ring-socius-red" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Boundary issue confirmed</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-socius-red border-gray-300 rounded focus:ring-socius-red" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Misuse suspected</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-socius-red border-gray-300 rounded focus:ring-socius-red" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Education required</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-socius-red border-gray-300 rounded focus:ring-socius-red" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Temporary limitation recommended</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-socius-red border-gray-300 rounded focus:ring-socius-red" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">No action needed</span>
                    </label>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button 
                      onClick={handleMarkReviewed}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded shadow-sm uppercase tracking-wide"
                      loading={processingAction === 'reviewed'}
                      disabled={processingAction !== null}
                    >
                      {processingAction === 'reviewed' ? 'Processing...' : 'Mark as Reviewed'}
                    </Button>
                    <Button 
                      onClick={handleSendWarning}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded shadow-sm uppercase tracking-wide"
                      loading={processingAction === 'warning'}
                      disabled={processingAction !== null}
                    >
                      {processingAction === 'warning' ? 'Sending...' : 'Send Warning Message'}
                    </Button>
                    <Button 
                      onClick={handleRequireReAcceptance}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded shadow-sm uppercase tracking-wide"
                      loading={processingAction === 'reacceptance'}
                      disabled={processingAction !== null}
                    >
                      {processingAction === 'reacceptance' ? 'Processing...' : 'Require CoC Re-Acceptance'}
                    </Button>
                  </div>
                </div>

              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center sm:text-left">
          Reports are reviewed to improve safety and platform integrity. Actions are procedural, proportionate, and logged.
        </p>
      </div>
    </div>
  );
};

export default ReportsSafetyFlagsPage;
