import React, { useState, useMemo } from 'react';
import Table from '../components/common/Table';
import { motion } from 'framer-motion';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { 
  ChevronDown, 
  Search, 
  Filter, 
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Flag,
  MessageSquare,
  Users
} from 'lucide-react';

const IncidentReviewPage = () => {
  const { toast } = useAlert();
  const [selectedIncident, setSelectedIncident] = useState(10123);
  const [processingAction, setProcessingAction] = useState(null);

  const handleAction = async (action, message) => {
    setProcessingAction(action);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setProcessingAction(null);
    toast.success(message);
  };

  // Mock Data
  const incidents = [
    { id: 10123, date: 'Jan 14, 2022 - 8:10 PM', category: 'Calm Presence', scenario: 'Info Request', outcome: 'Calm Resolution', status: 'Closed', outcomeType: 'neutral' },
    { id: 10098, date: 'Jan 5, 2022 - 6:45 PM', category: 'Prevent', scenario: 'Rising Tension', outcome: 'Safety Concern', status: 'Closed', outcomeType: 'warning' },
    { id: 10085, date: 'Dec 28, 2021 - 3:30 PM', category: 'Care & Support', scenario: 'Welfare Check', outcome: 'Cancelled by User', status: 'Closed', outcomeType: 'negative' },
    { id: 10072, date: 'Dec 12, 2021 - 1:20 PM', category: 'Right Help', scenario: 'Assist Needed', outcome: 'Emergency Contact', status: 'Closed', outcomeType: 'neutral' },
    { id: 10058, date: 'Dec 3, 2021 - 5:00 PM', category: 'Calm Presence', scenario: 'Noise Complaint', outcome: 'No Response', status: 'Closed', outcomeType: 'neutral' },
  ];

  const currentIncident = incidents.find(i => i.id === selectedIncident) || incidents[0];

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const columns = [
    { header: 'ID', accessor: 'id', className: 'font-medium text-gray-900 dark:text-white' },
    { header: 'Date & Time', accessor: 'date' },
    { header: 'Category', accessor: 'category', className: 'text-gray-900 dark:text-white' },
    { header: 'Scenario', accessor: 'scenario' },
    { 
      header: 'Outcome', 
      accessor: 'outcome',
      render: (row) => (
        <span className={`
          ${row.outcomeType === 'negative' ? 'text-red-600 dark:text-red-400' : ''}
          ${row.outcomeType === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : ''}
          ${row.outcomeType === 'neutral' ? 'text-gray-900 dark:text-white' : ''}
        `}>
          {row.outcome}
        </span>
      )
    },
    { header: 'Status', accessor: 'status' }
  ];

  const filteredData = useMemo(() => {
    return incidents.filter(item => 
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.scenario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toString().includes(searchTerm)
    );
  }, [incidents, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const renderOutcomeBadge = (outcome, type) => {
    let classes = "px-2 py-1 rounded text-xs font-medium ";
    if (type === 'negative') classes += "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    else if (type === 'warning') classes += "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    else classes += "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    
    return <span className={classes}>{outcome}</span>;
  };

  return (
    <div className="flex flex-col min-h-screen pb-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Incident Review</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Post-event analysis for learning and platform safety</p>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative w-full md:w-auto">
          <select className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full pl-3 pr-8 py-2">
            <option>Date Range</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>
        
        <div className="relative w-full md:w-auto">
          <select className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full pl-3 pr-8 py-2">
            <option>Category</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>

        <div className="relative w-full md:w-auto">
          <select className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full pl-3 pr-8 py-2">
            <option>Scenario</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>

        <div className="relative w-full md:w-auto">
          <select className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full pl-3 pr-8 py-2">
            <option>Outcome Tag</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>

        <div className="relative w-full md:w-auto">
          <select className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md focus:ring-socius-red focus:border-socius-red block w-full pl-3 pr-8 py-2">
            <option>Cluster / City</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>

        <div className="flex w-full md:w-auto gap-2 ml-auto sm:ml-0">
            <Button 
              variant="secondary" 
              className="flex-1 md:flex-none px-4 py-2 text-sm shadow-sm"
              onClick={() => handleAction('export_top', 'Exporting incident report...')}
              loading={processingAction === 'export_top'}
              disabled={!!processingAction}
            >
            {processingAction === 'export_top' ? 'Exporting...' : 'Export'}
            </Button>
            <Button 
              variant="primary" 
              className="flex-1 md:flex-none px-4 py-2 text-sm shadow-sm"
              onClick={() => handleAction('apply_filters', 'Filters applied')}
              loading={processingAction === 'apply_filters'}
              disabled={!!processingAction}
            >
            {processingAction === 'apply_filters' ? 'Applying...' : 'Apply Filters'}
            </Button>
        </div>
        <button className="w-full md:w-auto text-sm text-socius-red font-medium hover:text-red-800 text-center md:text-left transition-colors">
          Reset
        </button>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Incident List */}
        <div className="lg:col-span-8">
          <Table
            title="Incident List"
            columns={columns}
            data={paginatedData}
            onSearch={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search incidents..."
            pagination={{
              currentPage,
              totalPages: Math.ceil(filteredData.length / itemsPerPage),
              totalItems: filteredData.length,
              itemsPerPage
            }}
            onPageChange={setCurrentPage}
            onRowClick={(row) => setSelectedIncident(row.id)}
            rowClassName={(row) => row.id === selectedIncident ? 'bg-red-50 dark:bg-red-900/10' : ''}
          />
        </div>

        {/* Right Column: Incident Summary */}
        <Card className="lg:col-span-4 flex flex-col p-0">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Incident Summary</h3>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Header Info */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ID: {currentIncident.id}</h2>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p><span className="font-medium text-gray-500 dark:text-gray-400">Date:</span> {currentIncident.date}</p>
                <p><span className="font-medium text-gray-500 dark:text-gray-400">Category:</span> <span className="font-medium text-gray-900 dark:text-white">{currentIncident.category}</span></p>
                <p><span className="font-medium text-gray-500 dark:text-gray-400">Scenario:</span> <span className="font-medium text-gray-900 dark:text-white">{currentIncident.scenario}</span></p>
              </div>
            </div>

            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><span className="font-medium text-gray-500 dark:text-gray-400">Radius Used:</span> 500 meters</p>
              <p><span className="font-medium text-gray-500 dark:text-gray-400">Users Viewed:</span> 45</p>
              <p><span className="font-medium text-gray-500 dark:text-gray-400">Volunteers Aware:</span> 18</p>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Timeline</h4>
              <div className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-4">
                {[
                  "Awareness request created",
                  "12 volunteers became aware",
                  "Navigation opened (6)",
                  "Incident closed"
                ].map((event, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={index} 
                    className="relative"
                  >
                    <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{event}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Outcome Tags */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Outcome Tags</h4>
              <div className="flex flex-wrap gap-2">
                {renderOutcomeBadge(currentIncident.outcome, currentIncident.outcomeType)}
                {currentIncident.outcomeType === 'negative' && renderOutcomeBadge('Cancelled by User', 'negative')}
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Feedback Signals */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Feedback Signals</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {[
                  { label: "User Feedback: 12", color: "bg-gray-400" },
                  { label: "Volunteer Feedback: 8", color: "bg-gray-400" },
                  { label: "Flags Raised: 0", color: "bg-gray-400" }
                ].map((signal, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + (index * 0.1) }}
                    key={index} 
                    className="flex items-center"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${signal.color}`}></div>
                    <span>{signal.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>
        </Card>
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-700 pt-6">
        <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center sm:text-left">
          Incident reviews are anonymized and used only for learning, safety, and platform improvement.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button 
            variant="primary" 
            className="px-4 py-2 text-sm font-medium shadow-sm"
            onClick={() => handleAction('policy_review', 'Marked for policy review')}
            loading={processingAction === 'policy_review'}
            disabled={!!processingAction}
          >
            Mark for Policy Review
          </Button>
          <Button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 border-transparent text-white text-sm font-medium shadow-sm"
            onClick={() => handleAction('content_team', 'Sent to content team')}
            loading={processingAction === 'content_team'}
            disabled={!!processingAction}
          >
            Send to Content Team
          </Button>
          <Button 
            variant="secondary" 
            className="px-4 py-2 text-sm font-medium shadow-sm"
            onClick={() => handleAction('export_report', 'Anonymized report exported')}
            loading={processingAction === 'export_report'}
            disabled={!!processingAction}
          >
            Export Anonymized Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncidentReviewPage;
