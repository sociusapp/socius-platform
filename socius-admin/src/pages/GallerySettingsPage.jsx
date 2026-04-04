import React, { useState, useEffect } from 'react';
import { Image, Save, RefreshCw, ExternalLink } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api } from '../services/api/client';
import { toast } from 'react-hot-toast';

const GallerySettingsPage = () => {
  const [imageUrls, setImageUrls] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/gallery/gallery-images');
      if (response.data.success) {
        setImageUrls(response.data.data.imageUrls);
      }
    } catch (error) {
      console.error('Error fetching gallery images:', error);
      toast.error('Failed to load gallery images');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleImageUrlChange = (index, value) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
  };

  const handleSave = async () => {
    // Validate URLs
    for (let i = 0; i < imageUrls.length; i++) {
      if (!imageUrls[i].trim()) {
        toast.error(`Image ${i + 1} URL is required`);
        return;
      }
      try {
        new URL(imageUrls[i]);
      } catch {
        toast.error(`Invalid URL for Image ${i + 1}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const response = await api.put('/gallery/gallery-images', { imageUrls });
      if (response.data.success) {
        toast.success('Gallery images updated successfully');
      } else {
        toast.error('Failed to update gallery images');
      }
    } catch (error) {
      console.error('Error saving gallery images:', error);
      toast.error(error.response?.data?.message || 'Failed to save gallery images');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset to default images?')) {
      const defaults = [
        'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1529333241880-0fc7855bb921?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=400&h=400&fit=crop'
      ];
      setImageUrls(defaults);
      toast.success('Reset to default images');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gallery Image Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Customize the 6 images shown in the photo gallery capture page</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={fetchImages}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={handleReset}
          >
            Reset to Default
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {imageUrls.map((url, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Image Card {index + 1}
                </label>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Preview
                  </a>
                )}
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleImageUrlChange(index, e.target.value)}
                    placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                  />
                </div>
              </div>
              
              {url && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/128x128?text=Error';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Card {index + 1}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Instructions</h3>
        <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
          <li>Enter the URL for each of the 6 gallery cards</li>
          <li>Images should be square (1:1 aspect ratio) for best results</li>
          <li>Recommended size: 400x400 pixels or larger</li>
          <li>Supported formats: JPG, PNG, WebP</li>
          <li>Click "Preview" to verify the image loads correctly</li>
        </ul>
      </Card>
    </div>
  );
};

export default GallerySettingsPage;
