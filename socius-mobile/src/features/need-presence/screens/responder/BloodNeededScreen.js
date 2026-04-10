import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../../utils/responsive';

const BloodNeededScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Header 
        title="Blood Needed" 
        onBackPress={() => navigation.goBack()}
        style={[styles.header, { paddingHorizontal: spacing(16) }]}
        titleStyle={[styles.headerTitle, { fontSize: ms(18) }]}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing(20), paddingTop: vscale(20), paddingBottom: vscale(40) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <View style={[styles.iconContainer, { marginBottom: vscale(24) }]}>
            <Icon name="water" size={scale(80)} color="#E74C3C" />
          </View>

          <Text style={[styles.title, { fontSize: ms(24), marginBottom: vscale(12) }]}>Emergency Blood Needed</Text>
          <Text style={[styles.subtitle, { fontSize: ms(16), marginBottom: vscale(32) }]}>
            A request for blood donation has been shared with the community. If you can help, please proceed carefully.
          </Text>

          <View style={[styles.card, { padding: spacing(20), borderRadius: scale(16), marginBottom: vscale(24) }]}>
            <Text style={[styles.cardTitle, { fontSize: ms(18), marginBottom: vscale(12) }]}>How you can help</Text>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Icon name="check-circle" size={scale(18)} color="#2ECC71" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.bulletText, { fontSize: ms(14) }]}>Check if you match the required blood group.</Text>
            </View>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Icon name="check-circle" size={scale(18)} color="#2ECC71" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.bulletText, { fontSize: ms(14) }]}>Ensure you are in good health to donate.</Text>
            </View>
            <View style={[styles.bulletItem]}>
              <Icon name="check-circle" size={scale(18)} color="#2ECC71" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.bulletText, { fontSize: ms(14) }]}>Contact the requester for location details.</Text>
            </View>
          </View>

          <Button 
            title="I Can Help" 
            onPress={() => navigation.navigate('AwarenessShared')}
            style={{ borderRadius: scale(30), marginBottom: vscale(12) }}
          />
          <Button 
            title="I'm Not Available" 
            onPress={() => navigation.goBack()}
            variant="outline"
            style={{ borderRadius: scale(30) }}
          />
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
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  scroll: {
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  subtitle: {
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletText: {
    color: '#34495E',
    flex: 1,
  },
});

export default BloodNeededScreen;
