import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, RefreshCw, ExternalLink, Calendar, Smartphone, Globe } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { api, baseURL } from '../services/api/client';
import { toast } from 'react-hot-toast';

const PublicLocationsPage = () => {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // The capture page is on the backend. BaseURL usually has /api at the end.
  const publicCaptureUrl = baseURL.replace('/api', '') + '/public/capture';

  const fetchLocations = async () => {
    setIsRefreshing(true);
    try {
      // Use the baseURL but handle the case where the route is /public/all-locations
      // The api instance already has /api prefix, so this will call /api/public/all-locations
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
  }, []);

  const columns = [
    {
      header: 'Captured At',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">
            {new Date(row.capturedAt).toLocaleString()}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(row.capturedAt).toLocaleDateString()}
          </span>
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
              <div className={`h-2 w-2 rounded-full ${row.accuracy < 20 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-xs text-gray-500">
                Accuracy: ±{Math.round(row.accuracy)}m 
                {row.accuracy < 20 && <span className="ml-1 font-bold text-green-600">(Exact)</span>}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Device Info',
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <Globe className="w-3 h-3 mr-1" />
            <span className="truncate max-w-[200px]" title={row.ip}>IP: {row.ip}</span>
          </div>
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <Smartphone className="w-3 h-3 mr-1" />
            <span className="truncate max-w-[200px]" title={row.userAgent}>
              {row.userAgent?.split(') ')[0]?.split(' (')[1] || 'Unknown Device'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.open(`https://www.google.com/maps?q=${row.location.coordinates[1]},${row.location.coordinates[0]}`, '_blank')}
        >
          Track
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Public Location Tracking</h1>
          <p className="text-gray-500 dark:text-gray-400">View locations captured via public tracking URL</p>
        </div>
        <div className="flex space-x-3">
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
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Public Tracking URL</h3>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Share this URL to capture user locations.
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
                  // Fallback for non-secure contexts (0.0.0.0, HTTP)
                  const textArea = document.createElement("textarea");
                  textArea.value = publicCaptureUrl;
                  document.body.appendChild(textArea);
                  textArea.select();
                  try {
                    document.execCommand('copy');
                    toast.success('URL copied (fallback)');
                  } catch (err) {
                    toast.error('Failed to copy. Please copy manually.');
                  }
                  document.body.removeChild(textArea);
                }
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          data={locations}
          isLoading={isLoading}
          emptyMessage="No locations captured yet. Share the tracking URL above."
        />
      </Card>
    </div>
  );
};

export default PublicLocationsPage;
