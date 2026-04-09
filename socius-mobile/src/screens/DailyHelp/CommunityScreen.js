import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Animated, useWindowDimensions, RefreshControl, FlatList, TextInput, useColorScheme, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import PulseDot from '../../components/common/PulseDot';
import { useResponsive } from '../../utils/responsive';
import { getMyActiveHelpRequest, getNearbyHelpRequests } from '../../services/api/dailyHelp.api';
import { getBlogTypes } from '../../services/api/blog.api';
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
import { getCommunitySurveyQuestions, postCommunitySurveyVote } from '../../services/api/communitySurvey.api';

const CommunityScreen = ({ navigation }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight() || 72;
  /** Must match BottomTabNavigator tabBarStyle: absolute bar height + bottom offset + breathing room */
  const tabBarBottomOffset = Math.max(6, Platform.OS === 'android' ? 10 : 0, insets.bottom);
  const scrollBottomPad = tabBarHeight + tabBarBottomOffset + vscale(24);
  const isDark = useColorScheme() === 'dark';
  const colors = useMemo(
    () => ({
      screenBg: isDark ? '#0F172A' : '#FFFFFF',
      textPrimary: isDark ? '#E5E7EB' : '#374151',
      textMuted: isDark ? '#94A3B8' : '#9CA3AF',
      divider: isDark ? '#273449' : '#E5E7EB',
      cardBg: isDark ? '#111827' : '#FFFFFF',
      cardBorder: isDark ? '#334155' : '#E5E9F0',
      sectionTitle: isDark ? '#E2E8F0' : '#2C3E50',
      pointsBg: isDark ? '#0B1220' : '#FFFFFF',
      pointsText: isDark ? '#A7B4C8' : '#546E7A',
      iconDefault: isDark ? '#F87171' : '#C94444',
    }),
    [isDark]
  );
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
  const [blogTypes, setBlogTypes] = useState([]);
  const [blogTypesLoaded, setBlogTypesLoaded] = useState(false);
  const [surveyItems, setSurveyItems] = useState([]);
  const [surveyLoading, setSurveyLoading] = useState(true);
  const [surveyVoteBusyId, setSurveyVoteBusyId] = useState(null);
  /** Combined "Ask for Local Help" card: Request vs Survey */
  const [helpCardTab, setHelpCardTab] = useState('request');
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
      fetchBlogTypes();
      fetchSurvey();
      fetchActiveRequests();
      if (activeTab === 'requests') fetchNearbyRequests();
      else if (activeTab === 'history') fetchHistory();
    }
  }, [isFocused, activeTab, fetchNearbyRequests, fetchHistory, fetchActiveRequests, fetchBlogTypes, fetchSurvey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchActiveRequests(),
      fetchBlogTypes(),
      fetchSurvey(),
      activeTab === 'requests' ? fetchNearbyRequests() : null,
      activeTab === 'history' ? fetchHistory() : null
    ]);
    setRefreshing(false);
  }, [activeTab, fetchActiveRequests, fetchNearbyRequests, fetchHistory, fetchBlogTypes, fetchSurvey]);

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

  const fetchBlogTypes = useCallback(async () => {
    try {
      const response = await getBlogTypes();
      const items = Array.isArray(response?.items) ? response.items : [];
      setBlogTypes(items);
    } catch (err) {
      console.log('Error fetching blog types:', err);
    } finally {
      setBlogTypesLoaded(true);
    }
  }, []);

  const fetchSurvey = useCallback(async () => {
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token) {
        setSurveyItems([]);
        return;
      }
      const data = await getCommunitySurveyQuestions(token);
      const items = Array.isArray(data?.items) ? data.items : [];
      setSurveyItems(items);
    } catch (err) {
      console.log('Error fetching community survey:', err);
      setSurveyItems([]);
    } finally {
      setSurveyLoading(false);
    }
  }, []);

  const handleSurveyVote = useCallback(
    async (questionId, value) => {
      try {
        const auth = await loadAuth();
        const token = auth?.accessToken;
        if (!token || !questionId) return;
        setSurveyVoteBusyId(String(questionId));
        const loc = await loadLastKnownLocation();
        const payload = {
          questionId,
          value,
          ...(loc?.label ? { locationLabel: loc.label } : {}),
          ...(typeof loc?.latitude === 'number' && typeof loc?.longitude === 'number'
            ? { latitude: loc.latitude, longitude: loc.longitude }
            : {}),
        };
        const res = await postCommunitySurveyVote(token, payload);
        const qid = String(res?.questionId || questionId);
        const likeCount = Number(res?.likeCount) || 0;
        const dislikeCount = Number(res?.dislikeCount) || 0;
        const myVote = res?.myVote || value;
        setSurveyItems((prev) =>
          prev.map((row) =>
            String(row._id) === qid ? { ...row, likeCount, dislikeCount, myVote } : row
          )
        );
      } catch (err) {
        console.log('Survey vote failed:', err);
      } finally {
        setSurveyVoteBusyId(null);
      }
    },
    []
  );

  const handleSettings = () => navigation.navigate('Settings');
  const handleRequestHelp = () => navigation.navigate('HelpType');

  const dailyHelpTopics = useMemo(
    () =>
      blogTypes.map((type) => ({
        id: type._id || type.id,
        name: type.name,
        slug: type.slug,
        iconUrl: type.iconUrl || type.iconPath,
        iconName: type.iconName || 'file-document-outline',
        color: type.color || colors.iconDefault,
        raw: type,
      })),
    [blogTypes, colors.iconDefault]
  );

  const isValidTopicId = useCallback((id) => !!id && /^[0-9a-fA-F]{24}$/.test(String(id)), []);

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBg }]} edges={['top', 'left', 'right']}>
      <Header
        backButton={false}
        rightComponent={
          <TouchableOpacity onPress={handleSettings} style={{ padding: scale(8) }}>
            <Icon name="cog" size={scale(24)} color={colors.textMuted} />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(20), paddingTop: vscale(6), paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ width: contentWidth }}>
          {/* Header Section */}
          <View style={[styles.titleSection, { marginBottom: vscale(12), alignItems: 'center' }]}>
            <Text style={[styles.mainTitle, { fontSize: ms(23), fontWeight: '700', color: colors.textPrimary }]}>
              Community Around You
            </Text>
            <View style={{ width: '60%', height: 1, backgroundColor: colors.divider, marginVertical: vscale(8) }} />
            <Text style={[styles.subtitle, { fontSize: ms(14), color: colors.textMuted, marginTop: vscale(4) }]}>
              Awareness without exposure.
            </Text>
          </View>

          {/* Local Awareness Network Card */}
          <View style={[styles.awarenessCard, { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder }]}>
            <Text style={[styles.awarenessTitle, { color: colors.textPrimary }]}>Local awareness network</Text>
            <View style={[styles.awarenessDivider, { backgroundColor: colors.divider }]} />
            <Text style={[styles.awarenessDescription, { color: colors.textMuted }]}>
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

          {/* Ask for Local Help — Request / Survey tabs */}
          <View
            style={[
              styles.mockupCard,
              {
                backgroundColor: colors.cardBg,
                shadowOpacity: isDark ? 0.22 : 0.1,
              },
            ]}
          >
            <Text style={[styles.mockupTitle, { color: colors.textPrimary }]}>Ask for Local Help</Text>

            <View style={[styles.helpCardTabsRow, { backgroundColor: isDark ? '#1E293B' : '#F3F4F6' }]}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setHelpCardTab('request')}
                style={[
                  styles.helpCardTabBtn,
                  helpCardTab === 'request' && [
                    styles.helpCardTabBtnActive,
                    { backgroundColor: colors.cardBg, shadowOpacity: isDark ? 0.2 : 0.08 },
                  ],
                ]}
              >
                <Icon
                  name="hand-heart"
                  size={scale(18)}
                  color={helpCardTab === 'request' ? '#C94444' : colors.textMuted}
                  style={{ marginRight: spacing(6) }}
                />
                <Text
                  style={[
                    styles.helpCardTabLabel,
                    { color: helpCardTab === 'request' ? colors.textPrimary : colors.textMuted },
                    helpCardTab === 'request' && { fontWeight: '700' },
                  ]}
                >
                  Request
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setHelpCardTab('survey')}
                style={[
                  styles.helpCardTabBtn,
                  helpCardTab === 'survey' && [
                    styles.helpCardTabBtnActive,
                    { backgroundColor: colors.cardBg, shadowOpacity: isDark ? 0.2 : 0.08 },
                  ],
                ]}
              >
                <Icon
                  name="poll"
                  size={scale(18)}
                  color={helpCardTab === 'survey' ? '#C94444' : colors.textMuted}
                  style={{ marginRight: spacing(6) }}
                />
                <Text
                  style={[
                    styles.helpCardTabLabel,
                    { color: helpCardTab === 'survey' ? colors.textPrimary : colors.textMuted },
                    helpCardTab === 'survey' && { fontWeight: '700' },
                  ]}
                >
                  Survey
                </Text>
              </TouchableOpacity>
            </View>

            {helpCardTab === 'request' ? (
              <>
                <View style={styles.illustrationContainer}>
                  <Image
                    source={require('../../assets/daily-help.png')}
                    style={styles.illustrationImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={[styles.mockupDivider, { backgroundColor: colors.divider }]} />
                <Text style={[styles.mockupDescription, { color: colors.textMuted }]}>
                  Request small, everyday help from people nearby.{'\n'}No money. No obligation.
                </Text>
                <TouchableOpacity
                  style={styles.mockupButton}
                  onPress={handleRequestHelp}
                  activeOpacity={0.8}
                >
                  <Text style={styles.mockupButtonText}>Request Help</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ width: '100%', paddingTop: vscale(4), paddingHorizontal: spacing(4) }}>
                {surveyLoading ? (
                  <View style={{ paddingVertical: vscale(24), alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#DC5C69" />
                    <Text style={{ marginTop: vscale(8), fontSize: ms(13), color: colors.textMuted }}>Loading…</Text>
                  </View>
                ) : surveyItems.length === 0 ? (
                  <Text
                    style={{
                      fontSize: ms(13),
                      color: colors.textMuted,
                      textAlign: 'center',
                      paddingVertical: vscale(20),
                      lineHeight: ms(20),
                    }}
                  >
                    No survey questions right now. Check back later.
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.surveyCardHint, { color: colors.textMuted, marginBottom: vscale(8) }]}>
                      Share a quick reaction — your feedback helps shape the app.
                    </Text>
                    {surveyItems.map((q, qi) => {
                      const qid = String(q._id);
                      const busy = surveyVoteBusyId === qid;
                      const liked = q.myVote === 'like';
                      const disliked = q.myVote === 'dislike';
                      return (
                        <View
                          key={qid}
                          style={[
                            styles.surveyRow,
                            qi > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider } : null,
                          ]}
                        >
                          <Text style={[styles.surveyQuestionText, { color: colors.textPrimary }]}>{q.text}</Text>
                          <View style={styles.surveyVoteRow}>
                            {busy ? (
                              <ActivityIndicator size="small" color="#DC5C69" style={{ marginVertical: vscale(4) }} />
                            ) : (
                              <>
                                <TouchableOpacity
                                  onPress={() => handleSurveyVote(q._id, 'like')}
                                  activeOpacity={0.85}
                                  style={[
                                    styles.surveyVoteBtn,
                                    {
                                      borderColor: liked ? '#DC5C69' : colors.cardBorder,
                                      backgroundColor: liked
                                        ? isDark
                                          ? 'rgba(220,92,105,0.2)'
                                          : '#FDF2F2'
                                        : colors.pointsBg,
                                    },
                                  ]}
                                >
                                  <Icon
                                    name="thumb-up-outline"
                                    size={scale(18)}
                                    color={liked ? '#DC5C69' : colors.textMuted}
                                    style={{ marginRight: 6 }}
                                  />
                                  <Text style={[styles.surveyVoteCount, { color: liked ? '#DC5C69' : colors.textMuted }]}>
                                    {q.likeCount ?? 0}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleSurveyVote(q._id, 'dislike')}
                                  activeOpacity={0.85}
                                  style={[
                                    styles.surveyVoteBtn,
                                    {
                                      borderColor: disliked ? '#64748B' : colors.cardBorder,
                                      backgroundColor: disliked
                                        ? isDark
                                          ? 'rgba(100,116,139,0.25)'
                                          : '#F1F5F9'
                                        : colors.pointsBg,
                                    },
                                  ]}
                                >
                                  <Icon
                                    name="thumb-down-outline"
                                    size={scale(18)}
                                    color={disliked ? '#475569' : colors.textMuted}
                                    style={{ marginRight: 6 }}
                                  />
                                  <Text
                                    style={[styles.surveyVoteCount, { color: disliked ? '#475569' : colors.textMuted }]}
                                  >
                                    {q.dislikeCount ?? 0}
                                  </Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            )}
          </View>

          <View style={{ marginTop: vscale(12) }}>
            <Text style={[styles.sectionTitle, { fontSize: ms(15), marginBottom: vscale(10), color: colors.sectionTitle }]}>Type Help topics</Text>
            {!blogTypesLoaded ? (
              <Text style={{ fontSize: ms(13), color: colors.textMuted, marginBottom: vscale(20) }}>Loading topics…</Text>
            ) : dailyHelpTopics.length === 0 ? (
              <Text style={{ fontSize: ms(13), color: colors.textMuted, lineHeight: ms(20), marginBottom: vscale(20) }}>
                No topics yet. In the admin panel, add active entries under Blog Types (these power this row), then add published articles under Blogs for each type.
              </Text>
            ) : (
              <View style={[styles.grid, { marginBottom: vscale(20) }]}>
                {dailyHelpTopics.map((it) => {
                  const typeId = it?.raw?._id || it?.raw?.id || it.id;
                  const canOpenBlog = isValidTopicId(typeId);
                  return (
                    <TouchableOpacity
                      key={String(typeId || it.id)}
                      style={[styles.gridItem, { width: cardWidth }]}
                      onPress={() => {
                        if (!canOpenBlog) return;
                        navigation.navigate('BlogList', {
                          blogType: {
                            _id: typeId,
                            id: typeId,
                            name: it.name,
                            slug: it.slug,
                            iconUrl: it.iconUrl || null,
                            color: it.color,
                          },
                        });
                      }}
                      activeOpacity={0.8}
                      disabled={!canOpenBlog}
                    >
                      <View
                        style={[
                          styles.topicTileCard,
                          {
                            backgroundColor: colors.cardBg,
                            borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                            shadowOpacity: isDark ? 0.35 : 0.12,
                          },
                        ]}
                      >
                        <View style={[styles.topicTileIconWrap, { minHeight: cardWidth * 0.5 }]}>
                          {it.iconUrl ? (
                            <Image
                              source={{ uri: /^https?:\/\//i.test(it.iconUrl) ? it.iconUrl : `${baseRoot}${it.iconUrl}` }}
                              style={{
                                width: Math.min(Math.round(cardWidth * 0.56), 58),
                                height: Math.min(Math.round(cardWidth * 0.56), 58),
                              }}
                              resizeMode="contain"
                            />
                          ) : (
                            <Icon
                              name={it.iconName || it.icon || 'file-document-outline'}
                              size={scale(32)}
                              color={it.color || colors.iconDefault}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.topicTileLabel,
                            {
                              fontSize: ms(11),
                              lineHeight: Math.round(ms(16)),
                              color: isDark ? colors.textMuted : '#374151',
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {it.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={[styles.pointsCard, { backgroundColor: colors.pointsBg, borderColor: colors.cardBorder }]}>
              <Text style={[styles.pointsTitle, { color: colors.sectionTitle }]}>How this community works</Text>
              {communityPoints.map((point, idx) => (
                <View key={idx} style={styles.pointRow}>
                  <Icon name="check-circle-outline" size={scale(16)} color="#34C759" />
                  <Text style={[styles.pointText, { color: colors.pointsText }]}>{point}</Text>
                </View>
              ))}
              <View style={[styles.pointsDivider, { backgroundColor: colors.divider }]} />
              <TouchableOpacity
                style={styles.guidelinesLink}
                onPress={() => navigation.navigate('CommunityGuidelines')}
                activeOpacity={0.8}
              >
                <Text style={styles.guidelinesLinkText}>Read community guidelines</Text>
                <Icon name="chevron-right" size={scale(16)} color="#DC5C69" />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.improvementsCard,
                {
                  backgroundColor: colors.cardBg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  marginTop: vscale(8),
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.2 : 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                },
              ]}
            >
              <Text style={[styles.improvementsTitle, { color: colors.textPrimary }]}>Local Improvements</Text>
              <View style={[styles.improvementsDivider, { backgroundColor: colors.divider }]} />
              <Text style={[styles.improvementsDescription, { color: colors.textMuted }]}>
                Community cleanups and shared fixes. Coming soon.
              </Text>
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
  scrollContent: { flexGrow: 1 },
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
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 8,
  },
  helpCardTabsRow: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
  },
  helpCardTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  helpCardTabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  helpCardTabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  illustrationContainer: {
    marginBottom: 2,
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  mockupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  mockupDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
  },
  mockupDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  mockupButton: {
    width: '100%',
    backgroundColor: '#A83A30',
    borderRadius: 28,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#A83A30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mockupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
 
  surveyCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
  },
  surveyCardHint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  surveyRow: {
    paddingVertical: 12,
  },
  surveyQuestionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 10,
  },
  surveyVoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  surveyVoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 10,
  },
  surveyVoteCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  improvementsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
  },
  improvementsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  improvementsDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  improvementsDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  askCard: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, elevation: 2 },
  iconBadge: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F9FF' },
  askTitle: { fontWeight: '700', color: '#2C3E50' },
  askSubtext: { fontWeight: '400', color: '#666666' },
  sectionTitle: { fontWeight: '600', color: '#2C3E50' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  gridItem: { alignItems: 'stretch' },
  topicTileCard: {
    width: '100%',
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 5,
    paddingBottom: 5,
    paddingHorizontal: 0,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 2,
  },
  topicTileIconWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicTileLabel: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '400',
    marginTop: 4,
  },
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
    marginBottom: 8,
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
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  awarenessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  awarenessDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  awarenessDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default CommunityScreen;
