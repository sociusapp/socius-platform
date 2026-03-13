import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { useResponsive } from '../../../utils/responsive';
import BottomActionBar from '../../../components/common/BottomActionBar';

const HelpTypeScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHelpType, setSelectedHelpType] = useState(null);

  const helpTypes = [
    { id: 1, label: 'Print / Document', icon: 'printer', color: '#5A6F7D' },
    { id: 2, label: 'Tool / Repair', icon: 'wrench', color: '#5A6F7D' },
    { id: 3, label: 'Carry / Lift', icon: 'package-variant', color: '#8B6F47' },
    { id: 4, label: 'Transport Help', icon: 'car', color: '#5A6F7D' },
    { id: 5, label: 'Small Household Help', icon: 'home-variant-outline', color: '#5A6F7D' },
    { id: 6, label: 'Study / Office Help', icon: 'briefcase-variant-outline', color: '#5A6F7D' },
    { id: 7, label: 'Language / Translation', icon: 'translate', color: '#5A6F7D' },
    { id: 8, label: 'Elder / Accessibility Help', icon: 'human-cane', color: '#C94D4D' },
    { id: 9, label: 'Tech Help (Quick Fix)', icon: 'laptop', color: '#5A6F7D' },
    { id: 10, label: 'General Help (Last Resort)', icon: 'comment-question-outline', color: '#5A6F7D' },
  ];

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

    navigation.navigate('AddDetails', {
      helpType: selected,
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
        >
          <View style={{ width: contentWidth }}>
            {/* Title Section */}
            <View style={[styles.titleSection, { marginBottom: vscale(28) }]}>
              <Text style={[styles.mainTitle, { fontSize: ms(22), marginBottom: vscale(5), lineHeight: ms(34) }]}>What kind of help do you need?</Text>
              <Text style={[styles.subtitle, { fontSize: ms(16) }]}>Choose something simple and local.</Text>
            </View>

            {/* Search Bar */}
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

            {/* Help Type Grid */}
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
                  <Icon name={helpType.icon} size={scale(26)} color={helpType.color} style={styles.cardIcon} />
                  <Text style={[styles.helpTypeLabel, { fontSize: ms(14), marginLeft: spacing(10), lineHeight: ms(20) }]}>{helpType.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Info Text */}
            <View style={[styles.infoContainer, { 
              paddingHorizontal: spacing(14), 
              paddingVertical: vscale(12), 
              borderRadius: scale(12),
              borderWidth: scale(1),
              marginBottom: vscale(24)
            }]}>
              <Text style={[styles.infoText, { fontSize: ms(12), lineHeight: ms(20) }]}>Requests should be small, time-limited, and non-monetary.</Text>
            </View>
          </View>
        </ScrollView>

        <BottomActionBar style={{ paddingHorizontal: spacing(16) }}>
          <Button
            title="Continue"
            onPress={handleContinue}
            fullWidth
            disabled={!selectedHelpType}
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
