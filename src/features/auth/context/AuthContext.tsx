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

import { setCurrentTenantId } from '../../../constants/app';
import { fetchTenantByEmail } from '../api/tenant';
import {
  AUTH0_AUDIENCE,
  AUTH0_SCOPE,
  getAuth0Config,
  getUnsupportedAuthMessage,
} from '../config/auth0';
import { TenantAccessError } from '../errors';
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  type Session,
  type SessionTenant,
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
  tenant,
  user,
}: {
  credentials: Credentials;
  email: string;
  tenant: SessionTenant;
  user?: SessionUser | null;
}): Session {
  return {
    email,
    tenantId: tenant.id,
    tenant,
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
        setCurrentTenantId(null);
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
          setCurrentTenantId(null);
          await clearStoredSession();

          if (isMounted) {
            setSession(null);
          }

          return;
        }

        const credentials = await getCredentials(AUTH0_SCOPE, 60, {}, false);
        const normalizedEmail = normalizeEmail(storedSession?.email ?? user?.email ?? '');
        const storedTenant =
          storedSession?.tenant && typeof storedSession.tenant.id === 'number'
            ? storedSession.tenant
            : null;
        const tenantProfile =
          storedTenant ??
          (typeof storedSession?.tenantId === 'number'
            ? {
                id: storedSession.tenantId,
              }
            : await fetchTenantByEmail(normalizedEmail));

        if (!tenantProfile) {
          await clearStoredSession();
          await clearCredentials();
          setCurrentTenantId(null);

          if (isMounted) {
            setSession(null);
          }

          return;
        }

        const nextSession = buildSession({
          credentials,
          email: normalizedEmail,
          tenant: tenantProfile,
          user,
        });

        await setStoredSession(nextSession);
        setCurrentTenantId(tenantProfile.id);

        if (isMounted) {
          setSession(nextSession);
        }
      } catch {
        setCurrentTenantId(null);
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
  }, []);

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
        const tenantProfile = await fetchTenantByEmail(normalizedEmail);

        if (!tenantProfile) {
          await clearCredentials();
          await clearStoredSession();
          setCurrentTenantId(null);
          throw new TenantAccessError(
            'No tenant is registered for this email address. Please use a registered email or contact jetpacenterprise.com for access.'
          );
        }

        const nextSession = buildSession({
          credentials,
          email: normalizedEmail,
          tenant: tenantProfile,
          user,
        });

        await setStoredSession(nextSession);
        setCurrentTenantId(tenantProfile.id);
        setSession(nextSession);
      },
      async signOut() {
        await clearCredentials();
        await clearStoredSession();
        setCurrentTenantId(null);
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
