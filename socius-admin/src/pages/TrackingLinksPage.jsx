import React, { useState, useEffect } from 'react';
import { Plus, Link2, Copy, Trash2, Edit2, ExternalLink, BarChart3, Users, MapPin, CheckCircle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api, baseURL } from '../services/api/client';
import { toast } from 'react-hot-toast';

const TrackingLinksPage = () => {
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    campaign: 'default',
    expiresAt: ''
  });

  const baseUrl = baseURL.replace('/api', '');
  const URL_PREFIX = 'xxx'; // The prefix for custom tracking URLs

  const fetchLinks = async () => {
    try {
      const response = await api.get('/tracking-links');
      if (response.data.success) {
        setLinks(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching tracking links:', error);
      toast.error('Failed to fetch tracking links');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/tracking-links', formData);
      if (response.data.success) {
        toast.success('Tracking link created successfully');
        setShowCreateModal(false);
        setFormData({ slug: '', name: '', description: '', campaign: 'default', expiresAt: '' });
        fetchLinks();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create link');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/tracking-links/${editingLink.slug}`, formData);
      if (response.data.success) {
        toast.success('Tracking link updated successfully');
        setEditingLink(null);
        setFormData({ slug: '', name: '', description: '', campaign: 'default', expiresAt: '' });
        fetchLinks();
      }
    } catch (error) {
      toast.error('Failed to update link');
    }
  };

  const handleDelete = async (slug) => {
    if (!window.confirm('Are you sure you want to delete this tracking link?')) return;
    
    try {
      const response = await api.delete(`/tracking-links/${slug}`);
      if (response.data.success) {
        toast.success('Tracking link deleted');
        fetchLinks();
      }
    } catch (error) {
      toast.error('Failed to delete link');
    }
  };

  const [copyBase, setCopyBase] = useState(baseUrl);
  const [copyPrefix, setCopyPrefix] = useState('xxx');
  const [copySlug, setCopySlug] = useState('');

  const copyToClipboard = (slug) => {
    // If custom slug is set, use it, otherwise use the link's slug
    const finalSlug = copySlug || slug;
    const url = `${copyBase}/${copyPrefix}/${finalSlug}`;
    navigator.clipboard.writeText(url);
    toast.success(`Copied: ${url}`);
  };

  const openEditModal = (link) => {
    setEditingLink(link);
    setFormData({
      slug: link.slug,
      name: link.name,
      description: link.description || '',
      campaign: link.campaign || 'default',
      expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString().slice(0, 16) : ''
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tracking Links</h1>
          <p className="text-gray-500 dark:text-gray-400">Create custom URLs to track specific users or campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Link
          </Button>
        </div>
      </div>

      {/* Copy Configuration */}
      <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Copy Format:</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={copyBase}
              onChange={(e) => setCopyBase(e.target.value)}
              className="w-48 px-2 py-1 text-sm border border-yellow-300 dark:border-yellow-700 rounded focus:ring-2 focus:ring-yellow-500 dark:bg-gray-800"
              placeholder="http://127.0.0.1:48080"
            />
            <span className="text-gray-500">/</span>
            <input
              type="text"
              value={copyPrefix}
              onChange={(e) => setCopyPrefix(e.target.value.replace(/[^a-z0-9_-]/g, '').toLowerCase())}
              className="w-20 px-2 py-1 text-sm border border-yellow-300 dark:border-yellow-700 rounded focus:ring-2 focus:ring-yellow-500 dark:bg-gray-800"
              placeholder="xxx"
            />
            <span className="text-gray-500">/</span>
            <input
              type="text"
              value={copySlug}
              onChange={(e) => setCopySlug(e.target.value.replace(/[^a-z0-9_-]/g, '').toLowerCase())}
              className="w-24 px-2 py-1 text-sm border border-yellow-300 dark:border-yellow-700 rounded focus:ring-2 focus:ring-yellow-500 dark:bg-gray-800"
              placeholder="slug"
            />
          </div>
          <span className="text-xs text-yellow-600 dark:text-yellow-400">
            Leave slug empty to use link's slug
          </span>
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center">
            <Link2 className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Links</p>
              <p className="text-2xl font-bold text-blue-600">{links.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Visits</p>
              <p className="text-2xl font-bold text-green-600">
                {links.reduce((sum, l) => sum + (l.totalVisits || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-purple-50 dark:bg-purple-900/20">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unique Visitors</p>
              <p className="text-2xl font-bold text-purple-600">
                {links.reduce((sum, l) => sum + (l.uniqueVisitors || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center">
            <MapPin className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Locations Captured</p>
              <p className="text-2xl font-bold text-orange-600">
                {links.reduce((sum, l) => sum + (l.successfulCaptures || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Links Table */}
      <Card>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Tracking Links</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : links.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tracking links yet. Create your first one!
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {links.map((link) => (
              <div key={link._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{link.name}</h3>
                      {!link.isActive && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                      {link.expiresAt && new Date(link.expiresAt) < new Date() && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                          Expired
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-mono text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                        {baseUrl}/{URL_PREFIX}/{link.slug}
                      </span>
                      <button
                        onClick={() => copyToClipboard(link.slug)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Copy URL"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </button>
                      <a
                        href={`${baseUrl}/${URL_PREFIX}/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Open Link"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-500" />
                      </a>
                    </div>
                    
                    {link.description && (
                      <p className="text-sm text-gray-500 mt-1">{link.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Campaign: {link.campaign}</span>
                      <span>Created: {new Date(link.createdAt).toLocaleDateString()}</span>
                      {link.expiresAt && (
                        <span>Expires: {new Date(link.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-gray-900 dark:text-white">{link.totalVisits || 0}</p>
                        <p className="text-xs text-gray-500">Visits</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-900 dark:text-white">{link.uniqueVisitors || 0}</p>
                        <p className="text-xs text-gray-500">Unique</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-green-600">{link.successfulCaptures || 0}</p>
                        <p className="text-xs text-gray-500">Locations</p>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(link)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(link.slug)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingLink) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingLink ? 'Edit Tracking Link' : 'Create Tracking Link'}
            </h2>
            
            <form onSubmit={editingLink ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL Slug *
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-l-md text-sm">
                    {baseUrl}/{URL_PREFIX}/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                    placeholder="momtaj"
                    required
                    disabled={!!editingLink}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Only letters, numbers, hyphens and underscores allowed
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="Momtaj's Tracking Link"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  rows={2}
                  placeholder="Optional description..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Campaign
                </label>
                <input
                  type="text"
                  value={formData.campaign}
                  onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="default"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingLink(null);
                    setFormData({ slug: '', name: '', description: '', campaign: 'default', expiresAt: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {editingLink ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TrackingLinksPage;
