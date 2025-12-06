# ふたりごはん

ふたりの食卓をAIがサポート。カップルで一緒にレシピを管理するReact Native/Expoアプリです。

## 機能

- **カップルペアリング** - 招待コードでパートナーと連携
- **食の好み管理** - 好き/嫌い/アレルギーを登録
- **AIレシピ提案** - ふたりの好みに基づいたマッチスコア付きレシピ
- **写真で料理認識** - カメラで撮影した料理をAIが認識
- **URLからレシピ取得** - レシピサイトのURLを解析
- **料理記録** - 作った料理を写真付きで記録

## 技術スタック

- Expo SDK 54
- React Native 0.81
- React 19
- Clerk（認証）
- Supabase（データベース）
- Zustand（状態管理）
- Google Gemini（AI機能）

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env`にコピーして以下を設定：

```bash
cp .env.example .env
```

| 環境変数 | 説明 |
|---------|------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk認証キー |
| `EXPO_PUBLIC_SUPABASE_URL` | SupabaseのURL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabaseの匿名キー |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google Gemini AI APIキー |

### 3. 開発サーバーの起動

```bash
# Expo開発サーバー起動
npm start

# プラットフォーム別
npm run ios      # iOSシミュレーター
npm run android  # Androidエミュレーター
npm run web      # Webブラウザ
```

## ディレクトリ構成

```
src/
├── components/     # 再利用可能なUIコンポーネント
├── interfaces/     # TypeScript型定義
│   ├── auth.ts         # AuthProviderインターフェース
│   └── database.ts     # DatabaseProvider & データモデル
├── providers/      # プロバイダー実装
│   ├── ClerkAuthProvider.ts   # Clerk認証
│   └── SupabaseProvider.ts    # Supabaseデータベース
├── screens/        # 画面コンポーネント
├── services/       # ビジネスロジック
│   ├── CoupleService.ts       # ペアリング・レシピ管理
│   ├── GeminiService.ts       # AI連携
│   └── ServiceProvider.ts     # サービス管理
└── stores/         # Zustandストア
```

## アーキテクチャ

### プロバイダーパターン

認証とデータベースを抽象化するプロバイダーパターンを採用しています。

- `AuthProvider` - 認証の抽象インターフェース
- `DatabaseProvider` - データベースの抽象インターフェース
- `ServiceProvider` - 全プロバイダーを管理するシングルトン

### 認証フロー

1. 未ログイン → ログイン画面
2. ログイン済み・ペアリング未完了 → ペアリング画面
3. ログイン済み・ペアリング完了 → メインアプリ

### データモデル

| モデル | 説明 |
|-------|------|
| `Couple` | 招待コード付きのペアリング情報 |
| `CoupleUser` | 絵文字アバター付きユーザープロフィール |
| `Preference` | 食の好み（好き/嫌い/アレルギー） |
| `Recipe` | マッチスコア付き保存レシピ |
| `CookingRecord` | 写真付き料理履歴 |

## ライセンス

Private
