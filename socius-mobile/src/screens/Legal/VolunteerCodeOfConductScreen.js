import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import StaticPageViewer from '../../components/common/StaticPageViewer';
import { useResponsive } from '../../utils/responsive';

const FALLBACK_HTML = `<h1>Volunteer code of conduct</h1>
<p>Help with respect and clear boundaries. Do not harass, pressure, or take risks you cannot handle.</p>
<p>Follow community guidelines and local law. You may stop participating at any time.</p>`;

const VolunteerCodeOfConductScreen = ({ navigation, onAccept, onCancel }) => {
  const { ms, spacing, vscale, scale } = useResponsive();
  const [checkboxChecked, setCheckboxChecked] = useState(false);

  const handleAccept = () => {
    if (checkboxChecked) {
      const consentRecord = {
        type: 'volunteer_code',
        accepted: true,
        timestamp: new Date().toISOString(),
        version: 'v1.0',
      };

      if (onAccept) {
        onAccept(consentRecord);
      }
    }
  };

  const isAcceptanceMode = !!onAccept;

  return (
    <SafeAreaView style={styles.container}>
      {!isAcceptanceMode ? (
        <Header 
          title="Volunteer Code of Conduct" 
          onBackPress={() => navigation?.goBack()}
          style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
        />
      ) : (
        <View
          style={{
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(16),
            borderBottomWidth: scale(1),
            borderBottomColor: '#E8EAED',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: ms(18), fontWeight: '700', color: '#2C3E50' }}>
            Volunteer Agreement
          </Text>
          <Pressable onPress={onCancel} hitSlop={8}>
            <Icon name="close" size={scale(24)} color="#2C3E50" />
          </Pressable>
        </View>
      )}

      <View style={{ flex: 1, paddingHorizontal: isAcceptanceMode ? 0 : 16, paddingTop: 16 }}>
        {/* If in acceptance mode, maybe less padding or different layout */}
        <View style={{ flex: 1, paddingHorizontal: isAcceptanceMode ? 16 : 0 }}>
             <StaticPageViewer slug="volunteer-code-of-conduct" fallbackContent={FALLBACK_HTML} />
        </View>
      </View>

      {isAcceptanceMode && (
        <View style={[styles.footer, { padding: spacing(16), borderTopWidth: 1, borderTopColor: '#E8EAED' }]}>
          <Pressable
            onPress={() => setCheckboxChecked(!checkboxChecked)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: vscale(20),
            }}
          >
            <View
              style={{
                width: scale(22),
                height: scale(22),
                borderRadius: scale(6),
                borderWidth: scale(2),
                borderColor: checkboxChecked ? '#1976D2' : '#B0BEC5',
                backgroundColor: checkboxChecked ? '#1976D2' : '#FFFFFF',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing(10),
              }}
            >
              {checkboxChecked && <Icon name="check" size={scale(14)} color="#FFFFFF" />}
            </View>
            <Text style={{ fontSize: ms(13), color: '#455A64', flex: 1, lineHeight: ms(20) }}>
              I understand and agree to follow this Volunteer Code of Conduct.
            </Text>
          </Pressable>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Pressable
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: vscale(12),
                borderRadius: scale(8),
                borderWidth: scale(1),
                borderColor: '#CFD8DC',
                marginRight: spacing(8),
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Text style={{ fontSize: ms(14), color: '#607D8B', fontWeight: '500' }}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleAccept}
              disabled={!checkboxChecked}
              style={{
                flex: 1,
                paddingVertical: vscale(12),
                borderRadius: scale(8),
                backgroundColor: checkboxChecked ? '#1976D2' : '#B0BEC5',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: ms(14), color: '#FFFFFF', fontWeight: '600' }}>Accept & Continue</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default VolunteerCodeOfConductScreen;
