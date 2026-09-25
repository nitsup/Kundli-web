export type UserRole = 'user' | 'pandit' | 'admin';

export type BirthTimeAccuracy = 'exact' | 'approximate' | 'unknown';

export type FeatureName =
  | 'kundli_generation'
  | 'panchang_access'
  | 'matching_analysis'
  | 'ai_chat'
  | 'report_generation';

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  language: string;
  timezone: string;
  avatar_url?: string;
}

export interface BirthProfile {
  id: string;
  owner_id: string;
  name: string;
  date_of_birth: string;
  time_of_birth: string;
  birth_time_accuracy: BirthTimeAccuracy;
  latitude: number;
  longitude: number;
  timezone: string;
  notes?: string;
}

export interface LocationRecord {
  country: string;
  state?: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}
