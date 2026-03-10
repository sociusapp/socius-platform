import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

const ReportConcernScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const reasons = [
    { label: 'Felt uncomfortable or unsafe', icon: 'emoticon-sad-outline' },
    { label: 'Personal boundaries crossed', icon: 'account-off-outline' },
    { label: 'Misuse of the platform', icon: 'alert-octagon-outline' },
    { label: 'False or unnecessary request', icon: 'alert-circle-outline' },
    { label: 'Something else', icon: 'comment-question-outline' },
  ];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [details, setDetails] = useState('');

  const handleSubmit = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Report a Concern" onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(16), paddingTop: vscale(12), paddingBottom: vscale(24) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Text style={[styles.subtitleText, { fontSize: ms(13), marginBottom: vscale(12) }]}>
            Share any concerns about this interaction so we can improve safety and fairness.
          </Text>

          <View style={[styles.listContainer, { marginBottom: vscale(12), gap: vscale(10) }]}>
            {reasons.map((item, idx) => {
              const selected = selectedIndex === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.reasonRow, selected && styles.reasonRowSelected, { borderRadius: scale(14), borderWidth: scale(1), paddingHorizontal: spacing(12), paddingVertical: vscale(12), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(8), elevation: scale(2) }]}
                  onPress={() => setSelectedIndex(idx)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.reasonIconCircle, { width: scale(34), height: scale(34), borderRadius: scale(17), marginRight: spacing(12) }]}>
                    <Icon name={item.icon} size={scale(22)} color="#5A6F7D" />
                  </View>
                  <Text style={[styles.reasonLabel, selected && styles.reasonLabelSelected, { fontSize: ms(14) }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.inputCard, { borderRadius: scale(14), borderWidth: scale(1), paddingHorizontal: spacing(12), paddingVertical: vscale(10), marginBottom: vscale(12), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(8), elevation: scale(2) }]}>
            <TextInput
              style={[styles.input, { fontSize: ms(14), minHeight: vscale(44) }]}
              placeholder="Add details (optional)"
              placeholderTextColor="#999999"
              value={details}
              onChangeText={setDetails}
              multiline
            />
            <Text style={[styles.inputHint, { fontSize: ms(12), marginTop: vscale(6) }]}>
              Do not include sensitive personal information.
            </Text>
          </View>

          <View style={[styles.infoCard, { borderRadius: scale(14), borderWidth: scale(1), paddingHorizontal: spacing(12), paddingVertical: vscale(10), marginBottom: vscale(16) }]}>
            <View style={[styles.infoRow, { gap: spacing(8) }]}>
              <Icon name="information" size={scale(20)} color="#666666" />
              <Text style={[styles.infoText, { fontSize: ms(12), lineHeight: ms(18) }]}>
                Reports are reviewed after incidents are closed. They are not monitored in real time.
              </Text>
            </View>
          </View>

          <Button
            title="Submit Report"
            onPress={handleSubmit}
            variant="primary"
            fullWidth
            style={[styles.submitButton, { borderRadius: scale(26), paddingVertical: vscale(12), marginBottom: vscale(10) }]}
          />

          <Text style={[styles.footerNote, { fontSize: ms(12) }]}>
            Reports help improve safety and accountability.
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
  subtitleText: {
    color: '#666666',
    textAlign: 'left',
  },
  listContainer: {
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  reasonRowSelected: {
    borderColor: '#DC5C69',
  },
  reasonIconCircle: {
    backgroundColor: '#F2F7F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonLabel: {
    color: '#2C3E50',
    flex: 1,
  },
  reasonLabelSelected: {
    fontWeight: '700',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  input: {
    color: '#2C3E50',
  },
  inputHint: {
    color: '#999999',
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    color: '#666666',
    flex: 1,
  },
  submitButton: {
  },
  footerNote: {
    color: '#999999',
    textAlign: 'center',
  },
});

export default ReportConcernScreen;
