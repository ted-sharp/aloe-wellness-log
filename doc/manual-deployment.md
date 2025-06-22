# GitHub Pages 手動デプロイ設定

## 概要

React 健康管理アプリを GitHub Pages に手動でデプロイするための設定。
個人開発で更新頻度が高くないため、GitHub Actions を使わずに手動デプロイで運用。

## 設定内容

### 1. ビルドスクリプトの追加

**ファイル**: `package.json`

```json
{
  "scripts": {
    "build:gh-pages": "tsc -b && vite build --base=/aloe-wellness-log/",
    "deploy": "yarn build:gh-pages && yarn gh-pages -d dist"
  },
  "devDependencies": {
    "gh-pages": "^6.2.0"
  }
}
```

### 2. PWA 設定の調整

#### Manifest.json

- `start_url`: `/aloe-wellness-log/`
- `scope`: `/aloe-wellness-log/`
- アイコンパス: `/aloe-wellness-log/aloe-icon.png`
- ショートカット URL: `/aloe-wellness-log/*`

#### Service Worker (sw.js)

- `STATIC_FILES`: 全パスに `/aloe-wellness-log/` プレフィックス
- `IMPORTANT_ROUTES`: 全ルートに `/aloe-wellness-log/` プレフィックス
- オフライン時フォールバック: `/aloe-wellness-log/`

## デプロイ手順

### 初回セットアップ

```bash
cd aloe-wellness-log-react
yarn add --dev gh-pages
```

### GitHub リポジトリ設定

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: gh-pages / (root)
4. Save

### デプロイコマンド

```bash
cd aloe-wellness-log-react
yarn deploy
```

このコマンドで以下が自動実行されます：

1. TypeScript コンパイル
2. Vite ビルド（GitHub Pages 用 base 設定）
3. `gh-pages`ブランチへのプッシュ
4. GitHub Pages での自動反映

## デプロイ URL

- 本番環境: `https://ユーザー名.github.io/aloe-wellness-log/`
- 開発環境: `http://localhost:5173/`

## 技術詳細

### ベースパス設定

- GitHub Pages: `/aloe-wellness-log/`
- 開発環境: `/`

### ビルド時の動作

1. `--base=/aloe-wellness-log/` オプションで Vite ビルド
2. 静的ファイルのパスが自動調整
3. `dist` フォルダが `gh-pages` ブランチにプッシュ

## メリット

- GitHub Actions の消費なし
- デプロイタイミングを完全制御
- シンプルな設定
- 個人開発に最適

## 注意事項

- 初回デプロイ: 5-10 分程度
- DNS 反映: 最大 24 時間
- PWA 機能: HTTPS 環境必須（GitHub Pages 対応済み）
- デプロイ前にローカルでテスト実行を推奨

## トラブルシューティング

### デプロイが失敗する場合

1. `yarn build:gh-pages` でビルドエラーがないか確認
2. 権限設定の確認（リポジトリの Pages 設定）
3. ブランチ `gh-pages` が作成されているか確認

### PWA が動作しない場合

1. HTTPS 環境かチェック
2. Service Worker の登録確認
3. Manifest.json の設定確認
4. パスの整合性確認

## 開発・テスト手順

```bash
# 開発環境での確認
yarn dev

# ビルドテスト
yarn build:gh-pages

# プレビュー（ローカルでGitHub Pages環境を再現）
yarn build:gh-pages && yarn preview

# デプロイ
yarn deploy
```

## 実装日時

2024 年 12 月現在
