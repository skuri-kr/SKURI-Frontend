/* eslint-env jest */
// SKTaxi: Jest 설정 파일
// Firebase 및 React Native 모듈 모킹

// Firebase 모듈 모킹
jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(),
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    currentUser: { uid: 'test-user-id', email: 'test@example.com' },
    onAuthStateChanged: jest.fn((callback) => {
      callback({ uid: 'test-user-id', email: 'test@example.com' });
      return jest.fn();
    }),
    signInWithCredential: jest.fn(() => Promise.resolve()),
    signOut: jest.fn(() => Promise.resolve()),
  })),
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user-id', email: 'test@example.com' },
  })),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    requestPermission: jest.fn(() => Promise.resolve(1)),
  })),
}));

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    logEvent: jest.fn(() => Promise.resolve()),
    setUserId: jest.fn(() => Promise.resolve()),
    setUserProperties: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    log: jest.fn(),
    recordError: jest.fn(),
    setUserId: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ data: { idToken: 'mock-google-id-token' } })),
    signOut: jest.fn(() => Promise.resolve()),
    revokeAccess: jest.fn(() => Promise.resolve()),
  },
}));

// React Native 모듈 모킹
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock'),
);

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
  PanGestureHandler: 'PanGestureHandler',
  TapGestureHandler: 'TapGestureHandler',
  State: {},
  Directions: {},
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
}));

// 콘솔 경고 무시 (테스트 출력 정리용)
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Animated') ||
      args[0].includes('NativeModule') ||
      args[0].includes('Require cycle'))
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};
