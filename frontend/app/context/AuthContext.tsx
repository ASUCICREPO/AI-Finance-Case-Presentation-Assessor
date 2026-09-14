'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { config } from '../config/config';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export type UserRole = 'student' | 'ta' | 'instructor';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userRole: UserRole;
  userGroup: string | null;
  userCourse: string | null;
  userSessionNumber: string | null;
  userGroupNumber: string | null;
  idToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    group?: string,
    course?: string
  ) => Promise<{ userConfirmed: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}

// ──────────────────────────────────────────────────────────
// Cognito Pool Config
// ──────────────────────────────────────────────────────────

const userPool = new CognitoUserPool({
  UserPoolId: config.userPoolId || 'us-east-1_placeholder',
  ClientId: config.userPoolClientId || 'placeholder',
});

// ──────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('student');
  const [userGroup, setUserGroup] = useState<string | null>(null);
  const [userCourse, setUserCourse] = useState<string | null>(null);
  const [userSessionNumber, setUserSessionNumber] = useState<string | null>(null);
  const [userGroupNumber, setUserGroupNumber] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  // ── Extract user attributes from session ────────────────
  const extractUserData = useCallback((session: CognitoUserSession) => {
    const payload = session.getIdToken().decodePayload();
    const token = session.getIdToken().getJwtToken();

    setIdToken(token);
    setUserId(payload.sub || null);
    setUserEmail(payload.email || null);
    setUserName(
      [payload.given_name, payload.family_name].filter(Boolean).join(' ') || payload.email || null
    );
    setUserRole((payload['custom:role'] as UserRole) || 'student');
    setUserGroup(payload['custom:group'] || null);
    setUserCourse(payload['custom:course'] || null);
    // Session and group numbers for assignment grouping
    setUserSessionNumber(payload['custom:sessionNumber'] || '1');
    setUserGroupNumber(payload['custom:groupNumber'] || '1');
    setIsAuthenticated(true);

    // Store token for API service layer
    localStorage.setItem('auth_id_token', token);
  }, []);

  // ── Check existing session on mount ─────────────────────
  useEffect(() => {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        localStorage.removeItem('auth_id_token');
        setIsLoading(false);
        return;
      }
      extractUserData(session);
      setIsLoading(false);
    });
  }, [extractUserData]);

  // ── Login ───────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session) => {
          extractUserData(session);
          resolve();
        },
        onFailure: (err) => {
          reject(new Error(err.message || 'Authentication failed'));
        },
        newPasswordRequired: () => {
          reject(new Error('New password required. Please contact your instructor.'));
        },
      });
    });
  };

  // ── Sign Up ─────────────────────────────────────────────
  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    group?: string,
    course?: string
  ): Promise<{ userConfirmed: boolean }> => {
    return new Promise((resolve, reject) => {
      const nameParts = name.split(' ');
      const givenName = nameParts[0] || name;
      const familyName = nameParts.slice(1).join(' ') || name;

      const attributes: CognitoUserAttribute[] = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'given_name', Value: givenName }),
        new CognitoUserAttribute({ Name: 'family_name', Value: familyName }),
        new CognitoUserAttribute({ Name: 'custom:role', Value: role }),
      ];

      if (group) {
        attributes.push(new CognitoUserAttribute({ Name: 'custom:group', Value: group }));
      }
      if (course) {
        attributes.push(new CognitoUserAttribute({ Name: 'custom:course', Value: course }));
      }

      userPool.signUp(email, password, attributes, [], (err, result) => {
        if (err) {
          reject(new Error(err.message || 'Sign up failed'));
          return;
        }
        resolve({ userConfirmed: result?.userConfirmed ?? false });
      });
    });
  };

  // ── Confirm Sign Up ─────────────────────────────────────
  const confirmSignUp = async (email: string, code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) {
          reject(new Error(err.message || 'Confirmation failed'));
          return;
        }
        resolve();
      });
    });
  };

  // ── Forgot Password ─────────────────────────────────────
  const forgotPassword = async (email: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.forgotPassword({
        onSuccess: () => resolve(),
        onFailure: (err) => reject(new Error(err.message || 'Failed to send reset code')),
      });
    });
  };

  // ── Confirm Forgot Password ─────────────────────────────
  const confirmForgotPassword = async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => resolve(),
        onFailure: (err) => reject(new Error(err.message || 'Password reset failed')),
      });
    });
  };

  // ── Logout ──────────────────────────────────────────────
  const logout = () => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
    localStorage.removeItem('auth_id_token');
    setIsAuthenticated(false);
    setIdToken(null);
    setUserId(null);
    setUserEmail(null);
    setUserName(null);
    setUserRole('student');
    setUserGroup(null);
    setUserCourse(null);
    setUserSessionNumber(null);
    setUserGroupNumber(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userId,
        userEmail,
        userName,
        userRole,
        userGroup,
        userCourse,
        userSessionNumber,
        userGroupNumber,
        idToken,
        login,
        logout,
        signUp,
        confirmSignUp,
        forgotPassword,
        confirmForgotPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
