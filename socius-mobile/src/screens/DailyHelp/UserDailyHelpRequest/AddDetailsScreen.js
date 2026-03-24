import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { useResponsive } from '../../../utils/responsive';
import { api } from '../../../services/api/client';
import { reverseGeocode, formatLocationLabel } from '../../../services/location/geolocation.service';
import { loadAuth } from '../../../services/storage/asyncStorage.service';

const AddDetailsScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const helpType = route?.params?.helpType;
  const category = route?.params?.category;
  const reason = route?.params?.reason;
  const query = route?.params?.query;
  const requestId = route?.params?.requestId;
  const [description, setDescription] = useState('');
  const [selectedTime, setSelectedTime] = useState('30 minutes');
  const [customTimeVisible, setCustomTimeVisible] = useState(false);
  const [dbLocation, setDbLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [showError, setShowError] = useState(false);

  const timeOptions = [
    { id: 1, label: '10–15 minutes' },
    { id: 2, label: '30 minutes' },
    { id: 3, label: 'About 1 hour' },
    { id: 4, label: 'Custom time' },
  ];

  const customTimeOptions = [
    { id: 'c1', label: '5–10 minutes' },
    { id: 'c2', label: '10–15 minutes' },
    { id: 'c3', label: '15–30 minutes' },
    { id: 'c4', label: '30–45 minutes' },
    { id: 'c5', label: '45–60 minutes' },
    { id: 'c6', label: '1–2 hours' },
    { id: 'c7', label: '2–3 hours' },
    { id: 'c8', label: '3–5 hours' },
    { id: 'c9', label: 'More than 5 hours' },
  ];

  const baseTimeLabels = timeOptions.filter(t => t.label !== 'Custom time').map(t => t.label);

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  useEffect(() => {
    if (typeof route?.params?.description === 'string') {
      setDescription(route.params.description);
    }
    const loadDbLocation = async () => {
      try {
        const auth = await loadAuth();
        const token = auth?.accessToken;

        if (!token) {
          setDbLocation(null);
          setLocationLabel('');
          return;
        }

        const response = await api.get('/availability', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const body = response?.data;
        if (!body?.success) {
          setDbLocation(null);
          setLocationLabel('');
          return;
        }

        const location = body?.data?.location;
        const hasLocation =
          location &&
          typeof location.lat === 'number' &&
          typeof location.lng === 'number';

        if (!hasLocation) {
          setDbLocation(null);
          setLocationLabel('');
          return;
        }

        setDbLocation({ lat: location.lat, lng: location.lng });

        let label = `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;

        try {
          const place = await reverseGeocode({
            latitude: location.lat,
            longitude: location.lng,
          });
          label = formatLocationLabel(place, { fallback: label });
        } catch (e) {
        }

        setLocationLabel(label);
      } catch (e) {
        setDbLocation(null);
        setLocationLabel('');
      }
    };

    loadDbLocation();
  }, []);

  const handleReviewRequest = () => {
    if (!description.trim()) {
      setShowError(true);
      return;
    }
    navigation.navigate('ReviewRequest', {
      description,
      time: selectedTime,
      helpType,
      category,
      reason,
      query,
      location: dbLocation,
      requestId,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={handleSettings} style={{ padding: scale(8) }}>
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Title Section */}
          <View style={[styles.titleSection, { marginBottom: vscale(28) }]}>
            <Text style={[styles.mainTitle, { fontSize: ms(22), marginBottom: vscale(5) }]}>Add a short detail</Text>
            <Text style={[styles.subtitle, { fontSize: ms(16) }]}>One clear line helps nearby people understand.</Text>
          </View>

          {/* Text Input */}
          <View style={[styles.inputContainer, { marginBottom: showError ? vscale(8) : vscale(20) }]}>
            <TextInput
              style={[styles.textInput, { 
                borderRadius: scale(20),
                borderWidth: scale(1),
                paddingHorizontal: spacing(16),
                paddingVertical: vscale(14),
                fontSize: ms(15),
                minHeight: vscale(80),
                paddingRight: spacing(60),
                shadowOffset: { width: 0, height: vscale(2) },
                shadowRadius: scale(6),
                elevation: scale(2),
                borderColor: showError ? '#DC5C69' : '#E8EAED',
              }]}
              placeholder="Example: Need a quick printout near the bus stop"
              placeholderTextColor="#999999"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (text.trim().length > 0) setShowError(false);
              }}
              maxLength={120}
              multiline={true}
            />
            <Text style={[styles.charCount, { bottom: vscale(12), right: spacing(16), fontSize: ms(13) }]}>{description.length} / 120</Text>
          </View>

          {showError && (
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: vscale(12), marginLeft: spacing(4) }}>
              <Icon name="alert-circle-outline" size={scale(16)} color="#DC5C69" style={{ marginRight: spacing(4) }} />
              <Text style={{ color: '#DC5C69', fontSize: ms(13), fontWeight: '500' }}>Please add a short detail first.</Text>
            </View>
          )}

          {/* How Long Section */}
          <View style={[styles.timeSection, { marginBottom: vscale(24) }]}>
            <Text style={[styles.timeSectionTitle, { fontSize: ms(18), marginBottom: vscale(16) }]}>How long will this take?</Text>
            <View style={[styles.timeButtonsContainer, { gap: spacing(10) }]}>
              {timeOptions.map((option) => {
                const isCustom = option.label === 'Custom time';
                const isBaseSelected = selectedTime === option.label;
                const isCustomSelected = !baseTimeLabels.includes(selectedTime);
                const isSelected = isCustom ? isCustomSelected : isBaseSelected;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.timeButton,
                      { 
                        paddingVertical: vscale(10), 
                        paddingHorizontal: spacing(17), 
                        borderRadius: scale(24),
                        borderWidth: scale(1),
                        shadowOffset: { width: 0, height: vscale(2) },
                        shadowRadius: scale(6),
                        elevation: scale(2)
                      },
                      isSelected && styles.timeButtonActive
                    ]}
                    onPress={() => {
                      if (isCustom) {
                        setCustomTimeVisible(true);
                      } else {
                        setSelectedTime(option.label);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.timeButtonText,
                        { fontSize: ms(14) },
                        isSelected && styles.timeButtonTextActive,
                      ]}
                    >
                      {isCustom && isCustomSelected ? selectedTime : option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Location Card */}
          <View
            style={[
              styles.locationCard,
              {
                borderRadius: scale(18),
                borderWidth: scale(1),
                paddingHorizontal: spacing(16),
                paddingVertical: vscale(16),
                marginBottom: vscale(12),
                shadowOffset: { width: 0, height: vscale(2) },
                shadowRadius: scale(6),
                elevation: scale(2),
              },
            ]}
          >
            <View
              style={[
                styles.locationIconContainer,
                { marginRight: spacing(14), paddingTop: vscale(2) },
              ]}
            >
              <Icon name="map-marker" size={scale(28)} color="#DC5C69" />
            </View>
            <View style={styles.locationContent}>
              <Text
                style={[
                  styles.locationTitle,
                  { fontSize: ms(15), marginBottom: vscale(4), lineHeight: ms(22) },
                ]}
              >
                Location will be shared with nearby helpers.
              </Text>
              <Text
                style={[
                  styles.locationSubtext,
                  { fontSize: ms(13), lineHeight: ms(20) },
                ]}
              >
                {locationLabel ? `Using: ${locationLabel}` : 'Location not available.'}
              </Text>
            </View>
          </View>

          {/* Warning Box */}
          <View style={[styles.warningBox, { 
            borderRadius: scale(16),
            borderWidth: scale(1),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(14),
            marginBottom: vscale(20),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <Icon name="information" size={scale(24)} color="#999999" />
            <View style={[styles.warningContent, { marginLeft: spacing(12) }]}>
              <Text style={[styles.warningText, { fontSize: ms(15), marginBottom: vscale(0), lineHeight: ms(15) }]}>Please request only small, everyday help.</Text>
              <Text style={[styles.warningSubtext, { fontSize: ms(13), lineHeight: ms(20) }]}>This is not for emergencies.</Text>
            </View>
          </View>

          {/* Review Request Button */}
          <Button
            title="Review Request"
            onPress={handleReviewRequest}
            variant="gradient"
            fullWidth
            icon={<Icon name="clipboard-text-outline" size={scale(18)} color="#FFFFFF" />}
            accessibilityLabel="Review your request"
          />

          <View style={[styles.bottomSpacer, { height: vscale(40) }]} />
        </View>
      </ScrollView>

      <Modal
        visible={customTimeVisible}
        transparent
        animationType="none"
        onRequestClose={() => setCustomTimeVisible(false)}
      >
        <View style={styles.customModalOverlay}>
          <View style={[styles.customModalContent, { width: contentWidth, borderRadius: scale(20), padding: spacing(20) }]}>
            <Text style={[styles.customModalTitle, { fontSize: ms(18), marginBottom: vscale(12) }]}>Select a time</Text>
            {customTimeOptions.map((option) => {
              const isSelected = selectedTime === option.label;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.customOption,
                    { paddingVertical: vscale(10), borderRadius: scale(12), marginBottom: vscale(8), borderWidth: scale(1) },
                    isSelected && styles.customOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedTime(option.label);
                    setCustomTimeVisible(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select time: ${option.label}`}
                >
                  <Text style={[styles.customOptionText, { fontSize: ms(14) }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
            <Button
              title="Close"
              onPress={() => setCustomTimeVisible(false)}
              variant="white"
              fullWidth
              style={{ marginTop: vscale(4) }}
              icon={<Icon name="close" size={scale(18)} color="#2C3E50" />}
              accessibilityLabel="Close time picker"
            />
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  titleSection: {
    alignItems: 'flex-start',
  },

  mainTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  subtitle: {
    fontWeight: '400',
    color: '#666666',
  },

  inputContainer: {
    position: 'relative',
  },

  textInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    textAlignVertical: 'top',
    color: '#2C3E50',
  },

  charCount: {
    position: 'absolute',
    color: '#999999',
  },

  timeSection: {
  },

  timeSectionTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },

  timeButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  timeButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
  },

  timeButtonActive: {
    borderColor: '#DC5C69',
    backgroundColor: '#FFF5F5',
  },

  timeButtonText: {
    color: '#2C3E50',
  },

  timeButtonTextActive: {
    color: '#DC5C69',
    fontWeight: '600',
  },

  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  locationIconContainer: {
    justifyContent: 'flex-start',
  },

  locationContent: {
    flex: 1,
  },

  locationTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },

  locationSubtext: {
    color: '#666666',
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9F2',
    borderColor: '#FFE4C7',
  },

  warningContent: {
    flex: 1,
  },

  warningText: {
    fontWeight: '600',
    color: '#92400E',
  },

  warningSubtext: {
    color: '#92400E',
  },

  bottomSpacer: {
  },

  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  customModalContent: {
    backgroundColor: '#FFFFFF',
  },

  customModalTitle: {
    fontWeight: '600',
    color: '#111827',
  },

  customOption: {
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },

  customOptionSelected: {
    borderColor: '#DC5C69',
    backgroundColor: '#FFF5F5',
  },

  customOptionText: {
    color: '#111827',
  },
});

export default AddDetailsScreen;
