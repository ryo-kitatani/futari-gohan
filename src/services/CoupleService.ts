import { DatabaseProvider, Couple, CoupleUser, Preference } from '../interfaces/database';
import { AuthProvider } from '../interfaces/auth';

export class CoupleService {
  private database: DatabaseProvider;
  private auth: AuthProvider;

  constructor(database: DatabaseProvider, auth: AuthProvider) {
    this.database = database;
    this.auth = auth;
  }

  async getOrCreateDbUser(): Promise<CoupleUser | null> {
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) return null;

    return this.database.getOrCreateUser(
      currentUser.id,
      currentUser.email,
      currentUser.name
    );
  }

  async hasUserJoinedCouple(): Promise<boolean> {
    const dbUser = await this.getOrCreateDbUser();
    return !!dbUser?.coupleId;
  }

  async createCouple(): Promise<Couple> {
    const dbUser = await this.getOrCreateDbUser();
    if (!dbUser) throw new Error('User not authenticated');

    return this.database.createCouple(dbUser.id);
  }

  async joinCouple(inviteCode: string): Promise<Couple> {
    const dbUser = await this.getOrCreateDbUser();
    if (!dbUser) throw new Error('User not authenticated');

    return this.database.joinCouple(inviteCode, dbUser.id);
  }

  async getCurrentCouple(): Promise<Couple | null> {
    const dbUser = await this.getOrCreateDbUser();
    if (!dbUser?.coupleId) return null;

    return this.database.getCouple(dbUser.coupleId);
  }

  async getCoupleMembers(): Promise<CoupleUser[]> {
    const dbUser = await this.getOrCreateDbUser();
    if (!dbUser?.coupleId) return [];

    return this.database.getCoupleMembers(dbUser.coupleId);
  }

  async updateUserProfile(updates: { name?: string; emoji?: string }): Promise<CoupleUser> {
    const dbUser = await this.getOrCreateDbUser();
    if (!dbUser) throw new Error('User not authenticated');

    return this.database.updateUser(dbUser.id, updates);
  }

  // Preference management
  async getPreferences(): Promise<Preference[]> {
    const dbUser = await this.getOrCreateDbUser();
    if (!dbUser?.coupleId) return [];

    return this.database.getPreferences(dbUser.coupleId);
  }

  async addPreference(
    type: 'like' | 'dislike' | 'allergy',
    item: string,
    severity?: 'high' | 'medium' | 'low'
  ): Promise<Preference> {
    const dbUser = await this.getOrCreateDbUser();
    if (!dbUser?.coupleId) throw new Error('User not in a couple');

    return this.database.addPreference({
      userId: dbUser.id,
      coupleId: dbUser.coupleId,
      type,
      item,
      severity,
    });
  }

  async deletePreference(id: string): Promise<void> {
    return this.database.deletePreference(id);
  }

  // Recipe management
  async getRecipes() {
    const dbUser = await this.getOrCreateDbUser();
    if (!dbUser?.coupleId) return [];

    return this.database.getRecipes(dbUser.coupleId);
  }

  async createRecipe(recipeData: Parameters<DatabaseProvider['createRecipe']>[0]) {
    return this.database.createRecipe(recipeData);
  }

  // Record management
  async getRecords() {
    const dbUser = await this.getOrCreateDbUser();
    if (!dbUser?.coupleId) return [];

    return this.database.getRecords(dbUser.coupleId);
  }

  async createRecord(recordData: Parameters<DatabaseProvider['createRecord']>[0]) {
    return this.database.createRecord(recordData);
  }

  // Reaction management
  async addReaction(recordId: string, emoji: string, comment?: string) {
    const dbUser = await this.getOrCreateDbUser();
    if (!dbUser) throw new Error('User not authenticated');

    return this.database.addReaction({
      recordId,
      userId: dbUser.id,
      emoji,
      comment,
    });
  }

  async getReactions(recordId: string) {
    return this.database.getReactions(recordId);
  }

  // Photo upload
  async uploadPhoto(fileUri: string): Promise<string> {
    const dbUser = await this.getOrCreateDbUser();
    if (!dbUser?.coupleId) throw new Error('User not in a couple');

    // SupabaseProvider固有のメソッドを呼び出す
    const provider = this.database as any;
    if (typeof provider.uploadPhoto !== 'function') {
      throw new Error('Photo upload not supported');
    }

    return provider.uploadPhoto(fileUri, dbUser.coupleId);
  }
}
