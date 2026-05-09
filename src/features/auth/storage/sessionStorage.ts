import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'jetpac-partners.session';

export type Session = {
  email: string;
};

export async function getStoredSession() {
  const rawSession = await AsyncStorage.getItem(SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as Session;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function setStoredSession(session: Session) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
