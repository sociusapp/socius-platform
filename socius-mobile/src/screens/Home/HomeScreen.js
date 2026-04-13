import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useWindowDimensions, View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image, Animated, Easing, Platform, RefreshControl, ActivityIndicator, Alert, Dimensions, FlatList, TextInput, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeHeader from '../../components/common/HomeHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFcmToken } from '../../services/firebase/config';
import { getMessaging, onTokenRefresh } from '@react-native-firebase/messaging';
import { loadAuth, loadAvailabilityPreference, loadAvailabilityUpdatedAt, saveAvailabilityPreference, loadLastKnownLocation, saveLastKnownLocation } from '../../services/storage/asyncStorage.service';
import { updateDeviceToken } from '../../services/api/auth.api';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { reverseGeocode, requestLocationPermission, getCurrentPosition, formatLocationLabel, getNearbyPlaceName } from '../../services/location/geolocation.service';
import { updateAvailabilityLocation, toggleAvailability, getNearbyHelpRequests, getNearbyPresenceRequests, getActivePresenceRequest } from '../../services/api/incident.api';
import { getProfile, getHistory } from '../../services/api/user.api';
import { getHelpCategories } from '../../services/api/helpCategories.api';
import { api } from '../../services/api/client';
import moment from 'moment';
import Button from '../../components/common/Button';
import PulseDot from '../../components/common/PulseDot';
import { SkeletonBox, SkeletonCircle, SkeletonSpacer } from '../../components/common/Skeleton';
import { connectSocket, getSocket } from '../../services/socket/socket.service';
import MotionView from '../../components/common/MotionView';
import MotionPressable from '../../components/common/MotionPressable';

import DailyHelpRequestCard from '../../features/daily-help/components/cards/DailyHelpRequestCard';
import NeedPresenceRequestCard from '../../features/need-presence/components/cards/NeedPresenceRequestCard';
import DailyHelpHistoryCard from '../../features/daily-help/components/cards/DailyHelpHistoryCard';
import NeedPresenceHistoryCard from '../../features/need-presence/components/cards/NeedPresenceHistoryCard';

const HomeScreen = ({ navigation }) => {
  const { width: SCREEN_WIDTH, height: windowHeight } = useWindowDimensions();
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const tabPageMinHeight = useMemo(
    () => Math.max(420, windowHeight - 168),
    [windowHeight],
  );
  const [isAvailable, setIsAvailable] = useState(true);
  const [availabilityWidth, setAvailabilityWidth] = useState(0);
  const [toggleAnim] = useState(new Animated.Value(0));
  const [locationLabel, setLocationLabel] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const lastLocationSyncAtRef = useRef(0);
  const locationSyncInFlightRef = useRef(false);
  const availabilityReqSeqRef = useRef(0);
  const availabilityErrorShownAtRef = useRef(0);

  // Community Screen State
  const isFocused = useIsFocused();
  const [activeTab, setActiveTab] = useState('overview');
  const activeTabRef = useRef('overview');
  const isAvailableRef = useRef(true);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [refreshingNearby, setRefreshingNearby] = useState(false);
  const isNearbyLoadingRef = useRef(false);
  const isHistoryLoadingRef = useRef(false);
  const nearbyRequestsLengthRef = useRef(0);
  const historyDataLengthRef = useRef(0);

  useEffect(() => {
    nearbyRequestsLengthRef.current = nearbyRequests.length;
  }, [nearbyRequests.length]);

  useEffect(() => {
    historyDataLengthRef.current = historyData.length;
  }, [historyData.length]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const setHistoryFilter = useCallback((status) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFilterStatus(status);
  }, []);
  const [categoriesBySlug, setCategoriesBySlug] = useState({});
  const [activePresence, setActivePresence] = useState(null);

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const baseRoot = useMemo(() => {
    const base = String(api?.defaults?.baseURL || '');
    return base.replace(/\/api\/?$/, '');
  }, []);

  const onTabPress = useCallback((tabName, index) => {
    setActiveTab(tabName);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: (SCREEN_WIDTH || 375) * index, animated: true });
    });
  }, [SCREEN_WIDTH]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      // If the tab is already focused, reset top tab to overview
      if (navigation.isFocused()) {
        onTabPress('overview', 0);
      }
    });

    return unsubscribe;
  }, [navigation, onTabPress]);

  const onMomentumScrollEnd = (event) => {
    const width = event.nativeEvent.layoutMeasurement.width || SCREEN_WIDTH || 375;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    const tabs = ['overview', 'requests', 'history'];
    const newTab = tabs[index];
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchNearbyRequests(true); // Show skeleton only on first tab mount
    } else if (activeTab === 'history') {
      fetchHistory({ showSkeleton: true }); // Show skeleton only on first tab mount
    }
  }, [activeTab]);

  useEffect(() => {
    let mounted = true;
    let cleanup = null;

    (async () => {
      const socket = await connectSocket().catch(() => null);
      const s = socket || getSocket();
      if (!mounted || !s) return;

      const handler = () => {
        if (activeTab === 'requests') {
          fetchNearbyRequests();
        }
      };

      // Listen to events that should trigger a list refresh
      s.on('presence:notified', handler);
      s.on('presence:request_updated', handler);
      s.on('presence:accepted', handler);
      s.on('presence:declined', handler);
      s.on('help:notified', handler);
      s.on('help:request_updated', handler);

      cleanup = () => {
        s.off('presence:notified', handler);
        s.off('presence:request_updated', handler);
        s.off('presence:accepted', handler);
        s.off('presence:declined', handler);
        s.off('help:notified', handler);
        s.off('help:request_updated', handler);
      };
    })();

    return () => {
      mounted = false;
      if (typeof cleanup === 'function') cleanup();
    };
  }, [activeTab, fetchNearbyRequests]);

  useEffect(() => {
    // Polling as a fallback for real-time updates
    const interval = setInterval(() => {
      if (isFocused && activeTab === 'requests') {
        fetchNearbyRequests();
      }
    }, 30000); // every 30 seconds

    return () => clearInterval(interval);
  }, [isFocused, activeTab, fetchNearbyRequests]);

  const categoriesBySlugRef = useRef({});
  const categoriesFetchingRef = useRef(false);

  useEffect(() => {
    categoriesBySlugRef.current = categoriesBySlug;
  }, [categoriesBySlug]);

  const fetchCategoriesIndex = useCallback(async () => {
    // Optimization: Only fetch if we don't have them yet and not already fetching
    if (Object.keys(categoriesBySlugRef.current || {}).length > 0 || categoriesFetchingRef.current) return;

    try {
      categoriesFetchingRef.current = true;
      const res = await getHelpCategories();
      const items = res?.data?.items || res?.items || [];
      const next = {};
      (Array.isArray(items) ? items : []).forEach((c) => {
        const slug = String(c?.slug || '').toLowerCase();
        if (!slug) return;
        next[slug] = {
          slug,
          name: c?.name || c?.slug,
          iconUrl: c?.iconUrl || null,
          updatedAt: c?.updatedAt || c?.createdAt || null,
        };
      });
      setCategoriesBySlug(next);
    } catch (e) { 
    } finally {
      categoriesFetchingRef.current = false;
    }
  }, []);

  const resolveCategoryMeta = (slugLike, fallbackName, fallbackIconPath) => {
    const slug = String(slugLike || '').toLowerCase();
    const meta = slug ? categoriesBySlug?.[slug] : null;
    const name = meta?.name || fallbackName || slugLike || 'General Help';
    const iconPath = meta?.iconUrl || fallbackIconPath || null;
    const version = meta?.updatedAt ? `?v=${encodeURIComponent(String(meta.updatedAt))}` : '';
    const iconPathWithVersion = iconPath ? `${iconPath}${version}` : null;
    const iconUri = iconPathWithVersion ? `${baseRoot}${iconPathWithVersion}` : null;
    return { name, iconPath: iconPathWithVersion, iconUri };
  };

  const fetchNearbyRequests = useCallback(async (showSkeleton = false) => {
    if (!isAvailableRef.current) {
      setNearbyRequests([]);
      nearbyRequestsLengthRef.current = 0;
      setLoadingNearby(false);
      setRefreshingNearby(false);
      isNearbyLoadingRef.current = false;
      return;
    }
    if (isNearbyLoadingRef.current) return;

    // Only show skeleton if explicitly requested AND we have no data
    const shouldShowSkeleton = showSkeleton && nearbyRequestsLengthRef.current === 0;

    isNearbyLoadingRef.current = true;
    if (shouldShowSkeleton) setLoadingNearby(true);

    try {
      await fetchCategoriesIndex();
      const auth = await loadAuth();
      if (auth?.accessToken) {
        let coords = null;
        let cached = null;
        try {
          cached = await loadLastKnownLocation();
          if (cached?.latitude && cached?.longitude) {
            coords = { latitude: cached.latitude, longitude: cached.longitude };
          } else {
            const hasPermission = await requestLocationPermission();
            if (hasPermission) {
              const position = await getCurrentPosition();
              if (position?.coords) {
                coords = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                };
              }
            }
          }
        } catch (locErr) {
          console.log('Error getting location for nearby:', locErr);
        }

        const [helpRes, presenceRes] = await Promise.all([
          getNearbyHelpRequests(auth.accessToken, coords).catch((e) => {
            console.log('Help API Error:', e);
            return { success: false, data: [] };
          }),
          getNearbyPresenceRequests(auth.accessToken, coords).catch((e) => {
            console.log('Presence API Error:', e);
            return { success: false, data: [] };
          })
        ]);

        const myUserId = auth.userId;
        let combinedRequests = [];

        // Process Help Requests
        if (helpRes && (helpRes.success || Array.isArray(helpRes))) {
          const data = Array.isArray(helpRes) ? helpRes : (helpRes.data || []);
          const helpRequests = data
            .filter(req => {
              const reqUserId = req.requesterId?._id || req.requesterId;
              return String(reqUserId) !== String(myUserId);
            })
            .map(req => ({
              ...req,
              type: 'help_request',
              distance: req.distanceMeters ? (req.distanceMeters / 1000).toFixed(1) : req.distance
            }));
          combinedRequests = [...combinedRequests, ...helpRequests];
        }

        // Process Presence Requests
        if (presenceRes && (presenceRes.success || Array.isArray(presenceRes))) {
          const data = Array.isArray(presenceRes) ? presenceRes : (presenceRes.data || []);
          const presenceRequests = data
            .map(req => ({
              ...req,
              type: 'presence_request',
              category: 'Presence',
              categoryName: 'Need Presence',
              description: req.description || 'Requesting calm presence nearby',
              distance: req.distanceMeters ? (req.distanceMeters / 1000).toFixed(1) : req.distance
            }));
          combinedRequests = [...combinedRequests, ...presenceRequests];
        }

        // Sort by distance (if available) or createdAt
        combinedRequests.sort((a, b) => {
          if (a.distance && b.distance) return parseFloat(a.distance) - parseFloat(b.distance);
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        setNearbyRequests(combinedRequests);
        nearbyRequestsLengthRef.current = combinedRequests.length;
      }
    } catch (err) {
      console.log('Error fetching nearby requests:', err);
      // Only clear if it was an initial load error
      if (shouldShowSkeleton) {
        setNearbyRequests([]);
        nearbyRequestsLengthRef.current = 0;
      }
    } finally {
      isNearbyLoadingRef.current = false;
      setLoadingNearby(false);
      setRefreshingNearby(false);
    }
  }, [fetchCategoriesIndex]);

  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const historyPageRef = useRef(1);
  const hasMoreHistoryRef = useRef(true);
  const [isFetchingMoreHistory, setIsFetchingMoreHistory] = useState(false);
  const lastHistoryFetchTimestampRef = useRef(0);

  const fetchHistory = useCallback(async (options = {}) => {
    const { isLoadMore = false, showSkeleton = false, isRefresh = false } = options;

    const now = Date.now();
    // Prevent fetching too frequently (debounce by 500ms)
    // If loading or if loadMore is requested but no more history or too soon since last fetch
    if (isHistoryLoadingRef.current) return;
    if (isLoadMore && (!hasMoreHistoryRef.current || now - lastHistoryFetchTimestampRef.current < 800)) return;
    
    const pageToFetch = isLoadMore ? historyPageRef.current + 1 : 1;
    const limit = 10;
    
    // Only show skeleton if requested and we have NO data at all
    const shouldShowSkeleton = showSkeleton && !isLoadMore && historyDataLengthRef.current === 0;
    
    isHistoryLoadingRef.current = true;
    lastHistoryFetchTimestampRef.current = now;
    
    if (shouldShowSkeleton) setLoadingHistory(true);
    if (isLoadMore) setIsFetchingMoreHistory(true);
    if (isRefresh) setRefreshingHistory(true);

    try {
      await fetchCategoriesIndex();
      const auth = await loadAuth();
      if (auth?.accessToken) {
        const res = await getHistory(auth.accessToken, { page: pageToFetch, limit });
        if (res.success) {
          const newData = res.data || [];
          const isAtLimit = newData.length === limit;

          if (isLoadMore) {
            setHistoryData(prev => {
              const existingIds = new Set(prev.map(item => item._id));
              const uniqueNewData = newData.filter(item => !existingIds.has(item._id));
              const next = [...prev, ...uniqueNewData];
              historyDataLengthRef.current = next.length;
              return next;
            });
            historyPageRef.current = pageToFetch;
            setHistoryPage(pageToFetch);
          } else {
            setHistoryData(newData);
            historyDataLengthRef.current = newData.length;
            historyPageRef.current = 1;
            setHistoryPage(1);
          }
          
          hasMoreHistoryRef.current = isAtLimit;
          setHasMoreHistory(isAtLimit);
        } else {
          if (isLoadMore) {
            hasMoreHistoryRef.current = false;
            setHasMoreHistory(false);
          }
        }
      }
    } catch (err) {
      console.log('Error fetching history:', err);
      if (isLoadMore) {
        hasMoreHistoryRef.current = false;
        setHasMoreHistory(false);
      }
    } finally {
      isHistoryLoadingRef.current = false;
      setLoadingHistory(false);
      setIsFetchingMoreHistory(false);
      setRefreshingHistory(false);
    }
  }, [fetchCategoriesIndex]);

  const handleLoadMoreHistory = () => {
    if (!isHistoryLoadingRef.current && hasMoreHistoryRef.current && !isFetchingMoreHistory) {
      fetchHistory({ isLoadMore: true });
    }
  };

  const handleRefreshHistory = () => {
    fetchHistory({ isRefresh: true });
  };

  const handleRefreshNearby = () => {
    setRefreshingNearby(true);
    fetchNearbyRequests(false);
  };

  const handleViewAndAcceptRequest = (req) => {
    if (!req?._id) return;

    if (req.type === 'presence_request') {
      const d = req.distanceMeters;
      navigation.navigate('PresenceRequestDetail', {
        requestId: req._id,
        initialDistanceMeters:
          typeof d === 'number' && Number.isFinite(d) && d >= 0 ? d : undefined,
      });
      return;
    }

    // Redirect to Community / Daily Help flow screen
    const resolved = resolveCategoryMeta(req.category, req.categoryName, req.categoryIcon);
    navigation.navigate('SomeoneNeedsHelp', {
      requestId: req._id,
      requestType: 'help',
      category: req.category,
      categoryName: resolved.name,
      categoryIcon: resolved.iconPath || req.categoryIcon,
      description: req.description,
      distanceMeters: req.distanceMeters,
      area: req?.location?.address || req?.location?.whereToFindText || null,
    });
  };

  const getFilteredHistory = () => {
    let filtered = historyData;
    if (filterStatus !== 'All') {
      if (filterStatus === 'Active') {
        filtered = filtered.filter(item =>
          ['active', 'matched', 'en_route', 'arrived', 'pending', 'open', 'matching', 'helpers_notified', 'helpers_accepted'].includes(item.status?.toLowerCase())
        );
      } else if (filterStatus === 'Completed') {
        filtered = filtered.filter(item =>
          ['completed', 'closed', 'accepted'].includes(item.status?.toLowerCase())
        );
      } else if (filterStatus === 'Cancelled') {
        filtered = filtered.filter(item =>
          ['cancelled', 'declined'].includes(item.status?.toLowerCase())
        );
      }
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const raw = item?.data || {};
        const other = item.otherUser?.fullName;
        return (
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          (item._id && String(item._id).toLowerCase().includes(query)) ||
          (other && String(other).toLowerCase().includes(query)) ||
          (raw.category && String(raw.category).toLowerCase().includes(query)) ||
          (raw.categoryName && String(raw.categoryName).toLowerCase().includes(query)) ||
          (raw.requestedDurationLabel && String(raw.requestedDurationLabel).toLowerCase().includes(query)) ||
          (raw.location?.address && String(raw.location.address).toLowerCase().includes(query)) ||
          (item.status && String(item.status).toLowerCase().includes(query))
        );
      });
    }
    return filtered;
  };

  const renderHistoryItem = ({ item, index }) => {
    const isPresence = item.type === 'presence_request' || item.type === 'presence_provided';
    
    if (isPresence) {
      return (
        <NeedPresenceHistoryCard
          item={item}
          index={index}
          onAction={(it) => {
            if (it.isMyRequest) {
              if (it.status === 'active' || it.status === 'helpers_notified' || it.status === 'accepted') {
                navigation.navigate('NearbyMap', { requestId: it._id, mode: 'requester' });
              } else {
                navigation.navigate('WhatsHappening');
              }
            } else {
              navigation.navigate('NearbyMap', { requestId: it._id, mode: 'helper' });
            }
          }}
        />
      );
    }

    return (
      <DailyHelpHistoryCard
        item={item}
        index={index}
        resolveCategoryMeta={resolveCategoryMeta}
        baseRoot={baseRoot}
        onAction={(it) => {
          if (it.isMyRequest) {
            if (['active', 'matched', 'en_route', 'arrived', 'in_progress'].includes(it.status?.toLowerCase())) {
              navigation.navigate('RequesterMatchingMap', { requestId: it._id });
            } else {
              navigation.navigate('HelpType');
            }
          } else {
            navigation.navigate('MatchingMap', { requestId: it._id });
          }
        }}
      />
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        syncCurrentLocationToDb(true),
        fetchAvailabilityStatus(),
        checkOnboardingStatus(),
        activeTab === 'requests' ? fetchNearbyRequests() : null,
        activeTab === 'history' ? fetchHistory() : null,
        fetchActiveRequests()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab]);

  const fetchActiveRequests = async () => {
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token) return;

      const presenceRes = await getActivePresenceRequest(token).catch(() => null);

      if (presenceRes?.success && presenceRes?.data) {
        const data = presenceRes.data;
        setActivePresence(data.request || data.presence || data);
      } else {
        setActivePresence(null);
      }
    } catch (e) {
      console.log('Error fetching active requests:', e);
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const hasCompleted = await AsyncStorage.getItem('HAS_COMPLETED_ONBOARDING');
      if (!hasCompleted) {
        navigation.navigate('AvailabilityRoles');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Background sync on focus
      if (activeTab === 'requests') {
        fetchNearbyRequests(false);
      } else if (activeTab === 'history') {
        fetchHistory({ showSkeleton: false });
      }
    }, [activeTab]) // Only depend on activeTab
  );

  useFocusEffect(
    useCallback(() => {
      void fetchActiveRequests();
    }, [])
  );

  const syncCurrentLocationToDb = async (force = false) => {
    const now = Date.now();
    if (locationSyncInFlightRef.current) {
      return;
    }
    if (!force && now - lastLocationSyncAtRef.current < 60000) {
      return;
    }
    lastLocationSyncAtRef.current = now;
    locationSyncInFlightRef.current = true;
    try {
      const { accessToken } = await loadAuth();
      if (!accessToken) {
        return;
      }

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        return;
      }

      const position = await getCurrentPosition();
      const longitude = position?.coords?.longitude;
      const latitude = position?.coords?.latitude;

      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        return;
      }

      if (__DEV__) {
        console.log('[Location] coords', {
          latitude,
          longitude,
          accuracy: position?.coords?.accuracy,
          altitude: position?.coords?.altitude,
          altitudeAccuracy: position?.coords?.altitudeAccuracy,
          heading: position?.coords?.heading,
          speed: position?.coords?.speed,
          timestamp: position?.timestamp,
        });
      }

      let label = 'Location on';
      let place = null;

      try {
        place = await reverseGeocode({
          latitude,
          longitude,
        });
        const nearbyName = await getNearbyPlaceName({ latitude, longitude });
        if (nearbyName) {
          place = place ? { ...place, name: nearbyName } : { name: nearbyName };
        }
        label = formatLocationLabel(place, { fallback: label });
      } catch (e) {
      }

      if (__DEV__) {
        console.log('[Location] reverseGeocode', place);
        console.log('[Location] label', label);
      }

      setLocationLabel(label);
      saveLastKnownLocation({ label, latitude, longitude, updatedAt: now }).catch(() => {});

      await updateAvailabilityLocation(accessToken, {
        lng: longitude,
        lat: latitude,
      });
    } catch (e) {
    } finally {
      locationSyncInFlightRef.current = false;
    }
  };

  const fetchAvailabilityStatus = async ({ forceApply = false } = {}) => {
    try {
      const { accessToken } = await loadAuth();
      if (!accessToken) return;
      const response = await getProfile(accessToken);
      if (response?.success && response?.data) {
        const { isAvailable } = response.data;
        let shouldApplyServer = true;
        if (!forceApply) {
          try {
            const [localValue, updatedAt] = await Promise.all([
              loadAvailabilityPreference(),
              loadAvailabilityUpdatedAt(),
            ]);
            if (typeof localValue === 'boolean' && typeof updatedAt === 'number') {
              const recentlyChanged = Date.now() - updatedAt < 4000;
              if (recentlyChanged && localValue !== !!isAvailable) {
                shouldApplyServer = false;
              }
            }
          } catch (e) { }
        }

        if (shouldApplyServer) {
          const serverAvail = !!isAvailable;
          applyAvailability(serverAvail, { animate: true });
          try {
            await saveAvailabilityPreference(serverAvail);
          } catch (e) { }
        }
      }
    } catch (error) {
      console.log('Error fetching availability:', error);
    }
  };

  const applyAvailability = (value, { animate = false } = {}) => {
    const nextValue = !!value;
    isAvailableRef.current = nextValue;
    setIsAvailable(nextValue);
    if (!nextValue) {
      setNearbyRequests([]);
      nearbyRequestsLengthRef.current = 0;
      setLoadingNearby(false);
      setRefreshingNearby(false);
      isNearbyLoadingRef.current = false;
    } else {
      queueMicrotask(() => {
        if (activeTabRef.current === 'requests') {
          fetchNearbyRequests(false);
        }
      });
    }
    if (animate) {
      Animated.timing(toggleAnim, {
        toValue: nextValue ? 0 : 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      toggleAnim.setValue(nextValue ? 0 : 1);
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
    checkAndSyncDeviceToken();
    (async () => {
      try {
        const cached = await loadLastKnownLocation();
        if (cached?.label) {
          setLocationLabel(cached.label);
        }
        if (cached?.updatedAt) {
          lastLocationSyncAtRef.current = cached.updatedAt;
        }
      } catch (e) { }
      syncCurrentLocationToDb();
    })();
    (async () => {
      try {
        const localValue = await loadAvailabilityPreference();
        if (typeof localValue === 'boolean') {
          applyAvailability(localValue);
        }
      } catch (e) { }
      fetchAvailabilityStatus();
    })();
  }, []);


  useEffect(() => {
    const messaging = getMessaging();
    const unsubscribe = onTokenRefresh(messaging, async (newToken) => {
      try {
        const { accessToken } = await loadAuth();
        if (!accessToken || !newToken) return;
        await updateDeviceToken(accessToken, { deviceToken: newToken, platform: Platform.OS });
      } catch (e) {}
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const localValue = await loadAvailabilityPreference();
          if (!cancelled && typeof localValue === 'boolean') {
            applyAvailability(localValue);
          }
        } catch (e) { }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const checkAndSyncDeviceToken = async () => {
    try {
      console.log('[FCM] checkAndSyncDeviceToken: start');
      const { accessToken } = await loadAuth();
      if (!accessToken) {
        console.log('[FCM] No accessToken found, skipping device token sync');
        return;
      }

      let token = null;
      try {
        console.log('[FCM] Requesting notification permission + FCM token');
        token = await getFcmToken();
        console.log('[FCM] getFcmToken result:', token);
      } catch (e) {
        console.log('[FCM] getFcmToken error:', e?.message || e);
        token = null;
      }

      if (!token) {
        console.log('[FCM] No FCM token received, cannot update backend');
        return;
      }

      try {
        console.log('[FCM] Sending token to backend via /auth/device-token');
        let deviceId = null;
        let deviceModel = null;
        let appVersion = null;
        try {
          deviceModel = Device.modelName || null;
        } catch (e) { }
        try {
          if (Platform.OS === 'android') {
            deviceId = Application.androidId || null;
          } else if (Platform.OS === 'ios') {
            deviceId = Application.iosIdForVendor || null;
          }
        } catch (e) { }
        try {
          appVersion = Application.nativeApplicationVersion || null;
        } catch (e) { }
        const response = await updateDeviceToken(accessToken, {
          deviceToken: token,
          platform: Platform.OS,
          deviceId,
          deviceModel,
          appVersion,
        });
        console.log('[FCM] updateDeviceToken response:', response);
      } catch (e) {
        console.log('[FCM] updateDeviceToken API error:', e?.response?.data || e?.message || e);
      }
    } catch (error) {
      console.log('[FCM] checkAndSyncDeviceToken outer error:', error?.message || error);
    }
  };

  const handleAvailabilityToggle = async (value) => {
    if (value === isAvailable) return;

    const previousValue = isAvailable;

    if (value === true) {
      try {
        const hasCompleted = await AsyncStorage.getItem('HAS_COMPLETED_ONBOARDING');
        if (!hasCompleted) {
          navigation.navigate('AvailabilityRoles');
          return;
        }
      } catch (e) { }
    }

    applyAvailability(value, { animate: true });
    try {
      await saveAvailabilityPreference(value);
    } catch (e) { }

    const seq = (availabilityReqSeqRef.current || 0) + 1;
    availabilityReqSeqRef.current = seq;

    (async () => {
      try {
        const { accessToken } = await loadAuth();
        if (!accessToken) return;

        if (value === true) {
          let location = null;
          try {
            const cached = await loadLastKnownLocation();
            if (typeof cached?.latitude === 'number' && typeof cached?.longitude === 'number') {
              location = { lng: cached.longitude, lat: cached.latitude };
            }
          } catch (e) { }

          try {
            const hasPermission = await requestLocationPermission();
            if (hasPermission) {
              const pos = await getCurrentPosition({ timeoutMs: 1500, fallbackToLastKnown: true });
              if (pos && pos.coords) {
                location = {
                  lng: pos.coords.longitude,
                  lat: pos.coords.latitude,
                };
              }
            }
          } catch (e) { }

          const payload = location ? { isAvailable: true, location } : { isAvailable: true };
          const res = await toggleAvailability(accessToken, payload);
          const serverValue = res?.data?.isAvailable;
          if (availabilityReqSeqRef.current === seq && typeof serverValue === 'boolean') {
            applyAvailability(serverValue, { animate: true });
            try { await saveAvailabilityPreference(serverValue); } catch (e) { }
          }
        } else {
          const res = await toggleAvailability(accessToken, { isAvailable: false });
          const serverValue = res?.data?.isAvailable;
          if (availabilityReqSeqRef.current === seq && typeof serverValue === 'boolean') {
            applyAvailability(serverValue, { animate: true });
            try { await saveAvailabilityPreference(serverValue); } catch (e) { }
          }
        }
      } catch (error) {
        if (availabilityReqSeqRef.current !== seq) return;
        setTimeout(async () => {
          if (availabilityReqSeqRef.current !== seq) return;
          try {
            await fetchAvailabilityStatus({ forceApply: true });
            const now = Date.now();
            if (now - (availabilityErrorShownAtRef.current || 0) > 4000) {
              availabilityErrorShownAtRef.current = now;
              const apiMessage =
                error?.response?.data?.message ||
                error?.response?.data?.errors?.[0]?.message;
              Alert.alert('Unable to update', apiMessage || 'Unable to update availability. Please try again.');
            }
          } catch (e) { }
        }, 1500);
      }
    })();
  };

  const emergencyContacts = [
    { id: 1, label: 'Police', icon: require('../../assets/home_icons/2.png'), phone: '100' },
    { id: 2, label: 'Ambulance', icon: require('../../assets/home_icons/4.png'), phone: '108' },
    { id: 3, label: "Women's Safety", icon: require('../../assets/home_icons/5.png'), phone: '1091' },
    { id: 4, label: 'Local Helpline', icon: require('../../assets/home_icons/3.png'), phone: '112' }
  ];

  const quickActions = [
    { id: 1, label: 'Unsafe walk', icon: require('../../assets/home_icons/shoose.png') },
    { id: 2, label: 'Blood needed', icon: require('../../assets/home_icons/bolld.png') },
    { id: 3, label: 'Car issue', icon: require('../../assets/home_icons/car.png') }
  ];

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleQuickAction = (action) => {
    const label = String(action?.label || '').toLowerCase().trim();
    const map = {
      'unsafe walk': { reason: 'unsafe_walk', category: 'calm_presence' },
      'blood needed': { reason: 'blood_needed', category: 'right_help' },
      'car issue': { reason: 'car_issue', category: 'prevent_fix' },
    };

    const params = map[label];
    if (params) {
      navigation.navigate('BeforeShare', { ...params, note: '' });
      return;
    }

    navigation.navigate('WhatsHappening');
  };

  const handleEmergencyShortcut = (contact) => {
    const id = Number(contact?.id);
    navigation.navigate('EmergencyHelp', {
      focusIndex: Number.isFinite(id) ? Math.max(0, Math.min(3, id - 1)) : 0,
    });
  };

  const handlePresence = () => {
    if (activePresence) {
      navigation.navigate('NearbyMap', { requestId: activePresence._id, mode: 'requester' });
    } else {
      navigation.navigate('WhatsHappening');
    }
  };

  const translateX = scrollX.interpolate({
    inputRange: [0, Math.max(1, SCREEN_WIDTH), Math.max(2, SCREEN_WIDTH * 2)],
    outputRange: [0, SCREEN_WIDTH / 3, (SCREEN_WIDTH / 3) * 2],
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <HomeHeader
          onSettingsPress={handleSettings}
          onLogoPress={() => console.log('Logo pressed')}
          onLocationPress={() => navigation.navigate('LocationMap')}
          locationLabel={locationLabel}
        />

      <View style={{
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        position: 'relative',
        paddingBottom: vscale(4)
      }}>
        <TouchableOpacity
          onPress={() => onTabPress('overview', 0)}
          style={{
            flex: 1,
            paddingVertical: vscale(10),
            alignItems: 'center',
          }}
        >
          <Text style={{
            fontSize: ms(14),
            fontWeight: activeTab === 'overview' ? '700' : '500',
            color: activeTab === 'overview' ? '#DC5C69' : '#94A3B8'
          }}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onTabPress('requests', 1)}
          style={{
            flex: 1,
            paddingVertical: vscale(10),
            alignItems: 'center',
          }}
        >
          <Text style={{
            fontSize: ms(14),
            fontWeight: activeTab === 'requests' ? '700' : '500',
            color: activeTab === 'requests' ? '#DC5C69' : '#94A3B8'
          }}>Nearby Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onTabPress('history', 2)}
          style={{
            flex: 1,
            paddingVertical: vscale(10),
            alignItems: 'center',
          }}
        >
          <Text style={{
            fontSize: ms(14),
            fontWeight: activeTab === 'history' ? '700' : '500',
            color: activeTab === 'history' ? '#DC5C69' : '#94A3B8'
          }}>My Activity</Text>
        </TouchableOpacity>

        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '33.33%',
            height: scale(2),
            backgroundColor: '#DC5C69',
            transform: [{ translateX }]
          }}
        />
      </View>

      <Animated.FlatList
        ref={flatListRef}
        key={`home-tabs-${SCREEN_WIDTH}`}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        data={['overview', 'requests', 'history']}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH || 375,
          offset: (SCREEN_WIDTH || 375) * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          requestAnimationFrame(() => {
            flatListRef.current?.scrollToOffset({ offset: SCREEN_WIDTH * index, animated: true });
          });
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH || 375, flex: 1, minHeight: tabPageMinHeight }}>
            {item === 'overview' ? (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(20), paddingTop: vscale(12), paddingBottom: vscale(95) }]}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
              >
                <View style={{ width: contentWidth, alignSelf: 'center' }}>
                  <MotionView preset="fadeUp" delay={100}>
                    <Text
                      style={[
                        styles.connectedMessage,
                        { fontSize: ms(18), marginBottom: vscale(12), lineHeight: ms(26) },
                      ]}
                    >
                      You're connected to people nearby.
                    </Text>
                  </MotionView>

                  <MotionView preset="fadeUp" delay={200}>
                    <View
                      style={[
                        styles.availabilityContainer,
                        {
                          padding: scale(2),
                          marginBottom: vscale(10),
                          borderRadius: scale(24),
                          borderWidth: scale(1),
                          shadowRadius: scale(8),
                        },
                      ]}
                      onLayout={(event) => {
                        setAvailabilityWidth(event.nativeEvent.layout.width);
                      }}
                    >
                      {availabilityWidth > 0 && (
                        <Animated.View
                          style={[
                            styles.availabilitySlider,
                            {
                              width: availabilityWidth / 2 - scale(4),
                              transform: [
                                {
                                  translateX: toggleAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [scale(2), availabilityWidth / 2],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={['#EC6E63', '#D84D42']}
                            start={{ x: 0.2, y: 0.0 }}
                            end={{ x: 0.8, y: 1.0 }}
                            style={[styles.availabilitySliderGradient, { justifyContent: 'center', alignItems: 'flex-end', paddingRight: spacing(10) }]}
                          >
                          
                          </LinearGradient>
                        </Animated.View>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.availabilityButton,
                          {
                            paddingVertical: vscale(8),
                            paddingHorizontal: spacing(16),
                            borderRadius: scale(22),
                          },
                        ]}
                        onPress={() => handleAvailabilityToggle(true)}
                      >
                        <Text
                          style={[
                            styles.availabilityButtonText,
                            isAvailable && styles.availabilityButtonTextActive,
                            { fontSize: ms(14) },
                          ]}
                        >
                          Available
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.availabilityButton,
                          {
                            paddingVertical: vscale(8),
                            paddingHorizontal: spacing(16),
                            borderRadius: scale(22),
                          },
                        ]}
                        onPress={() => handleAvailabilityToggle(false)}
                      >
                        <Text
                          style={[
                            styles.availabilityButtonText,
                            !isAvailable && styles.availabilityButtonTextActive,
                            { fontSize: ms(14) },
                          ]}
                        >
                          Not Available
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </MotionView>

                  <MotionView preset="fadeUp" delay={300}>
                    <Text style={[{ fontSize: ms(12), marginBottom: vscale(5) }]}>
                      Bookmarks
                    </Text>

                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsHorizontalScrollIndicator={false}
                      bounces
                      contentContainerStyle={{ gap: spacing(10), paddingRight: spacing(20) }}
                      style={[styles.quickActionsContainer, { marginBottom: vscale(6) }]}
                    >
                      {quickActions.map((action, index) => (
                        <MotionPressable
                          key={action.id}
                          style={[
                            styles.quickActionButton,
                            {
                              paddingHorizontal: spacing(10),
                              height: vscale(40),
                              borderRadius: scale(24),
                              borderWidth: scale(1),
                              shadowRadius: scale(6),
                            },
                          ]}
                          onPress={() => handleQuickAction(action)}
                        >
                          <Image
                            source={action.icon}
                            style={{ width: scale(22), height: scale(22) }}
                            resizeMode="contain"
                          />
                          <Text
                            style={[
                              styles.quickActionLabel,
                              { fontSize: ms(12), marginLeft: spacing(8) },
                            ]}
                            numberOfLines={1}
                          >
                            {action.label}
                          </Text>
                        </MotionPressable>
                      ))}
                    </ScrollView>

                    <Text
                      style={[
                        styles.quickActionSubtext,
                        { fontSize: ms(13), marginBottom: vscale(8) },
                      ]}
                    >
                      Quick actions based on what you face often.
                    </Text>
                  </MotionView>

                  <MotionView preset="fadeUp" delay={400} style={[styles.presenceSection, { marginBottom: vscale(45) }]}>
                    {activePresence && (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handlePresence}
                        style={[
                          styles.activeCard,
                          {
                            width: '100%',
                            borderRadius: scale(16),
                            paddingVertical: vscale(14),
                            paddingHorizontal: spacing(16),
                            marginBottom: vscale(20),
                            borderWidth: 1.5,
                            borderColor: '#DC5C69',
                            backgroundColor: '#FFF5F6',
                            flexDirection: 'row',
                            alignItems: 'center',
                            shadowColor: "#DC5C69",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3
                          },
                        ]}
                      >
                        <View style={[styles.activeIconBadge, { backgroundColor: '#DC5C69', width: scale(40), height: scale(40), borderRadius: scale(20), marginRight: spacing(12) }]}>
                          <Icon name="eye-check" size={scale(20)} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                            <View style={{ marginRight: spacing(6) }}>
                              <PulseDot color="#DC5C69" size={6} />
                            </View>
                            <Text style={[styles.activeCardTitle, { fontSize: ms(14), color: '#DC5C69', fontWeight: '700', marginRight: spacing(6) }]}>
                              Active Presence Request
                            </Text>
                            <View style={{ backgroundColor: '#DC5C69', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ color: '#FFF', fontSize: ms(9), fontWeight: '800' }}>LIVE</Text>
                            </View>
                          </View>
                          <Text numberOfLines={1} style={{ fontSize: ms(13), color: '#334155' }}>
                            {activePresence.description || 'Sharing presence with people nearby'}
                          </Text>
                        </View>
                        <Icon name="chevron-right" size={scale(20)} color="#DC5C69" />
                      </TouchableOpacity>
                    )}

                    <MotionPressable 
                      onPress={handlePresence} 
                      pressScale={0.95}
                    >
                      <View
                        style={[
                          styles.presenceButtonContainer,
                          {
                            width: scale(165),
                            height: scale(165),
                            borderRadius: scale(82.5),
                            marginBottom: vscale(5),
                          },
                        ]}
                      >
                        <Image
                          source={require('../../assets/home_icons/1.png')}
                          style={{ width: scale(165), height: scale(165) }}
                          resizeMode="contain"
                        />
                      </View>
                    </MotionPressable>

                    <Text
                      style={[
                        styles.presenceTitle,
                        { fontSize: ms(18), marginBottom: vscale(4) },
                      ]}
                    >
                      Need Presence
                    </Text>
                    <Text
                      style={[
                        styles.presenceSubtitle,
                        { fontSize: ms(13), lineHeight: ms(22), marginBottom: vscale(2) },
                      ]}
                    >
                      Calm local support, no escalation
                    </Text>
                  </MotionView>

                  <MotionView
                    preset="fadeUp"
                    delay={500}
                    style={[
                      styles.emergencyContactsContainer,
                      { gap: spacing(12) },
                    ]}
                  >
                    {emergencyContacts.map((contact) => (
                      <MotionPressable
                        key={contact.id}
                        style={[
                          styles.emergencyContactButton,
                          {
                            paddingVertical: vscale(8),
                            paddingHorizontal: spacing(14),
                            borderRadius: scale(18),
                            borderWidth: scale(1),
                            shadowRadius: scale(6),
                          },
                        ]}
                        onPress={() => handleEmergencyShortcut(contact)}
                      >
                        <View
                          style={[
                            styles.emergencyContactIconWrapper,
                            { marginRight: spacing(12) },
                          ]}
                        >
                          <Image
                            source={contact.icon}
                            style={{ width: scale(30), height: scale(30) }}
                            resizeMode="contain"
                          />
                        </View>
                        <Text
                          style={[
                            styles.emergencyContactLabel,
                            { fontSize: ms(13) },
                          ]}
                        >
                          {contact.label}
                        </Text>
                      </MotionPressable>
                    ))}
                  </MotionView>

                  <View style={[styles.spacer, { height: vscale(5) }]} />
                </View>
              </ScrollView>
            ) : item === 'requests' ? (
              <View style={{ flex: 1, paddingHorizontal: spacing(20), paddingTop: vscale(10) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vscale(16) }}>
                  <Text style={[styles.sectionTitle, { fontSize: ms(18), marginBottom: 0 }]}>Nearby Active Requests</Text>
                </View>

                {!isAvailable ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: vscale(48), paddingHorizontal: spacing(16) }}>
                    <View
                      style={{
                        width: scale(80),
                        height: scale(80),
                        borderRadius: scale(40),
                        backgroundColor: '#F8FAFC',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: vscale(16),
                      }}
                    >
                      <Icon name="toggle-switch-off-outline" size={scale(40)} color="#CBD5E1" />
                    </View>
                    <Text style={{ fontSize: ms(16), fontWeight: '600', color: '#475569', marginBottom: vscale(8), textAlign: 'center' }}>
                      You're not available
                    </Text>
                    <Text style={{ fontSize: ms(13), color: '#94A3B8', textAlign: 'center', maxWidth: '85%', lineHeight: ms(20) }}>
                      Turn on <Text style={{ fontWeight: '600', color: '#64748B' }}>Available</Text> in the header to see nearby requests you can help with.
                    </Text>
                  </View>
                ) : (loadingNearby && nearbyRequests.length === 0) ? (
                  <View style={{ flex: 1 }}>
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.activeCard,
                          {
                            backgroundColor: '#FFFFFF',
                            marginBottom: vscale(16),
                            padding: spacing(16),
                            borderRadius: scale(16),
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.06,
                            shadowRadius: 8,
                            elevation: 3,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(12) }}>
                          <SkeletonCircle size={scale(48)} style={{ marginRight: spacing(12) }} />
                          <View style={{ flex: 1 }}>
                            <SkeletonBox height={12} radius={8} style={{ marginBottom: 8 }} />
                            <SkeletonBox height={10} radius={8} width="55%" />
                          </View>
                          <SkeletonBox height={22} radius={10} width={scale(62)} />
                        </View>
                        <SkeletonBox height={12} radius={8} style={{ marginBottom: 8 }} />
                        <SkeletonBox height={12} radius={8} width="80%" />
                        <SkeletonSpacer height={vscale(16)} />
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <SkeletonBox height={scale(40)} radius={scale(10)} style={{ flex: 1, marginRight: spacing(8) }} />
                          <SkeletonBox height={scale(40)} radius={scale(10)} width={scale(40)} />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <FlatList
                    data={nearbyRequests}
                    keyExtractor={(req) => req._id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: vscale(125) }}
                    refreshControl={
                      <RefreshControl refreshing={refreshingNearby} onRefresh={handleRefreshNearby} colors={['#DC5C69']} tintColor="#DC5C69" />
                    }
                    renderItem={({ item: req }) => {
                      if (req.type === 'presence_request') {
                        return (
                          <NeedPresenceRequestCard
                            key={req._id}
                            req={req}
                            onAccept={handleViewAndAcceptRequest}
                          />
                        );
                      }
                      return (
                        <DailyHelpRequestCard
                          key={req._id}
                          req={req}
                          onAccept={handleViewAndAcceptRequest}
                          resolveCategoryMeta={resolveCategoryMeta}
                        />
                      );
                    }}
                    ListEmptyComponent={
                      <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: vscale(60) }}>
                        <View style={{
                          width: scale(80), height: scale(80), borderRadius: scale(40),
                          backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center',
                          marginBottom: vscale(16)
                        }}>
                          <Icon name="map-search-outline" size={scale(40)} color="#CBD5E1" />
                        </View>
                        <Text style={{ fontSize: ms(16), fontWeight: '600', color: '#475569', marginBottom: vscale(4) }}>
                          No Requests Nearby
                        </Text>
                        <Text style={{ fontSize: ms(13), color: '#94A3B8', textAlign: 'center', maxWidth: '70%' }}>
                          There are no active help requests in your current location. Check back later!
                        </Text>
                        <TouchableOpacity
                          onPress={() => fetchNearbyRequests(true)}
                          style={{ marginTop: vscale(20) }}
                          accessibilityRole="button"
                          accessibilityLabel="Refresh nearby requests"
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name="refresh" size={scale(16)} color="#DC5C69" style={{ marginRight: spacing(6) }} />
                            <Text style={{ color: '#DC5C69', fontWeight: '600', fontSize: ms(14) }}>Refresh List</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    }
                  />
                )}
              </View>
            ) : (
              <View style={{ flex: 1, paddingHorizontal: spacing(20), paddingTop: vscale(12) }}>
                <View style={{ marginBottom: vscale(16) }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: scale(8),
                    paddingHorizontal: spacing(12),
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginBottom: vscale(12)
                  }}>
                    <Icon name="magnify" size={scale(20)} color="#94A3B8" />
                    <TextInput
                      style={{
                        flex: 1,
                        paddingVertical: vscale(10),
                        paddingHorizontal: spacing(8),
                        fontSize: ms(14),
                        color: '#1E293B'
                      }}
                      placeholder="Search history..."
                      placeholderTextColor="#94A3B8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="close-circle" size={scale(18)} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing(20) }}>
                    {['All', 'Active', 'Completed', 'Cancelled'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => setHistoryFilter(status)}
                        style={{
                          paddingHorizontal: spacing(16),
                          paddingVertical: vscale(6),
                          borderRadius: scale(20),
                          backgroundColor: filterStatus === status ? '#DC5C69' : '#F1F5F9',
                          marginRight: spacing(8),
                          borderWidth: 1,
                          borderColor: filterStatus === status ? '#DC5C69' : '#E2E8F0'
                        }}
                      >
                        <Text style={{
                          fontSize: ms(13),
                          fontWeight: filterStatus === status ? '600' : '500',
                          color: filterStatus === status ? '#FFFFFF' : '#64748B'
                        }}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {(loadingHistory && historyData.length === 0) ? (
                  <View style={{ marginTop: vscale(10), paddingBottom: vscale(125) }}>
                    {[0, 1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.historyCard,
                          {
                            marginBottom: vscale(8),
                            borderRadius: scale(12),
                            paddingHorizontal: spacing(10),
                            paddingVertical: vscale(10),
                            backgroundColor: '#FFFFFF',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.06,
                            shadowRadius: 6,
                            elevation: 2,
                            borderWidth: 1,
                            borderColor: '#EEF2F6',
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row' }}>
                          <SkeletonCircle size={scale(36)} style={{ marginRight: spacing(10) }} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vscale(5) }}>
                              <SkeletonBox height={11} radius={6} width="58%" />
                              <SkeletonBox height={16} radius={8} width={scale(56)} />
                            </View>
                            <SkeletonBox height={9} radius={6} width="72%" style={{ marginBottom: vscale(6) }} />
                            <SkeletonBox height={9} radius={6} width="40%" />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <FlatList
                    data={getFilteredHistory()}
                    renderItem={renderHistoryItem}
                    keyExtractor={(item, index) => item._id || String(index)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: vscale(125) }}
                    refreshControl={
                      <RefreshControl refreshing={refreshingHistory} onRefresh={handleRefreshHistory} colors={['#DC5C69']} tintColor="#DC5C69" />
                    }
                    onEndReached={handleLoadMoreHistory}
                    onEndReachedThreshold={0.1}
                    ListFooterComponent={
                      isFetchingMoreHistory ? (
                        <View style={{ paddingVertical: vscale(20), alignItems: 'center' }}>
                          <ActivityIndicator color="#DC5C69" size="small" />
                        </View>
                      ) : null
                    }
                    ListEmptyComponent={
                      <View style={{ alignItems: 'center', marginTop: vscale(40) }}>
                        <Icon name="history" size={scale(48)} color="#E0E0E0" />
                        <Text style={{ marginTop: vscale(12), color: '#999999', fontSize: ms(14) }}>
                          No history found
                        </Text>
                      </View>
                    }
                  />
                )}
              </View>
            )}
          </View>
        )}
      />

    </SafeAreaView>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    flexGrow: 1,
  },
  moduleButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  moduleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },

  // ===== CONNECTED MESSAGE =====
  connectedMessage: {
    fontWeight: '400',
    color: '#2C3E50',
    textAlign: 'center',
  },

  // ===== AVAILABILITY TOGGLE =====
  availabilityContainer: {
    flexDirection: 'row',
    backgroundColor: '#ECEFF4',
    borderColor: '#D0D5DD',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    elevation: 3,
  },

  availabilityButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  availabilityButtonActive: {
  },
  availabilityGradientFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  availabilityButtonText: {
    fontWeight: '600',
    color: '#6B7280',
  },

  availabilityButtonTextActive: {
    color: '#FFFFFF',
  },

  availabilitySlider: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 0,
    borderRadius: 22,
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },

  availabilitySliderGradient: {
    flex: 1,
    borderRadius: 22,
  },

  // ===== QUICK ACTIONS =====
  quickActionsContainer: {
  },

  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderColor: '#D0D5DD',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    elevation: 2,
  },

  quickActionLabel: {
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'left',
  },

  quickActionSubtext: {
    fontWeight: '400',
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },

  // ===== PRESENCE SECTION =====
  presenceSection: {
    alignItems: 'center',
  },

  presenceButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  presenceTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  presenceSubtitle: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },

  // ===== EMERGENCY CONTACTS GRID =====
  emergencyContactsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  emergencyContactButton: {
    width: '48%',
    borderColor: '#D0D5DD',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    elevation: 2,
  },

  emergencyContactIconWrapper: {
    flexShrink: 0,
  },

  emergencyContactLabel: {
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },

  locationModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationModalCard: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  locationModalHeader: {
    marginBottom: 16,
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  locationModalSubtitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  locationPrimaryCtaWrapper: {
    marginTop: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  locationPrimaryCta: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPrimaryCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  locationSkipButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  locationSkipButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },

  // ===== SPACER =====
  spacer: {
  },

  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEE',
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    alignItems: 'center',
  },
  iconCard: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E9F0',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconImage: {
    width: '72%',
    height: '72%',
    resizeMode: 'contain',
  },
  gridLabel: {
    color: '#2C3E50',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCardTitle: {
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    justifyContent: 'center',
  },
  statusText: {
    fontWeight: '600',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actionBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;
