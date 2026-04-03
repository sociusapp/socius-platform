import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, RefreshCw, ExternalLink, Calendar, Smartphone, Globe, 
  User, Battery, Monitor, Signal, Fingerprint, MousePointer, 
  Activity, ArrowLeft, Clock, Shield, Database, ChevronRight
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { api, baseURL } from '../services/api/client';
import { toast } from 'react-hot-toast';

const PublicLocationProfilePage = () => {
  const { visitorId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchVisitorDetails = async () => {
    if (!visitorId || visitorId === 'undefined') {
      toast.error('Invalid Visitor ID');
      setIsLoading(false);
      return;
    }
    setIsRefreshing(true);
    try {
      // Use standard api with encoded path
      const response = await api.get(`/public/visitor/${encodeURIComponent(visitorId)}`);
      if (response.data.success) {
        setHistory(response.data.data);
      } else {
        toast.error('No history found for this device');
        setHistory([]);
      }
    } catch (error) {
      console.error('Error fetching visitor details:', error);
      // Fallback: try direct fetch if axios/interceptor is failing
      try {
        const authData = JSON.parse(localStorage.getItem('socius_user'));
        const directRes = await fetch(`${baseURL}/public/visitor/${encodeURIComponent(visitorId)}`, {
          headers: {
            'Authorization': `Bearer ${authData?.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        const directData = await directRes.json();
        if (directData.success) {
          setHistory(directData.data);
          return;
        }
      } catch (e) {
        console.error('Fallback fetch failed:', e);
      }
      
      toast.error('Could not connect to tracking server');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisitorDetails();
  }, [visitorId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-socius-red" />
      </div>
    );
  }

  const latest = history[0] || {};
  const { deviceInfo, networkInfo, behavioralData } = latest;

  const columns = [
    {
      header: 'Captured At',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {new Date(row.capturedAt).toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400">
            {new Date(row.capturedAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Method',
      render: (row) => (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${row.method === 'geolocation' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
          {row.method || 'GPS'}
        </span>
      ),
    },
    {
      header: 'Coordinates',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
            {row.location.coordinates[1].toFixed(6)}, {row.location.coordinates[0].toFixed(6)}
          </span>
          <a
            href={`https://www.google.com/maps?q=${row.location.coordinates[1]},${row.location.coordinates[0]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ),
    },
    {
      header: 'Activity',
      render: (row) => (
        <div className="text-xs text-gray-500">
          {row.behavioralData?.totalClicks || 0} clicks · {(row.behavioralData?.timeOnPage / 1000).toFixed(1)}s
        </div>
      ),
    },
    {
      header: 'Network',
      render: (row) => (
        <div className="text-xs text-gray-500">
          {row.networkType} ({row.networkInfo?.downlink || 'N/A'} Mbps)
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/public-locations')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              Visitor Profile
              <span className="ml-3 text-xs font-mono bg-socius-red/10 text-socius-red px-2 py-1 rounded uppercase">
                Active Tracking
              </span>
            </h1>
            <p className="text-sm text-gray-500">Full forensic profile for Visitor ID: {visitorId}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={fetchVisitorDetails} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Sync Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 bg-socius-red/10 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-socius-red" />
            </div>
            <div>
              <h2 className="text-lg font-bold truncate w-full max-w-[200px]" title={visitorId}>{visitorId}</h2>
              <div className="flex items-center justify-center space-x-2 mt-1">
                <Fingerprint className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-mono text-gray-500">{latest.fingerprintHash || 'N/A'}</span>
              </div>
            </div>
          </div>

          <hr className="dark:border-gray-800" />

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Device Identity</h3>
            <div className="space-y-3">
              <ProfileItem icon={<Smartphone className="w-4 h-4" />} label="Platform" value={deviceInfo?.platform} />
              <ProfileItem icon={<Monitor className="w-4 h-4" />} label="Resolution" value={latest.screenResolution} />
              <ProfileItem icon={<Battery className="w-4 h-4" />} label="Battery" value={latest.batteryLevel ? Math.round(latest.batteryLevel) + '%' : 'N/A'} />
              <ProfileItem icon={<Globe className="w-4 h-4" />} label="Language" value={latest.language} />
              <ProfileItem icon={<Clock className="w-4 h-4" />} label="Timezone" value={latest.timezone} />
            </div>
          </div>

          <hr className="dark:border-gray-800" />

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Network Diagnostics</h3>
            <div className="space-y-3">
              <ProfileItem icon={<Signal className="w-4 h-4" />} label="IP Address" value={latest.ip} />
              <ProfileItem icon={<Database className="w-4 h-4" />} label="ISP Info" value={networkInfo?.effectiveType + ' Network'} />
              <ProfileItem icon={<Activity className="w-4 h-4" />} label="Avg Latency" value={networkInfo?.rtt + ' ms'} />
            </div>
          </div>
        </Card>

        {/* Detailed Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hardware & Behavioral Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="text-sm font-bold flex items-center mb-4">
                <Shield className="w-4 h-4 mr-2 text-green-500" /> Security & Hardware
              </h3>
              <div className="space-y-3">
                <DetailRow label="CPU Cores" value={deviceInfo?.cpuCores} />
                <DetailRow label="RAM" value={deviceInfo?.memory + ' GB'} />
                <DetailRow label="GPU" value={deviceInfo?.gpu} />
                <DetailRow label="DNT Enabled" value={deviceInfo?.doNotTrack === '1' ? 'Yes' : 'No'} />
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-bold flex items-center mb-4">
                <MousePointer className="w-4 h-4 mr-2 text-purple-500" /> Behavioral Biometrics
              </h3>
              <div className="space-y-3">
                <DetailRow label="Total Sessions" value={history.length} />
                <DetailRow label="Lifetime Clicks" value={history.reduce((acc, curr) => acc + (curr.behavioralData?.totalClicks || 0), 0)} />
                <DetailRow label="Referrer" value={deviceInfo?.referrer} />
                <DetailRow label="Browser History" value={deviceInfo?.historyLength + ' entries'} />
              </div>
            </Card>
          </div>

          {/* History Table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="font-bold flex items-center">
                <Clock className="w-4 h-4 mr-2" /> Tracking History
              </h3>
              <span className="text-xs text-gray-500">{history.length} snapshots captured</span>
            </div>
            <Table 
              columns={columns}
              data={history}
              isLoading={false}
              emptyMessage="No history records found."
            />
          </Card>

          {/* Click Pattern Visualization (Simple List) */}
          <Card className="p-5">
            <h3 className="text-sm font-bold flex items-center mb-4">
              <Activity className="w-4 h-4 mr-2 text-socius-red" /> Latest Behavioral Patterns (Clicks)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {behavioralData?.clickPatterns?.map((click, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-socius-red/10 rounded-full flex items-center justify-center text-socius-red font-bold text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold">X: {click.x} Y: {click.y}</div>
                      <div className="text-[10px] text-gray-400">Target: {click.target || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-gray-500">
                    {new Date(click.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {(!behavioralData?.clickPatterns || behavioralData.clickPatterns.length === 0) && (
                <div className="col-span-2 text-center py-4 text-gray-400 text-sm italic">
                  No click patterns recorded for this session.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const ProfileItem = ({ icon, label, value }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center text-gray-500 text-xs">
      <span className="mr-2">{icon}</span>
      {label}
    </div>
    <span className="text-xs font-medium dark:text-gray-300 truncate max-w-[120px]" title={value}>
      {value || 'N/A'}
    </span>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-start">
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-xs font-medium dark:text-gray-300 text-right max-w-[150px] truncate" title={value}>
      {value || 'N/A'}
    </span>
  </div>
);

export default PublicLocationProfilePage;
