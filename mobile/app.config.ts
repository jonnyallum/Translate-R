// mobile/app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Translate-R',
  slug: 'translate-r',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFF8F0',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.jonnyai.translater',
    infoPlist: {
      NSCameraUsageDescription: 'Translate-R needs camera access for video calls.',
      NSMicrophoneUsageDescription: 'Translate-R needs microphone access for voice translation during calls.',
      NSSpeechRecognitionUsageDescription: 'Translate-R uses speech recognition to translate your conversations in real-time.',
      UIBackgroundModes: ['audio', 'voip'],
    },
    buildNumber: '1',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFF8F0',
    },
    package: 'com.jonnyai.translater',
    permissions: [
      'CAMERA',
      'RECORD_AUDIO',
      'MODIFY_AUDIO_SETTINGS',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
        },
        android: {
          minSdkVersion: 24,
        },
      },
    ],
    [
      '@config-plugins/react-native-webrtc',
      {
        cameraPermission: 'Translate-R needs camera access for video calls.',
        microphonePermission: 'Translate-R needs microphone access for voice translation.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'your-eas-project-id',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
  scheme: 'translater',
});
