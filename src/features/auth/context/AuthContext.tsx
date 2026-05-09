import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  type Session,
} from '../storage/sessionStorage';

const DUMMY_OTP = '123456';

type AuthContextValue = {
  isBootstrapping: boolean;
  session: Session | null;
  requestOtp: (email: string) => Promise<string>;
  signInWithOtp: (email: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedSession = await getStoredSession();

        if (storedSession) {
          setSession(storedSession);
        }
      } finally {
        setIsBootstrapping(false);
      }
    }

    restoreSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isBootstrapping,
      session,
      async requestOtp(email: string) {
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !normalizedEmail.includes('@')) {
          throw new Error('Enter a valid email address to continue.');
        }

        await wait(500);
        return normalizedEmail;
      },
      async signInWithOtp(email: string, otp: string) {
        if (otp.trim() !== DUMMY_OTP) {
          throw new Error('Use the demo OTP 123456 to sign in.');
        }

        const nextSession = { email: normalizeEmail(email) };

        await wait(300);
        await setStoredSession(nextSession);
        setSession(nextSession);
      },
      async signOut() {
        await clearStoredSession();
        setSession(null);
      },
    }),
    [isBootstrapping, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return value;
}
