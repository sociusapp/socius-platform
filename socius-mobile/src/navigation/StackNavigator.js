import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Bottom Tab Navigator
import BottomTabNavigator from './BottomTabNavigator';

// ==================== AUTH SCREENS ====================
import PhoneVerificationScreen from '../screens/Auth/PhoneVerificationScreen';
// import OTPScreen from '../screens/Auth/OTPScreen';
import OTPFormScreen from '../screens/Auth/OTPFormScreen';
import ProfileInfoScreen from '../screens/Auth/ProfileInfoScreen';
import VerificationReviewScreen from '../screens/Auth/VerificationReviewScreen';

// ==================== ONBOARDING SCREENS (16) ====================
import SplashScreen from '../screens/Onboarding/SplashScreen';
import WhatSociusIsScreen from '../screens/Onboarding/WhatSociusIsScreen';
import WhatSociusIsNotScreen from '../screens/Onboarding/WhatSociusIsNotScreen';
import PrinciplesScreen from '../screens/Onboarding/PrinciplesScreen';
import CommunityPrinciplesScreen from '../screens/Onboarding/CommunityPrinciplesScreen';
import ParticipationChoiceScreen from '../screens/Onboarding/ParticipationChoiceScreen';
import IdentityVerificationScreen from '../screens/Onboarding/IdentityVerificationScreen';
import BeforeContinueScreen from '../screens/Onboarding/BeforeContinueScreen';
import SubscriptionScreen from '../screens/Onboarding/SubscriptionScreen';
import ProfileReviewScreen from '../screens/Onboarding/ProfileReviewScreen';
import RequestReviewScreen from '../screens/Onboarding/RequestReviewScreen';
import VerificationAttentionScreen from '../screens/Onboarding/VerificationAttentionScreen';

// ==================== LEGAL / POLICY SCREENS ====================
import TermsOfUseScreen from '../screens/Legal/TermsOfUseScreen';
import PrivacyPolicyScreen from '../screens/Legal/PrivacyPolicyScreen';
import CommunityGuidelinesScreen from '../screens/Legal/CommunityGuidelinesScreen';
import VolunteerCodeOfConductScreen from '../screens/Legal/VolunteerCodeOfConductScreen';

// ==================== FIRST TIME USER SCREENS (5) ====================
import AvailabilityScreen from '../screens/FirstTime/AvailabilityScreen';
import AvailabilityRolesScreen from '../screens/FirstTime/AvailabilityRolesScreen';
import BeingAvailableScreen from '../screens/FirstTime/BeingAvailableScreen';
import PermissionScreen from '../screens/FirstTime/PermissionScreen';
import EmergencyContactsScreen from '../screens/FirstTime/EmergencyContactsScreen';

// ==================== GUIDE SCREENS (10) ====================
import YourRoleScreen from '../screens/Guide/YourRoleScreen';
import NoObligationScreen from '../screens/Guide/NoObligationScreen';
import SafetyFirstScreen from '../screens/Guide/SafetyFirstScreen';
import PublicSpacesScreen from '../screens/Guide/PublicSpacesScreen';
import AfterLeaveScreen from '../screens/Guide/AfterLeaveScreen';
import IfYouSpeakScreen from '../screens/Guide/IfYouSpeakScreen';
import IfPoliceScreen from '../screens/Guide/IfPoliceScreen';
import ProtectYourselfScreen from '../screens/Guide/ProtectYourselfScreen';
import FeelsWrongScreen from '../screens/Guide/FeelsWrongScreen';
import EmergencyContactedScreen from '../screens/Guide/EmergencyContactedScreen';

// ==================== HOME FLOW SCREENS (13) ====================
import HomeScreen from '../screens/Home/HomeScreen';
import AccountAccessScreen from '../screens/Home/AccountAccessScreen';
import ProfileUnderReviewScreen from '../screens/Home/ProfileUnderReviewScreen';
import DocumentDetailsScreen from '../screens/Home/DocumentDetailsScreen';
import SettingsScreen from '../screens/Home/SettingsScreen';
import DataPrivacyScreen from '../screens/Home/DataPrivacyScreen';
import YourDataAccountScreen from '../screens/Home/YourDataAccountScreen';
import SubscriptionManageScreen from '../screens/Home/SubscriptionManageScreen';
import SubscriptionStatusScreen from '../screens/Home/SubscriptionStatusScreen';
import HelpSupportScreen from '../screens/Home/HelpSupportScreen';
import ConnectionIssueScreen from '../screens/Home/ConnectionIssueScreen';
import ReportConcernScreen from '../screens/Home/ReportConcernScreen';
import PrepareStayReadyScreen from '../screens/Home/PrepareStayReadyScreen';
import PrepareCardDetailScreen from '../screens/Home/PrepareCardDetailScreen';
import LocationMapScreen from '../screens/Home/LocationMapScreen';

// ==================== CALL SCREENS ====================
import P2PCallScreen from '../screens/Call/P2PCallScreen';

// ==================== PREPARE TAB SCREENS ====================
import SafetyTipsScreen from '../screens/Prepare/SafetyTipsScreen';
import PrepareLearnArticleScreen from '../screens/Prepare/PrepareLearnArticleScreen';
import WhenToAskPresenceScreen from '../screens/Prepare/WhenToAskPresenceScreen';

// ==================== BLOG SCREENS ====================
import BlogListScreen from '../screens/Blogs/BlogListScreen';
import BlogDetailScreen from '../screens/Blogs/BlogDetailScreen';

// ==================== COMMUNITY SCREENS (20) ====================
import CommunityAroundScreen from '../features/daily-help/screens/community/CommunityAroundScreen';
import HelpTypeScreen from '../features/daily-help/screens/requester/HelpTypeScreen';
import DailyHelpReasonScreen from '../features/daily-help/screens/requester/DailyHelpReasonScreen';
import AddDetailsScreen from '../features/daily-help/screens/requester/AddDetailsScreen';
import ReviewRequestScreen from '../features/daily-help/screens/requester/ReviewRequestScreen';
import RequestActiveScreen from '../features/daily-help/screens/requester/RequestActiveScreen';
import PeopleAwareScreen from '../features/daily-help/screens/requester/PeopleAwareScreen';
import RequestConfirmationScreen from '../features/daily-help/screens/requester/RequestConfirmationScreen';
import CancelRequestScreen from '../features/daily-help/screens/requester/CancelRequestScreen';
import AwarenessProgressScreen from '../features/daily-help/screens/requester/AwarenessProgressScreen';
import ClosingRequestScreen from '../features/daily-help/screens/requester/ClosingRequestScreen';
import RequestAutoClosedScreen from '../features/daily-help/screens/requester/RequestAutoClosedScreen';
import CommunityBalanceNudgeScreen from '../features/daily-help/screens/requester/CommunityBalanceNudgeScreen';
import HelperMatchingMapScreen from '../features/daily-help/screens/helper/HelperMatchingMapScreen';
import DailyHelpSafetyScreen from '../features/daily-help/screens/helper/SafetyComesFirstScreen';
import RequesterMatchingMapScreen from '../features/daily-help/screens/requester/RequesterMatchingMapScreen';
import StayAwayScreen from '../features/daily-help/screens/helper/StayAwayScreen';
import SomeoneNeedsHelpScreen from '../features/daily-help/screens/helper/SomeoneNeedsHelpScreen';
import LocalRequestScreen from '../features/daily-help/screens/helper/LocalRequestScreen';
import StartConcernScreen from '../features/daily-help/screens/community/StartConcernScreen';
import SteppedAwayScreen from '../features/daily-help/screens/helper/SteppedAwayScreen';
import StatusSharedScreen from '../features/daily-help/screens/helper/StatusSharedScreen';
import NearbySharedScreen from '../features/daily-help/screens/helper/NearbySharedScreen';

// ==================== AWARENESS/PRESENCE SCREENS (30+) ====================
import WhatsHappeningScreen from '../features/need-presence/screens/requester/WhatsHappeningScreen';
import CreateAwarenessScreen from '../features/need-presence/screens/requester/CreateAwarenessScreen';
import BeingFollowedScreen from '../features/need-presence/screens/responder/BeingFollowedScreen';
import UnsafeWalkScreen from '../features/need-presence/screens/responder/UnsafeWalkScreen';
import BloodNeededScreen from '../features/need-presence/screens/responder/BloodNeededScreen';
import CarIssueScreen from '../features/need-presence/screens/responder/CarIssueScreen';
import BeforeShareScreen from '../features/need-presence/screens/requester/BeforeShareScreen';
import ShareLocationScreen from '../features/need-presence/screens/requester/ShareLocationScreen';
import NearDubaiedAreaScreen from '../features/need-presence/screens/responder/NearDubaiedAreaScreen';
import RequestSharedScreen from '../features/need-presence/screens/requester/RequestSharedScreen';
import MultiplePeopleScreen from '../features/need-presence/screens/responder/MultiplePeopleScreen';
import PeopleListScreen from '../features/need-presence/screens/responder/PeopleListScreen';
import SafetyGuidanceScreen from '../features/need-presence/screens/requester/SafetyGuidanceScreen';
import NotAloneScreen from '../features/need-presence/screens/responder/NotAloneScreen';
import BeingHereOptionalScreen from '../features/need-presence/screens/responder/BeingHereOptionalScreen';
import BeingHereChoiceScreen from '../features/need-presence/screens/responder/BeingHereChoiceScreen';
import ObserveOnlyScreen from '../features/need-presence/screens/responder/ObserveOnlyScreen';
import AwarenessClosedScreen from '../features/need-presence/screens/responder/AwarenessClosedScreen';
import RequestClosedScreen from '../features/need-presence/screens/requester/RequestClosedScreen';
import ThankYouClosingScreen from '../features/need-presence/screens/responder/ThankYouClosingScreen';
import HighRiskAreaScreen from '../features/need-presence/screens/responder/HighRiskAreaScreen';
import NearbyMapScreen from '../features/need-presence/screens/responder/NearbyMapScreen';
import SituationSharedScreen from '../features/need-presence/screens/responder/SituationSharedScreen';
import SomeoneConcernScreen from '../features/need-presence/screens/responder/SomeoneConcernScreen';
import ViewDetailsIgnoreScreen from '../features/need-presence/screens/responder/ViewDetailsIgnoreScreen';
import ReminderScreen from '../features/need-presence/screens/responder/ReminderScreen';
import EmergencyHelpScreen from '../features/need-presence/screens/responder/EmergencyHelpScreen';
import CancelRequestModal from '../features/need-presence/screens/responder/CancelRequestModal';
import PresenceRequestDetailScreen from '../features/need-presence/screens/responder/PresenceRequestDetailScreen';

const Stack = createNativeStackNavigator();

const StackNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      {/* ==================== ONBOARDING ==================== */}
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ animation: 'none' }}
      />
      <Stack.Screen name="WhatSociusIs" component={WhatSociusIsScreen} />
      <Stack.Screen name="WhatSociusIsNot" component={WhatSociusIsNotScreen} />
      <Stack.Screen name="Principles" component={PrinciplesScreen} />
      <Stack.Screen name="CommunityPrinciples" component={CommunityPrinciplesScreen} />
      <Stack.Screen name="ParticipationChoice" component={ParticipationChoiceScreen} />
      <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
      <Stack.Screen name="BeforeContinue" component={BeforeContinueScreen} />
      <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="CommunityGuidelines" component={CommunityGuidelinesScreen} />
      <Stack.Screen name="VolunteerCodeOfConduct" component={VolunteerCodeOfConductScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="ProfileReview" component={ProfileReviewScreen} />
      <Stack.Screen name="RequestReview" component={RequestReviewScreen} />
      <Stack.Screen name="VerificationAttention" component={VerificationAttentionScreen} />


      {/* ==================== AUTHENTICATION ==================== */}
      <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
      {/* <Stack.Screen name="OTP" component={OTPScreen} /> */}
      <Stack.Screen name="OTPForm" component={OTPFormScreen} />
      <Stack.Screen name="ProfileInfo" component={ProfileInfoScreen} />
      <Stack.Screen name="VerificationReview" component={VerificationReviewScreen} />

      {/* ==================== FIRST TIME USER FLOW ==================== */}
      <Stack.Screen name="Availability" component={AvailabilityScreen} />
      <Stack.Screen name="AvailabilityRoles" component={AvailabilityRolesScreen} />
      <Stack.Screen name="BeingAvailable" component={BeingAvailableScreen} />
      <Stack.Screen name="Permission" component={PermissionScreen} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />

      {/* ==================== USER GUIDE FLOW ==================== */}
      <Stack.Screen name="YourRole" component={YourRoleScreen} />
      <Stack.Screen name="NoObligation" component={NoObligationScreen} />
      <Stack.Screen name="SafetyFirst" component={SafetyFirstScreen} />
      <Stack.Screen name="PublicSpaces" component={PublicSpacesScreen} />
      <Stack.Screen name="AfterLeave" component={AfterLeaveScreen} />
      <Stack.Screen name="IfYouSpeak" component={IfYouSpeakScreen} />
      <Stack.Screen name="IfPolice" component={IfPoliceScreen} />
      <Stack.Screen name="ProtectYourself" component={ProtectYourselfScreen} />
      <Stack.Screen name="FeelsWrong" component={FeelsWrongScreen} />
      <Stack.Screen name="EmergencyContacted" component={EmergencyContactedScreen} />

      {/* ==================== MAIN APP (BOTTOM TABS) ==================== */}
      <Stack.Screen
        name="MainApp"
        component={BottomTabNavigator}
        options={{ animation: 'fade' }}
      />

      {/* ==================== HOME FLOW SCREENS ==================== */}

      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="LocationMap" component={LocationMapScreen} />
      <Stack.Screen name="AccountAccess" component={AccountAccessScreen} />
      <Stack.Screen name="ProfileUnderReview" component={ProfileUnderReviewScreen} />
      <Stack.Screen name="DocumentDetails" component={DocumentDetailsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="DataPrivacy" component={DataPrivacyScreen} />
      <Stack.Screen name="YourDataAccount" component={YourDataAccountScreen} />
      <Stack.Screen name="SubscriptionManage" component={SubscriptionManageScreen} />
      <Stack.Screen name="SubscriptionStatus" component={SubscriptionStatusScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="ConnectionIssue" component={ConnectionIssueScreen} />
      <Stack.Screen name="ReportConcern" component={ReportConcernScreen} />
      <Stack.Screen name="PrepareStayReady" component={PrepareStayReadyScreen} />
      <Stack.Screen name="CardDetailScreen" component={PrepareCardDetailScreen} />

      {/* ==================== PREPARE TAB SCREENS ==================== */}
      <Stack.Screen name="SafetyTips" component={SafetyTipsScreen} />
      <Stack.Screen name="PrepareLearnArticle" component={PrepareLearnArticleScreen} />
      <Stack.Screen name="WhenToAskPresence" component={WhenToAskPresenceScreen} />

      {/* ==================== COMMUNITY FLOW SCREENS ==================== */}
      <Stack.Screen name="CommunityAround" component={CommunityAroundScreen} />
      <Stack.Screen name="HelpType" component={HelpTypeScreen} />
      <Stack.Screen name="DailyHelpReason" component={DailyHelpReasonScreen} />
      <Stack.Screen name="AddDetails" component={AddDetailsScreen} />
      <Stack.Screen name="ReviewRequest" component={ReviewRequestScreen} />
      <Stack.Screen name="RequestActive" component={RequestActiveScreen} />
      <Stack.Screen name="PeopleAware" component={PeopleAwareScreen} />
      <Stack.Screen name="RequestConfirmation" component={RequestConfirmationScreen} />
      <Stack.Screen name="CancelRequest" component={CancelRequestScreen} />
      <Stack.Screen name="AwarenessProgress" component={AwarenessProgressScreen} />
      <Stack.Screen name="ClosingRequest" component={ClosingRequestScreen} />
      <Stack.Screen name="RequestAutoClosed" component={RequestAutoClosedScreen} />
      <Stack.Screen name="CommunityBalanceNudge" component={CommunityBalanceNudgeScreen} />
      <Stack.Screen name="MatchingMap" component={HelperMatchingMapScreen} />
      <Stack.Screen name="RequesterMatchingMap" component={RequesterMatchingMapScreen} />
      <Stack.Screen name="StayAway" component={StayAwayScreen} />
      <Stack.Screen name="SomeoneNeedsHelp" component={SomeoneNeedsHelpScreen} />
      <Stack.Screen name="DailyHelpSafety" component={DailyHelpSafetyScreen} />
      <Stack.Screen name="LocalRequest" component={LocalRequestScreen} />
      <Stack.Screen name="StartConcern" component={StartConcernScreen} />
      <Stack.Screen name="SteppedAway" component={SteppedAwayScreen} />
      <Stack.Screen name="StatusShared" component={StatusSharedScreen} />
      <Stack.Screen name="NearbyShared" component={NearbySharedScreen} />

      {/* ==================== BLOG SCREENS ==================== */}
      <Stack.Screen name="BlogList" component={BlogListScreen} />
      <Stack.Screen name="BlogDetail" component={BlogDetailScreen} />

      {/* ==================== AWARENESS/PRESENCE FLOW SCREENS ==================== */}
      <Stack.Screen name="WhatsHappening" component={WhatsHappeningScreen} />
      <Stack.Screen name="CreateAwareness" component={CreateAwarenessScreen} />
      <Stack.Screen name="BeingFollowed" component={BeingFollowedScreen} />
      <Stack.Screen name="UnsafeWalk" component={UnsafeWalkScreen} />
      <Stack.Screen name="BloodNeeded" component={BloodNeededScreen} />
      <Stack.Screen name="CarIssue" component={CarIssueScreen} />
      <Stack.Screen name="BeforeShare" component={BeforeShareScreen} />
      <Stack.Screen name="ShareLocation" component={ShareLocationScreen} />
      <Stack.Screen name="NearDubaiedArea" component={NearDubaiedAreaScreen} />
      <Stack.Screen name="RequestShared" component={RequestSharedScreen} />
      <Stack.Screen name="MultiplePeople" component={MultiplePeopleScreen} />
      <Stack.Screen name="PeopleList" component={PeopleListScreen} />
      <Stack.Screen name="SafetyGuidance" component={SafetyGuidanceScreen} />
      <Stack.Screen name="NotAlone" component={NotAloneScreen} />
      <Stack.Screen name="BeingHereOptional" component={BeingHereOptionalScreen} />
      <Stack.Screen name="BeingHereChoice" component={BeingHereChoiceScreen} />
      <Stack.Screen name="ObserveOnly" component={ObserveOnlyScreen} />
      <Stack.Screen name="AwarenessClosed" component={AwarenessClosedScreen} />
      <Stack.Screen name="RequestClosed" component={RequestClosedScreen} />
      <Stack.Screen name="ThankYouClosing" component={ThankYouClosingScreen} />
      <Stack.Screen name="HighRiskArea" component={HighRiskAreaScreen} />
      <Stack.Screen name="NearbyMap" component={NearbyMapScreen} />
      <Stack.Screen name="SituationShared" component={SituationSharedScreen} />
      <Stack.Screen name="SomeoneConcern" component={SomeoneConcernScreen} />
      <Stack.Screen name="ViewDetailsIgnore" component={ViewDetailsIgnoreScreen} />
      <Stack.Screen name="Reminder" component={ReminderScreen} />
      <Stack.Screen name="EmergencyHelp" component={EmergencyHelpScreen} />
      <Stack.Screen name="PresenceRequestDetail" component={PresenceRequestDetailScreen} />

      {/* ==================== CALLS ==================== */}
      <Stack.Screen
        name="P2PCall"
        component={P2PCallScreen}
        options={{ headerShown: false, animation: 'fade' }}
      />

      {/* ==================== MODALS ==================== */}
      <Stack.Screen
        name="CancelRequestModal"
        component={CancelRequestModal}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
    </Stack.Navigator>

  );
};

export default StackNavigator;
