import { NativeModules } from 'react-native';

const { SociusCallModule } = NativeModules;

export default {
  displayIncomingCall: (uuid, name, info, avatarUrl, payload) => {
    if (SociusCallModule) {
      SociusCallModule.displayIncomingCall(uuid, name, info, avatarUrl || '', payload || '{}');
    } else {
      console.warn('SociusCallModule is not available');
    }
  },
  
  cancelCallNotification: (uuid) => {
    if (SociusCallModule) {
      SociusCallModule.cancelCallNotification(uuid);
    }
  },

  playHelpRequestSound: () => {
    if (SociusCallModule?.playHelpRequestSound) {
      SociusCallModule.playHelpRequestSound();
    }
  },

  startHelpRequestRingtone: () => {
    if (SociusCallModule?.startHelpRequestRingtone) {
      SociusCallModule.startHelpRequestRingtone();
    }
  },

  startPresenceAlarmRingtone: () => {
    if (SociusCallModule?.startPresenceAlarmRingtone) {
      SociusCallModule.startPresenceAlarmRingtone();
    }
  },

  stopRingtone: () => {
    if (SociusCallModule?.stopRingtone) {
      SociusCallModule.stopRingtone();
    }
  },

  playMessageSound: () => {
    if (SociusCallModule?.playMessageSound) {
      SociusCallModule.playMessageSound();
    } else {
      console.warn('playMessageSound not available on SociusCallModule');
    }
  },
};
