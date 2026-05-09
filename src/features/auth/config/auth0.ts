import Constants from 'expo-constants';

export const AUTH0_AUDIENCE = 'https://www.jetpacglobal.com';
export const AUTH0_SCOPE =
  'openid name user_email profile offline_access create:current_user_metadata read:current_user';
export const AUTH0_CUSTOM_SCHEME = 'jetpacpartners';

type Auth0ExtraConfig = {
  EXPO_PUBLIC_NODE_ENV?: string;
  EXPO_PUBLIC_AUTH0_DOMAIN?: string;
  EXPO_PUBLIC_AUTH0_CLIENT_ID?: string;
};

export function getAuth0Config() {
  const extra = (Constants.expoConfig?.extra ?? {}) as Auth0ExtraConfig;

  return {
    nodeEnv: extra.EXPO_PUBLIC_NODE_ENV ?? 'development',
    domain: extra.EXPO_PUBLIC_AUTH0_DOMAIN ?? '',
    clientId: extra.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? '',
  };
}

export function getUnsupportedAuthMessage() {
  if (Constants.executionEnvironment === 'storeClient') {
    return 'This login flow needs a development build. Expo Go does not support the native Auth0 SDK.';
  }

  return 'This login flow is only available in native development builds.';
}
