import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../components/common/Header';
import { useResponsive } from '../../../utils/responsive';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../../../components/common/Button';

const BeingFollowedScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [note, setNote] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Being Followed" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED', paddingVertical: vscale(8) }}
      />
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { 
          paddingHorizontal: spacing(20),
          paddingTop: vscale(20),
          paddingBottom: vscale(40),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          <View style={[styles.card, { borderRadius: scale(20), paddingHorizontal: spacing(16), paddingVertical: vscale(16), marginBottom: vscale(16), borderWidth: scale(1), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(8), elevation: scale(2) }]}>
            <Text style={[styles.label, { fontSize: ms(13), marginBottom: vscale(8) }]}>Add one line <Text style={{ color: '#999999' }}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, { borderRadius: scale(14), paddingHorizontal: spacing(14), paddingVertical: vscale(12), minHeight: vscale(48), fontSize: ms(14), borderWidth: scale(1), marginBottom: vscale(6) }]}
              placeholder="Anything helpful others should know (optional)"
              placeholderTextColor="#AAAAAA"
              value={note}
              onChangeText={setNote}
              multiline
            />
            <Text style={[styles.helper, { fontSize: ms(12) }]}>Keep it short. Do not include names or accusations.</Text>
          </View>

          <View style={[styles.card, { borderRadius: scale(20), paddingHorizontal: spacing(16), paddingVertical: vscale(16), marginBottom: vscale(16), borderWidth: scale(1), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(8), elevation: scale(2) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(8) }}>
              <Icon name="map-marker" size={scale(18)} color="#DC5C69" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.label, { fontSize: ms(13) }]}>Share your current location</Text>
            </View>
            <Text style={[styles.subtext, { fontSize: ms(12), marginBottom: vscale(12) }]}>Only with people who choose to view this request.</Text>
            <View style={[styles.locationPill, { borderRadius: scale(12), paddingVertical: vscale(12), paddingHorizontal: spacing(14), borderWidth: scale(1) }]}>
              <Text style={[styles.locationText, { fontSize: ms(14) }]}>Near Oakwood Ave</Text>
            </View>
          </View>

          <View style={[styles.infoCard, { borderRadius: scale(16), paddingHorizontal: spacing(16), paddingVertical: vscale(16), marginBottom: vscale(20), borderWidth: scale(1), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(8), elevation: scale(2) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Icon name="file-document-outline" size={scale(22)} color="#DC5C69" style={{ marginRight: spacing(12), marginTop: vscale(2) }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { fontSize: ms(14), marginBottom: vscale(4) }]}>You're sharing information voluntarily.</Text>
                <Text style={[styles.infoText, { fontSize: ms(12) }]}>Nothing is sent until you confirm.{"\n"}You can cancel at any time.</Text>
              </View>
            </View>
          </View>

          <Button
            title="Share Presence Request"
            onPress={() => navigation.navigate('CreateAwareness', { category: 'being_followed', note })}
            variant="gradient"
            fullWidth
          />

          <View style={{ alignItems: 'center', marginTop: vscale(16) }}>
            <View style={[styles.divider, { height: scale(1), marginBottom: vscale(10) }]} />
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.cancelText, { fontSize: ms(14) }]}>Cancel and go back</Text>
            </TouchableOpacity>
          </View>
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
  card: {
    backgroundColor: '#FDFDFD',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  label: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E4E8',
    color: '#2C3E50',
  },
  helper: {
    color: '#888888',
  },
  subtext: {
    color: '#888888',
  },
  locationPill: {
    backgroundColor: '#F6F7F9',
    borderColor: '#E1E4E8',
  },
  locationText: {
    color: '#2C3E50',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#FFF5F6',
    borderColor: '#FEE8EA',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  infoTitle: {
    color: '#2C3E50',
    fontWeight: '600',
  },
  infoText: {
    color: '#666666',
    fontWeight: '400',
  },
  divider: {
    backgroundColor: '#E8EAED',
    width: '100%',
  },
  cancelText: {
    color: '#777777',
    textDecorationLine: 'underline',
  },
});

export default BeingFollowedScreen;
