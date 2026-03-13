import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import { useResponsive } from '../../utils/responsive';
import { loadAuth, loadAvailabilityPreference, loadAvailabilityUpdatedAt, loadLastKnownLocation, saveAvailabilityPreference } from '../../services/storage/asyncStorage.service';
import { getProfile } from '../../services/api/user.api';
import { toggleAvailability } from '../../services/api/incident.api';
import { requestLocationPermission, getCurrentPosition } from '../../services/location/geolocation.service';

const SettingsScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [isAvailable, setIsAvailable] = useState(true);
  const availabilityReqSeqRef = useRef(0);
  const availabilityErrorShownAtRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const localValue = await loadAvailabilityPreference();
        if (typeof localValue === 'boolean') {
          setIsAvailable(localValue);
        }
      } catch (e) { }
      fetchAvailabilityStatus();
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const localValue = await loadAvailabilityPreference();
          if (!cancelled && typeof localValue === 'boolean') {
            setIsAvailable(localValue);
          }
        } catch (e) { }
        fetchAvailabilityStatus();
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const fetchAvailabilityStatus = async ({ forceApply = false } = {}) => {
    try {
      const { accessToken } = await loadAuth();
      if (!accessToken) return;
      const response = await getProfile(accessToken);
      if (response?.success && response?.data) {
        const value = !!response.data.isAvailable;
        let shouldApplyServer = true;
        if (!forceApply) {
          try {
            const [localValue, updatedAt] = await Promise.all([
              loadAvailabilityPreference(),
              loadAvailabilityUpdatedAt(),
            ]);
            if (typeof localValue === 'boolean' && typeof updatedAt === 'number') {
              const recentlyChanged = Date.now() - updatedAt < 4000;
              if (recentlyChanged && localValue !== value) {
                shouldApplyServer = false;
              }
            }
          } catch (e) { }
        }

        if (shouldApplyServer) {
          setIsAvailable(value);
          try {
            await saveAvailabilityPreference(value);
          } catch (e) { }
        }
      }
    } catch (error) {
      console.log('Error fetching availability:', error);
    }
  };

  const handleAvailabilityToggle = async (value) => {
    if (value === isAvailable) return;

    setIsAvailable(value);
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
            setIsAvailable(serverValue);
            try { await saveAvailabilityPreference(serverValue); } catch (e) { }
          }
        } else {
          const res = await toggleAvailability(accessToken, { isAvailable: false });
          const serverValue = res?.data?.isAvailable;
          if (availabilityReqSeqRef.current === seq && typeof serverValue === 'boolean') {
            setIsAvailable(serverValue);
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

  const sections = [
    {
      id: 1,
      title: 'Participation',
      items: [
        {
          id: 'availability',
          label: 'Availability Status',
          subtitle: null,
          type: 'toggle',
          value: isAvailable,
          onToggle: handleAvailabilityToggle,
          rightLabel: 'Available'
        },
        {
          id: 'pause',
          label: 'Pause Participation',
          subtitle: 'Temporarily stop receiving awareness alerts.',
          type: 'nav',
        }
      ],
      footer: 'Participation is always voluntary.'
    },
    {
      id: 2,
      title: 'Privacy & Data',
      items: [
        {
          id: 'privacy',
          label: 'Privacy Policy',
          subtitle: null,
          type: 'nav',
        },
        {
          id: 'usage',
          label: 'Data Usage Summary',
          subtitle: null,
          type: 'nav',
        },
        {
          id: 'location',
          label: 'Location Sharing Rules',
          subtitle: 'Location is shared only during an active request.',
          type: 'nav',
        }
      ]
    },
    {
      id: 3,
      title: 'Safety & Conduct',
      items: [
        {
          id: 'guidelines',
          label: 'Community Guidelines',
          subtitle: null,
          type: 'nav',
        },
        {
          id: 'conduct',
          label: 'Volunteer Code of Conduct',
          subtitle: null,
          type: 'nav',
        },
        {
          id: 'notdo',
          label: 'What Socius Does Not Do',
          subtitle: null,
          type: 'nav',
        }
      ]
    },
    {
      id: 4,
      title: 'Legal',
      items: [
        {
          id: 'terms',
          label: 'Terms of Use',
          subtitle: null,
          type: 'nav',
        },
        {
          id: 'consent',
          label: 'Consent & Disclaimers',
          subtitle: null,
          type: 'nav',
        },
        {
          id: 'jurisdiction',
          label: 'Jurisdiction & Dispute Resolution',
          subtitle: null,
          type: 'nav',
        }
      ],
      footer: 'Socius is an information-sharing platform only.'
    },
    {
      id: 5,
      title: 'Account',
      items: [
        {
          id: 'profile',
          label: 'Update Profile Information',
          subtitle: null,
          type: 'nav',
        },
        {
          id: 'delete',
          label: 'Delete Account',
          subtitle: null,
          type: 'nav',
          isDestructive: true,
        }
      ],
      footer: 'Socius does not provide emergency response or enforcement services.'
    },
    {
      id: 6,
      title: 'Help & Support',
      items: [
        {
          id: 'help',
          label: 'Help & support',
          subtitle: null,
          type: 'nav',
        }
      ]
    }
  ];

  const handleNavigation = (itemId) => {
    switch (itemId) {
      case 'pause':
        navigation.navigate('Availability');
        break;
      case 'privacy':
        navigation.navigate('PrivacyPolicy');
        break;
      case 'usage':
        navigation.navigate('YourDataAccount');
        break;
      case 'location':
        navigation.navigate('DataPrivacy');
        break;
      case 'guidelines':
        navigation.navigate('CommunityGuidelines');
        break;
      case 'conduct':
        navigation.navigate('VolunteerCodeOfConduct');
        break;
      case 'notdo':
        navigation.navigate('WhatSociusIsNot');
        break;
      case 'terms':
        navigation.navigate('TermsOfUse', { slug: 'terms-of-use', title: 'Terms of Use' });
        break;
      case 'consent':
        navigation.navigate('TermsOfUse', { slug: 'consent-disclaimers', title: 'Consent & Disclaimers' });
        break;
      case 'jurisdiction':
        navigation.navigate('TermsOfUse', { slug: 'jurisdiction-resolution', title: 'Jurisdiction & Dispute Resolution' });
        break;
      case 'profile':
        navigation.navigate('ProfileInfo');
        break;
      case 'delete':
        navigation.navigate('YourDataAccount');
        break;
      case 'help':
        navigation.navigate('HelpSupport');
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Settings" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(16), paddingTop: vscale(16), paddingBottom: vscale(20) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {sections.map((section) => (
            <View key={section.id} style={[styles.sectionWrapper, { marginBottom: vscale(12) }]}>
              {/* Section Title */}
              <Text style={[styles.sectionTitle, { fontSize: ms(15), marginBottom: vscale(7), marginLeft: spacing(4) }]}>{section.title}</Text>

              {/* Section Card */}
              <View style={[styles.sectionCard, { borderRadius: scale(14), borderWidth: scale(1) }]}>
                {section.items.map((item, index) => (
                  <View key={item.id} style={styles.itemWrapper}>
                    {item.type === 'toggle' ? (
                      // Toggle Item
                      <View style={[styles.toggleItem, { paddingHorizontal: spacing(16), paddingVertical: vscale(8) }]}>
                        <View style={[styles.itemLabelContainer, { paddingRight: spacing(12) }]}>
                          <Text style={[styles.itemLabel, { fontSize: ms(15), lineHeight: ms(22) }]}>{item.label}</Text>
                        </View>
                        <View style={[styles.toggleContainer, { gap: spacing(5) }]}>
                          <Text style={[styles.rightLabel, { fontSize: ms(13) }]}>{item.rightLabel}</Text>
                          <Switch
                            style={[styles.toggle, { transform: [{ scaleX: scale(0.9) }, { scaleY: scale(0.9) }] }]}
                            value={item.value}
                            onValueChange={item.onToggle}
                            trackColor={{ false: '#D0D5DD', true: '#27AE60' }}
                            thumbColor="#FFFFFF"
                          />
                        </View>
                      </View>
                    ) : (
                      // Navigation Item
                      <TouchableOpacity 
                        style={[styles.navItem, { paddingHorizontal: spacing(16), paddingVertical: vscale(9) }]}
                        onPress={() => handleNavigation(item.id)}
                      >
                        <View style={[styles.itemLabelContainer, { paddingRight: spacing(12) }]}>
                          <Text style={[
                            styles.itemLabel,
                            item.isDestructive && styles.itemLabelDestructive,
                            { fontSize: ms(15), lineHeight: ms(22) }
                          ]}>
                            {item.label}
                          </Text>
                          {item.subtitle && (
                            <Text style={[styles.itemSubtitle, { fontSize: ms(13), marginTop: vscale(4), lineHeight: ms(18) }]}>{item.subtitle}</Text>
                          )}
                        </View>
                        <Icon name="chevron-right" size={ms(24)} color="#CCCCCC" />
                      </TouchableOpacity>
                    )}

                    {/* Divider */}
                    {index < section.items.length - 1 && (
                      <View style={[styles.itemDivider, { height: scale(1), marginHorizontal: spacing(16) }]} />
                    )}
                  </View>
                ))}
              </View>

              {/* Footer Text */}
              {section.footer && (
                <Text style={[styles.sectionFooter, { fontSize: ms(12), marginTop: vscale(10), lineHeight: ms(16) }]}>{section.footer}</Text>
              )}
            </View>
          ))}

          <View style={[styles.bottomSpacing, { height: vscale(20) }]} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  scrollContent: {
    flexGrow: 1,
  },

  sectionWrapper: {
  },

  // ===== SECTION TITLE =====
  sectionTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  // ===== SECTION CARD =====
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  itemWrapper: {
    width: '100%',
  },

  // ===== TOGGLE ITEM =====
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ===== NAV ITEM =====
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  itemLabelContainer: {
    flex: 1,
  },

  itemLabel: {
    fontWeight: '600',
    color: '#2C3E50',
  },

  itemLabelDestructive: {
    color: '#DC5C69',
  },

  itemSubtitle: {
    fontWeight: '400',
    color: '#999999',
  },

  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rightLabel: {
    fontWeight: '500',
    color: '#666666',
  },

  toggle: {
  },

  // ===== DIVIDER =====
  itemDivider: {
    backgroundColor: '#F0F1F3',
  },

  // ===== SECTION FOOTER =====
  sectionFooter: {
    fontWeight: '400',
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ===== SPACING =====
  bottomSpacing: {
  },
});

export default SettingsScreen;
