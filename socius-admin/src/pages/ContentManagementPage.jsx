import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { getStaticPages, updateStaticPage, createStaticPage } from '../services/api/staticPages';
import { createHelpCategoryAdmin, deleteHelpCategoryAdmin, getHelpCategoriesAdmin, updateHelpCategoryAdmin } from '../services/api/helpCategories';
import { baseURL as ADMIN_API_BASE } from '../services/api/client';
import { 
  X, 
  Edit2, 
  Trash2, 
  CheckCircle,
  Plus,
  GripVertical
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
  const [draggingCategoryId, setDraggingCategoryId] = useState(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  // Static Pages State
  const [staticPages, setStaticPages] = useState([]);
  const hasShownCategoryFetchError = useRef(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [categories, setCategories] = useState([]);

  const scenarios = useMemo(
    () => [
      { id: 1, name: 'Broken Down Vehicle', risk: 'Medium', status: 'Active' },
      { id: 2, name: 'Suspicious Activity', risk: 'High', status: 'Draft' },
      { id: 3, name: 'Lost Child', risk: 'High', status: 'Active' },
    ],
    []
  );

  const tabs = [
    'Categories',
    'Scenarios',
    'Do / Don\'t Guidance',
    'Preparedness Content',
    'Static Pages'
  ];

  const fetchStaticPages = useCallback(async () => {
    try {
      const response = await getStaticPages();
      if (response.success) {
        setStaticPages(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch static pages');
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'Static Pages') {
      fetchStaticPages();
    }
  }, [activeTab, fetchStaticPages]);

  useEffect(() => {
    if (activeTab !== 'Categories') {
      hasShownCategoryFetchError.current = false;
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const response = await getHelpCategoriesAdmin();
        const items = response?.data?.items || response?.data?.categories || response?.items || [];
        const root = String(ADMIN_API_BASE || '').endsWith('/api') ? String(ADMIN_API_BASE).slice(0, -4) : String(ADMIN_API_BASE || '');
        if (cancelled) return;
        setCategories(
          (Array.isArray(items) ? items : []).map((c) => ({
            ...c,
            iconUrl: c.iconUrl ? `${root}${c.iconUrl}` : null,
          }))
        );
      } catch (error) {
        if (cancelled) return;
        if (!hasShownCategoryFetchError.current) {
          hasShownCategoryFetchError.current = true;
          const status = error?.response?.status;
          const msg = error?.response?.data?.message || error?.message || 'Failed to fetch help categories';
          toast.error(`${msg}${status ? ` (HTTP ${status})` : ''}`);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, toast]);

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
      try {
        const fd = new FormData();
        fd.append('name', editingCategory?.name || '');
        fd.append('slug', editingCategory?.slug || '');
        fd.append('description', editingCategory?.description || '');
        fd.append('sortOrder', String(editingCategory?.sortOrder ?? 0));
        fd.append('isActive', String(!!editingCategory?.isActive));
        if (editingCategory?.color) fd.append('color', editingCategory.color);
        if (editingCategory?.iconFile) fd.append('icon', editingCategory.iconFile);

        const toastId = toast.loading('Saving category...');
        if (editingCategory?._id) {
          await updateHelpCategoryAdmin(editingCategory._id, fd);
        } else {
          await createHelpCategoryAdmin(fd);
        }
        const response = await getHelpCategoriesAdmin();
        const items = response?.data?.items || response?.data?.categories || response?.items || [];
        const root = String(ADMIN_API_BASE || '').endsWith('/api') ? String(ADMIN_API_BASE).slice(0, -4) : String(ADMIN_API_BASE || '');
        setCategories(
          (Array.isArray(items) ? items : []).map((c) => ({
            ...c,
            iconUrl: c.iconUrl ? `${root}${c.iconUrl}` : null,
          }))
        );
        toast.dismiss(toastId);
        toast.success('Category saved');
      } catch (error) {
        toast.error('Failed to save category');
      }
    }

    setIsSaving(false);
    setIsEditPanelOpen(false);
    setEditingCategory(null);
    setEditingPage(null);
  };

  const handleDelete = async (category) => {
    const result = await confirm({
      title: 'Delete Category?',
      text: `Are you sure you want to delete "${category?.name || 'this category'}"? This cannot be undone.`,
      icon: 'warning',
      confirmButtonText: 'Yes, delete it',
      confirmButtonColor: 'bg-red-600 hover:bg-red-700 text-white',
    });
    
    if (result.isConfirmed) {
      const toastId = toast.loading('Deleting category...');
      try {
        await deleteHelpCategoryAdmin(category._id);
        const response = await getHelpCategoriesAdmin();
        const items = response?.data?.items || response?.data?.categories || response?.items || [];
        const root = String(ADMIN_API_BASE || '').endsWith('/api') ? String(ADMIN_API_BASE).slice(0, -4) : String(ADMIN_API_BASE || '');
        setCategories(
          (Array.isArray(items) ? items : []).map((c) => ({
            ...c,
            iconUrl: c.iconUrl ? `${root}${c.iconUrl}` : null,
          }))
        );
        toast.dismiss(toastId);
        toast.success('Category deleted');
      } catch (error) {
        toast.dismiss(toastId);
        toast.error('Failed to delete category');
      }
    }
  };

  const persistCategoryOrder = async (nextCategories, previousCategories) => {
    const prevMap = new Map((previousCategories || []).map((c) => [String(c._id), Number(c.sortOrder || 0)]));
    const changed = (nextCategories || []).filter((c, idx) => {
      const id = String(c._id || '');
      const prev = prevMap.get(id);
      return Number.isFinite(prev) ? prev !== Number(c.sortOrder || 0) : true;
    });
    if (changed.length === 0) return true;

    const toastId = toast.loading('Saving order...');
    setSavingOrder(true);
    try {
      const results = await Promise.allSettled(
        changed.map((c) => {
          const fd = new FormData();
          fd.append('sortOrder', String(c.sortOrder ?? 0));
          return updateHelpCategoryAdmin(c._id, fd);
        })
      );
      const failed = results.find((r) => r.status === 'rejected');
      if (failed) {
        throw new Error('Failed to save order');
      }
      toast.dismiss(toastId);
      toast.success('Order updated');
      return true;
    } catch (e) {
      toast.dismiss(toastId);
      toast.error('Failed to update order');
      return false;
    } finally {
      setSavingOrder(false);
    }
  };

  const categoryColumns = [
    { header: 'Icon', accessor: 'iconUrl', render: (row) => (
      row.iconUrl ? (
        <img src={row.iconUrl} alt={row.name} className="w-8 h-8 rounded-lg object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700" />
      )
    )},
    { header: 'Name', accessor: 'name', className: 'font-medium text-gray-900 dark:text-white' },
    { header: 'Slug', accessor: 'slug' },
    { header: 'Order', accessor: 'sortOrder' },
    { header: 'Status', accessor: 'isActive', render: (row) => (
      <div className="flex items-center">
        <div className={`h-5 w-5 ${row.isActive ? 'bg-green-600' : 'bg-gray-400'} rounded flex items-center justify-center mr-2`}>
           <CheckCircle className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-gray-700 dark:text-gray-300">{row.isActive ? 'Enabled' : 'Disabled'}</span>
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
          onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
          className="text-socius-red hover:text-brand-dark transition-colors"
          title="Delete"
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
      const q = String(searchTerm || '').toLowerCase().trim();
      const list = [...categories].sort((a, b) => (Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0)));
      if (!q) return list;
      return list.filter((c) => String(c?.name || '').toLowerCase().includes(q) || String(c?.slug || '').toLowerCase().includes(q));
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

  const handleDragStartCategory = (e, id) => {
    if (searchTerm.trim()) return;
    if (savingOrder) return;
    setDraggingCategoryId(String(id));
    setDragOverCategoryId(null);
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(id));
    } catch { }
  };

  const handleDragOverCategory = (e, id) => {
    if (searchTerm.trim()) return;
    if (savingOrder) return;
    e.preventDefault();
    setDragOverCategoryId(String(id));
    try {
      e.dataTransfer.dropEffect = 'move';
    } catch { }
  };

  const handleDropCategory = async (e, targetId) => {
    if (searchTerm.trim()) {
      toast.error('Clear search to reorder');
      return;
    }
    if (savingOrder) return;
    e.preventDefault();

    const sourceId = String(draggingCategoryId || '');
    const destId = String(targetId || '');
    if (!sourceId || !destId || sourceId === destId) return;

    const prev = [...categories].sort((a, b) => (Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0)));
    const fromIndex = prev.findIndex((c) => String(c._id) === sourceId);
    const toIndex = prev.findIndex((c) => String(c._id) === destId);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...prev];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const normalized = next.map((c, idx) => ({ ...c, sortOrder: idx + 1 }));

    setCategories(normalized);
    setDraggingCategoryId(null);
    setDragOverCategoryId(null);

    const ok = await persistCategoryOrder(normalized, prev);
    if (!ok) {
      setCategories(prev);
    }
  };

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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-lg font-semibold text-gray-800 dark:text-white">Categories</div>
                <div className="flex flex-1 items-center justify-end gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:max-w-xs">
                    <input
                      type="text"
                      placeholder="Search categories..."
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setEditingCategory({ name: '', slug: '', description: '', sortOrder: 0, isActive: true, color: '', iconUrl: null, iconFile: null });
                      setIsEditPanelOpen(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-socius-red hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-socius-red"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Create Category
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Move</th>
                      {categoryColumns.map((col, idx) => (
                        <th
                          key={idx}
                          scope="col"
                          className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 ${col.className || ''}`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredData && filteredData.length > 0 ? (
                      filteredData.map((row) => (
                        <tr
                          key={row._id}
                          onDragOver={(e) => handleDragOverCategory(e, row._id)}
                          onDrop={(e) => handleDropCategory(e, row._id)}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            dragOverCategoryId && String(dragOverCategoryId) === String(row._id) ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <button
                              type="button"
                              draggable={!searchTerm.trim() && !savingOrder}
                              onDragStart={(e) => handleDragStartCategory(e, row._id)}
                              onDragEnd={() => {
                                setDraggingCategoryId(null);
                                setDragOverCategoryId(null);
                              }}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded border ${
                                !searchTerm.trim() && !savingOrder
                                  ? 'cursor-move border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                  : 'cursor-not-allowed border-gray-200 dark:border-gray-700 opacity-50'
                              }`}
                              title={searchTerm.trim() ? 'Clear search to reorder' : 'Drag to reorder'}
                            >
                              <GripVertical className="w-4 h-4" />
                            </button>
                          </td>
                          {categoryColumns.map((col, idx) => (
                            <td key={idx} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 ${col.className || ''}`}>
                              {col.render ? col.render(row) : row[col.accessor]}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={categoryColumns.length + 1} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                          No data found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                Drag rows up/down to update order. {searchTerm.trim() ? 'Clear search to reorder.' : ''}
              </div>
            </div>
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
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                    />
                  </div>

                  <div>
                    <label htmlFor="categorySlug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slug (key used in app)
                    </label>
                    <input
                      type="text"
                      id="categorySlug"
                      value={editingCategory?.slug || ''}
                      onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                      placeholder="print_document"
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
                      onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2 border resize-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      id="sortOrder"
                      value={editingCategory?.sortOrder ?? 0}
                      onChange={(e) => setEditingCategory({ ...editingCategory, sortOrder: Number(e.target.value) })}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                    />
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      value={editingCategory?.isActive ? 'enabled' : 'disabled'}
                      onChange={(e) => setEditingCategory({ ...editingCategory, isActive: e.target.value === 'enabled' })}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="iconFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Icon (upload)
                    </label>
                    <input
                      type="file"
                      id="iconFile"
                      accept="image/*"
                      onChange={(e) => setEditingCategory({ ...editingCategory, iconFile: e.target.files?.[0] || null })}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                    />
                    {editingCategory?.iconUrl ? (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={editingCategory.iconUrl} alt="icon" className="w-10 h-10 rounded-lg object-cover" />
                        <div className="text-xs text-gray-500 dark:text-gray-400">Current icon</div>
                      </div>
                    ) : null}
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
