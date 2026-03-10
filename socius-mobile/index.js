globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import { registerRootComponent } from 'expo';
import './src/services/notifications/notificationsBackground';

import App from './App';

registerRootComponent(App);
