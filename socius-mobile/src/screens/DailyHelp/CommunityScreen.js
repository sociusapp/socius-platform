import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Animated, useWindowDimensions, RefreshControl, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import PulseDot from '../../components/common/PulseDot';
import { useResponsive } from '../../utils/responsive';
import { getMyActiveHelpRequest, getNearbyHelpRequests } from '../../services/api/incident.api';
import { getHistory } from '../../services/api/user.api';
import { api } from '../../services/api/client';
import { getHelpCategories } from '../../services/api/helpCategories.api';
import { loadAuth, loadLastKnownLocation } from '../../services/storage/asyncStorage.service';
import CustomAlert from '../../components/common/CustomAlert';
import DailyHelpRequestCard from '../../components/DailyHelp/cards/DailyHelpRequestCard';
import DailyHelpHistoryCard from '../../components/DailyHelp/cards/DailyHelpHistoryCard';
import { SkeletonBox, SkeletonCircle, SkeletonSpacer } from '../../components/common/Skeleton';
import { requestLocationPermission, getCurrentPosition } from '../../services/location/geolocation.service';
import { connectSocket, getSocket } from '../../services/socket/socket.service';

const CommunityScreen = ({ navigation }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const cardWidth = (contentWidth - spacing(24)) / 3;
  const baseRoot = useMemo(() => {
    const base = String(api?.defaults?.baseURL || '');
    return base.replace(/\/api\/?$/, '');
  }, []);
  const isFocused = useIsFocused();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeRequest, setActiveRequest] = useState(null);
  const [activeHelp, setActiveHelp] = useState(null);
  const [categoriesBySlug, setCategoriesBySlug] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  // Community Screen Refs
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

  const onTabPress = useCallback((tabName, index) => {
    setActiveTab(tabName);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: (SCREEN_WIDTH || 375) * index, animated: true });
    });
  }, [SCREEN_WIDTH]);

  const onMomentumScrollEnd = (event) => {
    const width = event.nativeEvent.layoutMeasurement.width || SCREEN_WIDTH || 375;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    const tabs = ['overview', 'requests', 'history'];
    const newTab = tabs[index];
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  const fetchCategoriesIndex = async () => {
    try {
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
    } catch (e) { }
  };

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

  const fetchNearbyRequests = useCallback(async () => {
    if (isNearbyLoadingRef.current) return;
    const shouldShowSkeleton = nearbyRequestsLengthRef.current === 0;
    isNearbyLoadingRef.current = true;
    if (shouldShowSkeleton) setLoadingNearby(true);

    try {
      const auth = await loadAuth();
      if (auth?.accessToken) {
        let coords = null;
        const cached = await loadLastKnownLocation();
        if (cached?.latitude && cached?.longitude) {
          coords = { latitude: cached.latitude, longitude: cached.longitude };
        }

        const helpRes = await getNearbyHelpRequests(auth.accessToken, coords).catch(() => ({ success: false, data: [] }));
        const myUserId = auth.userId;
        
        let helpRequests = [];
        if (helpRes && (helpRes.success || Array.isArray(helpRes))) {
          const data = Array.isArray(helpRes) ? helpRes : (helpRes.data || []);
          helpRequests = data
            .filter(req => String(req.requesterId?._id || req.requesterId) !== String(myUserId))
            .map(req => ({
              ...req,
              type: 'help_request',
              distance: req.distanceMeters ? (req.distanceMeters / 1000).toFixed(1) : req.distance
            }));
        }

        setNearbyRequests(helpRequests);
      }
    } catch (err) {
      console.log('Error fetching nearby requests:', err);
    } finally {
      isNearbyLoadingRef.current = false;
      if (shouldShowSkeleton) setLoadingNearby(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    if (isHistoryLoadingRef.current) return;
    const shouldShowSkeleton = historyDataLengthRef.current === 0;
    isHistoryLoadingRef.current = true;
    if (shouldShowSkeleton) setLoadingHistory(true);

    try {
      const auth = await loadAuth();
      if (auth?.accessToken) {
        const res = await getHistory(auth.accessToken);
        if (res.success) {
          const allHistory = res.data || [];
          const helpHistory = allHistory.filter(r => 
            r.type === 'help_request' || r.type === 'help_provided'
          );
          setHistoryData(helpHistory);
        }
      }
    } catch (err) {
      console.log('Error fetching history:', err);
    } finally {
      isHistoryLoadingRef.current = false;
      if (shouldShowSkeleton) setLoadingHistory(false);
    }
  }, []);

  const fetchActiveRequests = useCallback(async () => {
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (token) {
        const response = await getMyActiveHelpRequest(token);
        if (response?.success && response?.data) {
          const data = response.data;
          setActiveRequest(data.activeRequest !== undefined ? data.activeRequest : data);
          setActiveHelp(data.activeHelp || null);
        } else {
          setActiveRequest(null);
          setActiveHelp(null);
        }
      }
    } catch (error) {
      console.log('Error checking active requests:', error);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchCategoriesIndex();
      fetchActiveRequests();
      if (activeTab === 'requests') fetchNearbyRequests();
      else if (activeTab === 'history') fetchHistory();
    }
  }, [isFocused, activeTab, fetchNearbyRequests, fetchHistory, fetchActiveRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchActiveRequests(),
      activeTab === 'requests' ? fetchNearbyRequests() : null,
      activeTab === 'history' ? fetchHistory() : null
    ]);
    setRefreshing(false);
  }, [activeTab, fetchActiveRequests, fetchNearbyRequests, fetchHistory]);

  const handleViewAndAcceptRequest = (req) => {
    if (!req?._id) return;
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
        filtered = filtered.filter(item => ['active', 'matched', 'en_route', 'arrived', 'pending', 'open', 'matching'].includes(item.status?.toLowerCase()));
      } else if (filterStatus === 'Completed') {
        filtered = filtered.filter(item => ['completed', 'closed', 'accepted'].includes(item.status?.toLowerCase()));
      } else if (filterStatus === 'Cancelled') {
        filtered = filtered.filter(item => ['cancelled', 'declined'].includes(item.status?.toLowerCase()));
      }
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }
    return filtered;
  };

  const renderHistoryItem = ({ item }) => (
    <DailyHelpHistoryCard
      item={item}
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

  const translateX = scrollX.interpolate({
    inputRange: [0, Math.max(1, SCREEN_WIDTH), Math.max(2, SCREEN_WIDTH * 2)],
    outputRange: [0, SCREEN_WIDTH / 3, (SCREEN_WIDTH / 3) * 2],
  });

  const handleSettings = () => navigation.navigate('Settings');
  const handleRequestHelp = () => navigation.navigate('HelpType');

  const presenceTypes = [
    { id: 'calm', name: 'Calm presence', image: require('../../assets/images/community/Screenshot 2026-02-16 at 2.57.36 PM.png') },
    { id: 'care', name: 'Care & support', image: require('../../assets/images/community/5.png') },
    { id: 'medical', name: 'Medical awareness', image: require('../../assets/images/community/4.png') },
    { id: 'language', name: 'Language support', image: require('../../assets/images/community/3.png') },
    { id: 'elder', name: 'Elder assistance', image: require('../../assets/images/community/Screenshot 2026-02-16 at 2.58.04 PM.png') },
    { id: 'community', name: 'Community upkeep', image: require('../../assets/images/community/1.png') },
  ];

  const communityPoints = [
    'Voluntary participation',
    'No public activity',
    'No confrontation',
    'Respect and restraint',
  ];

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'alert-circle-outline',
    iconColor: '#DC5C69'
  });

  const closeAlert = () => setAlertVisible(false);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        backButton={false}
        rightComponent={
          <TouchableOpacity onPress={handleSettings} style={{ padding: scale(8) }}>
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(20), paddingTop: vscale(10), paddingBottom: vscale(80) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ width: contentWidth }}>
          {/* Header Section */}
          <View style={[styles.titleSection, { marginBottom: vscale(20), alignItems: 'center' }]}>
            <Text style={[styles.mainTitle, { fontSize: ms(28), fontWeight: '700', color: '#374151' }]}>
              Community Around You
            </Text>
            <View style={{ width: '60%', height: 1, backgroundColor: '#E5E7EB', marginVertical: vscale(8) }} />
            <Text style={[styles.subtitle, { fontSize: ms(14), color: '#9CA3AF', marginTop: vscale(4) }]}>
              Awareness without exposure.
            </Text>
          </View>

          {/* Local Awareness Network Card */}
          <View style={styles.awarenessCard}>
            <Text style={styles.awarenessTitle}>Local awareness network</Text>
            <View style={styles.awarenessDivider} />
            <Text style={styles.awarenessDescription}>
              Socius helps people stay aware and supportive{'\n'}without public feeds, groups, or coordination.
            </Text>
          </View>

          {/* Active Request Card (Requester) */}
          {activeRequest && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                const status = String(activeRequest.status || '').toLowerCase();
                if (['accepted', 'in_progress', 'matched', 'en_route', 'arrived', 'active'].includes(status)) {
                  navigation.navigate('RequesterMatchingMap', { requestId: activeRequest._id });
                } else {
                  navigation.navigate('RequestActive');
                }
              }}
              style={[styles.activeCard, styles.helpActiveCard]}
            >
              <View style={[styles.activeIconBadge, { backgroundColor: '#0EA5E9', width: scale(40), height: scale(40), borderRadius: scale(20), marginRight: spacing(12) }]}>
                <Icon name="hand-heart" size={scale(20)} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <View style={{ marginRight: spacing(6) }}>
                    <PulseDot color="#0EA5E9" size={6} />
                  </View>
                  <Text style={[styles.activeCardTitle, { fontSize: ms(14), color: '#0EA5E9', fontWeight: '700', marginRight: spacing(6) }]}>
                    Active Help Request
                  </Text>
                  <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
                </View>
                <Text numberOfLines={1} style={styles.activeCardDesc}>{activeRequest.description}</Text>
              </View>
              <Icon name="chevron-right" size={scale(20)} color="#0EA5E9" />
            </TouchableOpacity>
          )}

          {/* Ask for Local Help Card (New Design) */}
          <View style={styles.mockupCard}>
            <View style={styles.illustrationContainer}>
              <Image 
                source={require('../../assets/daily-help.png')}
                style={styles.illustrationImage}
                resizeMode="contain"
              />
            </View>
            
            <Text style={styles.mockupTitle}>Ask for Local Help</Text>
            <View style={styles.mockupDivider} />
            
            <Text style={styles.mockupDescription}>
              Request small, everyday help from people nearby.{"\n"}No money. No obligation.
            </Text>

            <TouchableOpacity 
              style={styles.mockupButton}
              onPress={handleRequestHelp}
              activeOpacity={0.8}
            >
              <Text style={styles.mockupButtonText}>Request Help</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: vscale(20) }}>
            <Text style={[styles.sectionTitle, { fontSize: ms(15), marginBottom: vscale(10) }]}>Types of presence nearby</Text>
            <View style={[styles.grid, { marginBottom: vscale(20) }]}>
              {presenceTypes.map((it) => (
                <View key={it.id} style={[styles.gridItem, { width: cardWidth }]}>
                  <View style={styles.iconCard}><Image source={it.image} style={styles.iconImage} /></View>
                  <Text style={[styles.gridLabel, { fontSize: ms(9) }]} numberOfLines={2}>{it.name}</Text>
                </View>
              ))}
            </View>

            <View style={styles.pointsCard}>
              <Text style={styles.pointsTitle}>How this community works</Text>
              {communityPoints.map((point, idx) => (
                <View key={idx} style={styles.pointRow}>
                  <Icon name="check-circle-outline" size={scale(16)} color="#34C759" />
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
              <View style={styles.pointsDivider} />
              <TouchableOpacity 
                style={styles.guidelinesLink}
                onPress={() => navigation.navigate('CommunityGuidelines')}
                activeOpacity={0.8}
              >
                <Text style={styles.guidelinesLinkText}>Read community guidelines</Text>
                <Icon name="chevron-right" size={scale(16)} color="#DC5C69" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={closeAlert}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 80 },
  titleSection: { marginBottom: 12 },
  mainTitle: { color: '#2C3E50' },
  subtitle: { color: '#8A9BA7' },
  activeCard: {
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.1, elevation: 3
  },
  helpActiveCard: { borderWidth: 1.5, borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' },
  activeIconBadge: { alignItems: 'center', justifyContent: 'center' },
  activeCardTitle: { fontWeight: '700' },
  activeCardDesc: { fontSize: 13, color: '#334155' },
  liveBadge: { backgroundColor: '#0EA5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  // New Mockup Design Styles
  mockupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 10,
  },
  illustrationContainer: {
    marginBottom: 5,
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  mockupTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  mockupDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  mockupDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  mockupButton: {
    width: '100%',
    backgroundColor: '#A83A30',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#A83A30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mockupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
 
  improvementsCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  improvementsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
  },
  improvementsDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  improvementsDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  askCard: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, elevation: 2 },
  iconBadge: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F9FF' },
  askTitle: { fontWeight: '700', color: '#2C3E50' },
  askSubtext: { fontWeight: '400', color: '#666666' },
  sectionTitle: { fontWeight: '600', color: '#2C3E50' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  gridItem: { alignItems: 'center' },
  iconCard: { width: '100%', aspectRatio: 1, backgroundColor: '#FFFFFF', borderColor: '#E5E9F0', borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconImage: { width: '72%', height: '72%', resizeMode: 'contain' },
  gridLabel: { color: '#2C3E50', fontWeight: '500', textAlign: 'center' },
  pointsCard: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E9F0', marginBottom: 12 },
  pointsTitle: { fontWeight: '600', color: '#2C3E50', fontSize: 14, marginBottom: 8 },
  pointRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pointText: { color: '#546E7A', fontSize: 13, marginLeft: 8 },
  pointsDivider: { 
    width: '100%', 
    height: 1, 
    backgroundColor: '#E5E7EB', 
    marginTop: 8, 
    marginBottom: 8 
  },
  guidelinesLink: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingTop: 4 
  },
  guidelinesLinkText: { 
    color: '#DC5C69', 
    fontSize: 13, 
    fontWeight: '500',
    marginRight: 4,
    textDecorationLine: 'underline'
  },
  // Local Awareness Network Card Styles
  awarenessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  awarenessTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  awarenessDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  awarenessDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
});

export default CommunityScreen;
