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
  }
};
