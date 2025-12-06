import { Preference } from '../interfaces/database';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface PhotoRecognitionResult {
  dishName: string;
  emoji: string;
  ingredients: string[];
  calories?: number;
  cookingMethod?: string;
  category?: string;
}

interface RecipeParseResult {
  title: string;
  emoji: string;
  description?: string;
  ingredients: Array<{ name: string; amount: string }>;
  steps: string[];
  cookTime?: number;
  servings?: number;
  calories?: number;
  matchScores: {
    total: number;
    users: Record<string, { score: number; reason: string }>;
  };
  warnings: Array<{
    userId: string;
    userName: string;
    item: string;
    type: 'allergy' | 'dislike';
  }>;
}

interface RecipeSuggestion {
  name: string;
  emoji: string;
  description: string;
  cookTime: number;
  ingredients: string[];
  matchScore: number;
  reason: string;
}

export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async callGemini(prompt: string, imageBase64?: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const parts: any[] = [{ text: prompt }];

    if (imageBase64) {
      parts.unshift({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      });
    }

    const response = await fetch(`${GEMINI_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('Gemini response:', JSON.stringify(data, null, 2));
      throw new Error('No response from Gemini');
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Gemini response:', text);
      throw new Error('Invalid JSON response from Gemini');
    }
  }

  private async fetchUrlContent(url: string): Promise<string> {
    // Webプラットフォームの場合はCORS制限のためエラー
    const isWeb = typeof document !== 'undefined';
    if (isWeb) {
      throw new Error('WEB_NOT_SUPPORTED');
    }

    try {
      // モバイルの場合は直接アクセス
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FutariGohan/1.0)',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }
      const html = await response.text();
      return this.extractTextFromHtml(html);
    } catch (error) {
      console.error('Error fetching URL:', error);
      throw new Error(`URLの取得に失敗しました: ${url}`);
    }
  }

  private extractTextFromHtml(html: string): string {
    // HTMLからテキストを簡易抽出（scriptとstyleタグを除去）
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000); // 最大10000文字
    return textContent;
  }

  async recognizePhoto(imageBase64: string): Promise<PhotoRecognitionResult> {
    const prompt = `この料理の写真を分析してください。
以下のJSON形式で回答してください：
{
  "dishName": "料理名",
  "emoji": "料理を表す絵文字1つ",
  "ingredients": ["推定される材料1", "材料2", ...],
  "calories": 推定カロリー(数値),
  "cookingMethod": "調理法(焼く/煮る/揚げる/蒸す/生など)",
  "category": "主菜/副菜/汁物/デザート/その他のいずれか"
}

日本語で回答してください。`;

    return this.callGemini(prompt, imageBase64);
  }

  async parseRecipeUrl(
    url: string,
    users: Array<{
      id: string;
      name: string;
      preferences: {
        likes: string[];
        dislikes: string[];
        allergies: string[];
      };
    }>
  ): Promise<RecipeParseResult> {
    // まずURLの内容を取得
    const urlContent = await this.fetchUrlContent(url);

    const userPrefsText = users
      .map(
        (u) => `${u.name}の好み:
- 好き: ${u.preferences.likes.join(', ') || 'なし'}
- 嫌い: ${u.preferences.dislikes.join(', ') || 'なし'}
- アレルギー: ${u.preferences.allergies.join(', ') || 'なし'}`
      )
      .join('\n\n');

    const prompt = `以下のレシピページの内容を解析してください。

【レシピページの内容】
${urlContent}

【ユーザーの好み】
${userPrefsText}

以下のJSON形式で回答してください：
{
  "title": "レシピ名",
  "emoji": "料理を表す絵文字1つ",
  "description": "簡単な説明",
  "ingredients": [{"name": "材料名", "amount": "分量"}, ...],
  "steps": ["手順1", "手順2", ...],
  "cookTime": 調理時間(分、数値),
  "servings": 人数(数値),
  "calories": 推定カロリー(数値),
  "matchScores": {
    "total": 全体のマッチ度(0-100),
    "users": {
      "${users[0]?.id || 'user1'}": {"score": スコア, "reason": "理由"},
      "${users[1]?.id || 'user2'}": {"score": スコア, "reason": "理由"}
    }
  },
  "warnings": [
    {"userId": "ユーザーID", "userName": "ユーザー名", "item": "食材名", "type": "allergy または dislike"}
  ]
}

注意:
- アレルギー食材が含まれている場合は必ずwarningsに追加
- マッチ度は好きな食材が多いほど高く、嫌いな食材があると低くなる
- warningsがない場合は空配列[]を返す
- 日本語で回答してください`;

    return this.callGemini(prompt);
  }

  async suggestRecipes(
    users: Array<{
      id: string;
      name: string;
      preferences: {
        likes: string[];
        dislikes: string[];
        allergies: string[];
      };
    }>,
    options?: {
      maxCookTime?: number;
      category?: string;
      excludeRecipes?: string[];
    }
  ): Promise<RecipeSuggestion[]> {
    const userPrefsText = users
      .map(
        (u) => `${u.name}:
- 好き: ${u.preferences.likes.join(', ') || 'なし'}
- 嫌い: ${u.preferences.dislikes.join(', ') || 'なし'}
- アレルギー: ${u.preferences.allergies.join(', ') || 'なし'}`
      )
      .join('\n\n');

    const conditions = [];
    if (options?.maxCookTime) {
      conditions.push(`調理時間は${options.maxCookTime}分以内`);
    }
    if (options?.category) {
      conditions.push(`カテゴリは${options.category}`);
    }

    // ランダム性を追加するための要素
    const cuisineTypes = ['和食', '洋食', '中華', 'イタリアン', 'エスニック', '韓国料理', 'フレンチ', 'メキシカン'];
    const mealTypes = ['定番料理', '時短料理', 'ヘルシー料理', 'ガッツリ系', 'おしゃれ料理', 'なつかしの味', '新感覚料理'];
    const seasons = ['春向け', '夏向け', '秋向け', '冬向け', '季節を問わない'];

    // ランダムにテーマを選択
    const randomCuisine = cuisineTypes[Math.floor(Math.random() * cuisineTypes.length)];
    const randomMealType = mealTypes[Math.floor(Math.random() * mealTypes.length)];
    const randomSeason = seasons[Math.floor(Math.random() * seasons.length)];
    const randomSeed = Math.floor(Math.random() * 10000);

    // 除外するレシピ
    const excludeText = options?.excludeRecipes && options.excludeRecipes.length > 0
      ? `\n除外する料理（これらは提案しないで）: ${options.excludeRecipes.join(', ')}`
      : '';

    const prompt = `以下のふたりの好みに合う料理を3つ提案してください。

${userPrefsText}

今回のテーマ: ${randomCuisine}系の${randomMealType}（${randomSeason}）
バリエーション番号: ${randomSeed}

${conditions.length > 0 ? `条件:\n- ${conditions.join('\n- ')}` : ''}
${excludeText}

以下のJSON形式で回答してください：
{
  "recipes": [
    {
      "name": "料理名",
      "emoji": "料理を表す絵文字1つ",
      "description": "簡単な説明",
      "cookTime": 調理時間(分、数値),
      "servings": 人数(数値、通常は2),
      "ingredients": [{"name": "材料名", "amount": "分量（例：100g、大さじ1、1個など）"}, ...],
      "steps": ["手順1", "手順2", ...],
      "matchScore": ふたりの平均マッチ度(0-100),
      "reason": "なぜこの料理をおすすめするか"
    }
  ]
}

注意:
- ふたりとも楽しめる料理を優先
- アレルギー食材は絶対に含めない
- 毎回異なる料理を提案すること（定番だけでなく珍しい料理も混ぜる）
- テーマに沿いつつも、ふたりの好みを最優先
- 日本語で回答してください`;

    const result = await this.callGemini(prompt);
    return result.recipes || [];
  }

  // Helper to convert preferences to the format needed for AI
  static formatPreferencesForAI(
    userId: string,
    userName: string,
    preferences: Preference[]
  ) {
    const userPrefs = preferences.filter((p) => p.userId === userId);
    return {
      id: userId,
      name: userName,
      preferences: {
        likes: userPrefs.filter((p) => p.type === 'like').map((p) => p.item),
        dislikes: userPrefs.filter((p) => p.type === 'dislike').map((p) => p.item),
        allergies: userPrefs.filter((p) => p.type === 'allergy').map((p) => p.item),
      },
    };
  }
}
