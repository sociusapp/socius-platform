import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bug,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  MessageSquare,
  Paperclip,
  ExternalLink,
  History,
  Send,
  MoreVertical,
  Copy,
  Check,
  XCircle
} from 'lucide-react';

import { issueTrackerApi, issueTrackerBaseURL } from '../services/api/client';
import { useAlert } from '../hooks/useAlert';
import { useAuth } from '../context/AuthContext';

const IssueDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useAlert();
  const { user } = useAuth();
  const isDeveloper = !!user?.isDeveloper;
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const copyToClipboard = () => {
    if (!issue) return;
    const activityLines = Array.isArray(issue.activity)
      ? issue.activity
          .map((a) => {
            const who = a?.user ? String(a.user) : '-';
            const when = a?.time ? String(a.time) : '';
            const text = a?.text ? String(a.text) : '';
            return `- ${when} ${who}: ${text}`.trim();
          })
          .filter(Boolean)
      : [];

    const apiOrigin = (() => {
      try {
        const normalized = String(issueTrackerBaseURL || '').replace(/\/api\/?$/, '');
        return new URL(normalized).toString().replace(/\/$/, '');
      } catch {
        return 'http://127.0.0.1:48080';
      }
    })();

    const textToCopy =
      `Issue: ${issue.title}\n` +
      `ID: ${issue._id || issue.id}\n` +
      `Platform: ${issue.platform || '-'}\n` +
      `Flow: ${issue.flow || '-'}\n` +
      `Category: ${issue.category || '-'}\n` +
      `Priority: ${issue.priority || '-'}\n` +
      `Status: ${issue.status || '-'}\n` +
      (issue.occurredAt ? `Occurred At: ${new Date(issue.occurredAt).toLocaleString()}\n` : '') +
      `Description:\n${issue.description || ''}\n` +
      (issue.screenshot ? `Screenshot: ${apiOrigin}${issue.screenshot}\n` : '') +
      (activityLines.length ? `\nActivity & Discussion:\n${activityLines.join('\n')}\n` : '');

    // Check if navigator.clipboard is available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy using navigator.clipboard:', err);
        fallbackCopyToClipboard(textToCopy);
      });
    } else {
      // Fallback for non-secure contexts
      fallbackCopyToClipboard(textToCopy);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;

      // Ensure the textarea is not visible
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
  };

  const fetchIssue = async () => {
    try {
      const response = await issueTrackerApi.get(`/admin-issues/${id}`);
      if (response.data.success) {
        setIssue(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch issue details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    if (!isDeveloper) {
      if (newStatus !== 'Pending' && newStatus !== 'Completed') return;
    }
    setIsUpdating(true);
    try {
      const response = await issueTrackerApi.patch(`/admin-issues/${id}`, { status: newStatus });
      if (response.data.success) {
        toast.success(`Status updated to ${newStatus}`);
        setIssue(response.data.data);
      }
    } catch (error) {
      const statusCode = error?.response?.status;
      const message = error?.response?.data?.message || error?.message || 'Failed to update status';
      toast.error(message);
      if (statusCode === 401) {
        try {
          localStorage.removeItem('socius_user');
        } catch { }
        navigate('/login');
      }
      console.error('Status update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateAIEnabled = async (enabled) => {
    if (!isDeveloper) return;
    setIsUpdating(true);
    try {
      const response = await issueTrackerApi.patch(`/admin-issues/${id}`, { aiEnabled: enabled });
      if (response.data.success) {
        toast.success(enabled ? 'AI automation enabled' : 'AI automation disabled');
        setIssue(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to update AI automation');
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsUpdating(true);
    try {
      const response = await issueTrackerApi.patch(`/admin-issues/${id}`, { activityText: newComment });
      if (response.data.success) {
        setIssue(response.data.data);
        setNewComment('');
        toast.success('Comment added');
      }
    } catch (error) {
      toast.error('Failed to add comment');
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-socius-red"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
          <Bug size={32} />
        </div>
        <h2 className="text-xl font-bold dark:text-white">Issue Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400">The issue you're looking for doesn't exist or has been deleted.</p>
        <button
          onClick={() => navigate('/issue-tracker')}
          className="bg-socius-red text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-all"
        >
          Back to Tracker
        </button>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/issue-tracker')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft className="text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded uppercase">
                ID: {issue._id || issue.id}
              </span>
              {issue.occurredAt && (
                <span className="text-xs font-medium text-socius-red bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                  Occurred: {new Date(issue.occurredAt).toLocaleString()}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(issue.status)}`}>
                {issue.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{issue.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isDeveloper && (
            <>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={!!issue.aiEnabled}
                  onChange={(e) => handleUpdateAIEnabled(e.target.checked)}
                  disabled={isUpdating}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                />
                AI Automation
              </label>
              <select
                value={issue.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={isUpdating}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-socius-red/50 dark:text-white disabled:opacity-50"
              >
                <option value="Pending">Set Pending</option>
                <option value="In Progress">Set In Progress</option>
                <option value="Completed">Set Completed</option>
              </select>
              <button className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <MoreVertical size={20} className="text-gray-500" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden group/card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Description</h3>
              {isDeveloper && (
                <button
                  onClick={copyToClipboard}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 hover:bg-socius-red/10 hover:text-socius-red'
                    }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy for AI'}
                </button>
              )}
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {issue.description}
            </p>

            {/* Attachments/Screenshots */}
            <div className="mt-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Paperclip size={16} />
                Screenshots
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {issue.screenshot ? (
                  <div className="aspect-video bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group relative">
                    <img src={`http://127.0.0.1:48080${issue.screenshot}`} alt="Screenshot" className="w-full h-full object-cover" />
                    <a
                      href={`http://127.0.0.1:48080${issue.screenshot}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <ExternalLink className="text-white" size={24} />
                    </a>
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400">
                    <p className="text-xs">No screenshot</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity / Discussion */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <History size={20} className="text-socius-red" />
                Activity & Discussion
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {issue.activity && issue.activity.map((item) => (
                <div key={item._id || item.id} className="flex gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.type === 'status'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                    }`}>
                    {item.type === 'status' ? <Clock size={16} /> : <User size={16} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm dark:text-white">{item.user}</span>
                      <span className="text-xs text-gray-400">{item.time}</span>
                    </div>
                    <p className={`text-sm ${item.type === 'status'
                        ? 'text-gray-500 italic'
                        : 'text-gray-700 dark:text-gray-300'
                      }`}>
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Comment */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">
              <form onSubmit={handleAddComment} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Type a comment or update..."
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-socius-red/50 dark:text-white"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-socius-red hover:bg-red-700 text-white p-2 rounded-lg transition-all shadow-lg shadow-red-500/20"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Issue Properties</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                  <div className="w-2 h-2 rounded-full bg-socius-red"></div>
                  {issue.category}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Priority</label>
                <div className={`flex items-center gap-2 font-bold ${issue.priority === 'High' ? 'text-red-600' : 'text-orange-500'
                  }`}>
                  <AlertCircle size={16} />
                  {issue.priority}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Reported By</label>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                  <User size={16} className="text-gray-400" />
                  {issue.reportedByName || 'Admin'}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Created At</label>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                  <Clock size={16} className="text-gray-400" />
                  {new Date(issue.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          {isDeveloper && (
            <div className="bg-socius-red rounded-xl shadow-lg p-6 text-white overflow-hidden relative group">
              <Bug size={80} className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold mb-2">Need to Fix?</h3>
              <p className="text-sm text-red-100 mb-6 leading-relaxed">
                Track this issue across different versions and coordinate with other team members.
              </p>
              <button
                onClick={() => handleUpdateStatus('Completed')}
                disabled={isUpdating || issue.status === 'Completed'}
                className="w-full bg-white text-socius-red font-bold py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle size={18} />
                {issue.status === 'Completed' ? 'Resolved' : 'Mark as Resolved'}
              </button>
            </div>
          )}

          {!isDeveloper && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Resolution Check</h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleUpdateStatus('Completed')}
                  disabled={isUpdating || issue.status === 'Completed'}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  Solved
                </button>
                <button
                  onClick={() => handleUpdateStatus('Pending')}
                  disabled={isUpdating || issue.status === 'Pending'}
                  className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle size={18} />
                  Not Solved
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Not solved select karoge to issue automatically Pending me chala jayega.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueDetailsPage;
