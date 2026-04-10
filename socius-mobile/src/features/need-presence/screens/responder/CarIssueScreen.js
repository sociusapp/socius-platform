import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../../utils/responsive';

const CarIssueScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Header 
        title="Vehicle Issue" 
        onBackPress={() => navigation.goBack()}
        style={[styles.header, { paddingHorizontal: spacing(16) }]}
        titleStyle={[styles.headerTitle, { fontSize: ms(18) }]}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing(20), paddingTop: vscale(20), paddingBottom: vscale(40) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <View style={[styles.iconContainer, { marginBottom: vscale(24) }]}>
            <Icon name="car-cog" size={scale(80)} color="#3498DB" />
          </View>

          <Text style={[styles.title, { fontSize: ms(24), marginBottom: vscale(12) }]}>Vehicle Assistance Needed</Text>
          <Text style={[styles.subtitle, { fontSize: ms(16), marginBottom: vscale(32) }]}>
            Someone nearby is experiencing vehicle issues. If you have mechanical knowledge or can offer assistance, please consider helping.
          </Text>

          <View style={[styles.card, { padding: spacing(20), borderRadius: scale(16), marginBottom: vscale(24) }]}>
            <Text style={[styles.cardTitle, { fontSize: ms(18), marginBottom: vscale(12) }]}>Safety Guidelines</Text>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Icon name="shield-check" size={scale(18)} color="#3498DB" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.bulletText, { fontSize: ms(14) }]}>Always prioritize your own safety first.</Text>
            </View>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Icon name="shield-check" size={scale(18)} color="#3498DB" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.bulletText, { fontSize: ms(14) }]}>Be aware of your surroundings while helping.</Text>
            </View>
            <View style={[styles.bulletItem]}>
              <Icon name="shield-check" size={scale(18)} color="#3498DB" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.bulletText, { fontSize: ms(14) }]}>Call professional help if the situation requires it.</Text>
            </View>
          </View>

          <Button 
            title="I'm Nearby and Can Help" 
            onPress={() => navigation.navigate('MultiplePeople')}
            style={{ borderRadius: scale(30), marginBottom: vscale(12) }}
          />
          <Button 
            title="Not Available" 
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

export default CarIssueScreen;
