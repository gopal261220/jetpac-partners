module.exports = ({ config }) => {
  const extra = {
    EXPO_PUBLIC_NODE_ENV: 'development',
    EXPO_PUBLIC_AUTH0_DOMAIN: 'jetpac-staging.us.auth0.com',
    EXPO_PUBLIC_AUTH0_CLIENT_ID: 'LgRtBgww2vqBSDG6WVTLIh7TlWbZBhl1',
  };

  return {
    ...config,
    name: 'jetpac-partners',
    slug: 'jetpac-partners',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: 'jetpacpartners',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'co.circles.jetpacpartners',
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsArbitraryLoadsInWebContent: true,
          NSAllowsLocalNetworking: true,
          NSExceptionDomains: {
            'onrender.com': {
              NSIncludesSubdomains: true,
              NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
              NSTemporaryExceptionMinimumTLSVersion: 'TLSv1.0',
            },
            'b2b-enterprise-portal.onrender.com': {
              NSIncludesSubdomains: true,
              NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
              NSTemporaryExceptionMinimumTLSVersion: 'TLSv1.0',
            },
          },
        },
      },
    },
    android: {
      package: 'co.circles.jetpacpartners',
      permissions: ['INTERNET'],
      usesCleartextTraffic: true,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra,
    plugins: [
      'expo-dev-client',
      [
        'react-native-auth0',
        {
          domain: extra.EXPO_PUBLIC_AUTH0_DOMAIN,
          customScheme: 'jetpacpartners',
        },
      ],
    ],
  };
};
