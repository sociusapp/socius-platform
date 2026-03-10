import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../utils/responsive';
import Button from '../../components/common/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateProfile, upsertEmergencyContacts } from '../../services/api/user.api';
import { loadAuth } from '../../services/storage/asyncStorage.service';

const EmergencyContactsScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const fromProfile = !!route?.params?.fromProfile;
  const initialContacts = Array.isArray(route?.params?.initialContacts)
    ? route.params.initialContacts
    : null;
  const [contacts, setContacts] = useState([
    { id: 1, name: '', phone: '', relationship: '' }
  ]);

  useEffect(() => {
    if (!initialContacts) return;
    const mapped = initialContacts.map((c, idx) => ({
      id: c?.id || c?._id || `${Date.now()}_${idx}`,
      name: c?.name || '',
      phone: c?.phone || '',
      relationship: c?.relationship || '',
    }));
    setContacts(mapped.length ? mapped : [{ id: 1, name: '', phone: '', relationship: '' }]);
  }, [initialContacts]);

  const addContact = () => {
    setContacts([...contacts, { id: Date.now(), name: '', phone: '', relationship: '' }]);
  };

  const removeContact = (id) => {
    setContacts(contacts.filter(contact => contact.id !== id));
  };

  const updateContact = (id, field, value) => {
    setContacts(contacts.map(contact =>
      contact.id === id ? { ...contact, [field]: value } : contact
    ));
  };

  const [isLoading, setIsLoading] = useState(false);
  const handleSaveContinue = async () => {
    try {
      setIsLoading(true);
      const filtered = contacts
        .map(c => ({
          name: c.name?.trim() || '',
          phone: c.phone?.trim() || '',
          relationship: c.relationship?.trim() || '',
        }))
        .filter(c => c.name && c.phone);

      const { accessToken } = await loadAuth();
      if (!accessToken) {
        Alert.alert('Error', 'Session expired. Please login again.');
        setIsLoading(false);
        return;
      }

      let response = null;
      try {
        response = await upsertEmergencyContacts(accessToken, filtered);
      } catch (e) {
        const payload = { emergencyContacts: filtered, emergency_contacts: filtered };
        response = await updateProfile(accessToken, payload);
      }
      const { success, message } = response || {};
      if (!success) {
        Alert.alert('Error', message || 'Failed to save contacts.');
        setIsLoading(false);
        return;
      }
      try {
        await AsyncStorage.setItem('USER_EMERGENCY_CONTACTS', JSON.stringify(filtered));
      } catch (e) { }


      if (fromProfile) {
        navigation.goBack();
      } else {
        try {
          await AsyncStorage.setItem('HAS_COMPLETED_ONBOARDING', 'true');
        } catch (e) { }

        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
        });
      }
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;
      Alert.alert('Connection error', apiMessage || 'We could not save your contacts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(16), paddingTop: vscale(35), paddingBottom: vscale(30) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Logo Header */}
          <View style={[styles.logoSection, { marginBottom: vscale(16) }]}>
            <Image
              source={require('../../assets/icons/icon-03.png')}
              style={{ width: scale(32), height: scale(32), resizeMode: 'contain', marginRight: spacing(8) }}
            />
            <Text style={[styles.logoText, { fontSize: ms(24) }]}>Socius</Text>
          </View>

          {/* Divider */}
          <View style={[styles.headerDivider, { height: scale(1), marginBottom: vscale(28) }]} />

          {/* Title Section */}
          <View style={[styles.titleSection, { marginBottom: vscale(24) }]}>
            <Text style={[styles.mainTitle, { fontSize: ms(26), lineHeight: ms(32), marginBottom: vscale(8) }]}>Emergency Contacts</Text>
            <Text style={[styles.subtitle, { fontSize: ms(15), lineHeight: ms(22) }]}>People we can notify if you choose escalation</Text>
          </View>

          {contacts.map((contact, index) => (
            <View key={contact.id} style={[styles.contactsCard, {
              borderRadius: scale(20),
              paddingHorizontal: spacing(16),
              paddingVertical: vscale(14),
              marginBottom: vscale(14),
              borderWidth: scale(1),
              shadowOffset: { width: 0, height: vscale(2) },
              shadowRadius: scale(8),
              elevation: scale(3)
            }]}>
              {index > 0 && (
                <View style={[styles.cardHeader, { marginBottom: vscale(8) }]}>
                  <TouchableOpacity
                    style={[styles.removeContactButton, {
                      width: scale(28),
                      height: scale(28),
                      borderRadius: scale(14),
                      borderWidth: scale(1),
                      shadowOffset: { width: 0, height: vscale(2) },
                      shadowRadius: scale(6),
                      elevation: scale(2)
                    }]}
                    onPress={() => removeContact(contact.id)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Icon name="close" size={scale(18)} color="#777777" />
                  </TouchableOpacity>
                </View>
              )}
              <TextInput
                style={[styles.input, { borderRadius: scale(12), paddingHorizontal: spacing(14), paddingVertical: vscale(12), fontSize: ms(14), height: vscale(45), marginBottom: vscale(10), borderWidth: scale(1) }]}
                placeholder="Contact name"
                placeholderTextColor="#AAAAAA"
                value={contact.name}
                onChangeText={(text) => updateContact(contact.id, 'name', text)}
              />
              <TextInput
                style={[styles.input, { borderRadius: scale(12), paddingHorizontal: spacing(14), paddingVertical: vscale(12), fontSize: ms(14), height: vscale(45), marginBottom: vscale(10), borderWidth: scale(1) }]}
                placeholder="Phone number"
                placeholderTextColor="#AAAAAA"
                keyboardType="phone-pad"
                value={contact.phone}
                onChangeText={(text) => updateContact(contact.id, 'phone', text)}
              />
              <TextInput
                style={[styles.input, styles.lastInput, { borderRadius: scale(12), paddingHorizontal: spacing(14), paddingVertical: vscale(12), fontSize: ms(14), height: vscale(45), borderWidth: scale(1) }]}
                placeholder="Relationship (optional)"
                placeholderTextColor="#AAAAAA"
                value={contact.relationship}
                onChangeText={(text) => updateContact(contact.id, 'relationship', text)}
              />
            </View>
          ))}

          {/* Add Another Contact Button */}
          <TouchableOpacity style={[styles.addContactButton, {
            borderRadius: scale(18),
            paddingVertical: vscale(12),
            paddingHorizontal: spacing(16),
            marginBottom: vscale(18),
            gap: spacing(8),
            borderWidth: scale(1)
          }]} onPress={addContact}>
            <Icon name="plus" size={scale(18)} color="#2C3E50" />
            <Text style={[styles.addContactText, { fontSize: ms(15) }]}>Add another contact</Text>
          </TouchableOpacity>

          {/* Info Card */}
          <View style={[styles.infoCard, {
            borderRadius: scale(16),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(14),
            marginBottom: vscale(24),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(8),
            elevation: scale(3)
          }]}>
            <Text style={[styles.infoText, { fontSize: ms(13), lineHeight: ms(20), marginBottom: vscale(8) }]}>
              These contacts are notified only if you choose to escalate a situation.
            </Text>
            <Text style={[styles.infoText, { fontSize: ms(13), lineHeight: ms(20) }]}>
              Socius does not notify them automatically.
            </Text>
          </View>

          {/* Save Button */}
          <Button
            title="Save & Continue"
            onPress={handleSaveContinue}
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={isLoading}
          />

          {/* Footer Text */}
          <Text style={[styles.footerText, { fontSize: ms(13), lineHeight: ms(20) }]}>
            You can update or remove contacts at any time.
          </Text>
        </View>
      </ScrollView>
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

  // ===== LOGO SECTION =====
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoIcon: {
  },

  logoText: {
    fontWeight: '600',
    color: '#999999',
  },

  // ===== HEADER DIVIDER =====
  headerDivider: {
    backgroundColor: '#E8EAED',
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
    color: '#888888',
    textAlign: 'center',
  },

  // ===== CONTACTS CARD =====
  contactsCard: {
    backgroundColor: '#FDFDFD',
    borderColor: '#E1E4E8',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
  },

  cardHeader: {
    alignItems: 'flex-end',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E4E8',
    fontWeight: '400',
    color: '#2C3E50',
  },

  lastInput: {
    marginBottom: 0,
  },

  removeContactButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E4E8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  // ===== ADD CONTACT BUTTON =====
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDFDFD',
    borderColor: '#E1E4E8',
  },

  addContactText: {
    fontWeight: '500',
    color: '#2C3E50',
  },

  // ===== INFO CARD =====
  infoCard: {
    backgroundColor: '#FDFDFD',
    borderColor: '#E1E4E8',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  infoText: {
    fontWeight: '400',
    color: '#555555',
  },

  // ===== FOOTER TEXT =====
  footerText: {
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
  },
});

export default EmergencyContactsScreen;
