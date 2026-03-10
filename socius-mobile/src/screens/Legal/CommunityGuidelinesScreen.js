import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/common/Header';
import StaticPageViewer from '../../components/common/StaticPageViewer';
import { useResponsive } from '../../utils/responsive';

const CommunityGuidelinesScreen = ({ navigation }) => {
  const { scale } = useResponsive();

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Community Guidelines" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <View style={styles.contentContainer}>
        <StaticPageViewer slug="community-guidelines" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});

export default CommunityGuidelinesScreen;
