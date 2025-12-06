import { DatabaseProvider } from '../interfaces/database';
import { AuthProvider } from '../interfaces/auth';
import { getConfig } from '../config/providers';
import { ClerkAuthProvider } from '../providers/ClerkAuthProvider';
import { SupabaseProvider } from '../providers/SupabaseProvider';
import { CoupleService } from './CoupleService';
import { GeminiService } from './GeminiService';

class ServiceProviderClass {
  private _databaseProvider: DatabaseProvider | null = null;
  private _authProvider: AuthProvider | null = null;
  private _coupleService: CoupleService | null = null;
  private _geminiService: GeminiService | null = null;
  private _currentUser: any = null;

  get databaseProvider(): DatabaseProvider {
    if (!this._databaseProvider) {
      this._databaseProvider = this.createDatabaseProvider();
    }
    return this._databaseProvider;
  }

  get authProvider(): AuthProvider {
    if (!this._authProvider) {
      this._authProvider = new ClerkAuthProvider();
    }
    return this._authProvider;
  }

  get coupleService(): CoupleService {
    if (!this._coupleService) {
      this._coupleService = new CoupleService(this.databaseProvider, this.authProvider);
    }
    return this._coupleService;
  }

  get geminiService(): GeminiService {
    if (!this._geminiService) {
      const config = getConfig();
      this._geminiService = new GeminiService(config.ai.geminiApiKey || '');
    }
    return this._geminiService;
  }

  private createDatabaseProvider(): DatabaseProvider {
    const config = getConfig();

    if (!config.database.url || !config.database.anonKey) {
      throw new Error('Supabase configuration is missing');
    }
    return new SupabaseProvider(config.database.url, config.database.anonKey);
  }

  async setAuthToken(token: string) {
    if (this._databaseProvider && 'setAuthToken' in this._databaseProvider) {
      (this._databaseProvider as any).setAuthToken(token);
    }
  }

  setCurrentUser(user: any) {
    this._currentUser = user;
  }

  getCurrentUser() {
    return this._currentUser;
  }
}

export const ServiceProvider = new ServiceProviderClass();
