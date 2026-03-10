import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ArrowLeft, Save } from 'lucide-react';
import { useAlert } from '../hooks/useAlert';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { getStaticPageBySlug, updateStaticPage, createStaticPage } from '../services/api/staticPages';

const StaticPageEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useAlert();
  const isEditMode = !!slug;

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    section: 'privacy',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      fetchPage();
    }
  }, [isEditMode, slug]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      // Assuming getStaticPageBySlug exists or we fetch all and find one. 
      // Ideally backend should support get by slug. 
      // If not, we might need to adjust this. 
      // For now, let's assume getStaticPageBySlug is available or we use getStaticPages and filter.
      // Checking previous file content, only getStaticPages was imported.
      // Let's try to fetch all and filter for now if specific API is missing, 
      // or check api/staticPages.js content.
      const response = await getStaticPageBySlug(slug);
      if (response.success) {
        setFormData(response.data);
      } else {
        toast.error('Failed to fetch page details');
        navigate('/static-pages');
      }
    } catch (error) {
      console.error('Error fetching page:', error);
      toast.error('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug) {
      toast.error('Title and Slug are required');
      return;
    }

    try {
      setSaving(true);
      let response;
      
      if (isEditMode) {
        response = await updateStaticPage(slug, formData);
      } else {
        response = await createStaticPage(formData);
      }

      if (response.success) {
        toast.success(`Page ${isEditMode ? 'updated' : 'created'} successfully`);
        navigate('/static-pages');
      } else {
        toast.error(response.message || 'Failed to save page');
      }
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-socius-red"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/static-pages')}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? 'Edit Static Page' : 'Create New Page'}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isEditMode ? 'Update existing content' : 'Add a new static page to the application'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate('/static-pages')}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            className="bg-socius-red hover:bg-red-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isEditMode ? 'Update Page' : 'Publish Page'}
          </Button>
        </div>
      </div>

      <Card className="p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="space-y-6">
          {/* Title & Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Page Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Privacy Policy"
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2.5 border"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 sm:text-sm">
                  /
                </span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="privacy-policy"
                  className="flex-1 min-w-0 block w-full rounded-none rounded-r-md border-gray-300 dark:border-gray-600 focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2.5 border"
                />
              </div>
            </div>
          </div>

          {/* Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Section Category
            </label>
            <select
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              className="w-full md:w-1/3 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2.5 border"
            >
              <option value="privacy">Privacy & Data</option>
              <option value="safety">Safety & Conduct</option>
              <option value="legal">Legal & Terms</option>
              <option value="support">Help & Support</option>
            </select>
          </div>

          {/* Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Page Content
            </label>
            <div className="prose max-w-none ck-content-wrapper">
              <style>{`
                /* Common overrides */
                .ck-editor__editable_inline {
                  min-height: 400px;
                  border-bottom-left-radius: 0.5rem !important;
                  border-bottom-right-radius: 0.5rem !important;
                }
                .ck-toolbar {
                  border-top-left-radius: 0.5rem !important;
                  border-top-right-radius: 0.5rem !important;
                }
                
                /* Dark Mode Theme Variables for CKEditor 5 */
                .dark .ck.ck-reset,
                .dark .ck.ck-reset_all,
                .dark .ck-content-wrapper {
                    --ck-color-base-foreground: #374151;
                    --ck-color-base-background: #1f2937;
                    --ck-color-base-border: #4b5563;
                    --ck-color-base-action: #5a6fa3;
                    --ck-color-base-focus: #5a6fa3;
                    --ck-color-text: #e5e7eb;
                    --ck-color-shadow-drop: hsla(0, 0%, 0%, 0.2);
                    --ck-color-shadow-inner: hsla(0, 0%, 0%, 0.1);
                    --ck-color-button-default-background: transparent;
                    --ck-color-button-default-hover-background: #374151;
                    --ck-color-button-default-active-background: #4b5563;
                    --ck-color-button-default-active-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
                    --ck-color-button-default-disabled-background: transparent;
                    --ck-color-button-on-background: #374151;
                    --ck-color-button-on-hover-background: #4b5563;
                    --ck-color-button-on-active-background: #4b5563;
                    --ck-color-button-on-active-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
                    --ck-color-button-on-disabled-background: #374151;
                    --ck-color-button-action-background: #5a6fa3;
                    --ck-color-button-action-hover-background: #4b5563;
                    --ck-color-button-action-active-background: #4b5563;
                    --ck-color-button-action-active-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
                    --ck-color-button-action-disabled-background: #374151;
                    --ck-color-button-action-text: #e5e7eb;
                    --ck-color-dropdown-panel-background: #1f2937;
                    --ck-color-dropdown-panel-border: #4b5563;
                    --ck-color-input-background: #374151;
                    --ck-color-input-border: #4b5563;
                    --ck-color-input-text: #e5e7eb;
                    --ck-color-list-background: #1f2937;
                    --ck-color-list-button-hover-background: #374151;
                    --ck-color-panel-background: #1f2937;
                    --ck-color-panel-border: #4b5563;
                    --ck-color-toolbar-background: #1f2937;
                    --ck-color-toolbar-border: #4b5563;
                    --ck-color-tooltip-background: #111827;
                    --ck-color-tooltip-text: #e5e7eb;
                    --ck-color-link-default: #60a5fa;
                }
                
                /* Explicit dark mode overrides for elements */
                .dark .ck.ck-editor__main > .ck-editor__editable {
                    background-color: #1f2937 !important;
                    color: #e5e7eb !important;
                }
                .dark .ck.ck-icon {
                    color: #e5e7eb !important;
                }
                .dark .ck.ck-button:hover .ck.ck-icon {
                    color: #fff !important;
                }
                .dark .ck-content blockquote {
                    border-left-color: #4b5563;
                    color: #9ca3af;
                }
              `}</style>
              <CKEditor
                editor={ClassicEditor}
                data={formData.content || ''}
                onChange={(event, editor) => {
                  const data = editor.getData();
                  setFormData({ ...formData, content: data });
                }}
                config={{
                  toolbar: [
                    'heading', '|',
                    'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
                    'blockQuote', 'insertTable', 'undo', 'redo'
                  ],
                  placeholder: 'Start writing your content here...'
                }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StaticPageEditor;
