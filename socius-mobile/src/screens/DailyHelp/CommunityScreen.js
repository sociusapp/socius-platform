import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, ActivityIndicator, Animated, Dimensions, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from 'moment';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';
import { getMyActiveHelpRequest, getNearbyHelpRequests, acceptHelpRequest } from '../../services/api/incident.api';
import { getHistory } from '../../services/api/user.api';
import { loadAuth } from '../../services/storage/asyncStorage.service';
import { getCurrentPosition } from '../../services/location/geolocation.service';
import CustomAlert from '../../components/common/CustomAlert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CommunityScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const cardWidth = (contentWidth - spacing(24)) / 3;
  const isFocused = useIsFocused();
  const [activeRequest, setActiveRequest] = useState(null);
  const [activeHelp, setActiveHelp] = useState(null);
  const [activeTab, setActiveTab] = useState('community');
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'alert-circle-outline',
    iconColor: '#DC5C69'
  });

  const showAlert = (title, message, buttons = [], icon = 'alert-circle-outline', iconColor = '#DC5C69') => {
    setAlertConfig({
      title,
      message,
      buttons,
      icon,
      iconColor
    });
    setAlertVisible(true);
  };

  const closeAlert = () => {
    setAlertVisible(false);
  };

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchNearbyRequests();
    }
  }, [activeTab]);

  const fetchNearbyRequests = async () => {
    setLoadingNearby(true);
    try {
      const auth = await loadAuth();
      if (auth?.accessToken) {
        let coords = null;
        try {
          const position = await getCurrentPosition();
          if (position?.coords) {
            coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
          }
        } catch (locErr) {
          console.log('Error getting location:', locErr);
        }

        const res = await getNearbyHelpRequests(auth.accessToken, coords);
        if (res && res.success) {
          // Filter out my own requests
          const myUserId = auth.userId;
          const allRequests = res.data || [];

          // Filter logic: ensure request is not from current user
          const filteredRequests = allRequests
            .filter(req => {
              const reqUserId = req.requesterId?._id || req.requesterId;
              return String(reqUserId) !== String(myUserId);
            })
            .map(req => ({
              ...req,
              distance: req.distanceMeters ? (req.distanceMeters / 1000).toFixed(1) : req.distance
            }));

          setNearbyRequests(filteredRequests);
        } else {
          setNearbyRequests([]);
        }
      }
    } catch (err) {
      console.log('Error fetching nearby requests:', err);
      setNearbyRequests([]);
    } finally {
      setLoadingNearby(false);
    }
  };

  const [isAccepting, setIsAccepting] = useState(false);
  const handleAcceptRequest = async (requestId) => {
    if (isAccepting) return;
    showAlert(
      "Confirm Help",
      "Are you sure you want to accept this request? The requester will be notified immediately.",
      [
        { text: "Cancel", style: "cancel", onPress: closeAlert },
        {
          text: "Yes, I'll Help",
          style: 'primary',
          onPress: async () => {
            closeAlert();
            try {
              setIsAccepting(true);
              const auth = await loadAuth();
              if (auth?.accessToken) {
                const res = await acceptHelpRequest(auth.accessToken, requestId);
                if (res && res.success) {
                  showAlert(
                    "Request Accepted",
                    "Thank you for helping! Please proceed to the location.",
                    [{ text: "OK", style: 'primary', onPress: closeAlert }]
                  );
                  fetchNearbyRequests(); // Refresh list
                  navigation.navigate('MatchingMap', { requestId });
                } else {
                  showAlert(
                    "Unable to Accept",
                    res?.message || "This request may have been taken or cancelled.",
                    [{ text: "OK", style: 'destructive', onPress: closeAlert }]
                  );
                  fetchNearbyRequests(); // Refresh to update status
                }
              }
            } catch (err) {
              console.log('Error accepting request:', err);
              showAlert(
                "Error",
                "An unexpected error occurred. Please check your connection.",
                [{ text: "OK", style: 'destructive', onPress: closeAlert }]
              );
            } finally {
              setIsAccepting(false);
            }
          }
        }
      ],
      'hand-heart',
      '#DC5C69'
    );
  };

  useEffect(() => {
    const checkActiveRequests = async () => {
      try {
        const auth = await loadAuth();
        const token = auth?.accessToken;
        if (token) {
          const response = await getMyActiveHelpRequest(token);
          if (response?.success && response?.data) {
            const data = response.data;
            // If response has activeRequest/activeHelp keys
            if (data.activeRequest !== undefined || data.activeHelp !== undefined) {
              setActiveRequest(data.activeRequest || null);
              setActiveHelp(data.activeHelp || null);
            } else {
              // Backward compatibility: assume data is request
              setActiveRequest(data);
              setActiveHelp(null);
            }
          } else {
            setActiveRequest(null);
            setActiveHelp(null);
          }
        }
      } catch (error) {
        console.log('Error checking active requests:', error);
      }
    };

    if (isFocused && activeTab === 'community') {
      checkActiveRequests();
    }
  }, [isFocused, activeTab]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const auth = await loadAuth();
      if (auth?.accessToken) {
        const res = await getHistory(auth.accessToken);
        if (res.success) {
          setHistoryData(res.data || []);
        }
      }
    } catch (err) {
      console.log('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleRequestHelp = () => {
    navigation.navigate('HelpType');
  };

  const onTabPress = (tabName, index) => {
    setActiveTab(tabName);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  useEffect(() => {
    const initialTab = route?.params?.initialTab;
    if (!initialTab) return;
    const tabs = ['community', 'requests', 'history'];
    const idx = tabs.indexOf(String(initialTab));
    if (idx === -1) return;
    onTabPress(tabs[idx], idx);
  }, [route?.params?.initialTab]);

  const onMomentumScrollEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    const tabs = ['community', 'requests', 'history'];
    const newTab = tabs[index];
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };



  const presenceTypes = [
    {
      id: 'calm',
      name: 'Calm presence',
      image: require('../../assets/images/community/Screenshot 2026-02-16 at 2.57.36 PM.png'),
    },
    {
      id: 'care',
      name: 'Care & support',
      image: require('../../assets/images/community/5.png'),
    },
    {
      id: 'medical',
      name: 'Medical awareness',
      image: require('../../assets/images/community/4.png'),
    },
    {
      id: 'language',
      name: 'Language support',
      image: require('../../assets/images/community/3.png'),
    },
    {
      id: 'elder',
      name: 'Elder assistance',
      image: require('../../assets/images/community/Screenshot 2026-02-16 at 2.58.04 PM.png'),
    },
    {
      id: 'community',
      name: 'Community upkeep',
      image: require('../../assets/images/community/1.png'),
    },
  ];

  const communityPoints = [
    'Voluntary participation',
    'No public activity',
    'No confrontation',
    'Respect and restraint',
  ];

  const copyToClipboard = async (text, label = 'Content') => {
    // Requires rebuild for native module
    showAlert('Info', `${label}: ${text}`, [{ text: 'OK', onPress: closeAlert, style: 'primary' }]);
  };

  const getFilteredHistory = () => {
    let filtered = historyData;

    // Filter by Status
    if (filterStatus !== 'All') {
      if (filterStatus === 'Active') {
        filtered = filtered.filter(item =>
          ['active', 'matched', 'en_route', 'arrived', 'pending', 'open', 'matching'].includes(item.status?.toLowerCase())
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

    // Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item._id && item._id.includes(query))
      );
    }

    return filtered;
  };

  const renderHistoryItem = ({ item }) => {
    const isHelp = item.type === 'help_request' || item.type === 'help_provided';
    const isMyRequest = item.isMyRequest;

    const getStatusStyle = (status) => {
      switch (status?.toLowerCase()) {
        case 'active':
        case 'matched':
        case 'en_route':
        case 'arrived':
        case 'in_progress':
          return { color: '#28C76F', bg: '#E7F9F0', label: 'Active' };
        case 'pending':
        case 'open':
        case 'matching':
          return { color: '#FF9F43', bg: '#FFF0E1', label: 'Pending' };
        case 'accepted':
          return { color: '#00CFE8', bg: '#E0F9FC', label: 'Accepted' };
        case 'completed':
        case 'closed':
          return { color: '#7367F0', bg: '#ECEBFF', label: 'Completed' };
        case 'cancelled':
        case 'declined':
          return { color: '#EA5455', bg: '#FCEAEA', label: 'Cancelled' };
        default:
          return { color: '#A0AEC0', bg: '#EDF2F7', label: status || 'Unknown' };
      }
    };

    const statusStyle = getStatusStyle(item.status);

    const getTimeDisplay = () => {
      const created = moment(item.createdAt);
      if (['active', 'matched', 'en_route', 'arrived', 'accepted', 'in_progress'].includes(String(item.status || '').toLowerCase())) {
        return `Started ${created.fromNow()}`;
      }
      return created.format('MMM D, h:mm A');
    };

    const renderAvatar = (user, isMe) => {
      if (!user && !isMe) return (
        <View style={[styles.avatarPlaceholder, { backgroundColor: '#F0F2F5', width: scale(48), height: scale(48), borderRadius: scale(24) }]}>
          <Icon name="account-question" size={scale(24)} color="#A0AEC0" />
        </View>
      );

      if (user?.profileImage) {
        return <Image source={{ uri: user.profileImage }} style={[styles.avatarImage, { width: scale(48), height: scale(48), borderRadius: scale(24) }]} />;
      }

      return (
        <View style={[styles.avatarPlaceholder, {
          backgroundColor: isMe ? (isMyRequest ? '#FFF5F6' : '#E7F9F0') : '#F0F2F5',
          width: scale(48), height: scale(48), borderRadius: scale(24)
        }]}>
          <Icon name="account" size={scale(24)} color={isMe ? (isMyRequest ? '#DC5C69' : '#28C76F') : '#A0AEC0'} />
        </View>
      );
    };

    const isExpanded = expandedId === item._id;
    const isActive = ['active', 'matched', 'en_route', 'arrived', 'accepted', 'in_progress'].includes(String(item.status || '').toLowerCase());
    const isCancelled = ['cancelled', 'declined'].includes(String(item.status || '').toLowerCase());
    const cancellationReason = item.reason || item.cancellationReason || item.cancelReason;

    const formatReason = (reason) => {
      if (!reason) return '';
      const reasons = {
        'no_helpers_nearby': 'No helpers nearby',
        'no_one_accepted': 'No one accepted',
        'change_of_plans': 'Change of plans'
      };
      return reasons[reason] || reason;
    };

    const toggleExpand = () => {
      setExpandedId(isExpanded ? null : item._id);
    };

    return (
      <TouchableOpacity
        style={[styles.historyCard, {
          marginBottom: vscale(12),
          borderRadius: scale(16),
          padding: scale(16),
          backgroundColor: '#FFFFFF',
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
          borderWidth: 1,
          borderColor: isExpanded ? '#DC5C69' : '#F1F5F9'
        }]}
        onPress={toggleExpand}
        activeOpacity={0.9}
      >
        <View style={{ flexDirection: 'row' }}>
          {/* Left: Avatar/Icon */}
          <View style={{ marginRight: spacing(12) }}>
            {isMyRequest ? (
              item.otherUser ? renderAvatar(item.otherUser, false) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#FFF0F1', width: scale(48), height: scale(48), borderRadius: scale(24), alignItems: 'center', justifyContent: 'center' }]}>
                  <Icon name="hand-heart" size={scale(24)} color="#DC5C69" />
                </View>
              )
            ) : (
              renderAvatar(item.otherUser, false)
            )}
          </View>

          {/* Right: Content */}
          <View style={{ flex: 1 }}>
            {/* Header: Title & Status */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vscale(4) }}>
              <View style={{ flex: 1, marginRight: spacing(8) }}>
                <Text style={{ fontSize: ms(16), fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>
                  {item.title || (isMyRequest ? 'Help Request' : 'Help Provided')}
                </Text>
                {item.category && (
                  <Text style={{ fontSize: ms(12), color: '#64748B', marginTop: 2, textTransform: 'uppercase' }}>
                    {item.category}
                  </Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, paddingHorizontal: spacing(8), paddingVertical: vscale(4), borderRadius: scale(6) }]}>
                <Text style={[styles.statusText, { color: statusStyle.color, fontSize: ms(11), fontWeight: '700' }]}>
                  {statusStyle.label.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Description */}
            {item.description && (
              <Text style={{ fontSize: ms(14), color: '#475569', lineHeight: ms(20), marginBottom: vscale(8) }} numberOfLines={isExpanded ? undefined : 2}>
                {item.description}
              </Text>
            )}

            {/* Location Info (New) */}
            {(item.location?.address || item.address) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(8) }}>
                <Icon name="map-marker-outline" size={scale(14)} color="#94A3B8" style={{ marginRight: spacing(4) }} />
                <Text style={{ fontSize: ms(12), color: '#64748B', flex: 1 }} numberOfLines={1}>
                  {item.location?.address || item.address}
                </Text>
              </View>
            )}

            {/* Cancellation Reason */}
            {isCancelled && cancellationReason && (
              <View style={{
                marginTop: vscale(2),
                marginBottom: vscale(8),
                backgroundColor: '#FEF2F2',
                padding: spacing(8),
                borderRadius: scale(8),
                borderWidth: 1,
                borderColor: '#FECACA'
              }}>
                <Text style={{ fontSize: ms(12), color: '#EF4444' }}>
                  <Text style={{ fontWeight: '600' }}>Cancelled: </Text>
                  {formatReason(cancellationReason)}
                </Text>
              </View>
            )}

            {/* Meta: Role & Time */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: vscale(4) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isMyRequest ? '#FFF5F6' : '#F0FDF4', paddingHorizontal: spacing(6), paddingVertical: vscale(2), borderRadius: scale(4), marginRight: spacing(8) }}>
                <Icon name={isMyRequest ? "account-arrow-right-outline" : "account-arrow-left-outline"} size={scale(12)} color={isMyRequest ? "#DC5C69" : "#16A34A"} style={{ marginRight: spacing(4) }} />
                <Text style={{ color: isMyRequest ? '#DC5C69' : '#16A34A', fontSize: ms(11), fontWeight: '600' }}>
                  {isMyRequest ? 'You Requested' : 'You Helped'}
                </Text>
              </View>
              <Text style={{ color: '#94A3B8', fontSize: ms(11) }}>{getTimeDisplay()}</Text>
            </View>
          </View>
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={{ marginTop: vscale(16), paddingTop: vscale(16), borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
            {/* Additional Details Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: vscale(12) }}>
              {item.otherUser && (
                <View style={{ width: '50%', marginBottom: vscale(8) }}>
                  <Text style={{ fontSize: ms(11), color: '#94A3B8', marginBottom: 2 }}>{isMyRequest ? 'HELPER' : 'REQUESTER'}</Text>
                  <Text style={{ fontSize: ms(13), color: '#1E293B', fontWeight: '600' }}>
                    {item.otherUser.firstName || item.otherUser.name || item.otherUser.fullName || 'Unknown User'}
                  </Text>
                </View>
              )}
              <View style={{ width: '50%', marginBottom: vscale(8) }}>
                <Text style={{ fontSize: ms(11), color: '#94A3B8', marginBottom: 2 }}>CATEGORY</Text>
                <Text style={{ fontSize: ms(13), color: '#1E293B', fontWeight: '600' }}>{item.category || 'General'}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: spacing(8), marginTop: vscale(8) }}>
              {isActive ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isMyRequest ? '#DC5C69' : '#28C76F', flex: 1, paddingVertical: vscale(10), borderRadius: scale(8), alignItems: 'center', justifyContent: 'center' }]}
                    onPress={() => {
                      const requestId = item._id;
                      // Navigation logic...
                      if (isMyRequest) {
                        navigation.navigate('RequesterMatchingMap', { requestId });
                      } else {
                        navigation.navigate('MatchingMap', { requestId });
                      }
                    }}
                  >
                    <Text style={[styles.actionBtnText, { fontSize: ms(13), color: '#FFF', fontWeight: '600' }]}>Track Status</Text>
                  </TouchableOpacity>
                </>
              ) : (
                isMyRequest && (
                  <TouchableOpacity
                    onPress={() => {
                      navigation.navigate('ReviewRequest', {
                        description: item.description,
                        time: item.duration || '10–15 minutes',
                        helpType: {
                          label: item.category || item.title || 'General Help',
                          icon: 'hand-heart',
                          color: '#DC5C69'
                        }
                      });
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: '#F8FAFC', paddingVertical: vscale(10), borderRadius: scale(8),
                      borderWidth: 1, borderColor: '#E2E8F0'
                    }}
                  >
                    <Icon name="refresh" size={scale(16)} color="#475569" style={{ marginRight: spacing(6) }} />
                    <Text style={{ fontSize: ms(13), color: '#475569', fontWeight: '600' }}>Request Again</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const translateX = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH, SCREEN_WIDTH * 2],
    outputRange: [0, SCREEN_WIDTH / 3, (SCREEN_WIDTH / 3) * 2],
  });

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

      <View style={{
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        position: 'relative',
        paddingBottom: vscale(4)
      }}>
        <TouchableOpacity
          onPress={() => onTabPress('community', 0)}
          style={{
            flex: 1,
            paddingVertical: vscale(10),
            alignItems: 'center',
          }}
        >
          <Text style={{
            fontSize: ms(14),
            fontWeight: activeTab === 'community' ? '700' : '500',
            color: activeTab === 'community' ? '#DC5C69' : '#94A3B8'
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
          }}>Nearby Help</Text>
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
        data={['community', 'requests', 'history']}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            {item === 'community' ? (
              <ScrollView
                contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(20), paddingTop: vscale(10), paddingBottom: vscale(80) }]}
                showsVerticalScrollIndicator={false}
              >
                <View style={{ width: contentWidth }}>
                  {/* Header Section - More Compact */}
                  <View style={[styles.titleSection, { marginBottom: vscale(12), alignItems: 'flex-start' }]}>
                    <Text style={[styles.mainTitle, { fontSize: ms(18), marginBottom: vscale(2), fontWeight: '700' }]}>
                      Community Around You
                    </Text>
                    <Text style={[styles.subtitle, { fontSize: ms(12), lineHeight: ms(16), textAlign: 'left' }]}>
                      Awareness without exposure.
                    </Text>
                  </View>

                  {/* Active Request Card (Requester) - Compact */}
                  {activeRequest && (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        // Check if request is accepted/matched before navigating to map
                        const status = String(activeRequest.status || '').toLowerCase();
                        const isAccepted = ['accepted', 'in_progress', 'matched', 'en_route', 'arrived', 'active'].includes(status) || activeRequest.volunteer;

                        if (isAccepted) {
                          navigation.navigate('RequesterMatchingMap', { requestId: activeRequest._id });
                        } else {
                          navigation.navigate('RequestActive');
                        }
                      }}
                      style={[
                        styles.activeCard,
                        {
                          borderRadius: scale(12),
                          paddingVertical: vscale(14),
                          paddingHorizontal: spacing(14),
                          marginBottom: vscale(12),
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
                        <Icon name="hand-heart" size={scale(20)} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          <Text style={[styles.activeCardTitle, { fontSize: ms(14), color: '#DC5C69', fontWeight: '700', marginRight: spacing(6) }]}>
                            Active Help Request
                          </Text>
                          <View style={{ backgroundColor: '#DC5C69', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#FFF', fontSize: ms(9), fontWeight: '800' }}>LIVE</Text>
                          </View>
                        </View>
                        <Text numberOfLines={1} style={{ fontSize: ms(13), color: '#334155' }}>
                          {activeRequest.description}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={scale(20)} color="#DC5C69" />
                    </TouchableOpacity>
                  )}

                  {/* Active Help Card (Volunteer) - Compact */}
                  {activeHelp && (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => navigation.navigate('MatchingMap', { requestId: activeHelp.request._id })}
                      style={[
                        styles.activeCard,
                        {
                          borderRadius: scale(12),
                          paddingVertical: vscale(12),
                          paddingHorizontal: spacing(12),
                          marginBottom: vscale(12),
                          borderWidth: 1,
                          borderColor: '#28C76F',
                          backgroundColor: '#E7F9F0',
                          flexDirection: 'row',
                          alignItems: 'center'
                        },
                      ]}
                    >
                      <View style={[styles.activeIconBadge, { backgroundColor: '#28C76F', width: scale(36), height: scale(36), borderRadius: scale(18), marginRight: spacing(10) }]}>
                        <Icon name="account-heart" size={scale(18)} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.activeCardTitle, { fontSize: ms(14), color: '#28C76F', marginBottom: 2 }]}>
                          Helping Someone
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: ms(12), color: '#2C3E50' }}>
                          {activeHelp.request.description}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={scale(20)} color="#28C76F" />
                    </TouchableOpacity>
                  )}

                  {/* Local Awareness Network - More Compact */}
                  <View
                    style={[
                      styles.primaryCard,
                      {
                        borderRadius: scale(12),
                        paddingVertical: vscale(12),
                        paddingHorizontal: spacing(14),
                        marginBottom: vscale(12),
                        borderWidth: 1,
                        shadowRadius: scale(4),
                        elevation: scale(1),
                      },
                    ]}
                  >
                    <Text style={[styles.cardTitle, { fontSize: ms(13), marginBottom: vscale(4) }]}>
                      Local awareness network
                    </Text>
                    <Text style={[styles.cardText, { fontSize: ms(12), lineHeight: ms(18) }]}>
                      Socius helps people stay aware and supportive without public feeds.
                    </Text>
                  </View>

                  {/* Ask for Local Help - Redesigned Horizontal Compact */}
                  <View style={[styles.askCard, {
                    borderRadius: scale(16),
                    borderWidth: 1,
                    padding: spacing(14),
                    marginBottom: vscale(20),
                    shadowOffset: { width: 0, height: vscale(2) },
                    shadowRadius: scale(6),
                    elevation: scale(2),
                    alignItems: 'flex-start' // Reset center alignment
                  }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(12) }}>
                      <View style={[styles.iconBadge, {
                        width: scale(48),
                        height: scale(48),
                        borderRadius: scale(24),
                        marginRight: spacing(12),
                        marginBottom: 0 // Remove bottom margin
                      }]}>
                        <Icon name="handshake" size={scale(28)} color="#DC5C69" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.askTitle, { fontSize: ms(16), marginBottom: vscale(2) }]}>Ask for Local Help</Text>
                        <Text style={[styles.askSubtext, { fontSize: ms(12), lineHeight: ms(16), textAlign: 'left' }]}>
                          Request small, everyday help from people nearby.
                        </Text>
                      </View>
                    </View>

                    <Button
                      title="Request Help"
                      onPress={handleRequestHelp}
                      variant="gradient"
                      fullWidth
                      style={{ borderRadius: scale(12), height: scale(42) }}
                      labelStyle={{ fontSize: ms(14) }}
                    />
                  </View>

                  {/* Nearby Requests Section - Removed from here and moved to Requests tab */}

                  <Text style={[styles.sectionTitle, { fontSize: ms(15), marginBottom: vscale(10) }]}>Types of presence nearby</Text>
                  <View style={[styles.grid, { rowGap: vscale(10), marginBottom: vscale(20) }]}>
                    {presenceTypes.map((item) => (
                      <View
                        key={item.id}
                        style={[
                          styles.gridItem,
                          {
                            width: cardWidth,
                          },
                        ]}
                      >
                        <View style={[styles.iconCard, { borderRadius: scale(14), marginBottom: 4 }]}>
                          <Image
                            source={item.image}
                            style={styles.iconImage}
                          />
                        </View>
                        <Text style={[styles.gridLabel, { fontSize: ms(9) }]} numberOfLines={2}>
                          {item.name}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={[styles.pointsCard, { borderRadius: scale(12), padding: spacing(12), marginBottom: vscale(12), borderWidth: 1 }]}>
                    <Text style={[styles.pointsTitle, { fontSize: ms(14), marginBottom: vscale(8) }]}>Community principles</Text>
                    {communityPoints.map((point, idx) => (
                      <View key={idx} style={[styles.pointRow, { marginBottom: vscale(6) }]}>
                        <Icon name="check-circle-outline" size={scale(16)} color="#34C759" />
                        <Text style={[styles.pointText, { fontSize: ms(13), marginLeft: spacing(8) }]}>{point}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            ) : item === 'requests' ? (
              <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(20), paddingTop: vscale(10), paddingBottom: vscale(80) }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={false} onRefresh={fetchNearbyRequests} colors={['#DC5C69']} tintColor="#DC5C69" />
                }
              >
                <View style={{ marginBottom: vscale(20) }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vscale(16) }}>
                    <Text style={[styles.sectionTitle, { fontSize: ms(18), marginBottom: 0 }]}>Nearby Help Requests</Text>
                  </View>

                  {loadingNearby ? (
                    <View style={{ minHeight: vscale(280), alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator size="large" color="#DC5C69" />
                    </View>
                  ) : nearbyRequests.length > 0 ? (
                    nearbyRequests.map((req, index) => (
                      <View key={index} style={[styles.activeCard, {
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
                        elevation: 3
                      }]}>
                        {/* Header: Icon, Category, Distance */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(12) }}>
                          <View style={[styles.iconBadge, {
                            width: scale(48),
                            height: scale(48),
                            borderRadius: scale(24),
                            backgroundColor: req.category === 'Medical' ? '#FEF2F2' : '#F0F9FF',
                            marginRight: spacing(12),
                            marginBottom: 0
                          }]}>
                            <Icon
                              name={req.category === 'Medical' ? 'medical-bag' : 'hand-heart'}
                              size={scale(24)}
                              color={req.category === 'Medical' ? '#DC5C69' : '#0EA5E9'}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.activeCardTitle, { fontSize: ms(16), color: '#1E293B', marginBottom: 2 }]}>
                              {req.category || 'General Help'}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Icon name="map-marker" size={scale(12)} color="#64748B" style={{ marginRight: 2 }} />
                              <Text style={{ fontSize: ms(12), color: '#64748B' }}>
                                {req.distance ? `${parseFloat(req.distance).toFixed(1)} km away` : 'Distance unknown'}
                              </Text>
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <View style={[
                              { paddingHorizontal: spacing(8), paddingVertical: vscale(4), borderRadius: scale(8) },
                              req.status === 'matched' ? { backgroundColor: '#E0F2FE' } :
                                req.status === 'active' ? { backgroundColor: '#DCFCE7' } :
                                  { backgroundColor: '#F1F5F9' }
                            ]}>
                              <Text style={[
                                { fontSize: ms(10), fontWeight: '700' },
                                req.status === 'matched' ? { color: '#0369A1' } :
                                  req.status === 'active' ? { color: '#15803D' } :
                                    { color: '#475569' }
                              ]}>
                                {(req.status || 'OPEN').toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Content: Description */}
                        <View style={{ marginBottom: vscale(16) }}>
                          <Text style={{ fontSize: ms(14), color: '#334155', lineHeight: ms(20) }}>
                            {req.description}
                          </Text>
                        </View>

                        {/* Footer: Actions */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: vscale(12), borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                          <TouchableOpacity
                            onPress={() => handleAcceptRequest(req._id)}
                            style={{
                              flex: 1,
                              backgroundColor: '#DC5C69',
                              paddingVertical: vscale(10),
                              borderRadius: scale(10),
                              alignItems: 'center',
                              marginRight: spacing(8),
                              flexDirection: 'row',
                              justifyContent: 'center'
                            }}
                          >
                            <Text style={{ color: '#FFF', fontSize: ms(13), fontWeight: '600', marginRight: spacing(6) }}>Accept Request</Text>
                            <Icon name="arrow-right" size={scale(16)} color="#FFF" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => copyToClipboard(req._id, 'Request ID')}
                            style={{
                              width: scale(40),
                              height: scale(40),
                              backgroundColor: '#F8FAFC',
                              borderRadius: scale(10),
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 1,
                              borderColor: '#E2E8F0'
                            }}
                          >
                            <Icon name="content-copy" size={scale(18)} color="#64748B" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : (
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
                        onPress={fetchNearbyRequests}
                        style={{ marginTop: vscale(20) }}
                      >
                        <Text style={{ color: '#DC5C69', fontWeight: '600', fontSize: ms(14) }}>Refresh List</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            ) : (
              <View style={{ flex: 1, paddingHorizontal: spacing(20), paddingTop: vscale(12) }}>
                {/* Search and Filter Section */}
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
                        onPress={() => setFilterStatus(status)}
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

                {loadingHistory ? (
                  <ActivityIndicator size="large" color="#DC5C69" style={{ marginTop: vscale(20) }} />
                ) : (
                  <FlatList
                    data={getFilteredHistory()}
                    renderItem={renderHistoryItem}
                    keyExtractor={(item) => item._id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: vscale(100) }}
                    refreshControl={
                      <RefreshControl refreshing={loadingHistory} onRefresh={fetchHistory} colors={['#DC5C69']} tintColor="#DC5C69" />
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
  titleSection: {
    alignItems: 'center',
  },
  mainTitle: {
    fontWeight: '400',
    color: '#2C3E50',
    textAlign: 'center',
  },
  subtitle: {
    color: '#8A9BA7',
    textAlign: 'center',
  },
  primaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E9F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
  },
  askCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0F2F5',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    alignItems: 'center',
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEE',
  },
  askTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  askSubtext: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },
  cardTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  cardText: {
    color: '#546E7A',
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
  pointsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E9F0',
  },
  pointsTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointText: {
    color: '#546E7A',
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
  activeCardStatus: {
    fontWeight: '500',
    opacity: 0.8,
  },
  activeCardDesc: {
    fontWeight: '400',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  historyDate: {
    color: '#999999',
    fontWeight: '400',
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
  historyDesc: {
    color: '#546E7A',
    lineHeight: 18,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  roleText: {
    fontWeight: '500',
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

export default CommunityScreen;
