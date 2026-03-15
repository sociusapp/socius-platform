import React, { useState, useEffect, useRef } from 'react';
import {
  Bug,
  Plus,
  Image as ImageIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Trash2,
  Filter,
  Zap,
  TrendingUp,
  ArrowUpRight,
  ChevronRight,
  Loader2,
  Mic,
  Smartphone,
  Layout as LayoutIcon,
  Server,
  StopCircle,
  Trash,
  Edit2,
  X,
  Undo
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Table from '../components/common/Table';
import { issueTrackerApi, issueTrackerBaseURL } from '../services/api/client';
import { useAlert } from '../hooks/useAlert';
import { useAuth } from '../context/AuthContext';

const IssueTrackerPage = () => {
  const navigate = useNavigate();
  const { toast } = useAlert();
  const { user } = useAuth();
  const isDeveloper = !!user?.isDeveloper;
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const [aiStats, setAIStats] = useState({
    totalFixed: 0,
    totalPending: 0,
    avgFixTimeMinutes: 0,
    successRate: 0,
    recentActivity: []
  });

  const fetchAIStats = async () => {
    try {
      const res = await issueTrackerApi.get('/admin-issues/stats/performance');
      if (res?.data?.success) {
        setAIStats(res.data.data);
      }
    } catch (err) {
      console.error('AI stats fetch failed:', err);
    }
  };

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const response = await issueTrackerApi.get('/admin-issues');
      if (response.data.success) {
        setIssues(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch issues');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    if (isDeveloper) fetchAIStats();
  }, [isDeveloper]);

  const filteredIssues = (issues || []).filter((i) => {
    const statusOk = statusFilter === 'All' || i?.status === statusFilter;
    const categoryOk = categoryFilter === 'All' || i?.category === categoryFilter;
    const priorityOk = priorityFilter === 'All' || i?.priority === priorityFilter;
    if (!statusOk || !categoryOk || !priorityOk) return false;

    const q = String(searchTerm || '').trim().toLowerCase();
    if (!q) return true;
    const hay = [
      i?._id,
      i?.id,
      i?.title,
      i?.description,
      i?.platform,
      i?.flow,
      i?.status,
      i?.category,
      i?.priority,
    ]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase())
      .join(' ');
    return hay.includes(q);
  });

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newIssue, setNewIssue] = useState({
    category: 'Bug',
    description: '',
    priority: 'Medium',
    platform: 'Mobile App',
    flow: 'General',
    occurredAt: new Date().toISOString().slice(0, 16), // current time for picker
    screenshot: null,
    voiceNote: null
  });
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [voiceFile, setVoiceFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Annotation states
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawHistory, setDrawHistory] = useState([]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#ef4444'; // socius-red
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setDrawHistory([...drawHistory, canvasRef.current.toDataURL()]);
  };

  const saveAnnotation = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const file = new File([blob], 'annotated-screenshot.png', { type: 'image/png' });
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(blob));
      setShowAnnotator(false);
    });
  };

  const loadOriginalImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      // Set canvas size to match image aspect ratio
      const maxWidth = window.innerWidth * 0.8;
      const maxHeight = window.innerHeight * 0.7;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      setDrawHistory([canvas.toDataURL()]);
    };
    img.src = screenshotPreview;
  };

  useEffect(() => {
    if (showAnnotator && screenshotPreview) {
      setTimeout(loadOriginalImage, 100);
    }
  }, [showAnnotator]);

  const startRecording = async () => {
    setMicBlocked(false);
    setTranscript('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      // Setup Speech Recognition (Free Browser API)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN'; // Support Hindi transcription

        recognition.onresult = (event) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        setVoiceFile(file);
        stream.getTracks().forEach(track => track.stop());
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setMicBlocked(true);
      toast.error('Microphone access denied or not secure context');
      console.error(err);
    }
  };

  const handleVoiceUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      setVoiceFile(file);
      toast.success('Audio file attached');
    } else if (file) {
      toast.error('Please upload an audio file');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      toast.error('Please upload an image file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const flowOptions = {
    'Mobile App': [
      { label: 'General / Other', value: 'General' },
      { label: 'Login & Phone OTP', value: 'Login/OTP' },
      { label: 'Identity Verification (KYC)', value: 'Onboarding' },
      { label: 'Help Map (Live Awareness)', value: 'Live Awareness' },
      { label: 'Requesting DailyHelp', value: 'DailyHelp' },
      { label: 'Chatting with Helpers', value: 'Chat/Messaging' },
      { label: 'Voice Calls', value: 'Calls' },
      { label: 'My Profile & Settings', value: 'Settings' }
    ],
    'Admin Panel': [
      { label: 'General / Other', value: 'General' },
      { label: 'Dashboard Stats', value: 'Dashboard' },
      { label: 'User Management', value: 'Users' },
      { label: 'Reviewing Verifications', value: 'Verification Queue' },
      { label: 'Incident Review', value: 'Incident Review' },
      { label: 'System Settings', value: 'Settings' },
      { label: 'Issue Tracker', value: 'Issue Tracker' }
    ]
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    // Use first line of description as title if title is removed
    const generatedTitle = newIssue.description.split('\n')[0].substring(0, 50) || 'New Issue';

    // Auto-detect Device/Web Info
    const getDeviceInfo = () => {
      const ua = navigator.userAgent;
      let browser = "Unknown";
      if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Safari")) browser = "Safari";
      else if (ua.includes("Edge")) browser = "Edge";

      return {
        model: navigator.platform,
        os: navigator.appVersion,
        browser: browser,
        appVersion: "Admin-Web-1.0.0"
      };
    };

    formData.append('title', generatedTitle);
    formData.append('category', newIssue.category);
    formData.append('description', newIssue.description);
    formData.append('priority', newIssue.priority);
    formData.append('platform', newIssue.platform);
    formData.append('flow', newIssue.flow);
    formData.append('occurredAt', new Date(newIssue.occurredAt).toISOString());
    formData.append('deviceInfo', JSON.stringify(getDeviceInfo()));

    if (transcript) {
      formData.append('transcript', transcript);
    }

    if (screenshotFile) {
      formData.append('screenshot', screenshotFile);
    }
    if (voiceFile) {
      formData.append('voiceNote', voiceFile);
    }

    try {
      const response = await issueTrackerApi.post('/admin-issues', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data.success) {
        toast.success('Issue reported successfully');
        setShowForm(false);
        setNewIssue({
          category: 'Bug',
          description: '',
          priority: 'Medium',
          platform: 'Mobile App',
          flow: 'General',
          occurredAt: new Date().toISOString().slice(0, 16),
          screenshot: null,
          voiceNote: null
        });
        setScreenshotFile(null);
        setScreenshotPreview(null);
        setVoiceFile(null);
        fetchIssues();
      }
    } catch (error) {
      toast.error('Failed to report issue');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const response = await issueTrackerApi.patch(`/admin-issues/${id}`, { status: newStatus });
      if (response.data.success) {
        toast.success(`Status updated to ${newStatus}`);
        setIssues(issues.map(issue =>
          issue.id === id || issue._id === id ? { ...issue, status: newStatus } : issue
        ));
      }
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const updateAIEnabled = async (id, enabled) => {
    try {
      const response = await issueTrackerApi.patch(`/admin-issues/${id}`, { aiEnabled: enabled });
      if (response.data.success) {
        toast.success(enabled ? 'AI automation enabled' : 'AI automation disabled');
        const updated = response.data.data;
        setIssues(issues.map(issue =>
          issue.id === id || issue._id === id
            ? { ...issue, aiEnabled: !!updated?.aiEnabled, status: updated?.status || issue.status }
            : issue
        ));
      }
    } catch (error) {
      toast.error('Failed to update AI automation');
      console.error(error);
    }
  };

  const deleteIssue = async (id) => {
    if (window.confirm('Are you sure you want to delete this issue?')) {
      try {
        const response = await issueTrackerApi.delete(`/admin-issues/${id}`);
        if (response.data.success) {
          toast.success('Issue deleted');
          setIssues(issues.filter(issue => issue.id !== id && issue._id !== id));
        }
      } catch (error) {
        toast.error('Failed to delete issue');
        console.error(error);
      }
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      'High': 'text-red-600 dark:text-red-400',
      'Medium': 'text-orange-600 dark:text-orange-400',
      'Low': 'text-gray-600 dark:text-gray-400',
    };
    return (
      <span className={`flex items-center gap-1 font-semibold ${styles[priority] || ''}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${priority === 'High' ? 'bg-red-600' : priority === 'Medium' ? 'bg-orange-600' : 'bg-gray-400'}`}></div>
        {priority}
      </span>
    );
  };

  const columns = [
    {
      header: 'Issue',
      accessor: 'title',
      headerClassName: 'w-[520px] max-w-[520px]',
      className: 'whitespace-normal max-w-[520px]',
      render: (row) => (
        <div className="flex flex-col max-w-[520px]">
          <span className="text-sm text-gray-900 dark:text-white line-clamp-2 break-words">
            {row.description || row.title}
          </span>
        </div>
      )
    },
    {
      header: 'Category',
      accessor: 'category',
      headerClassName: 'w-28',
      className: 'w-28',
      render: (row) => (
        <span className="text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
          {row.category}
        </span>
      )
    },
    {
      header: 'Priority',
      accessor: 'priority',
      headerClassName: 'w-28',
      className: 'w-28',
      render: (row) => getPriorityBadge(row.priority)
    },
    {
      header: 'Status',
      accessor: 'status',
      headerClassName: 'w-32',
      className: 'w-32',
      render: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Date',
      accessor: 'createdAt',
      headerClassName: 'w-28',
      className: 'w-28',
      render: (row) => new Date(row.createdAt).toLocaleDateString()
    },
    {
      header: '',
      headerClassName: 'w-10',
      className: 'w-10',
      render: () => (
        <div className="text-socius-red opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={20} />
        </div>
      )
    },
    ...(isDeveloper ? [{
      header: 'Actions',
      render: (row) => {
        const issueId = row._id || row.id;
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <input
                type="checkbox"
                checked={!!row.aiEnabled}
                onChange={(e) => updateAIEnabled(issueId, e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600"
              />
              AI
            </label>
            <select
              value={row.status}
              onChange={(e) => updateStatus(issueId, e.target.value)}
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-1 outline-none focus:ring-1 focus:ring-socius-red"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteIssue(issueId);
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      }
    }] : [])
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header with AI Performance */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
              <Bug className="text-socius-red" size={32} />
              Issue Tracker
            </h1>
            <p className="text-gray-500 mt-1">Manage and track project issues, bugs, and feature requests.</p>
            <div className="mt-2 text-xs text-gray-500">
              Data source: <span className="font-mono">{String(issueTrackerBaseURL || '')}</span>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-socius-red text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
          >
            {showForm ? <Clock size={20} /> : <Plus size={20} />}
            {showForm ? 'View History' : 'Report New Issue'}
          </button>
        </div>

        {isDeveloper && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-2.5 rounded-lg">
              <Zap className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiStats.totalFixed}</p>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">AI Fixed</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg">
              <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiStats.successRate}%</p>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Success Rate</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2.5 rounded-lg">
              <Clock size={24} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiStats.avgFixTimeMinutes}m</p>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Avg Fix Time</p>
            </div>
          </div>
          <div className="bg-gray-900 text-white p-4 rounded-xl border border-gray-800 shadow-sm flex items-center justify-between overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-2xl font-bold">{aiStats.totalPending}</p>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">In AI Queue</p>
            </div>
            <div className="bg-socius-red/20 p-2 rounded-lg relative z-10">
              <Loader2 className="animate-spin text-socius-red" size={24} />
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-socius-red/5 rounded-full -mr-12 -mt-12"></div>
          </div>
        </div>
        )}
      </div>

      {showForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-socius-red">
              <Bug size={24} />
            </div>
            <h2 className="text-xl font-bold dark:text-white">New Issue Report</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Mobile App', 'Admin Panel'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setNewIssue({ ...newIssue, platform: p, flow: 'General' });
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${newIssue.platform === p
                          ? 'border-socius-red bg-red-50 text-socius-red dark:bg-red-900/20'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500'
                        }`}
                    >
                      {p === 'Mobile App' && <Smartphone size={18} className="mb-1" />}
                      {p === 'Admin Panel' && <LayoutIcon size={18} className="mb-1" />}
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Flow</label>
                <select
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-socius-red/50 dark:text-white"
                  value={newIssue.flow}
                  onChange={(e) => setNewIssue({ ...newIssue, flow: e.target.value })}
                >
                  {(flowOptions[newIssue.platform] || flowOptions['Mobile App']).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-socius-red/50 dark:text-white"
                  value={newIssue.category}
                  onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value })}
                >
                  <option value="Bug">Something is broken</option>
                  <option value="UI/UX">Design/Look issue</option>
                  <option value="Feature">I want a new feature</option>
                  <option value="Security">Security Concern</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-socius-red/50 dark:text-white"
                  value={newIssue.priority}
                  onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                >
                  <option value="High">High (Needs urgent fix)</option>
                  <option value="Medium">Medium (Can wait a bit)</option>
                  <option value="Low">Low (Minor improvement)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">When did this happen?</label>
                <input
                  type="datetime-local"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-socius-red/50 dark:text-white"
                  value={newIssue.occurredAt}
                  onChange={(e) => setNewIssue({ ...newIssue, occurredAt: e.target.value })}
                />
                <p className="text-[10px] text-gray-400 mt-1">If you are reporting a past issue, select the approximate time to help us find the logs.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Explain what happened</label>
              <textarea
                rows="4"
                required
                placeholder="Describe the issue in your own words..."
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-socius-red/50 dark:text-white resize-none"
                value={newIssue.description}
                onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => document.getElementById('screenshot-upload').click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer relative overflow-hidden ${isDragging
                    ? 'border-socius-red bg-red-50 dark:bg-red-900/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-socius-red/50 hover:text-socius-red text-gray-400'
                  }`}
              >
                {screenshotPreview ? (
                  <div className="absolute inset-0 w-full h-full bg-black/10 flex items-center justify-center">
                    <img src={screenshotPreview} alt="Preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAnnotator(true);
                        }}
                        className="bg-socius-red text-white p-2 rounded-lg hover:scale-110 transition-transform flex items-center gap-1 text-xs font-bold"
                      >
                        <Edit2 size={16} />
                        Highlight
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScreenshotFile(null);
                          setScreenshotPreview(null);
                        }}
                        className="bg-gray-800 text-white p-2 rounded-lg hover:scale-110 transition-transform"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImageIcon size={32} className={isDragging ? 'text-socius-red animate-bounce' : ''} />
                    <div className="text-center">
                      <p className="text-xs font-bold">Add Screenshot</p>
                      <p className="text-[10px]">Click or Drag & Drop</p>
                    </div>
                  </>
                )}
                <input id="screenshot-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all ${isRecording
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/10 animate-pulse'
                    : voiceFile
                      ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-900/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-socius-red/50 hover:text-socius-red text-gray-400'
                  }`}
              >
                {isRecording ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-ping"></div>
                      <span className="text-red-600 font-bold font-mono">{formatDuration(recordingDuration)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all"
                    >
                      <StopCircle size={24} />
                    </button>
                    <p className="text-[10px] text-red-500 font-medium uppercase tracking-wider">Recording...</p>
                    {transcript && (
                      <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded border border-red-100 max-h-20 overflow-y-auto">
                        <p className="text-[10px] italic text-gray-600 dark:text-gray-300">"{transcript}..."</p>
                      </div>
                    )}
                  </>
                ) : voiceFile ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Mic size={24} className="text-green-500" />
                      <div className="flex flex-col">
                        <p className="text-xs font-bold text-green-600">Voice Note Ready</p>
                        <p className="text-[10px] text-gray-400">Recorded explanation attached</p>
                      </div>
                    </div>
                    {transcript && (
                      <div className="w-full mt-2 p-2 bg-green-50/50 dark:bg-green-900/10 rounded border border-green-100 max-h-20 overflow-y-auto">
                        <p className="text-[10px] italic text-gray-600 dark:text-gray-300">Transcript: "{transcript}"</p>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <audio src={URL.createObjectURL(voiceFile)} controls className="h-8 w-40" />
                      <button
                        type="button"
                        onClick={() => setVoiceFile(null)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full hover:bg-socius-red/10 hover:text-socius-red transition-all"
                        title="Record with microphone"
                      >
                        <Mic size={24} />
                      </button>
                      <button
                        type="button"
                        onClick={() => document.getElementById('voice-upload-fallback').click()}
                        className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition-all"
                        title="Upload audio file"
                      >
                        <Plus size={24} />
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold">Voice Explanation</p>
                      <p className="text-[10px]">Record or Upload audio</p>
                      {micBlocked && (
                        <p className="text-[9px] text-red-400 mt-1">Mic blocked? Use upload instead.</p>
                      )}
                    </div>
                    <input
                      id="voice-upload-fallback"
                      type="file"
                      className="hidden"
                      accept="audio/*"
                      onChange={handleVoiceUpload}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-socius-red text-white px-8 py-2 rounded-lg font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="animate-spin" size={20} />}
                Submit Issue
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
                  <Clock size={20} />
                </div>
                <span className="text-sm font-medium text-gray-500">Pending</span>
              </div>
              <div className="text-2xl font-bold dark:text-white">
                {issues.filter(i => i.status === 'Pending').length}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <AlertCircle size={20} />
                </div>
                <span className="text-sm font-medium text-gray-500">In Progress</span>
              </div>
              <div className="text-2xl font-bold dark:text-white">
                {issues.filter(i => i.status === 'In Progress').length}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                  <CheckCircle size={20} />
                </div>
                <span className="text-sm font-medium text-gray-500">Completed</span>
              </div>
              <div className="text-2xl font-bold dark:text-white">
                {issues.filter(i => i.status === 'Completed').length}
              </div>
            </div>
          </div>

          <Table
            columns={columns}
            data={filteredIssues}
            title="Issues List"
            searchPlaceholder="Search issues..."
            isLoading={isLoading}
            actions={
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-socius-red"
                  >
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-socius-red"
                  >
                    <option value="All">All Categories</option>
                    <option value="Bug">Bug</option>
                    <option value="UI/UX">UI/UX</option>
                    <option value="Feature">Feature</option>
                    <option value="Backend">Backend</option>
                    <option value="Security">Security</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-socius-red"
                  >
                    <option value="All">All Priority</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                {(searchTerm || statusFilter !== 'All' || categoryFilter !== 'All' || priorityFilter !== 'All') ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('All');
                      setCategoryFilter('All');
                      setPriorityFilter('All');
                    }}
                    className="px-3 py-2 text-sm font-bold rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            }
            onRowClick={(row) => navigate(`/issue-tracker/${row.id}`)}
            rowClassName="hover:bg-gray-50/80 cursor-pointer"
            onSearch={(term) => setSearchTerm(term)}
          />
        </div>
      )}

      {/* Image Annotator Modal */}
      {showAnnotator && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-5xl flex items-center justify-between mb-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Edit2 size={20} className="text-socius-red" />
              Highlight the Problem Area
            </h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  const ctx = canvas.getContext('2d');
                  const img = new Image();
                  img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  img.src = screenshotPreview;
                }}
                className="text-white hover:text-socius-red transition-colors flex items-center gap-1 text-sm font-bold"
              >
                <Undo size={18} />
                Reset
              </button>
              <button
                onClick={() => setShowAnnotator(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              className="cursor-crosshair block"
            />
          </div>

          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              onClick={saveAnnotation}
              className="bg-socius-red text-white px-10 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-red-500/20"
            >
              Save Changes
            </button>
            <p className="text-gray-500 text-xs italic">Use your mouse to draw red circles or markers on the image.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueTrackerPage;
