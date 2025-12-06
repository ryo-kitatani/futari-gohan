import { Preference } from '../interfaces/database';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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

  private async callGemini(prompt: string, imageBase64?: string, responseSchema?: object): Promise<any> {
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

    const generationConfig: any = {
      responseMimeType: 'application/json',
    };

    if (responseSchema) {
      generationConfig.responseSchema = responseSchema;
    }

    const response = await fetch(`${GEMINI_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig,
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
    const isWeb = typeof document !== 'undefined';

    try {
      let html: string;

      if (isWeb) {
        // Web環境ではCORSプロキシを使用
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status}`);
        }
        const data = await response.json();
        html = data.contents;
      } else {
        // モバイルの場合は直接アクセス
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FutariGohan/1.0)',
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status}`);
        }
        html = await response.text();
      }

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
    const prompt = `この料理の写真を分析してください。料理名、材料、カロリー、調理法、カテゴリを推定してください。日本語で回答してください。`;

    const schema = {
      type: 'object',
      properties: {
        dishName: { type: 'string', description: '料理名' },
        emoji: { type: 'string', description: '料理を表す絵文字1つ' },
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description: '推定される材料リスト',
        },
        calories: { type: 'integer', description: '推定カロリー（kcal）' },
        cookingMethod: { type: 'string', description: '調理法（焼く/煮る/揚げる/蒸す/生など）' },
        category: { type: 'string', description: '主菜/副菜/汁物/デザート/その他のいずれか' },
      },
      required: ['dishName', 'emoji', 'ingredients'],
    };

    return this.callGemini(prompt, imageBase64, schema);
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
        (u) => `${u.name}(ID: ${u.id})の好み:
- 好き: ${u.preferences.likes.join(', ') || 'なし'}
- 嫌い: ${u.preferences.dislikes.join(', ') || 'なし'}
- アレルギー: ${u.preferences.allergies.join(', ') || 'なし'}`
      )
      .join('\n\n');

    const prompt = `以下のレシピページの内容を解析してください。

【重要：警告(warnings)のルール】
1. 「アレルギー」に登録された食材が材料に含まれる場合のみ type: "allergy" で警告
2. 「嫌い」に登録された食材が材料に含まれる場合のみ type: "dislike" で警告
3. 「好き」に登録された食材は絶対に警告に入れないでください！！！
4. 材料リストに文字として実際に存在する食材のみ警告してください
5. 似ている食材を混同しないでください（鮭と蟹は別物、鶏肉と卵は別物）

【マッチ度計算】
- 「好き」な食材が多いほどスコアを高く（ボーナス）
- 「嫌い」な食材があるとスコアを下げる
- 「アレルギー」食材が含まれていれば警告を出し、スコアも下げる

日本語で回答してください。

【レシピページの内容】
${urlContent}

【ユーザーの好み】
${userPrefsText}`;

    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'レシピ名' },
        emoji: { type: 'string', description: '料理を表す絵文字1つ' },
        description: { type: 'string', description: '簡単な説明' },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '材料名' },
              amount: { type: 'string', description: '分量' },
            },
            required: ['name', 'amount'],
          },
          description: '材料リスト',
        },
        steps: {
          type: 'array',
          items: { type: 'string' },
          description: '調理手順',
        },
        cookTime: { type: 'integer', description: '調理時間（分）' },
        servings: { type: 'integer', description: '人数' },
        calories: { type: 'integer', description: '推定カロリー（kcal）' },
        matchScores: {
          type: 'object',
          properties: {
            total: { type: 'integer', description: '全体のマッチ度（0-100）' },
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string', description: 'ユーザーID' },
                  score: { type: 'integer', description: 'マッチ度スコア（0-100）' },
                  reason: { type: 'string', description: 'スコアの理由' },
                },
                required: ['userId', 'score', 'reason'],
              },
              description: '各ユーザーのマッチ度',
            },
          },
          required: ['total', 'users'],
        },
        warnings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'ユーザーID' },
              userName: { type: 'string', description: 'ユーザー名' },
              item: { type: 'string', description: '食材名' },
              type: { type: 'string', description: 'allergy または dislike' },
            },
            required: ['userId', 'userName', 'item', 'type'],
          },
          description: 'アレルギーや嫌いな食材の警告',
        },
      },
      required: ['title', 'emoji', 'ingredients', 'steps', 'matchScores', 'warnings'],
    };

    return this.callGemini(prompt, undefined, schema);
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
ふたりとも楽しめる料理を優先し、アレルギー食材は絶対に含めないでください。
毎回異なる料理を提案してください（定番だけでなく珍しい料理も混ぜる）。
日本語で回答してください。

${userPrefsText}

今回のテーマ: ${randomCuisine}系の${randomMealType}（${randomSeason}）
バリエーション番号: ${randomSeed}

${conditions.length > 0 ? `条件:\n- ${conditions.join('\n- ')}` : ''}
${excludeText}`;

    const schema = {
      type: 'object',
      properties: {
        recipes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '料理名' },
              emoji: { type: 'string', description: '料理を表す絵文字1つ' },
              description: { type: 'string', description: '簡単な説明' },
              cookTime: { type: 'integer', description: '調理時間（分）' },
              servings: { type: 'integer', description: '人数（通常は2）' },
              ingredients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: '材料名' },
                    amount: { type: 'string', description: '分量（例：100g、大さじ1、1個など）' },
                  },
                  required: ['name', 'amount'],
                },
                description: '材料リスト',
              },
              steps: {
                type: 'array',
                items: { type: 'string' },
                description: '調理手順',
              },
              matchScore: { type: 'integer', description: 'ふたりの平均マッチ度（0-100）' },
              reason: { type: 'string', description: 'なぜこの料理をおすすめするか' },
            },
            required: ['name', 'emoji', 'description', 'cookTime', 'ingredients', 'steps', 'matchScore', 'reason'],
          },
          description: '提案レシピリスト（3つ）',
        },
      },
      required: ['recipes'],
    };

    const result = await this.callGemini(prompt, undefined, schema);
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
