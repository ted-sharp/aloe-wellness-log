# GitHub Pages デプロイ設定オプション比較

## URL 構造（共通）

すべての設定で、リポジトリ名が `aloe-wellness-log` の場合：

```
https://username.github.io/aloe-wellness-log/
```

**理由**: User Pages (`username.github.io` リポジトリ) 以外はすべて Project Pages として扱われ、リポジトリ名が URL パスに含まれる。

## 設定オプション比較

### Option A: main ブランチ → / (root)

```yaml
Source: main branch
Folder: / (root)
```

**手順**:

1. ビルドファイルを main ブランチのルートに配置
2. package.json に追加:
   ```json
   "scripts": {
     "build:deploy": "yarn build:gh-pages && cp -r dist/* ."
   }
   ```
3. Settings → Pages → Source: Deploy from a branch → main → /

**メリット**:

- シンプルな設定
- 追加ブランチ不要

**デメリット**:

- ソースコードとビルドファイルが混在
- gitignore の管理が複雑
- 不要ファイルの公開リスク

### Option B: main ブランチ → /docs フォルダ

```yaml
Source: main branch
Folder: /docs
```

**手順**:

1. Vite 設定で outDir を調整:
   ```typescript
   // vite.config.ts
   export default defineConfig({
     build: {
       outDir: "../docs",
       base: "/aloe-wellness-log/",
     },
   });
   ```
2. package.json に追加:
   ```json
   "scripts": {
     "build:docs": "tsc -b && vite build"
   }
   ```
3. Settings → Pages → Source: Deploy from a branch → main → /docs

**メリット**:

- ソースコードと分離
- main ブランチで一元管理
- 直感的な構造

**デメリット**:

- docs フォルダをコミットする必要
- ビルド成果物がリポジトリに含まれる

### Option C: gh-pages ブランチ → / (root) ⭐ 現在の設定

```yaml
Source: gh-pages branch
Folder: / (root)
```

**手順**:

1. 現在の設定をそのまま使用
2. `yarn deploy` で gh-pages ブランチに自動プッシュ
3. Settings → Pages → Source: Deploy from a branch → gh-pages → /

**メリット**:

- 完全にソースコードと分離
- 自動化に最適
- リポジトリの履歴が清潔
- ビルド成果物をメインブランチにコミットしない

**デメリット**:

- 別ブランチの管理
- gh-pages パッケージの依存

### Option D: GitHub Actions

```yaml
Source: GitHub Actions
```

**手順**:

1. `.github/workflows/deploy.yml` を作成
2. カスタムビルドプロセス実装
3. Settings → Pages → Source: GitHub Actions

**メリット**:

- 最高の柔軟性
- 複雑なビルドプロセス対応
- テスト・リント・ビルドの統合

**デメリット**:

- GitHub Actions の消費
- 設定が複雑
- 個人開発には過剰

## 推奨設定

### 個人開発・小規模プロジェクト

**Option C (gh-pages ブランチ)** - 現在の設定

- 理由: シンプルな手動デプロイ、ソースコード分離

### チーム開発・CI/CD 重視

**Option D (GitHub Actions)**

- 理由: 自動化、テスト統合、高い柔軟性

### シンプル重視・学習目的

**Option B (main → /docs)**

- 理由: 設定が単純、理解しやすい

## 現在の設定の妥当性

現在の **Option C (gh-pages ブランチ)** は以下の理由で最適：

1. ✅ 個人開発に適している
2. ✅ ソースコードが清潔
3. ✅ 手動デプロイで十分
4. ✅ GitHub Actions の消費なし
5. ✅ 設定がシンプル

## URL・パス設定は変更不要

どのオプションを選んでも、以下の設定は同じ：

- Base path: `/aloe-wellness-log/`
- Manifest.json: `/aloe-wellness-log/` プレフィックス
- Service Worker: `/aloe-wellness-log/` プレフィックス

**結論**: 現在の設定で問題ありません！
