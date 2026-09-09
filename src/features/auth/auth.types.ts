export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  status: 'ACTIVE' | 'VERIFICATION_PENDING' | 'DISABLED';
  emailVerified: boolean;
  roles: string[];
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

export interface ProviderCapability {
  name: 'google' | 'facebook' | 'zalo' | 'apple';
  enabled: boolean;
}

export interface ProviderCapabilities {
  providers: ProviderCapability[];
}

export interface RegistrationResult {
  verificationRequired: true;
}

export interface SimpleAuthResult {
  verified?: true;
  sent?: true;
  reset?: true;
  loggedOut?: true;
}
