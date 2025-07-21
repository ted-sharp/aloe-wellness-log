# 🌿 アロエ健康管理ログ

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Deployed-brightgreen)](https://ted-sharp.github.io/aloe-wellness-log/)
[![React](https://img.shields.io/badge/React-18.3.1-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

体重、血圧、運動記録などを日々記録できる健康管理 Progressive Web App（PWA）です。

## ✨ 主な機能

- 📝 **健康データ記録**: 体重、血圧、心拍数、体温、運動、食事、睡眠など
- 🏥 **特定保健指導対応**: メタボリックシンドローム対策に必要な項目を網羅
  - 体重・BMI管理（肥満度判定）
  - 血圧記録（高血圧リスク管理）
  - 生活習慣記録（運動・食事・睡眠・喫煙・飲酒）
  - 目標設定・進捗追跡機能
- 📊 **グラフ表示**: データの推移を視覚的に確認
- 📅 **カレンダー表示**: 日別の記録状況を一覧
- 📋 **記録一覧**: 時系列での記録確認・編集
- 📤 **データエクスポート**: JSON 形式でのデータダウンロード
- 🌐 **PWA 対応**: オフライン利用・アプリインストール可能
- 📱 **レスポンシブ**: モバイル・タブレット・デスクトップ対応
- 🔒 **プライバシー重視**: データは端末内で保存（IndexedDB）

## 🚀 デモ

**[アロエ健康管理ログを試す](https://ted-sharp.github.io/aloe-wellness-log/)**

### 📱 QR コードでアクセス

<div align="center">

![QRコード](https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://ted-sharp.github.io/aloe-wellness-log/)

_スマートフォンで QR コードをスキャンしてアプリにアクセス_

</div>

## 🛠️ 技術スタック

### フロントエンド

- **React 18.3.1** - UI フレームワーク
- **TypeScript 5.8.3** - 型安全性
- **Vite 6.3.5** - ビルドツール
- **Tailwind CSS 4.1.10** - スタイリング
- **React Router 7.6.2** - ルーティング

### データ管理

- **MobX 6.13.7** - 状態管理（Zustandから移行）
- **mobx-react-lite** - React統合
- **IndexedDB** - ローカルデータベース（Repository パターン）

### UI/UX

- **Recharts 2.15.3** - グラフ表示
- **React Calendar 6.0.0** - カレンダー表示
- **Headless UI 2.2.4** - アクセシブルコンポーネント
- **React Icons 5.5.0** - アイコン
- **DnD Kit** - ドラッグ&ドロップ

### 開発・テスト

- **Vitest** - ユニットテスト
- **Playwright** - E2E テスト
- **ESLint** - 静的解析
- **TypeScript ESLint** - TS 用リント

## 📦 セットアップ

### 前提条件

- Node.js 20.x 以上
- Yarn

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/ted-sharp/aloe-wellness-log.git
cd aloe-wellness-log

# Reactアプリディレクトリに移動
cd src_react

# 依存関係をインストール
yarn install
```

## 🚀 開発

### 開発サーバー起動

```bash
cd src_react
yarn dev
```

ブラウザで `http://localhost:5173` にアクセス

### 利用可能なコマンド

```bash
# 開発サーバー起動
yarn dev

# プロダクションビルド
yarn build             # TypeScript + Vite ビルド
yarn build:preview     # プレビュー用ビルド
yarn build:docs        # GitHub Pages用ビルド

# プレビュー（ローカル確認用）
yarn preview           # ビルド後のプレビュー

# テスト実行
yarn test              # ユニットテスト（1回実行）
yarn test:ui           # ユニットテスト（UIモード）
yarn test:coverage     # カバレッジレポート付き
yarn test:e2e          # E2Eテスト
yarn test:e2e:ui       # E2Eテスト（UIモード）
yarn test:e2e:headed   # E2Eテスト（ヘッド有り）
yarn test:e2e:debug    # E2Eテスト（デバッグモード）

# リント・フォーマット
yarn lint              # リント実行
yarn lint:fix          # リント自動修正
yarn lint:dev          # 開発時リント（警告0件）

# デプロイ
yarn deploy            # GitHub Pagesデプロイ
```

## 🌐 デプロイ

### GitHub Pages（自動）

```bash
cd src_react
yarn deploy
```

このコマンドで以下が自動実行されます：

1. `yarn build:docs` - TypeScriptコンパイル＋Viteビルド
2. プロダクションビルド（`base: '/aloe-wellness-log/'`自動設定）
3. `../docs/` フォルダへの出力
4. GitHub Pages での自動公開（`docs/` フォルダから）

### その他のプラットフォーム

- **Netlify**: `docs/` フォルダをデプロイ（`yarn deploy`実行後）
- **Vercel**: `src_react` をルートディレクトリとして設定
- **Firebase Hosting**: `firebase.json` 設定後 `firebase deploy`

## 📁 プロジェクト構造

```cmd
aloe-wellness-log/
├── src_react/                        # React アプリケーション
│   ├── src/
│   │   ├── components/               # UIコンポーネント
│   │   ├── pages/                    # ページコンポーネント
│   │   ├── store/                    # MobX ストア
│   │   ├── hooks/                    # カスタムフック
│   │   │   └── business/             # ビジネスロジック専用フック
│   │   ├── utils/                    # ユーティリティ関数
│   │   ├── types/                    # TypeScript型定義
│   │   ├── db/                       # IndexedDB関連（Repository パターン）
│   │   ├── constants/                # アプリケーション定数
│   │   └── data/                     # 静的データ（tips、examples）
│   ├── public/                       # 静的ファイル・PWA マニフェスト
│   ├── tests/                        # E2Eテスト（Playwright）
│   ├── coverage/                     # テストカバレッジレポート
│   └── dist/                         # ビルド成果物
├── docs/                             # GitHub Pages デプロイ出力
├── doc/                              # プロジェクトドキュメント
├── .github/                          # GitHub Actions設定
├── CLAUDE.md                         # Claude Code 用プロジェクト指示
└── README.md                         # このファイル
```

## 📚 ドキュメント

詳細なドキュメントは [`doc/`](./doc/) フォルダに整理されています：

- **[要件定義](./doc/要件定義_健康管理アプリ.md)** - プロジェクトの要件と仕様
- **[実装タスク一覧](./doc/実装タスク一覧_健康管理アプリ.md)** - 開発タスクの詳細
- **[手動デプロイ手順](./doc/manual-deployment.md)** - GitHub Pages へのデプロイ方法
- **[デプロイ設定比較](./doc/deployment-options-comparison.md)** - 各種デプロイ方法の比較

## 🧪 テスト

### ユニットテスト

```bash
yarn test:run          # 全テスト実行
yarn test:coverage     # カバレッジレポート
```

### E2E テスト

```bash
yarn test:e2e          # Playwright E2Eテスト
yarn test:e2e:ui       # UIモードで実行
```

## 🔧 設定ファイル

- **`package.json`** - npm パッケージ設定
- **`vite.config.ts`** - Vite ビルド設定
- **`tailwind.config.js`** - Tailwind CSS 設定
- **`tsconfig.json`** - TypeScript 設定
- **`playwright.config.ts`** - E2E テスト設定
- **`vitest.config.ts`** - ユニットテスト設定

## 🐛 トラブルシューティング

### よくある問題

1. **PWA が動作しない**

   - HTTPS 環境で実行してください（GitHub Pages は対応済み）
   - Service Worker の登録を確認してください

2. **デプロイが失敗する**

   - `yarn build:gh-pages` でビルドエラーがないか確認
   - GitHub リポジトリの Pages 設定を確認

3. **テストが失敗する**
   - 依存関係が最新か確認: `yarn install`
   - ブラウザのキャッシュをクリア

## 🤝 コントリビューション

1. リポジトリをフォーク
2. フィーチャーブランチを作成: `git checkout -b feature/amazing-feature`
3. 変更をコミット: `git commit -m 'Add amazing feature'`
4. ブランチにプッシュ: `git push origin feature/amazing-feature`
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは [MIT License](./LICENSE) の下で公開されています。

## 🙏 謝辞

- React、TypeScript、Vite コミュニティ
- PWA 技術仕様策定者
- オープンソースライブラリの開発者の皆様

---

💚 健康管理を通じて、より良い生活をサポートします！
