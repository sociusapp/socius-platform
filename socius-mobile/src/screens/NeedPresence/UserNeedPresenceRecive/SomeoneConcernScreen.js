import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../components/common/Header';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../utils/responsive';
import { acceptPresence } from '../../../services/api/incident.api';
import { loadAuth, saveActivePresenceAssignmentId } from '../../../services/storage/asyncStorage.service';
import CustomAlert from '../../../components/common/CustomAlert';

const SomeoneConcernScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { requestId, situation, distanceMeters, area } = route?.params || {};

  const [isLoading, setIsLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'alert-circle-outline',
    iconColor: '#DC5C69'
  });

  const showAlert = (title, message, buttons = [], icon = 'alert-circle-outline', iconColor = '#DC5C69') => {
    setAlertConfig({ title, message, buttons, icon, iconColor });
    setAlertVisible(true);
  };

  const closeAlert = () => setAlertVisible(false);

  const handleAccept = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token) return;

      const response = await acceptPresence(token, requestId);
      if (!response?.success) {
        showAlert('Unable to continue', response?.message || 'This request may no longer be active.', [{ text: 'OK', onPress: closeAlert }]);
        return;
      }
      
      await saveActivePresenceAssignmentId(requestId).catch(() => {});
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'NearbyMap', params: { requestId, mode: 'helper', lockBack: true } }],
      });
    } catch (error) {
      console.log('Error accepting presence:', error);
      showAlert('Error', 'Something went wrong. Please try again.', [{ text: 'OK', onPress: closeAlert }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Header 
        title="" 
        onBackPress={() => navigation.goBack()}
        style={[styles.header, { paddingHorizontal: spacing(16) }]}
        titleStyle={[styles.headerTitle, { fontSize: ms(18) }]}
      />
      
      <ScrollView contentContainerStyle={[styles.scrollContent, { padding: spacing(20), paddingBottom: vscale(40) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {/* Main Alert Card */}
          <View style={[styles.alertCard, { borderRadius: scale(16), padding: spacing(16), marginBottom: vscale(24), shadowRadius: scale(4), elevation: scale(2), borderWidth: scale(1) }]}>
            <View style={[styles.cardHeaderRow, { marginBottom: vscale(8) }]}>
              <Icon name="information" size={scale(24)} color="#A93226" style={[styles.icon, { marginRight: spacing(10) }]} />
              <Text style={[styles.cardTitle, { fontSize: ms(16) }]}>Someone nearby shared a concern</Text>
            </View>
            
            <Text style={[styles.cardSubtitle, { fontSize: ms(13), marginBottom: vscale(12), lineHeight: vscale(18) }]}>
              This is an awareness alert. You are not required to respond.
            </Text>
            
            <View style={[styles.divider, { height: scale(1), marginBottom: vscale(12) }]} />
            
            <View style={[styles.detailRow, { marginBottom: vscale(8) }]}>
              <Text style={[styles.detailLabel, { fontSize: ms(14), width: spacing(130) }]}>Situation:</Text>
              <Text style={[styles.detailValue, { fontSize: ms(14), lineHeight: vscale(20) }]}>{situation || 'Safety concern'}</Text>
            </View>
            
            <View style={[styles.detailRow, { marginBottom: vscale(8) }]}>
              <Text style={[styles.detailLabel, { fontSize: ms(14), width: spacing(130) }]}>Approximate area:</Text>
              <Text style={[styles.detailValue, { fontSize: ms(14), lineHeight: vscale(20) }]}>{area || (distanceMeters ? `Within ~${distanceMeters} m` : 'Nearby')}</Text>
            </View>
          </View>

          {/* Action Prompt */}
          <Text style={[styles.promptText, { fontSize: ms(15), marginBottom: vscale(16), lineHeight: vscale(22) }]}>
            If you are nearby and feel safe, you may choose to be aware.
          </Text>

          {/* Action Buttons */}
          <View style={[styles.buttonRow, { marginBottom: vscale(32), gap: spacing(16) }]}>
            <TouchableOpacity 
              style={[styles.viewDetailsButton, { paddingVertical: vscale(12), borderRadius: scale(25), borderWidth: scale(1), shadowRadius: scale(2), elevation: scale(1) }]}
              onPress={handleAccept}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#2C3E50" /> : <Text style={[styles.viewDetailsText, { fontSize: ms(15) }]}>I'm Aware</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.ignoreButton, { paddingVertical: vscale(12), borderRadius: scale(25), borderWidth: scale(1), shadowRadius: scale(2), elevation: scale(1) }]}
              onPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
                })
              }
              disabled={isLoading}
            >
              <Text style={[styles.ignoreText, { fontSize: ms(15) }]}>Ignore</Text>
            </TouchableOpacity>
          </View>

          {/* Reminder Card */}
          <View style={[styles.reminderCard, { borderRadius: scale(16), padding: spacing(16), marginBottom: vscale(24), borderWidth: scale(1), shadowRadius: scale(2), elevation: scale(1) }]}>
            <View style={[styles.cardHeaderRow, { marginBottom: vscale(8) }]}>
              <Icon name="alert-circle" size={scale(24)} color="#A93226" style={[styles.icon, { marginRight: spacing(10) }]} />
              <Text style={[styles.reminderTitle, { fontSize: ms(16) }]}>Reminder</Text>
            </View>
            
            <View style={[styles.divider, { height: scale(1), marginBottom: vscale(12) }]} />
            
            <View style={[styles.bulletList, { marginTop: vscale(4) }]}>
              <View style={[styles.bulletItem, { marginBottom: vscale(6) }]}>
                <Text style={[styles.bulletPoint, { fontSize: ms(18), marginRight: spacing(8), lineHeight: vscale(22) }]}>•</Text>
                <Text style={[styles.bulletText, { fontSize: ms(14), lineHeight: vscale(22) }]}>Participation is voluntary.</Text>
              </View>
              <View style={[styles.bulletItem, { marginBottom: vscale(6) }]}>
                <Text style={[styles.bulletPoint, { fontSize: ms(18), marginRight: spacing(8), lineHeight: vscale(22) }]}>•</Text>
                <Text style={[styles.bulletText, { fontSize: ms(14), lineHeight: vscale(22) }]}>Do not confront anyone.</Text>
              </View>
              <View style={[styles.bulletItem, { marginBottom: vscale(6) }]}>
                <Text style={[styles.bulletPoint, { fontSize: ms(18), marginRight: spacing(8), lineHeight: vscale(22) }]}>•</Text>
                <Text style={[styles.bulletText, { fontSize: ms(14), lineHeight: vscale(22) }]}>Do not place yourself at risk.</Text>
              </View>
              <View style={[styles.bulletItem, { marginBottom: vscale(6) }]}>
                <Text style={[styles.bulletPoint, { fontSize: ms(18), marginRight: spacing(8), lineHeight: vscale(22) }]}>•</Text>
                <Text style={[styles.bulletText, { fontSize: ms(14), lineHeight: vscale(22) }]}>Contact authorities if needed.</Text>
              </View>
            </View>
          </View>

          <View style={styles.spacer} />
          
          <Text style={[styles.footerText, { fontSize: ms(12) }]}>
            Socius does not coordinate responses or interventions.
          </Text>
        </View>
      </ScrollView>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    color: '#5D6D7E',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  alertCard: {
    backgroundColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    borderColor: '#F0F0F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
  },
  cardTitle: {
    fontWeight: '700',
    color: '#4A5568',
    flex: 1,
  },
  cardSubtitle: {
    color: '#718096',
  },
  divider: {
    backgroundColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontWeight: '700',
    color: '#4A5568',
  },
  detailValue: {
    color: '#4A5568',
    flex: 1,
  },
  promptText: {
    color: '#4A5568',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewDetailsButton: {
    flex: 1,
    borderColor: '#D0D3D4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
  },
  viewDetailsText: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  ignoreButton: {
    flex: 1,
    borderColor: '#E6B0AA', // Light red border
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
  },
  ignoreText: {
    fontWeight: '600',
    color: '#A93226', // Red text
  },
  reminderCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
  },
  reminderTitle: {
    fontWeight: '700',
    color: '#4A5568',
  },
  bulletList: {
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletPoint: {
    color: '#4A5568',
  },
  bulletText: {
    color: '#4A5568',
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  footerText: {
    color: '#718096',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default SomeoneConcernScreen;
