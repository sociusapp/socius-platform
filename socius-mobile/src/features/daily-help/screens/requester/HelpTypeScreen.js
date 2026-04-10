import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';
import MotionView from '../../../../components/common/MotionView';
import { useResponsive } from '../../../../utils/responsive';
import BottomActionBar from '../../../../components/common/BottomActionBar';
import { api } from '../../../../services/api/client';
import { getHelpCategories } from '../../../../services/api/helpCategories.api';
import { sociusRefreshProps } from '../../../../utils/sociusRefreshControl';

const HelpTypeScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHelpType, setSelectedHelpType] = useState(null);
  const [remoteCategories, setRemoteCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const categoriesMountedRef = useRef(true);

  const fallbackHelpTypes = useMemo(() => ([
    { id: 1, label: 'Print / Document', icon: 'printer', color: '#5A6F7D', category: 'print_document' },
    { id: 2, label: 'Tool / Repair', icon: 'wrench', color: '#5A6F7D', category: 'tool_repair' },
    { id: 3, label: 'Carry / Lift', icon: 'package-variant', color: '#8B6F47', category: 'carry_lift' },
    { id: 4, label: 'Transport Help', icon: 'car', color: '#5A6F7D', category: 'transport_help' },
    { id: 5, label: 'Small Household Help', icon: 'home-variant-outline', color: '#5A6F7D', category: 'household_help' },
    { id: 6, label: 'Study / Office Help', icon: 'briefcase-variant-outline', color: '#5A6F7D', category: 'study_office_help' },
    { id: 7, label: 'Language / Translation', icon: 'translate', color: '#5A6F7D', category: 'language_support' },
    { id: 8, label: 'Elder / Accessibility Help', icon: 'human-cane', color: '#C94D4D', category: 'elder_assistance' },
    { id: 9, label: 'Tech Help (Quick Fix)', icon: 'laptop', color: '#5A6F7D', category: 'tech_help' },
    { id: 10, label: 'General Help (Last Resort)', icon: 'comment-question-outline', color: '#5A6F7D', category: 'general_help' },
  ]), []);

  const baseRoot = useMemo(() => {
    const base = String(api?.defaults?.baseURL || '');
    return base.replace(/\/api\/?$/, '');
  }, []);

  useEffect(() => {
    categoriesMountedRef.current = true;
    return () => {
      categoriesMountedRef.current = false;
    };
  }, []);

  const loadRemoteCategories = useCallback(async ({ quiet = false } = {}) => {
    try {
      if (!quiet) setLoadingCategories(true);
      const res = await getHelpCategories();
      const items = res?.data?.items || res?.items || [];
      if (categoriesMountedRef.current) setRemoteCategories(Array.isArray(items) ? items : []);
    } catch (e) {
      if (categoriesMountedRef.current) setRemoteCategories([]);
    } finally {
      if (categoriesMountedRef.current && !quiet) setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadRemoteCategories();
  }, [loadRemoteCategories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRemoteCategories({ quiet: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadRemoteCategories]);

  const helpTypes = useMemo(() => {
    if (Array.isArray(remoteCategories) && remoteCategories.length) {
      const iconMap = {
        print_document: 'printer',
        tool_repair: 'wrench',
        carry_lift: 'package-variant',
        transport_help: 'car',
        household_help: 'home-variant-outline',
        study_office_help: 'briefcase-variant-outline',
        language_support: 'translate',
        elder_assistance: 'human-cane',
        tech_help: 'laptop',
        general_help: 'comment-question-outline',
      };
      return remoteCategories
        .filter((c) => c?.isActive !== false)
        .sort((a, b) => (Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0)))
        .map((c, idx) => ({
          id: c.slug || String(c._id || idx),
          mongoId: c._id ? String(c._id) : null,
          label: c.name || c.slug || 'Help',
          description: c.description || '',
          category: c.slug,
          iconUrl: c.iconUrl ? `${baseRoot}${c.iconUrl}` : null,
          icon: iconMap[String(c.slug || '').toLowerCase()] || 'help-circle-outline',
          color: c.color || '#5A6F7D',
          hasSubcategories: !!(c.has_subcategories || c.hasSubcategories),
          subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
        }));
    }
    return fallbackHelpTypes;
  }, [remoteCategories, fallbackHelpTypes, baseRoot]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredHelpTypes = normalizedQuery.length === 0
    ? helpTypes
    : helpTypes.filter((helpType) =>
        helpType.label.toLowerCase().includes(normalizedQuery)
      );

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleSelectHelpType = (helpType) => {
    setSelectedHelpType(helpType.id);
  };

  const handleContinue = () => {
    if (!selectedHelpType) return;
    const selected = helpTypes.find((item) => item.id === selectedHelpType);
    if (!selected) return;

    const hasSubcategories = !!selected.hasSubcategories || (Array.isArray(selected.subcategories) && selected.subcategories.length > 0);
    if (hasSubcategories) {
      navigation.navigate('DailyHelpReason', {
        helpType: selected,
        categoryId: selected.mongoId || undefined,
        categorySlug: selected.category,
        subcategories: selected.subcategories || [],
        mode: 'subcategory',
      });
      return;
    }

    navigation.navigate('AddDetails', {
      helpType: selected,
      category: selected.category,
      categoryId: selected.mongoId || undefined,
      categorySlug: selected.category,
      subcategoryId: undefined,
      reason: undefined,
      query: '',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={handleSettings} style={{ padding: scale(8) }}>
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      <View style={styles.body}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...sociusRefreshProps} />}
        >
          <View style={{ width: contentWidth }}>
            {/* Title Section */}
            <MotionView preset="fadeUp" duration={220}>
              <View style={[styles.titleSection, { marginBottom: vscale(28) }]}>
                <Text style={[styles.mainTitle, { fontSize: ms(22), marginBottom: vscale(5), lineHeight: ms(34) }]}>What kind of help do you need?</Text>
                <Text style={[styles.subtitle, { fontSize: ms(16) }]}>Choose something simple and local.</Text>
              </View>
            </MotionView>

            {/* Search Bar */}
            <MotionView preset="fadeUp" duration={220} delay={50}>
              <View style={[styles.searchContainer, { 
                paddingHorizontal: spacing(16), 
                paddingVertical: vscale(12), 
                borderRadius: scale(28),
                borderWidth: scale(1),
                marginBottom: vscale(24),
                shadowOffset: { width: 0, height: vscale(2) },
                shadowRadius: scale(6),
                elevation: scale(2)
              }]}>
                <Icon name="magnify" size={scale(20)} color="#999999" style={[styles.searchIcon, { marginRight: spacing(10) }]} />
                <TextInput
                  style={[styles.searchInput, { fontSize: ms(15) }]}
                  placeholder="Search for help (e.g., print, tool, lift)"
                  placeholderTextColor="#999999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </MotionView>

            {/* Help Type Grid */}
            <MotionView preset="fadeUp" duration={220} delay={80}>
            <View style={[styles.gridContainer, { marginBottom: vscale(20) }]}>
              {filteredHelpTypes.map((helpType) => (
                <TouchableOpacity
                  key={helpType.id}
                  style={[
                    styles.helpTypeCard,
                    { 
                      width: (contentWidth - spacing(14)) / 2,
                      paddingVertical: vscale(12), 
                      paddingHorizontal: spacing(10), 
                      borderRadius: scale(16),
                      borderWidth: scale(1),
                      marginBottom: vscale(10),
                      shadowOffset: { width: 0, height: vscale(2) },
                      shadowRadius: scale(6),
                      elevation: scale(2)
                    },
                    selectedHelpType === helpType.id && [styles.helpTypeCardSelected, { borderWidth: scale(2) }]
                  ]}
                  onPress={() => handleSelectHelpType(helpType)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select help type: ${helpType.label}`}
                >
                  {helpType.iconUrl ? (
                    <Image
                      source={{ uri: helpType.iconUrl }}
                      style={{ width: scale(32), height: scale(32), borderRadius: scale(8) }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Icon name={helpType.icon} size={scale(32)} color={helpType.color} style={styles.cardIcon} />
                  )}
                  <Text style={[styles.helpTypeLabel, { fontSize: ms(14), marginLeft: spacing(10), lineHeight: ms(20) }]}>
                    {String(helpType.label || '').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            </MotionView>

            {/* Info Text */}
            <MotionView preset="fadeUp" duration={220} delay={110}>
              <View style={[styles.infoContainer, { 
                paddingHorizontal: spacing(14), 
                paddingVertical: vscale(12), 
                borderRadius: scale(12),
                borderWidth: scale(1),
                marginBottom: vscale(24)
              }]}>
                <Text style={[styles.infoText, { fontSize: ms(12), lineHeight: ms(20) }]}>Requests should be small, time-limited, and non-monetary.</Text>
              </View>
            </MotionView>
          </View>
        </ScrollView>

        <BottomActionBar style={{ paddingHorizontal: spacing(16) }}>
          <Button
            title="Continue"
            onPress={handleContinue}
            fullWidth
            disabled={!selectedHelpType || loadingCategories}
            icon={<Icon name="arrow-right" size={scale(18)} color="#FFFFFF" />}
            accessibilityLabel="Continue to review details"
          />
        </BottomActionBar>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  body: {
    flex: 1,
    justifyContent: 'space-between',
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 24,
    paddingBottom: 60,
  },

  // ===== TITLE SECTION =====
  titleSection: {
    alignItems: 'center',
  },

  mainTitle: {
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center',
  },

  subtitle: {
    fontWeight: '400',
    color: '#999999',
    textAlign: 'center',
  },

  // ===== SEARCH BAR =====
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  searchIcon: {
  },

  searchInput: {
    flex: 1,
    fontWeight: '400',
    color: '#2C3E50',
    paddingVertical: 0,
  },

  // ===== GRID CONTAINER =====
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  cardIcon: {
    flexShrink: 0,
  },

  helpTypeCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
  },

  helpTypeCardSelected: {
    borderColor: '#DC5C69',
    backgroundColor: '#FFF5F5',
  },

  helpTypeLabel: {
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'left',
    flex: 1,
  },

  // ===== INFO CONTAINER =====
  infoContainer: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E8EAED',
  },

  infoText: {
    fontWeight: '400',
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ===== CONTINUE BUTTON =====
  continueButton: {
    backgroundColor: '#D89398',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC5C69',
    shadowOpacity: 0.25,
  },

  continueButtonDisabled: {
  },

  footer: {
    backgroundColor: '#FFFFFF',
  },
});

export default HelpTypeScreen;
