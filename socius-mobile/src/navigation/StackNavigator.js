import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Bottom Tab Navigator
import BottomTabNavigator from './BottomTabNavigator';

// ==================== AUTH SCREENS ====================
import PhoneVerificationScreen from '../screens/Auth/PhoneVerificationScreen';
// import OTPScreen from '../screens/Auth/OTPScreen';
import OTPFormScreen from '../screens/Auth/OTPFormScreen';
import SelfieVerificationScreen from '../screens/Auth/SelfieVerificationScreen';
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
import LocationMapScreen from '../screens/Home/LocationMapScreen';

// ==================== CALL SCREENS ====================
import P2PCallScreen from '../screens/Call/P2PCallScreen';

// ==================== PREPARE TAB SCREENS ====================
import SafetyTipsScreen from '../screens/Prepare/SafetyTipsScreen';
import WhenToAskPresenceScreen from '../screens/Prepare/WhenToAskPresenceScreen';

// ==================== COMMUNITY SCREENS (20) ====================
import CommunityAroundScreen from '../screens/DailyHelp/CommunityAroundScreen';
import AskLocalHelpScreen from '../screens/DailyHelp/UserDailyHelpRequest/AskLocalHelpScreen';
import HelpTypeScreen from '../screens/DailyHelp/UserDailyHelpRequest/HelpTypeScreen';
import AddDetailsScreen from '../screens/DailyHelp/UserDailyHelpRequest/AddDetailsScreen';
import ReviewRequestScreen from '../screens/DailyHelp/UserDailyHelpRequest/ReviewRequestScreen';
import RequestActiveScreen from '../screens/DailyHelp/UserDailyHelpRequest/RequestActiveScreen';
import PeopleAwareScreen from '../screens/DailyHelp/UserDailyHelpRequest/PeopleAwareScreen';
import RequestConfirmationScreen from '../screens/DailyHelp/UserDailyHelpRequest/RequestConfirmationScreen';
import CancelRequestScreen from '../screens/DailyHelp/UserDailyHelpRequest/CancelRequestScreen';
import AwarenessProgressScreen from '../screens/DailyHelp/UserDailyHelpRequest/AwarenessProgressScreen';
import ClosingRequestScreen from '../screens/DailyHelp/UserDailyHelpRequest/ClosingRequestScreen';
import RequestAutoClosedScreen from '../screens/DailyHelp/UserDailyHelpRequest/RequestAutoClosedScreen';
import CommunityBalanceNudgeScreen from '../screens/DailyHelp/UserDailyHelpRequest/CommunityBalanceNudgeScreen';
import MatchingMapScreen from '../screens/DailyHelp/UserDailyHelpRecive/MatchingMapScreen';
import DailyHelpSafetyScreen from '../screens/DailyHelp/UserDailyHelpRecive/SafetyComesFirstScreen';
import RequesterMatchingMapScreen from '../screens/DailyHelp/UserDailyHelpRequest/MatchingMapScreen';
import StayAwayScreen from '../screens/DailyHelp/UserDailyHelpRecive/StayAwayScreen';
import SomeoneNeedsHelpScreen from '../screens/DailyHelp/UserDailyHelpRecive/SomeoneNeedsHelpScreen';
import LocalRequestScreen from '../screens/DailyHelp/UserDailyHelpRecive/LocalRequestScreen';
import StartConcernScreen from '../screens/DailyHelp/StartConcernScreen';
import SteppedAwayScreen from '../screens/DailyHelp/UserDailyHelpRecive/SteppedAwayScreen';
import StatusSharedScreen from '../screens/DailyHelp/UserDailyHelpRecive/StatusSharedScreen';
import NearbySharedScreen from '../screens/DailyHelp/UserDailyHelpRecive/NearbySharedScreen';

// ==================== AWARENESS/PRESENCE SCREENS (30+) ====================
import WhatsHappeningScreen from '../screens/NeedPresence/UserNeedPresenceRequest/WhatsHappeningScreen';
import CreateAwarenessScreen from '../screens/NeedPresence/UserNeedPresenceRequest/CreateAwarenessScreen';
import BeingFollowedScreen from '../screens/NeedPresence/UserNeedPresenceRecive/BeingFollowedScreen';
import UnsafeWalkScreen from '../screens/NeedPresence/UserNeedPresenceRecive/UnsafeWalkScreen';
import BloodNeededScreen from '../screens/NeedPresence/UserNeedPresenceRecive/BloodNeededScreen';
import CarIssueScreen from '../screens/NeedPresence/UserNeedPresenceRecive/CarIssueScreen';
import BeforeShareScreen from '../screens/NeedPresence/UserNeedPresenceRequest/BeforeShareScreen';
import ShareLocationScreen from '../screens/NeedPresence/UserNeedPresenceRequest/ShareLocationScreen';
import NearDubaiedAreaScreen from '../screens/NeedPresence/UserNeedPresenceRecive/NearDubaiedAreaScreen';
import RequestSharedScreen from '../screens/NeedPresence/UserNeedPresenceRequest/RequestSharedScreen';
import MultiplePeopleScreen from '../screens/NeedPresence/UserNeedPresenceRecive/MultiplePeopleScreen';
import PeopleListScreen from '../screens/NeedPresence/UserNeedPresenceRecive/PeopleListScreen';
import SafetyGuidanceScreen from '../screens/NeedPresence/UserNeedPresenceRequest/SafetyGuidanceScreen';
import NotAloneScreen from '../screens/NeedPresence/UserNeedPresenceRecive/NotAloneScreen';
import BeingHereOptionalScreen from '../screens/NeedPresence/UserNeedPresenceRecive/BeingHereOptionalScreen';
import BeingHereChoiceScreen from '../screens/NeedPresence/UserNeedPresenceRecive/BeingHereChoiceScreen';
import ObserveOnlyScreen from '../screens/NeedPresence/UserNeedPresenceRecive/ObserveOnlyScreen';
import AwarenessClosedScreen from '../screens/NeedPresence/UserNeedPresenceRecive/AwarenessClosedScreen';
import RequestClosedScreen from '../screens/NeedPresence/UserNeedPresenceRequest/RequestClosedScreen';
import ThankYouClosingScreen from '../screens/NeedPresence/UserNeedPresenceRecive/ThankYouClosingScreen';
import HighRiskAreaScreen from '../screens/NeedPresence/UserNeedPresenceRecive/HighRiskAreaScreen';
import NearbyMapScreen from '../screens/NeedPresence/UserNeedPresenceRecive/NearbyMapScreen';
import SituationSharedScreen from '../screens/NeedPresence/UserNeedPresenceRecive/SituationSharedScreen';
import SomeoneConcernScreen from '../screens/NeedPresence/UserNeedPresenceRecive/SomeoneConcernScreen';
import ViewDetailsIgnoreScreen from '../screens/NeedPresence/UserNeedPresenceRecive/ViewDetailsIgnoreScreen';
import ReminderScreen from '../screens/NeedPresence/UserNeedPresenceRecive/ReminderScreen';
import EmergencyHelpScreen from '../screens/NeedPresence/UserNeedPresenceRecive/EmergencyHelpScreen';
import CancelRequestModal from '../screens/NeedPresence/UserNeedPresenceRecive/CancelRequestModal';
import PresenceRequestDetailScreen from '../screens/NeedPresence/UserNeedPresenceRecive/PresenceRequestDetailScreen';

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
      <Stack.Screen name="Splash" component={SplashScreen} />
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
      <Stack.Screen name="SelfieVerification" component={SelfieVerificationScreen} />
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

      {/* ==================== PREPARE TAB SCREENS ==================== */}
      <Stack.Screen name="SafetyTips" component={SafetyTipsScreen} />
      <Stack.Screen name="WhenToAskPresence" component={WhenToAskPresenceScreen} />

      {/* ==================== COMMUNITY FLOW SCREENS ==================== */}
      <Stack.Screen name="CommunityAround" component={CommunityAroundScreen} />
      <Stack.Screen name="AskLocalHelp" component={AskLocalHelpScreen} />
      <Stack.Screen name="HelpType" component={HelpTypeScreen} />
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
      <Stack.Screen name="MatchingMap" component={MatchingMapScreen} />
      <Stack.Screen name="RequesterMatchingMap" component={RequesterMatchingMapScreen} />
      <Stack.Screen name="StayAway" component={StayAwayScreen} />
      <Stack.Screen name="SomeoneNeedsHelp" component={SomeoneNeedsHelpScreen} />
      <Stack.Screen name="DailyHelpSafety" component={DailyHelpSafetyScreen} />
      <Stack.Screen name="LocalRequest" component={LocalRequestScreen} />
      <Stack.Screen name="StartConcern" component={StartConcernScreen} />
      <Stack.Screen name="SteppedAway" component={SteppedAwayScreen} />
      <Stack.Screen name="StatusShared" component={StatusSharedScreen} />
      <Stack.Screen name="NearbyShared" component={NearbySharedScreen} />

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
