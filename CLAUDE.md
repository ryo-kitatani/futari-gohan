# CLAUDE.md

このファイルは Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト概要

ふたりごはんは、カップルで一緒にレシピを管理するReact Native/Expoアプリです。AIがふたりの食の好みに基づいて料理を提案します。

## 開発コマンド

```bash
# 開発サーバー起動（全プラットフォーム共通）
npm start

# プラットフォーム別
npm run ios      # iOSシミュレーター
npm run android  # Androidエミュレーター
npm run web      # Webブラウザ
```

## 環境設定

`.env.example`を`.env`にコピーして以下を設定：
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk認証キー
- `EXPO_PUBLIC_SUPABASE_URL` - SupabaseのURL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabaseの匿名キー
- `EXPO_PUBLIC_GEMINI_API_KEY` - Google Gemini AI APIキー

## アーキテクチャ

### プロバイダーパターン
認証とデータベースを抽象化するプロバイダーパターンを採用：
- `src/interfaces/auth.ts` - AuthProviderインターフェース
- `src/interfaces/database.ts` - DatabaseProviderインターフェース
- `src/providers/ClerkAuthProvider.ts` - Clerk実装
- `src/providers/SupabaseProvider.ts` - Supabase実装
- `src/services/ServiceProvider.ts` - 全プロバイダーを管理するシングルトン

### 主要サービス
- `CoupleService` - カップルペアリング、好み設定、レシピ、料理記録の管理
- `GeminiService` - レシピ提案、写真認識、URL解析のAI連携

### データモデル (src/interfaces/database.ts)
- `Couple` - 招待コード付きのペアリング情報
- `CoupleUser` - 絵文字アバター付きユーザープロフィール
- `Preference` - 食の好み（好き/嫌い/アレルギー）
- `Recipe` - マッチスコア付き保存レシピ
- `CookingRecord` - 写真付き料理履歴

### ナビゲーション
- 5つのタブ: ホーム、カメラ、URL、好み、設定
- カメラとURLタブは画面ではなくモーダルとして開く
- 認証フロー: ログイン -> ペアリング -> メインアプリ（`AuthWrapper`で制御）

### 認証フロー
1. `AuthWrapper`がアプリ全体をClerkプロバイダーでラップ
2. 未ログイン時は`LoginScreen`を表示
3. ログイン済みだがペアリング未完了時は`PairingScreen`を表示
4. ログイン済みかつペアリング完了時はメインアプリを表示

## 技術スタック
- Expo SDK 54
- React Native 0.81
- React 19
- Clerk（認証）
- Supabase（データベース）
- Zustand（状態管理）
- Google Gemini（AI機能）
