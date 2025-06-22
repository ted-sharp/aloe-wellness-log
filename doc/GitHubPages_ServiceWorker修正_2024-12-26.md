# GitHub Pages Service Worker パス設定修正記録

## 日時

2024-12-26

## 問題の概要

- GitHub Pages（`https://ted-sharp.github.io/aloe-wellness-log/`）でリダイレクトが発生
- Service Worker のパス設定が GitHub Pages のベースパス（`/aloe-wellness-log/`）に対応していなかった

## 原因

GitHub Pages ではリポジトリ URL の一部がベースパスとなるため、Service Worker のパスも適切に設定する必要があった。

## 修正内容

### 1. index.html の Service Worker 登録修正

```javascript
// 修正前
const registration = await navigator.serviceWorker.register("/sw.js", {
  scope: "/",
});

// 修正後
const registration = await navigator.serviceWorker.register(
  "/aloe-wellness-log/sw.js",
  {
    scope: "/aloe-wellness-log/",
  }
);
```

### 2. Service Worker 内の静的ファイルパス修正

```javascript
// 修正前
const STATIC_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/list",
  "/graph",
  "/calendar",
  "/export",
];

// 修正後
const STATIC_FILES = [
  "/aloe-wellness-log/",
  "/aloe-wellness-log/index.html",
  "/aloe-wellness-log/manifest.json",
  "/aloe-wellness-log/aloe-icon.png",
  "/aloe-wellness-log/list",
  "/aloe-wellness-log/graph",
  "/aloe-wellness-log/calendar",
  "/aloe-wellness-log/export",
];
```

### 3. オフライン時のフォールバック修正

```javascript
// 修正前
return caches.match("/");

// 修正後
return caches.match("/aloe-wellness-log/");
```

### 4. 通知クリック時の新しいウィンドウパス修正

```javascript
// 修正前
return self.clients.openWindow("/");

// 修正後
return self.clients.openWindow("/aloe-wellness-log/");
```

## 修正対象ファイル

- `docs/index.html`
- `docs/sw.js`

## 結果

- GitHub Pages でのリダイレクト問題が解決
- Service Worker が適切にロードされ、PWA 機能が正常に動作

## 注意点

- GitHub Pages では必ずベースパスを考慮したパス設定が必要
- Service Worker のスコープもベースパスに合わせて設定する必要がある
- 今後のビルド時も同様の設定を維持する必要がある

## 追加の問題と修正

### preload 設定の問題

ビルドプロセスで以下の問題が発生：

1. **不適切なファイル参照**: preload で `.tsx` ファイルが指定されていた
2. **不要なファイル生成**: ビルド後に TypeScript ソースファイル（`.tsx`）が残存

**修正内容:**

```html
<!-- 修正前 -->
<link
  rel="preload"
  href="/aloe-wellness-log/assets/main-BvoKBSBL.tsx"
  as="script"
  crossorigin
/>

<!-- 修正後 -->
<link
  rel="preload"
  href="/aloe-wellness-log/assets/index-VAtuCI8Y.js"
  as="script"
  crossorigin
/>
```

### ソースファイルでの Service Worker パス修正

`src/main.tsx` での動的パス設定：

```javascript
// 環境に応じたパス設定
const swPath = import.meta.env.PROD ? "/aloe-wellness-log/sw.js" : "/sw.js";
navigator.serviceWorker.register(swPath);
```

## 参考情報

- GitHub Pages: https://ted-sharp.github.io/aloe-wellness-log/
- リポジトリ: https://github.com/ted-sharp/aloe-wellness-log
- ベースパス: `/aloe-wellness-log/`

## 最終的な解決策（正しいアプローチ）

### 根本原因の解決

**問題**: Vite のビルドプロセスで、アセット参照が正しく変換されていない

**解決策**: Vite 設定で環境に応じた `base` パスの動的設定

### 修正された設定

#### 1. vite.config.ts の改善

```javascript
export default defineConfig(({ mode, command }) => {
  const isProduction = mode === "production";

  // GitHub Pages用のベースパス設定
  const base =
    isProduction && command === "build" ? "/aloe-wellness-log/" : "/";

  return {
    plugins,
    base, // 動的ベースパス設定
    // ... 他の設定
  };
});
```

#### 2. Service Worker 自動更新プラグインの改善

```javascript
function swAutoUpdate(basePath: string) {
  // ベースパスを考慮したファイルパス生成
  const buildFiles = [
    ...jsFiles.map((file) => `${basePath}assets/${file}`),
    ...cssFiles.map((file) => `${basePath}assets/${file}`),
  ];
}
```

#### 3. HTML での動的 Service Worker パス設定

```javascript
// ベースパスを動的に取得（GitHub Pages対応）
const pathname = window.location.pathname;
const basePath =
  pathname === "/"
    ? "/"
    : pathname.startsWith("/aloe-wellness-log/")
    ? "/aloe-wellness-log/"
    : "/";
```

#### 4. preload 問題の解決

- HTML から手動の preload 設定を削除
- Vite が自動的に最適な preload を生成

### 結果

✅ **完全自動化**: ファイル名のハッシュが変更されても自動対応
✅ **環境対応**: 開発環境と本番環境で自動切り替え
✅ **保守性向上**: 手動でのファイル名指定が不要
✅ **正しいビルド**: `.tsx` ファイルの誤った出力を解消

## 学んだ教訓

- ビルドツールの設定は根本から正しく行うべき
- 手動でのファイル名指定は保守性を損なう
- 環境に応じた動的設定が重要
