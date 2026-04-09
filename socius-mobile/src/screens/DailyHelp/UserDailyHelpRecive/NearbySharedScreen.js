import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { useResponsive } from '../../../utils/responsive';
import { sociusRefreshProps, useStaticPullRefresh } from '../../../utils/sociusRefreshControl';

const NearbySharedScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { refreshing, onRefresh } = useStaticPullRefresh();
  const handleViewDetails = () => navigation.navigate('ViewDetailsIgnore');
  const handleDismiss = () => navigation.goBack();
  const handleSetNotAvailable = () => navigation.navigate('Availability');

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ padding: 8 }}>
            <Icon name="cog" size={24} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: 1, borderBottomColor: '#E8EAED' }}
      />
      <ScrollView 
        contentContainerStyle={[styles.scroll, { 
          paddingHorizontal: spacing(20),
          paddingTop: vscale(20),
          paddingBottom: vscale(60),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...sociusRefreshProps} />}
      >
        <View style={{ width: contentWidth }}>
          <View style={[styles.bannerCard, { 
            borderRadius: scale(16),
            borderWidth: scale(1),
            paddingHorizontal: spacing(14),
            paddingVertical: vscale(14),
            marginBottom: vscale(16),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <Text style={[styles.bannerTitle, { fontSize: ms(16), marginBottom: vscale(10) }]}>Someone Nearby Shared Awareness</Text>
            <View style={[styles.bannerDivider, { height: scale(1), marginVertical: vscale(4) }]} />
            <Text style={[styles.bannerSubtitle, { fontSize: ms(12) }]}>You are seeing this because you are available.</Text>
          </View>

          <View style={[styles.sharedInfoCard, { 
            borderRadius: scale(16),
            borderWidth: scale(1),
            paddingHorizontal: spacing(14),
            paddingVertical: vscale(14),
            marginBottom: vscale(16),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <Text style={[styles.cardHeaderLabel, { fontSize: ms(13), marginBottom: vscale(10) }]}>Shared information</Text>
            <View style={[styles.infoItemCard, { 
              borderRadius: scale(12),
              borderWidth: scale(1),
              paddingHorizontal: spacing(12),
              paddingVertical: vscale(12),
              shadowOffset: { width: 0, height: vscale(2) },
              shadowRadius: scale(6),
              elevation: scale(2)
            }]}>
              <Text style={[styles.infoMainText, { fontSize: ms(15), marginBottom: vscale(6) }]}>Needs a quick printout near the bus stop</Text>
              <Text style={[styles.infoSubText, { fontSize: ms(12) }]}>Location shared voluntarily</Text>
            </View>
          </View>

          <Text style={[styles.guidanceLine, { fontSize: ms(12), marginBottom: vscale(8) }]}>You are not required to respond.</Text>
          <Text style={[styles.guidanceLine, { fontSize: ms(12), marginBottom: vscale(8) }]}>Only proceed if you feel safe and comfortable.</Text>

          <Button title="View Details" onPress={handleViewDetails} variant="gradient" size="large" fullWidth />
          <Button title="Dismiss" onPress={handleDismiss} variant="white" size="large" fullWidth />
          <Button title="Set Not Available" onPress={handleSetNotAvailable} variant="white" size="large" fullWidth textStyle={{ color: '#E85555' }} />

          <View style={[styles.footerNote, { marginTop: vscale(8) }]}>
            <Text style={[styles.footerNoteText, { fontSize: ms(12) }]}>Socius does not instruct action or intervention.</Text>
            <Text style={[styles.footerNoteText, { fontSize: ms(12) }]}>What you do is entirely your choice.</Text>
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
  scroll: {
    flexGrow: 1,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  bannerTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  bannerDivider: {
    backgroundColor: '#E8EAED',
  },
  bannerSubtitle: {
    color: '#666666',
    textAlign: 'center',
  },
  sharedInfoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  cardHeaderLabel: {
    fontWeight: '700',
    color: '#999999',
    textTransform: 'none',
  },
  infoItemCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  infoMainText: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  infoSubText: {
    color: '#666666',
  },
  guidanceLine: {
    color: '#666666',
    textAlign: 'center',
  },
  footerNote: {
    alignItems: 'center',
  },
  footerNoteText: {
    color: '#999999',
    textAlign: 'center',
  },
});

export default NearbySharedScreen;

