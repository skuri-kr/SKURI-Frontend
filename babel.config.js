module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.ios.ts', '.android.ts', '.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@': './src',
          '@/app': './src/app',
          '@/shared': './src/shared',
          '@/features': './src/features',
        },
      },
    ],
    'react-native-worklets/plugin',
  ],
};
