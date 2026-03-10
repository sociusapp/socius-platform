import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { getStaticPages, updateStaticPage, createStaticPage } from '../services/api/staticPages';
import { 
  Heart, 
  HandHelping, 
  MessageCircle, 
  UserPlus, 
  UserCheck, 
  X, 
  Edit2, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  Plus,
  FileText
} from 'lucide-react';

const ContentManagementPage = ({ initialTab = 'Categories' }) => {
  const { confirm, toast } = useAlert();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingPage, setEditingPage] = useState(null); // For Static Pages
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Static Pages State
  const [staticPages, setStaticPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Mock Data
  const [categories, setCategories] = useState([
    { id: 1, name: 'Calm Presence', description: 'Promoting a steady and calm approach.', status: 'Enabled', icon: 'heart' },
    { id: 2, name: 'Care & Support', description: 'Offering empathy and assistance.', status: 'Enabled', icon: 'hand' },
    { id: 3, name: 'Right Help', description: 'Connecting to appropriate resources.', status: 'Enabled', icon: 'message' },
    { id: 4, name: 'Prevent / Fix', description: 'Addressing issues to reduce harm.', status: 'Enabled', icon: 'user-plus' },
  ]);

  const [scenarios, setScenarios] = useState([
    { id: 1, name: 'Broken Down Vehicle', risk: 'Medium', status: 'Active' },
    { id: 2, name: 'Suspicious Activity', risk: 'High', status: 'Draft' },
    { id: 3, name: 'Lost Child', risk: 'High', status: 'Active' },
  ]);

  const tabs = [
    'Categories',
    'Scenarios',
    'Do / Don\'t Guidance',
    'Preparedness Content',
    'Static Pages'
  ];

  useEffect(() => {
    if (activeTab === 'Static Pages') {
      fetchStaticPages();
    }
  }, [activeTab]);

  const fetchStaticPages = async () => {
    try {
      setLoadingPages(true);
      const response = await getStaticPages();
      if (response.success) {
        setStaticPages(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch static pages');
    } finally {
      setLoadingPages(false);
    }
  };

  const handleCreatePage = () => {
    navigate('/static-pages/new');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsEditPanelOpen(false);
    setEditingCategory(null);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleEdit = (category) => {
    setEditingCategory({ ...category });
    setIsEditPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsEditPanelOpen(false);
    setEditingCategory(null);
    setEditingPage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    if (editingPage) {
      try {
        let response;
        if (editingPage._id) {
          response = await updateStaticPage(editingPage.slug, editingPage);
        } else {
          response = await createStaticPage(editingPage);
        }

        if (response.success) {
          if (editingPage._id) {
            setStaticPages(prev => prev.map(p => p._id === response.data._id ? response.data : p));
            toast.success('Page updated successfully');
          } else {
            setStaticPages(prev => [...prev, response.data]);
            toast.success('Page created successfully');
          }
        } else {
          toast.error(response.message || 'Failed to save page');
        }
      } catch (error) {
        toast.error('Failed to save page');
      }
    } else {
      // Existing mock save for Categories
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (editingCategory) {
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? editingCategory : c));
      }
      toast.success('Category updated successfully');
    }

    setIsSaving(false);
    setIsEditPanelOpen(false);
    setEditingCategory(null);
    setEditingPage(null);
  };

  const handleDelete = async (categoryName) => {
    const result = await confirm({
      title: 'Delete Category?',
      text: `Are you sure you want to delete "${categoryName}"? This cannot be undone.`,
      icon: 'warning',
      confirmButtonText: 'Yes, delete it',
      confirmButtonColor: 'bg-red-600 hover:bg-red-700 text-white',
    });
    
    if (result.isConfirmed) {
      // Simulate API delay
      const toastId = toast.loading('Deleting category...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setCategories(prev => prev.filter(c => c.name !== categoryName));
      toast.dismiss(toastId);
      toast.success(`Category "${categoryName}" deleted`);
    }
  };

  const renderIcon = (iconName) => {
    const commonClasses = "w-6 h-6 fill-current";
    switch (iconName) {
      case 'heart': return <Heart className={commonClasses} />;
      case 'hand': return <HandHelping className={commonClasses} />;
      case 'message': return <MessageCircle className={commonClasses} />;
      case 'user-plus': return <UserPlus className={commonClasses} />;
      case 'user-check': return <UserCheck className={commonClasses} />;
      default: return <Heart className={commonClasses} />;
    }
  };

  const categoryColumns = [
    { header: 'Category Name', accessor: 'name', className: 'font-medium text-gray-900 dark:text-white' },
    { header: 'Description', accessor: 'description' },
    { header: 'Status', accessor: 'status', render: (row) => (
      <div className="flex items-center">
        <div className="h-5 w-5 bg-green-600 rounded flex items-center justify-center mr-2">
           <CheckCircle className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-gray-700 dark:text-gray-300">{row.status}</span>
      </div>
    )},
    { header: 'Action', accessor: 'actions', render: (row) => (
      <div className="flex items-center space-x-3">
        <button 
          onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
          className="text-socius-red hover:text-brand-dark transition-colors"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); handleDelete(row.name); }}
          className="text-socius-red hover:text-brand-dark transition-colors"
          title="Disable"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )}
  ];

  const scenarioColumns = [
    { header: 'Scenario Name', accessor: 'name', className: 'font-medium text-gray-900 dark:text-white' },
    { header: 'Risk Tier', accessor: 'risk', render: (row) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        row.risk === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
        row.risk === 'Medium' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' :
        'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
      }`}>
        {row.risk}
      </span>
    )},
    { header: 'Status', accessor: 'status' },
    { header: 'Action', accessor: 'actions', render: (row) => (
       <Link to="/content/scenario-config" className="text-socius-red hover:text-brand-dark">Edit</Link>
    )}
  ];

  const staticPageColumns = [
    { header: 'Title', accessor: 'title', className: 'font-medium text-gray-900 dark:text-white' },
    { header: 'Section', accessor: 'section', render: (row) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
        {row.section.charAt(0).toUpperCase() + row.section.slice(1)}
      </span>
    )},
    { header: 'Last Updated', accessor: 'updatedAt', render: (row) => new Date(row.updatedAt).toLocaleDateString() },
    { header: 'Action', accessor: 'actions', render: (row) => (
      <button 
        onClick={(e) => { e.stopPropagation(); handleEditPage(row); }}
        className="text-socius-red hover:text-brand-dark transition-colors"
        title="Edit"
      >
        <Edit2 className="w-4 h-4" />
      </button>
    )}
  ];

  const filteredData = useMemo(() => {
    if (activeTab === 'Categories') {
      return categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    } else if (activeTab === 'Scenarios') {
      return scenarios.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    } else if (activeTab === 'Static Pages') {
      return staticPages.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return [];
  }, [activeTab, categories, scenarios, staticPages, searchTerm]);

  const handleEditPage = (page) => {
    navigate(`/static-pages/edit/${page.slug}`);
  };

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.32))]">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Content Management</h1>
        <p className="mt-1 text-sm md:text-base text-gray-500 dark:text-gray-400">Manage categories, scenarios, and user guidance content</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-socius-red text-white bg-socius-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
          {/* Spacer to fill the rest of the tab line if needed, or just let it be */}
          <div className="flex-1 border-b border-gray-200 dark:border-gray-700"></div>
        </div>
      </div>

      {/* Main Content Area */}
      <Card className="flex flex-1 shadow rounded-t-none rounded-b-lg overflow-hidden relative p-0">
        
        {/* Left Side: Table */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'Categories' && (
            <Table 
              columns={categoryColumns}
              data={paginatedData}
              onSearch={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              searchPlaceholder="Search categories..."
              pagination={{
                currentPage,
                totalPages: Math.ceil(filteredData.length / itemsPerPage),
                totalItems: filteredData.length,
                itemsPerPage
              }}
              onPageChange={setCurrentPage}
              actions={
                <button 
                  onClick={() => {
                    setEditingCategory({ name: '', description: '', status: 'Enabled', icon: 'heart' });
                    setIsEditPanelOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-socius-red hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-socius-red"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Category
                </button>
              }
            />
          )}

          {activeTab === 'Scenarios' && (
            <Table 
              columns={scenarioColumns}
              data={paginatedData}
              onSearch={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              searchPlaceholder="Search scenarios..."
              pagination={{
                currentPage,
                totalPages: Math.ceil(filteredData.length / itemsPerPage),
                totalItems: filteredData.length,
                itemsPerPage
              }}
              onPageChange={setCurrentPage}
              actions={
                <Link 
                  to="/content/scenario-config" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-socius-red hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-socius-red"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Scenario
                </Link>
              }
            />
          )}

          {activeTab === 'Static Pages' && (
            <Table 
              columns={staticPageColumns}
              data={paginatedData}
              onSearch={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              searchPlaceholder="Search pages..."
              pagination={{
                currentPage,
                totalPages: Math.ceil(filteredData.length / itemsPerPage),
                totalItems: filteredData.length,
                itemsPerPage
              }}
              onPageChange={setCurrentPage}
              actions={
                <button 
                  onClick={handleCreatePage}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-socius-red hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-socius-red"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Page
                </button>
              }
            />
          )}

          {activeTab !== 'Categories' && activeTab !== 'Scenarios' && activeTab !== 'Static Pages' && (
             <div className="text-center py-10 text-gray-500">
                Content for {activeTab} will be implemented soon.
             </div>
          )}
        </div>

        {/* Right Side: Edit Panel */}
        <AnimatePresence>
        {isEditPanelOpen && (
          <motion.div 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-white dark:bg-gray-800 flex flex-col z-20"
          >
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between md:rounded-t-xl">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingPage ? 'Edit Page' : 'Edit Category'}
              </h2>
              <button 
                onClick={handleClosePanel}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {/* Category Edit Form */}
                <>
                  <div>
                    <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category Name
                    </label>
                    <input
                      type="text"
                      id="categoryName"
                      value={editingCategory?.name || ''}
                      onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                    />
                  </div>

                  {/* Short Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Short Description
                    </label>
                    <textarea
                      id="description"
                      rows={2}
                      value={editingCategory?.description || ''}
                      onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2 border resize-none"
                    />
                  </div>

                  {/* Icon Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Icon
                    </label>
                    <div className="flex space-x-3">
                      {['heart', 'hand', 'message', 'user-plus', 'user-check'].map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setEditingCategory({...editingCategory, icon})}
                          className={`w-12 h-12 flex items-center justify-center rounded-md transition-all duration-200 ${
                            editingCategory?.icon === icon
                              ? 'border-2 border-socius-red bg-white text-socius-red shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-transparent'
                          }`}
                        >
                          {renderIcon(icon)}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex gap-3">
              <Button 
                variant="primary" 
                className="flex-1"
                onClick={handleSave}
                loading={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                variant="secondary" 
                className="flex-1"
                onClick={handleClosePanel}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </Card>

      {/* Bottom Disclaimer */}
      <div className="mt-6 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          All content published here is informational. Socius does <span className="italic font-medium">not</span> instruct, coordinate, or enforce actions.
        </p>
      </div>
    </div>
  );
};

export default ContentManagementPage;
