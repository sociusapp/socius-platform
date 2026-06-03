import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import { getPresenceCategories } from '../../services/api/needPresence.api';
import { loadAuth } from '../../services/storage/asyncStorage.service';

const ParticipationChoiceScreen = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState('Community Member');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const roles = [
    {
      id: 'Community Member',
      title: 'Community Member',
      icon: 'account',
      description: 'Use Socius to share information and stay aware of what\'s happening nearby.'
    },
    {
      id: 'Available to Help',
      title: 'Available to Help',
      subtitle: '(Optional)',
      icon: 'account-multiple',
      description: 'Be notified about situations you\'re comfortable being aware of.'
    }
  ];

  // Fetch categories from admin panel API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { accessToken } = await loadAuth();
        if (!accessToken) {
          setError('Session expired');
          setLoading(false);
          return;
        }
        const response = await getPresenceCategories(accessToken);
        if (response?.success && Array.isArray(response?.data?.categories)) {
          const cats = response.data.categories
            .filter(cat => cat.isActive !== false)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          setCategories(cats);
          // Pre-select first 2 categories by default
          if (cats.length > 0) {
            setSelectedNotifications(cats.slice(0, 2).map(c => c.title || c.name));
          }
        } else if (response?.success && Array.isArray(response?.data)) {
          const cats = response.data
            .filter(cat => cat.isActive !== false)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          setCategories(cats);
          if (cats.length > 0) {
            setSelectedNotifications(cats.slice(0, 2).map(c => c.title || c.name));
          }
        }
      } catch (err) {
        console.error('[ParticipationChoice] Failed to load categories:', err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const toggleNotification = (type) => {
    setSelectedNotifications(prev =>
      prev.includes(type)
        ? prev.filter(item => item !== type)
        : [...prev, type]
    );
  };

  const getCategoryDisplayName = (category) => {
    return category.title || category.name || category.label || '';
  };

    const handleContinue = () => {
    console.log('[ParticipationChoice] handleContinue clicked');
    console.log('[ParticipationChoice] Selected role:', selectedRole);
    console.log('[ParticipationChoice] Selected notifications:', selectedNotifications);
    navigation.navigate('IdentityVerification');
  };

  const { contentWidth, titleFont, subtitleFont, bodyFont, smallFont, isTablet, scale, vscale, spacing } = useResponsive();
  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="" 
        onBackPress={() => navigation.goBack()} 
        style={{ borderBottomWidth: 0 }}
      />
      
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(16), paddingTop: vscale(16), paddingBottom: vscale(130) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          <View style={[styles.titleSection, { marginBottom: vscale(28) }]}>
            <Text style={[styles.mainTitle, { fontSize: titleFont(20), lineHeight: titleFont(32), marginBottom: vscale(10) }]}>How would you like to participate?</Text>
            <Text style={[styles.subtitle, { fontSize: subtitleFont(15), lineHeight: subtitleFont(22) }]}>You can change this anytime. There is no obligation to respond.</Text>
          </View>

        {/* Role Selection Cards */}
        <View style={[styles.rolesContainer, { flexDirection: 'row', gap: spacing(10) }]}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleCard,
                selectedRole === role.id && styles.roleCardSelected,
                { 
                  padding: spacing(12), 
                  borderRadius: scale(16), 
                  borderWidth: scale(1),
                  flex: 1, // Ensure cards take equal width in row
                }
              ]}
              onPress={() => setSelectedRole(role.id)}
            >
              <View style={[styles.roleHeader, { marginBottom: vscale(8) }]}>
                <View style={[
                  styles.roleIcon,
                  selectedRole === role.id && styles.roleIconSelected,
                  { width: scale(44), height: scale(44), borderRadius: scale(22) }
                ]}>
                  {role.id === 'Community Member' ? (
                    <Image
                      source={require('../../assets/icons/icon-25.png')}
                      style={[styles.roleIconImage, { width: scale(40), height: scale(40) }]}
                    />
                  ) : (
                    <Image
                      source={require('../../assets/icons/icon-10.png')}
                      style={[styles.roleIconImage, { width: scale(40), height: scale(40) }]}
                    />
                  )}
                </View>
              </View>

              <View style={styles.roleTextContent}>
                <View style={[styles.roleTitleContainer, { marginBottom: vscale(4) }]}>
                  <Text style={[styles.roleTitle, { fontSize: subtitleFont(14) }] }>{role.title}</Text>
                  {role.subtitle && (
                    <Text style={[styles.roleSubtitle, { fontSize: smallFont(10), marginLeft: spacing(4) }]}>{role.subtitle}</Text>
                  )}
                </View>
                <Text style={[styles.roleDescription, { fontSize: bodyFont(11), lineHeight: bodyFont(15) }]}>{role.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notification Types Section */}
        <View style={[styles.notificationSection, { marginTop: vscale(32), marginBottom: vscale(24) }]}>
          <Text style={[styles.notificationTitle, { fontSize: subtitleFont(16), marginBottom: vscale(16) }]}>What would you like to be notified about?</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#DC5C69" style={{ marginVertical: vscale(20) }} />
          ) : error ? (
            <Text style={[styles.errorText, { fontSize: bodyFont(14), color: '#DC5C69', textAlign: 'center' }]}>
              {error}
            </Text>
          ) : categories.length === 0 ? (
            <Text style={[styles.emptyText, { fontSize: bodyFont(14), color: '#9CA3AF', textAlign: 'center' }]}>
              No categories available
            </Text>
          ) : (
            <View style={[styles.tagsContainer, { gap: spacing(10) }]}>
              {categories.map((category) => {
                const displayName = getCategoryDisplayName(category);
                const isSelected = selectedNotifications.includes(displayName);
                return (
                  <TouchableOpacity
                    key={category._id || category.id}
                    style={[
                      styles.tag,
                      isSelected && styles.tagSelected,
                      { paddingHorizontal: spacing(16), paddingVertical: vscale(8), borderRadius: scale(20), borderWidth: scale(1) }
                    ]}
                    onPress={() => toggleNotification(displayName)}
                  >
                    <Text style={[
                      styles.tagText,
                      isSelected && styles.tagTextSelected,
                      { fontSize: smallFont(13) }
                    ]}>
                      {displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <Text style={[styles.infoText, { fontSize: smallFont(13), marginTop: vscale(12), lineHeight: smallFont(18) }]}>You will only see requests related to what you select.</Text>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.footer, { paddingHorizontal: spacing(20), paddingVertical: vscale(16), paddingBottom: vscale(24), borderTopWidth: 0 }]}>
        <Button 
          title="Continue" 
          onPress={handleContinue}
          fullWidth
        />
      </View>
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

  // ===== TITLE SECTION =====
  titleSection: {
    alignItems: 'center',
  },

  mainTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },

  subtitle: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },

  // ===== ROLE CARDS =====
  rolesContainer: {
  },

  roleCard: {
    flex: 1,
    borderColor: '#E8EAED',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },

  roleCardSelected: {
    borderColor: '#DC5C69',
    backgroundColor: '#FFF5F6',
  },

  roleHeader: {
    alignItems: 'center',
  },

  roleIcon: {
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  roleIconSelected: {
    backgroundColor: '#FEE8EA',
  },
  roleIconImage: {
    resizeMode: 'contain',
  },

  roleTextContent: {
    alignItems: 'center',
  },

  roleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  roleTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },

  roleSubtitle: {
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
  },

  roleDescription: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },

  // ===== NOTIFICATION SECTION =====
  notificationSection: {
  },

  notificationTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },

  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  tag: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
  },

  tagSelected: {
    backgroundColor: '#DC5C69',
    borderColor: '#DC5C69',
  },

  tagText: {
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },

  tagTextSelected: {
    color: '#FFFFFF',
  },

  // ===== INFO TEXT =====
  infoText: {
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyText: {
    fontWeight: '400',
    textAlign: 'center',
  },

  // ===== FOOTER BUTTON =====
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E8EAED',
  },
});

export default ParticipationChoiceScreen;
