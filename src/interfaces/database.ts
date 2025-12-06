export interface Couple {
  id: string;
  name?: string;
  inviteCode: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CoupleUser {
  id: string;
  clerkId: string;
  email?: string;
  name: string;
  emoji: string;
  coupleId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InviteCode {
  id: string;
  code: string;
  coupleId: string;
  createdBy: string;
  usedBy?: string;
  usedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface Preference {
  id: string;
  userId: string;
  coupleId: string;
  type: 'like' | 'dislike' | 'allergy';
  item: string;
  severity?: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  name: string;
  amount?: string;
  orderIndex: number;
}

export interface Recipe {
  id: string;
  coupleId: string;
  title: string;
  emoji: string;
  description?: string;
  sourceType: 'url' | 'photo' | 'ai' | 'manual';
  sourceUrl?: string;
  sourceSiteName?: string;
  steps?: string[];
  cookTime?: number;
  servings: number;
  calories?: number;
  category?: string;
  tags?: string[];
  matchScoreTotal?: number;
  matchScores?: Record<string, { score: number; reason: string }>;
  warnings?: Array<{ userId: string; item: string; type: 'allergy' | 'dislike' }>;
  cookedCount: number;
  lastCookedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  ingredients?: RecipeIngredient[];
}

export interface CookingRecord {
  id: string;
  coupleId: string;
  recipeId?: string;
  dishName: string;
  emoji?: string;
  photoUrl?: string;
  photoRecognition?: {
    dishName: string;
    ingredients: string[];
    calories?: number;
    cookingMethod?: string;
    category?: string;
  };
  memo?: string;
  cookedAt: string;
  createdBy?: string;
  createdAt: string;
}

export interface Reaction {
  id: string;
  recordId: string;
  userId: string;
  emoji: string;
  comment?: string;
  createdAt: string;
}

export interface DatabaseProvider {
  // Couple operations
  createCouple(userId: string): Promise<Couple>;
  joinCouple(inviteCode: string, userId: string): Promise<Couple>;
  getCouple(coupleId: string): Promise<Couple | null>;
  getCoupleMembers(coupleId: string): Promise<CoupleUser[]>;

  // User operations
  getOrCreateUser(clerkId: string, email?: string, name?: string): Promise<CoupleUser>;
  getUserByClerkId(clerkId: string): Promise<CoupleUser | null>;
  updateUser(userId: string, updates: Partial<CoupleUser>): Promise<CoupleUser>;

  // Preference operations
  getPreferences(coupleId: string): Promise<Preference[]>;
  addPreference(preference: Omit<Preference, 'id' | 'createdAt'>): Promise<Preference>;
  deletePreference(id: string): Promise<void>;

  // Recipe operations
  getRecipes(coupleId: string): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | null>;
  createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'cookedCount'>): Promise<Recipe>;
  updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe>;
  deleteRecipe(id: string): Promise<void>;

  // Record operations
  getRecords(coupleId: string): Promise<CookingRecord[]>;
  createRecord(record: Omit<CookingRecord, 'id' | 'createdAt'>): Promise<CookingRecord>;

  // Reaction operations
  addReaction(reaction: Omit<Reaction, 'id' | 'createdAt'>): Promise<Reaction>;
  getReactions(recordId: string): Promise<Reaction[]>;

  // Invite code
  generateInviteCode(): string;
}
