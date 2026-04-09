import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

const CommunityGuidelinesScreen = ({ navigation }) => {
  const guidelines = [
    {
      icon: 'heart',
      color: '#E57373',
      title: 'No Hate or Harassment',
      content: 'Socius does not tolerate hate or harassment of any kind. You must not target or stereotype people based on religion, caste, gender, ethnicity, language, or belief. This platform is neutral and inclusive by design.'
    },
    {
      icon: 'hand-peace',
      color: '#BA68C8',
      title: 'No Moral Policing',
      content: 'Socius is not a place to enforce personal, cultural, or religious beliefs. You must not judge how people dress, speak, or live, or shame or "correct" others. People deserve dignity, not supervision.'
    },
    {
      icon: 'handshake',
      color: '#64B5F6',
      title: 'No Confrontation',
      content: 'Socius does not support confrontation. You must not threaten or challenge others, physically block, follow, or surround anyone. Calm presence means de-escalation, not dominance.'
    },
    {
      icon: 'eye-off',
      color: '#4DB6AC',
      title: 'Respect Privacy',
      content: 'Privacy is fundamental. You must not record, photograph, or film people without consent. You must not share names, faces, phone numbers, or addresses. What happens through Socius stays private.'
    },
    {
      icon: 'shield-alert',
      color: '#FFB74D',
      title: 'No Misuse',
      content: 'You must not share false or misleading information, trigger alerts as a joke, or use the platform to settle personal disputes. Misuse damages trust and safety for everyone.'
    },
    {
      icon: 'shield-check',
      color: '#81C784',
      title: 'Safety First',
      content: 'Your safety matters. Do not put yourself in danger. Disengage if a situation escalates. Contact emergency services independently if needed. Socius does not expect heroics.'
    },
    {
      icon: 'account-off',
      color: '#90A4AE',
      title: 'Respect Choice',
      content: 'Everyone has the right to ignore alerts, decline involvement, or leave at any time. No one owes participation.'
    },
    {
      icon: 'flag',
      color: '#F06292',
      title: 'Report Responsibly',
      content: 'If you experience misuse, harassment, or boundary violations, use the in-app reporting tools. Do not confront or retaliate.'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Community Guidelines" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 1, borderBottomColor: '#E8EAED' }}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Icon name="account-group" size={40} color={COLORS.PRIMARY} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Socius Community Guidelines</Text>
          <Text style={styles.heroSubtitle}>
            Socius exists to help people feel less alone, more aware, and calmer in moments of concern.
          </Text>
        </View>

        {/* Core Principle */}
        <View style={styles.principleCard}>
          <View style={styles.principleHeader}>
            <Icon name="sprout" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.principleTitle}>Core Principle</Text>
          </View>
          <Text style={styles.principleText}>
            "Socius is about awareness and presence, not control or judgment."
          </Text>
          <Text style={styles.principleSubtext}>
            If something encourages fear, aggression, or domination, it does not belong here.
          </Text>
        </View>

        {/* Guidelines Grid */}
        <Text style={styles.sectionTitle}>Guidelines</Text>
        
        <View style={styles.grid}>
          {guidelines.map((item, index) => (
            <View key={index} style={styles.card}>
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <Icon name={item.icon} size={28} color={item.color} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardContent}>{item.content}</Text>
            </View>
          ))}
        </View>

        {/* Consequences Section */}
        <View style={styles.consequencesCard}>
          <View style={styles.consequencesHeader}>
            <Icon name="gavel" size={24} color="#FF6B6B" />
            <Text style={styles.consequencesTitle}>Consequences</Text>
          </View>
          <Text style={styles.consequencesText}>
            Violations of these guidelines may result in warnings, temporary suspension, or permanent removal from the platform. These actions are taken to protect the community, not to punish.
          </Text>
        </View>

        {/* Final Note */}
        <View style={styles.finalNoteCard}>
          <Icon name="format-quote-open" size={20} color={COLORS.PRIMARY} style={styles.quoteIcon} />
          <Text style={styles.finalNoteText}>
            Socius works only when people act with restraint, empathy, and responsibility.
          </Text>
          <Text style={styles.finalNoteSubtext}>
            This is a space for calm humans, not loud authority.
          </Text>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C84D59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  principleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  principleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  principleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginLeft: 8,
  },
  principleText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.PRIMARY,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 8,
  },
  principleSubtext: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  cardContent: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  consequencesCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  consequencesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  consequencesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  consequencesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  finalNoteCard: {
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
    alignItems: 'center',
  },
  quoteIcon: {
    marginBottom: 12,
  },
  finalNoteText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A2E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  finalNoteSubtext: {
    fontSize: 13,
    color: COLORS.PRIMARY,
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default CommunityGuidelinesScreen;
