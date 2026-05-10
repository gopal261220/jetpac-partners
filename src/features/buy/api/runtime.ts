import { NativeModules, Platform } from 'react-native';

const LOCAL_API_PORT = 3081;

function getBundleHostname() {
  const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;

  if (!scriptURL) {
    return null;
  }

  try {
    return new URL(scriptURL).hostname;
  } catch {
    return null;
  }
}

export function getCandidateApiBaseUrls() {
  const endpoints = [`http://localhost:${LOCAL_API_PORT}`];

  if (__DEV__ && Platform.OS !== 'web') {
    const bundleHostname = getBundleHostname();

    if (bundleHostname && bundleHostname !== 'localhost' && bundleHostname !== '127.0.0.1') {
      endpoints.unshift(`http://${bundleHostname}:${LOCAL_API_PORT}`);
    }
  }

  return Array.from(new Set(endpoints));
}
