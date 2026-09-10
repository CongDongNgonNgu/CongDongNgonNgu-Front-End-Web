import type {
  LanguageCatalogItem,
  OwnProfile,
  ProfileLanguageResponse,
  ProfileUpdateInput,
} from '../onboarding/onboarding.types';

export type PublicProfileLanguage = Omit<ProfileLanguageResponse, 'visibility'>;

export interface PublicProfile {
  scope: 'public';
  user: {
    id: string;
    displayName: string;
  };
  languages: PublicProfileLanguage[];
  goals: string[];
  skills: OwnProfile['skills'];
  interests: string[];
}

export interface PassportApi {
  getLanguages: () => Promise<LanguageCatalogItem[]>;
  getProfile: () => Promise<OwnProfile>;
  updateProfile: (input: ProfileUpdateInput) => Promise<OwnProfile>;
  getPublicProfile: (userId: string) => Promise<PublicProfile>;
}
