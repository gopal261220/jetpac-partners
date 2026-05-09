import Constants from 'expo-constants';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';
import { Auth0Provider, useAuth0, type Credentials } from 'react-native-auth0';

import {
  AUTH0_AUDIENCE,
  AUTH0_SCOPE,
  getAuth0Config,
  getUnsupportedAuthMessage,
} from '../config/auth0';
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  type Session,
  type SessionUser,
} from '../storage/sessionStorage';

type AuthContextValue = {
  isBootstrapping: boolean;
  isNativeAuthSupported: boolean;
  unsupportedMessage: string | null;
  session: Session | null;
  sendEmailOtp: (email: string) => Promise<string>;
  signInWithOtp: (email: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapUser(user?: SessionUser | null): SessionUser | null {
  if (!user) {
    return null;
  }

  return {
    sub: user.sub,
    name: user.name,
    givenName: user.givenName,
    familyName: user.familyName,
    email: user.email,
    picture: user.picture,
  };
}

function buildSession({
  credentials,
  email,
  user,
}: {
  credentials: Credentials;
  email: string;
  user?: SessionUser | null;
}): Session {
  return {
    email,
    accessToken: credentials.accessToken,
    idToken: credentials.idToken,
    tokenType: credentials.tokenType,
    expiresAt: credentials.expiresAt,
    refreshToken: credentials.refreshToken,
    scope: credentials.scope,
    user: mapUser(user),
  };
}

function UnsupportedAuthProvider({ children }: PropsWithChildren) {
  const value = useMemo<AuthContextValue>(
    () => ({
      isBootstrapping: false,
      isNativeAuthSupported: false,
      unsupportedMessage: getUnsupportedAuthMessage(),
      session: null,
      async sendEmailOtp() {
        throw new Error(getUnsupportedAuthMessage());
      },
      async signInWithOtp() {
        throw new Error(getUnsupportedAuthMessage());
      },
      async signOut() {
        await clearStoredSession();
      },
    }),
    []
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function AuthStateProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const { authorizeWithEmail, clearCredentials, getCredentials, hasValidCredentials, sendEmailCode, user } =
    useAuth0();

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedSession = await getStoredSession();
        const hasValidSession = await hasValidCredentials(60);

        if (!hasValidSession) {
          await clearStoredSession();

          if (isMounted) {
            setSession(null);
          }

          return;
        }

        const credentials = await getCredentials(AUTH0_SCOPE, 60, {}, false);
        const nextSession = buildSession({
          credentials,
          email: storedSession?.email ?? user?.email ?? '',
          user,
        });

        await setStoredSession(nextSession);

        if (isMounted) {
          setSession(nextSession);
        }
      } catch {
        await clearStoredSession();

        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [getCredentials, hasValidCredentials, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isBootstrapping,
      isNativeAuthSupported: true,
      unsupportedMessage: null,
      session,
      async sendEmailOtp(email: string) {
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !normalizedEmail.includes('@')) {
          throw new Error('Enter a valid email address to continue.');
        }

        await sendEmailCode({
          email: normalizedEmail,
          send: 'code',
        });

        return normalizedEmail;
      },
      async signInWithOtp(email: string, otp: string) {
        const normalizedEmail = normalizeEmail(email);
        const otpTrimmed = otp.trim();

        if (otpTrimmed.length !== 6) {
          throw new Error('Enter the 6-digit verification code.');
        }

        const credentials =
          (await authorizeWithEmail({
            email: normalizedEmail,
            code: otpTrimmed,
            audience: AUTH0_AUDIENCE,
            scope: AUTH0_SCOPE,
          })) ?? (await getCredentials(AUTH0_SCOPE, 60, {}, false));

        const nextSession = buildSession({
          credentials,
          email: normalizedEmail,
          user,
        });

        await setStoredSession(nextSession);
        setSession(nextSession);
      },
      async signOut() {
        await clearCredentials();
        await clearStoredSession();
        setSession(null);
      },
    }),
    [
      authorizeWithEmail,
      clearCredentials,
      getCredentials,
      isBootstrapping,
      sendEmailCode,
      session,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { clientId, domain } = getAuth0Config();
  const isNativeAuthSupported =
    Platform.OS !== 'web' &&
    Constants.executionEnvironment !== 'storeClient' &&
    Boolean(domain) &&
    Boolean(clientId);

  if (!isNativeAuthSupported) {
    return <UnsupportedAuthProvider>{children}</UnsupportedAuthProvider>;
  }

  return (
    <Auth0Provider clientId={clientId} domain={domain}>
      <AuthStateProvider>{children}</AuthStateProvider>
    </Auth0Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return value;
}
