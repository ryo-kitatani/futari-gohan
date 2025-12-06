import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import {
  DatabaseProvider,
  Couple,
  CoupleUser,
  Preference,
  Recipe,
  CookingRecord,
  Reaction,
} from '../interfaces/database';

export class SupabaseProvider implements DatabaseProvider {
  private supabase: SupabaseClient;
  private url: string;
  private anonKey: string;

  constructor(url: string, anonKey: string) {
    this.url = url;
    this.anonKey = anonKey;
    this.supabase = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });
  }

  setAuthToken(token: string) {
    this.supabase = createClient(this.url, this.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  // Couple operations
  async createCouple(userId: string): Promise<Couple> {
    const inviteCode = this.generateInviteCode();

    const { data: couple, error: coupleError } = await this.supabase
      .from('couples')
      .insert({ name: null })
      .select()
      .single();

    if (coupleError) throw coupleError;

    // Create invite code
    const { error: inviteError } = await this.supabase.from('invite_codes').insert({
      code: inviteCode,
      couple_id: couple.id,
      created_by: userId,
    });

    if (inviteError) throw inviteError;

    // Update user with couple_id
    const { error: userError } = await this.supabase
      .from('users')
      .update({ couple_id: couple.id })
      .eq('id', userId);

    if (userError) throw userError;

    return {
      id: couple.id,
      name: couple.name,
      inviteCode: inviteCode,
      createdAt: couple.created_at,
      updatedAt: couple.updated_at,
    };
  }

  async joinCouple(inviteCode: string, userId: string): Promise<Couple> {
    // Find invite code
    const { data: invite, error: inviteError } = await this.supabase
      .from('invite_codes')
      .select('*, couples(*)')
      .eq('code', inviteCode.toUpperCase())
      .is('used_by', null)
      .single();

    if (inviteError || !invite) throw new Error('Invalid invite code');

    // Mark invite as used
    const { error: updateInviteError } = await this.supabase
      .from('invite_codes')
      .update({
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (updateInviteError) throw updateInviteError;

    // Update user with couple_id
    const { error: userError } = await this.supabase
      .from('users')
      .update({ couple_id: invite.couple_id })
      .eq('id', userId);

    if (userError) throw userError;

    return {
      id: invite.couples.id,
      name: invite.couples.name,
      inviteCode: inviteCode,
      createdAt: invite.couples.created_at,
      updatedAt: invite.couples.updated_at,
    };
  }

  async getCouple(coupleId: string): Promise<Couple | null> {
    const { data, error } = await this.supabase
      .from('couples')
      .select('*, invite_codes(code)')
      .eq('id', coupleId)
      .single();

    if (error) return null;

    return {
      id: data.id,
      name: data.name,
      inviteCode: data.invite_codes?.[0]?.code || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getCoupleMembers(coupleId: string): Promise<CoupleUser[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('couple_id', coupleId);

    if (error) throw error;

    return (
      data?.map((u) => ({
        id: u.id,
        clerkId: u.clerk_id,
        email: u.email,
        name: u.name,
        emoji: u.emoji || '👤',
        coupleId: u.couple_id,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      })) || []
    );
  }

  // User operations
  async getOrCreateUser(clerkId: string, email?: string, name?: string): Promise<CoupleUser> {
    // Try to get existing user
    const existing = await this.getUserByClerkId(clerkId);
    if (existing) return existing;

    // Create new user
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        clerk_id: clerkId,
        email: email,
        name: name || 'ユーザー',
        emoji: '👤',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clerkId: data.clerk_id,
      email: data.email,
      name: data.name,
      emoji: data.emoji,
      coupleId: data.couple_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getUserByClerkId(clerkId: string): Promise<CoupleUser | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (error) return null;

    return {
      id: data.id,
      clerkId: data.clerk_id,
      email: data.email,
      name: data.name,
      emoji: data.emoji,
      coupleId: data.couple_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateUser(userId: string, updates: Partial<CoupleUser>): Promise<CoupleUser> {
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
    if (updates.email !== undefined) dbUpdates.email = updates.email;

    const { data, error } = await this.supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clerkId: data.clerk_id,
      email: data.email,
      name: data.name,
      emoji: data.emoji,
      coupleId: data.couple_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Preference operations
  async getPreferences(coupleId: string): Promise<Preference[]> {
    const { data, error } = await this.supabase
      .from('preferences')
      .select('*')
      .eq('couple_id', coupleId);

    if (error) throw error;

    return (
      data?.map((p) => ({
        id: p.id,
        userId: p.user_id,
        coupleId: p.couple_id,
        type: p.type,
        item: p.item,
        severity: p.severity,
        createdAt: p.created_at,
      })) || []
    );
  }

  async addPreference(
    preference: Omit<Preference, 'id' | 'createdAt'>
  ): Promise<Preference> {
    const { data, error } = await this.supabase
      .from('preferences')
      .insert({
        user_id: preference.userId,
        couple_id: preference.coupleId,
        type: preference.type,
        item: preference.item,
        severity: preference.severity,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      coupleId: data.couple_id,
      type: data.type,
      item: data.item,
      severity: data.severity,
      createdAt: data.created_at,
    };
  }

  async deletePreference(id: string): Promise<void> {
    const { error } = await this.supabase.from('preferences').delete().eq('id', id);
    if (error) throw error;
  }

  // Recipe operations
  async getRecipes(coupleId: string): Promise<Recipe[]> {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (
      data?.map((r) => ({
        id: r.id,
        coupleId: r.couple_id,
        title: r.title,
        emoji: r.emoji || '🍽️',
        description: r.description,
        sourceType: r.source_type,
        sourceUrl: r.source_url,
        sourceSiteName: r.source_site_name,
        steps: r.steps,
        cookTime: r.cook_time,
        servings: r.servings || 2,
        calories: r.calories,
        category: r.category,
        tags: r.tags,
        matchScoreTotal: r.match_score_total,
        matchScores: r.match_scores,
        warnings: r.warnings,
        cookedCount: r.cooked_count || 0,
        lastCookedAt: r.last_cooked_at,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        ingredients: r.recipe_ingredients?.map((i: any) => ({
          id: i.id,
          recipeId: i.recipe_id,
          name: i.name,
          amount: i.amount,
          orderIndex: i.order_index,
        })),
      })) || []
    );
  }

  async getRecipe(id: string): Promise<Recipe | null> {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .eq('id', id)
      .single();

    if (error) return null;

    return {
      id: data.id,
      coupleId: data.couple_id,
      title: data.title,
      emoji: data.emoji || '🍽️',
      description: data.description,
      sourceType: data.source_type,
      sourceUrl: data.source_url,
      sourceSiteName: data.source_site_name,
      steps: data.steps,
      cookTime: data.cook_time,
      servings: data.servings || 2,
      calories: data.calories,
      category: data.category,
      tags: data.tags,
      matchScoreTotal: data.match_score_total,
      matchScores: data.match_scores,
      warnings: data.warnings,
      cookedCount: data.cooked_count || 0,
      lastCookedAt: data.last_cooked_at,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      ingredients: data.recipe_ingredients?.map((i: any) => ({
        id: i.id,
        recipeId: i.recipe_id,
        name: i.name,
        amount: i.amount,
        orderIndex: i.order_index,
      })),
    };
  }

  async createRecipe(
    recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'cookedCount'>
  ): Promise<Recipe> {
    const { ingredients, ...recipeData } = recipe;

    const { data, error } = await this.supabase
      .from('recipes')
      .insert({
        couple_id: recipeData.coupleId,
        title: recipeData.title,
        emoji: recipeData.emoji,
        description: recipeData.description,
        source_type: recipeData.sourceType,
        source_url: recipeData.sourceUrl,
        source_site_name: recipeData.sourceSiteName,
        steps: recipeData.steps,
        cook_time: recipeData.cookTime,
        servings: recipeData.servings,
        calories: recipeData.calories,
        category: recipeData.category,
        tags: recipeData.tags,
        match_score_total: recipeData.matchScoreTotal,
        match_scores: recipeData.matchScores,
        warnings: recipeData.warnings,
        created_by: recipeData.createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert ingredients if provided
    if (ingredients && ingredients.length > 0) {
      const { error: ingredientError } = await this.supabase
        .from('recipe_ingredients')
        .insert(
          ingredients.map((i, index) => ({
            recipe_id: data.id,
            name: i.name,
            amount: i.amount,
            order_index: index,
          }))
        );

      if (ingredientError) throw ingredientError;
    }

    return this.getRecipe(data.id) as Promise<Recipe>;
  }

  async updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.steps !== undefined) dbUpdates.steps = updates.steps;
    if (updates.cookTime !== undefined) dbUpdates.cook_time = updates.cookTime;
    if (updates.servings !== undefined) dbUpdates.servings = updates.servings;
    if (updates.calories !== undefined) dbUpdates.calories = updates.calories;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.matchScoreTotal !== undefined)
      dbUpdates.match_score_total = updates.matchScoreTotal;
    if (updates.matchScores !== undefined) dbUpdates.match_scores = updates.matchScores;
    if (updates.warnings !== undefined) dbUpdates.warnings = updates.warnings;
    if (updates.cookedCount !== undefined) dbUpdates.cooked_count = updates.cookedCount;
    if (updates.lastCookedAt !== undefined) dbUpdates.last_cooked_at = updates.lastCookedAt;

    const { error } = await this.supabase.from('recipes').update(dbUpdates).eq('id', id);

    if (error) throw error;

    return this.getRecipe(id) as Promise<Recipe>;
  }

  async deleteRecipe(id: string): Promise<void> {
    const { error } = await this.supabase.from('recipes').delete().eq('id', id);
    if (error) throw error;
  }

  // Record operations
  async getRecords(coupleId: string): Promise<CookingRecord[]> {
    const { data, error } = await this.supabase
      .from('records')
      .select('*')
      .eq('couple_id', coupleId)
      .order('cooked_at', { ascending: false });

    if (error) throw error;

    return (
      data?.map((r) => ({
        id: r.id,
        coupleId: r.couple_id,
        recipeId: r.recipe_id,
        dishName: r.dish_name,
        emoji: r.emoji,
        photoUrl: r.photo_url,
        photoRecognition: r.photo_recognition,
        memo: r.memo,
        cookedAt: r.cooked_at,
        createdBy: r.created_by,
        createdAt: r.created_at,
      })) || []
    );
  }

  async createRecord(
    record: Omit<CookingRecord, 'id' | 'createdAt'>
  ): Promise<CookingRecord> {
    const { data, error } = await this.supabase
      .from('records')
      .insert({
        couple_id: record.coupleId,
        recipe_id: record.recipeId,
        dish_name: record.dishName,
        emoji: record.emoji,
        photo_url: record.photoUrl,
        photo_recognition: record.photoRecognition,
        memo: record.memo,
        cooked_at: record.cookedAt,
        created_by: record.createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      coupleId: data.couple_id,
      recipeId: data.recipe_id,
      dishName: data.dish_name,
      emoji: data.emoji,
      photoUrl: data.photo_url,
      photoRecognition: data.photo_recognition,
      memo: data.memo,
      cookedAt: data.cooked_at,
      createdBy: data.created_by,
      createdAt: data.created_at,
    };
  }

  // Reaction operations
  async addReaction(reaction: Omit<Reaction, 'id' | 'createdAt'>): Promise<Reaction> {
    const { data, error } = await this.supabase
      .from('reactions')
      .upsert(
        {
          record_id: reaction.recordId,
          user_id: reaction.userId,
          emoji: reaction.emoji,
          comment: reaction.comment,
        },
        { onConflict: 'record_id,user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      recordId: data.record_id,
      userId: data.user_id,
      emoji: data.emoji,
      comment: data.comment,
      createdAt: data.created_at,
    };
  }

  async getReactions(recordId: string): Promise<Reaction[]> {
    const { data, error } = await this.supabase
      .from('reactions')
      .select('*')
      .eq('record_id', recordId);

    if (error) throw error;

    return (
      data?.map((r) => ({
        id: r.id,
        recordId: r.record_id,
        userId: r.user_id,
        emoji: r.emoji,
        comment: r.comment,
        createdAt: r.created_at,
      })) || []
    );
  }

  generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'FUTARI-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Storage operations
  async uploadPhoto(fileUriOrBase64: string, coupleId: string, isBase64?: boolean): Promise<string> {
    const fileName = `${coupleId}/${Date.now()}.jpg`;
    const isWeb = typeof document !== 'undefined';

    let base64: string;

    if (isWeb || isBase64) {
      // Webの場合、またはbase64が直接渡された場合
      base64 = fileUriOrBase64;
    } else {
      // モバイルの場合：ファイルURIからbase64で読み込み
      base64 = await FileSystem.readAsStringAsync(fileUriOrBase64, {
        encoding: 'base64',
      });
    }

    // base64をUint8Arrayに変換
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { data, error } = await this.supabase.storage
      .from('cooking-photos')
      .upload(fileName, bytes.buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    // 公開URLを取得
    const { data: publicUrlData } = this.supabase.storage
      .from('cooking-photos')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  }
}
