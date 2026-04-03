import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert, Linking } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import RNFetchBlob from 'rn-fetch-blob';

const { width, height } = Dimensions.get('window');

const AppUpdateManager = () => {
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('1.0.0');

  // Check for updates on app start
  useEffect(() => {
    checkForUpdates();
    
    // Get current version
    DeviceInfo.getBuildNumber().then((buildNumber) => {
      setCurrentVersion(buildNumber);
    });
  }, []);

  const checkForUpdates = async () => {
    try {
      const currentVersion = await DeviceInfo.getBuildNumber();
      
      const response = await fetch('http://127.0.0.1:48080/api/app-update/check-update?version=' + currentVersion);
      const data = await response.json();
      
      if (data.success && data.data) {
        if (data.data.versionCode > parseInt(currentVersion)) {
          setUpdateInfo(data.data);
          setUpdateModalVisible(true);
        }
      }
    } catch (error) {
      console.log('Update check failed:', error);
    }
  };

  const downloadAndInstall = async () => {
    if (!updateInfo?.apkUrl) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const { config, fs } = RNFetchBlob;
      const DownloadDir = fs.dirs.DownloadDir;
      
      const configOptions = {
        fileCache: true,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          path: `${DownloadDir}/socius-app-v${updateInfo.versionName}.apk`,
          mime: 'application/vnd.android.package-archive',
          description: 'Downloading Socius App Update...',
        },
      };

      const task = RNFetchBlob.config(configOptions)
        .fetch('GET', updateInfo.apkUrl);

      // Listen to download progress
      task.progress((received, total) => {
        const progress = Math.round((received / total) * 100);
        setDownloadProgress(progress);
      });

      const res = await task;
      
      // Trigger installation
      if (res && res.path()) {
        RNFetchBlob.android.actionViewIntent(res.path(), 'application/vnd.android.package-archive');
        setUpdateModalVisible(false);
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert(
        'Download Failed',
        'Unable to download the update. Please check your internet connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: downloadAndInstall }
        ]
      );
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleLater = () => {
    if (updateInfo?.isForceUpdate) {
      // For force updates, don't allow closing
      Alert.alert(
        'Required Update',
        'This update is required to continue using the app. Please update now.',
        [{ text: 'Update Now', onPress: downloadAndInstall }]
      );
    } else {
      setUpdateModalVisible(false);
    }
  };

  const showInstallGuide = () => {
    Alert.alert(
      'Installation Guide',
      '1. After download, tap the downloaded file\n' +
      '2. If prompted, enable "Install from Unknown Sources"\n' +
      '3. Tap "Install" and wait for completion\n' +
      '4. Open the updated app',
      [{ text: 'Got it!' }]
    );
  };

  if (!updateModalVisible || !updateInfo) return null;

  return (
    <Modal
      visible={updateModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleLater}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🚀 App Update Available!</Text>
            <Text style={styles.version}>Version {updateInfo.versionName}</Text>
          </View>

          {/* Release Notes */}
          <View style={styles.releaseNotesContainer}>
            <Text style={styles.releaseNotesTitle}>What's New:</Text>
            {updateInfo.releaseNotes.map((note, index) => (
              <Text key={index} style={styles.releaseNoteItem}>
                {note}
              </Text>
            ))}
          </View>

          {/* File Size */}
          <Text style={styles.fileSize}>Size: {updateInfo.fileSize}</Text>

          {/* Download Progress */}
          {isDownloading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${downloadProgress}%` }]} 
                />
              </View>
              <Text style={styles.progressText}>{downloadProgress}%</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {!isDownloading ? (
              <>
                <TouchableOpacity 
                  style={styles.updateButton} 
                  onPress={downloadAndInstall}
                >
                  <Text style={styles.updateButtonText}>
                    {updateInfo.isForceUpdate ? 'Update Now (Required)' : 'Update Now'}
                  </Text>
                </TouchableOpacity>
                
                {!updateInfo.isForceUpdate && (
                  <TouchableOpacity style={styles.laterButton} onPress={handleLater}>
                    <Text style={styles.laterButtonText}>Later</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.downloadingContainer}>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={styles.downloadingText}>Downloading...</Text>
              </View>
            )}
          </View>

          {/* Install Guide */}
          <TouchableOpacity style={styles.guideButton} onPress={showInstallGuide}>
            <Text style={styles.guideButtonText}>📖 How to Install?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1a2e',
    margin: 20,
    borderRadius: 20,
    padding: 25,
    width: width * 0.9,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
  },
  version: {
    fontSize: 16,
    color: '#888',
    marginTop: 5,
  },
  releaseNotesContainer: {
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  releaseNotesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  releaseNoteItem: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
    paddingLeft: 10,
  },
  fileSize: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 15,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  progressText: {
    textAlign: 'center',
    color: '#FF6B35',
    fontSize: 12,
    marginTop: 5,
  },
  buttonContainer: {
    gap: 10,
  },
  updateButton: {
    backgroundColor: '#FF6B35',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  laterButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
  },
  laterButtonText: {
    color: '#888',
    fontSize: 16,
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#333',
    borderRadius: 10,
  },
  downloadingText: {
    color: '#FF6B35',
    fontSize: 16,
    marginLeft: 10,
  },
  guideButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  guideButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default AppUpdateManager;
