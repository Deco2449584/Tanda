/** Loads .env locally; on EAS cloud builds variables come from eas env (preview/production). */
require('dotenv').config();

const appJson = require('./app.json');

const FIREBASE_ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

function getMissingFirebaseEnvKeys() {
  return FIREBASE_ENV_KEYS.filter((key) => !process.env[key]?.trim());
}

module.exports = () => {
  const missing = getMissingFirebaseEnvKeys();

  if (process.env.EAS_BUILD === 'true' && missing.length > 0) {
    throw new Error(
      [
        'Missing Firebase env for EAS build:',
        missing.join(', '),
        '',
        'Run: npm run eas:env:push   (requires a filled .env file)',
        'Then rebuild: npm run build:android:apk',
      ].join('\n'),
    );
  }

  return {
    ...appJson.expo,
    plugins: [...(appJson.expo.plugins ?? []), 'react-native-compressor'],
    extra: {
      ...appJson.expo.extra,
      firebaseEnvReady: missing.length === 0,
    },
  };
};
