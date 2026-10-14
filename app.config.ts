// Uygulama ayarları. Web adresi alt klasördeyse (GitHub Pages: /rolses) EXPO_BASE_URL ile verilir.
const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || '';

export default {
  expo: {
    name: 'RolSes',
    slug: 'rolses',
    scheme: 'rolses',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#F6F1E9',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'net.rolses.app',
      infoPlist: {
        NSMicrophoneUsageDescription:
          'Rollere sesli başvuru ve teslim kaydı yapmak için mikrofon kullanılır.',
      },
    },
    android: {
      package: 'net.rolses.app',
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#F6F1E9',
      },
      permissions: ['android.permission.RECORD_AUDIO'],
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/icon.png',
      name: 'RolSes — Videona gerçek ses',
      themeColor: '#E8412C',
      backgroundColor: '#F6F1E9',
    },
    plugins: [
      'expo-router',
      [
        'expo-audio',
        {
          microphonePermission:
            'Rollere sesli başvuru ve teslim kaydı yapmak için mikrofon kullanılır.',
        },
      ],
      'expo-video',
      'expo-web-browser',
    ],
    experiments: {
      typedRoutes: false,
      ...(baseUrl ? { baseUrl } : {}),
    },
    extra: {
      eas: {},
    },
  },
};
