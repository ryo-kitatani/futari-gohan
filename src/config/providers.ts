export type AuthProviderType = 'clerk';
export type DatabaseProviderType = 'supabase';

export interface AppConfig {
  auth: {
    provider: AuthProviderType;
    publishableKey?: string;
  };
  database: {
    provider: DatabaseProviderType;
    url?: string;
    anonKey?: string;
  };
  ai: {
    geminiApiKey?: string;
  };
}

export const defaultConfig: AppConfig = {
  auth: {
    provider: 'clerk',
  },
  database: {
    provider: 'supabase',
  },
  ai: {},
};

export const getConfig = (): AppConfig => ({
  auth: {
    provider: 'clerk',
    publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  database: {
    provider: 'supabase',
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  ai: {
    geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
  },
});
