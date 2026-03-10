safety-app/
├── app.json
├── package.json
├── babel.config.js
├── metro.config.js
├── index.js
├── .env.example
│
├── src/
│   ├── navigation/
│   │    
│   │
│   ├── screens/                # App screens (Main Level)
│   │   ├── auth/               # Authentication screens
│   │   │   ├── LoginScreen.js
│   │   │   ├── PhoneVerificationScreen.js
│   │   │   ├── OTPScreen.js
│   │   │   ├── OTPFormScreen.js
│   │   │   ├── SelfieVerificationScreen.js
│   │   │   ├── ProfileInfoScreen.js
│   │   │   └── VerificationReviewScreen.js
│   │   │
│   │   ├── onboarding/         # Onboarding (16 screens)
│   │   │   ├── SplashScreen.js
│   │   │   ├── WelcomeScreen.js
│   │   │   ├── WhatSociusIsScreen.js
│   │   │   ├── WhatSociusIsNotScreen.js
│   │   │   ├── PrinciplesScreen.js
│   │   │   ├── CommunityPrinciplesScreen.js
│   │   │   ├── ParticipationChoiceScreen.js
│   │   │   ├── IdentityVerificationScreen.js
│   │   │   ├── BeforeContinueScreen.js
│   │   │   ├── SubscriptionScreen.js
│   │   │   ├── ProfileReviewScreen.js
│   │   │   ├── RequestReviewScreen.js
│   │   │   └── VerificationAttentionScreen.js
│   │   │
│   │   ├── firstTime/          # First time user (5 screens)
│   │   │   ├── AvailabilityScreen.js
│   │   │   ├── AvailabilityRolesScreen.js
│   │   │   ├── BeingAvailableScreen.js
│   │   │   ├── PermissionScreen.js
│   │   │   └── EmergencyContactsScreen.js
│   │   │
│   │   ├── guide/              # User guide (10 screens)
│   │   │   ├── YourRoleScreen.js
│   │   │   ├── NoObligationScreen.js
│   │   │   ├── SafetyFirstScreen.js
│   │   │   ├── PublicSpacesScreen.js
│   │   │   ├── AfterLeaveScreen.js
│   │   │   ├── IfYouSpeakScreen.js
│   │   │   ├── IfPoliceScreen.js
│   │   │   ├── ProtectYourselfScreen.js
│   │   │   ├── FeelsWrongScreen.js
│   │   │   └── EmergencyContactedScreen.js
│   │   │
│   │   ├── home/               # Home Flow (13 screens)
│   │   │   ├── HomeScreen.js
│   │   │   ├── AccountAccessScreen.js
│   │   │   ├── ProfileUnderReviewScreen.js
│   │   │   ├── SettingsScreen.js
│   │   │   ├── ProfileScreen.js
│   │   │   ├── DataPrivacyScreen.js
│   │   │   ├── YourDataAccountScreen.js
│   │   │   ├── SubscriptionManageScreen.js
│   │   │   ├── SubscriptionStatusScreen.js
│   │   │   ├── HelpSupportScreen.js
│   │   │   ├── ConnectionIssueScreen.js
│   │   │   ├── ReportConcernScreen.js
│   │   │   └── PrepareStayReadyScreen.js
│   │   │
│   │   ├── prepare/            # Prepare Tab
│   │   │   ├── PrepareScreen.js
│   │   │   ├── SafetyTipsScreen.js
│   │   │   ├── EmergencyContactsScreen.js
│   │   │   └── WhenToAskPresenceScreen.js
│   │   │
│   │   ├── community/          # Community (20 screens)
│   │   │   ├── CommunityScreen.js
│   │   │   ├── CommunityAroundScreen.js
│   │   │   ├── AskLocalHelpScreen.js
│   │   │   ├── HelpTypeScreen.js
│   │   │   ├── AddDetailsScreen.js
│   │   │   ├── ReviewRequestScreen.js
│   │   │   ├── RequestActiveScreen.js
│   │   │   ├── PeopleAwareScreen.js
│   │   │   ├── RequestConfirmationScreen.js
│   │   │   ├── CancelRequestScreen.js
│   │   │   ├── AwarenessProgressScreen.js
│   │   │   ├── ClosingRequestScreen.js
│   │   │   ├── MatchingMapScreen.js
│   │   │   ├── StayAwayScreen.js
│   │   │   ├── SomeoneNeedsHelpScreen.js
│   │   │   ├── LocalRequestScreen.js
│   │   │   ├── StartConcernScreen.js
│   │   │   ├── SteppedAwayScreen.js
│   │   │   ├── StatusSharedScreen.js
│   │   │   └── NearbySharedScreen.js
│   │   │
│   │   └── awareness/          # Need Presence / Awareness (30+ screens)
│   │       ├── WhatsHappeningScreen.js
│   │       ├── CreateAwarenessScreen.js
│   │       ├── BeingFollowedScreen.js
│   │       ├── UnsafeWalkScreen.js
│   │       ├── BloodNeededScreen.js
│   │       ├── CarIssueScreen.js
│   │       ├── BeforeShareScreen.js
│   │       ├── ShareLocationScreen.js
│   │       ├── NearDubaiedAreaScreen.js
│   │       ├── RequestSharedScreen.js
│   │       ├── AwarenessSharedScreen.js
│   │       ├── MultiplePeopleScreen.js
│   │       ├── PeopleListScreen.js
│   │       ├── SafetyGuidanceScreen.js
│   │       ├── NotAloneScreen.js
│   │       ├── SafetyComesFirstScreen.js
│   │       ├── BeingHereOptionalScreen.js
│   │       ├── BeingHereChoiceScreen.js
│   │       ├── ObserveOnlyScreen.js
│   │       ├── AwarenessClosedScreen.js
│   │       ├── RequestClosedScreen.js
│   │       ├── ThankYouClosingScreen.js
│   │       ├── HighRiskAreaScreen.js
│   │       ├── NearbyMapScreen.js
│   │       ├── SituationSharedScreen.js
│   │       ├── SomeoneConcernScreen.js
│   │       ├── ViewDetailsIgnoreScreen.js
│   │       ├── ReminderScreen.js
│   │       ├── EmergencyHelpScreen.js
│   │       └── CancelRequestModal.js
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.js
│   │   │   ├── TextInput.js
│   │   │   ├── Card.js
│   │   │   ├── Modal.js
│   │   │   ├── LoadingSpinner.js
│   │   │   ├── Header.js
│   │   │   ├── BottomSheet.js
│   │   │   └── Toast.js
│   │   │
│   │   ├── user/
│   │   │   ├── HelpButton.js
│   │   │   ├── ConcernButton.js
│   │   │   ├── IncidentCard.js
│   │   │   ├── MapViewComponent.js
│   │   │   ├── VolunteerArrivalTimer.js
│   │   │   └── StatusIndicator.js
│   │   │
│   │   ├── volunteer/
│   │   │   ├── IncidentAcceptButton.js
│   │   │   ├── IncidentRejectButton.js
│   │   │   ├── NavigationGuide.js
│   │   │   ├── CustomerDetailCard.js
│   │   │   ├── ResolutionOptions.js
│   │   │   └── VolunteerTimer.js
│   │   │
│   │   └── admin/
│   │       ├── IncidentTable.js
│   │       ├── VolunteerList.js
│   │       ├── ClusterMap.js
│   │       ├── StatCard.js
│   │       └── FilterPanel.js
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.js
│   │   │   ├── auth.api.js
│   │   │   ├── incident.api.js
│   │   │   ├── volunteer.api.js
│   │   │   ├── user.api.js
│   │   │   └── admin.api.js
│   │   │
│   │   ├── firebase/
│   │   │   ├── config.js
│   │   │   ├── messaging.js
│   │   │   └── database.js
│   │   │
│   │   ├── location/
│   │   │   ├── geolocation.service.js
│   │   │   └── cluster.service.js
│   │   │
│   │   ├── payment/
│   │   │   └── razorpay.service.js
│   │   │
│   │   └── storage/
│   │       └── asyncStorage.service.js
│   │
│   ├── state/
│   │   ├── redux/
│   │   │   ├── store.js
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   ├── incidentSlice.js
│   │   │   │   ├── userSlice.js
│   │   │   │   ├── volunteerSlice.js
│   │   │   │   └── adminSlice.js
│   │   │   └── thunks/
│   │   │       ├── authThunks.js
│   │   │       └── incidentThunks.js
│   │   │
│   │   └── hooks/
│   │       ├── useAuth.js
│   │       ├── useIncident.js
│   │       ├── useLocation.js
│   │       └── useTheme.js
│   │
│   ├── utils/
│   │   ├── constants.js
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   ├── helpers.js
│   │   └── errors.js
│   │
│   ├── theme/
│   │   ├── colors.js
│   │   ├── typography.js
│   │   ├── spacing.js
│   │   ├── theme.js
│   │   └── darkTheme.js
│   │
│   ├── assets/
│   │   ├── images/
│   │   │   ├── splash.png
│   │   │   ├── logo.png
│   │   │   └── illustrations/
│   │   │
│   │   ├── icons/
│   │   │   ├── help.svg
│   │   │   ├── concern.svg
│   │   │   ├── location.svg
│   │   │   └── ...
│   │   │
│   │   └── fonts/
│   │       └── custom-fonts/
│   │
│   └── App.js
│
├── __tests__/
│   ├── components/
│   ├── services/
│   └── utils/
│
└── .env.example