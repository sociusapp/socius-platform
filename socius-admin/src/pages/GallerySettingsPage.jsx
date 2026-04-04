import React, { useState, useEffect, useRef } from 'react';
import { Image, Save, RefreshCw, ExternalLink, Upload, X } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { api } from '../services/api/client';
import { toast } from 'react-hot-toast';

const GallerySettingsPage = () => {
  const [imageUrls, setImageUrls] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const fileInputRefs = useRef([]);

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

  const handleFileSelect = async (index, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select an image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setUploadingIndex(index);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('cardIndex', index.toString());

      const response = await api.post('/gallery/gallery-images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const newUrls = [...imageUrls];
        newUrls[index] = response.data.data.imageUrl;
        setImageUrls(newUrls);
        toast.success('Image ' + (index + 1) + ' uploaded successfully');
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingIndex(null);
      // Clear the file input
      if (fileInputRefs.current[index]) {
        fileInputRefs.current[index].value = '';
      }
    }
  };

  const clearImage = (index) => {
    const newUrls = [...imageUrls];
    newUrls[index] = '';
    setImageUrls(newUrls);
    toast.success('Image ' + (index + 1) + ' cleared');
  };

  const handleSave = async () => {
    // Validate URLs
    for (let i = 0; i < imageUrls.length; i++) {
      if (!imageUrls[i].trim()) {
        toast.error('Image ' + (i + 1) + ' is required');
        return;
      }
    }

    setIsSaving(true);
    try {
      const response = await api.put('/gallery/gallery-images', { imageUrls });
      if (response.data.success) {
        toast.success('Gallery images saved successfully');
      } else {
        toast.error('Failed to save gallery images');
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
          <p className="text-gray-500 dark:text-gray-400">Upload images from your device for each gallery card</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {imageUrls.map((url, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Card {index + 1}
                </label>
                {url && (
                  <button
                    onClick={() => clearImage(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Clear image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Image Preview */}
              <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                {url ? (
                  <img
                    src={url}
                    alt={'Card ' + (index + 1)}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x400?text=Error';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <Image className="w-12 h-12 mb-2" />
                    <span className="text-sm">No image</span>
                  </div>
                )}
                
                {/* Upload Overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      ref={el => fileInputRefs.current[index] = el}
                      onChange={(e) => handleFileSelect(index, e)}
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingIndex === index}
                    />
                    <div className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors">
                      {uploadingIndex === index ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>
              
              {/* URL Input */}
              <div className="space-y-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">Or enter image URL:</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleImageUrlChange(index, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-500 hover:text-blue-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                      title="Preview"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Instructions</h3>
        <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
          <li>Click on any card to upload an image from your device</li>
          <li>Or enter an image URL manually in the text field</li>
          <li>Supported formats: JPEG, PNG, WebP</li>
          <li>Maximum file size: 5MB</li>
          <li>Images should be square (1:1) for best display</li>
          <li>Click "Save Changes" when done</li>
        </ul>
      </Card>
    </div>
  );
};

export default GallerySettingsPage;
