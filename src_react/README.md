# 🌿 アロエ健康管理ログ

体重・血圧・運動・食事・睡眠などを日々記録できる、完全ローカル型の健康管理 PWA アプリです。
データはブラウザ内（IndexedDB）に保存され、サーバー不要・プライバシー重視でご利用いただけます。

---

## ✨ 主な特徴

- **📝 柔軟な記録入力**: 体重・血圧・心拍数・体温・運動・食事・睡眠・喫煙・飲酒など
- **📊 カスタマイズ可能**: 記録項目の追加・編集・並び替え・一時非表示
- **📈 データ可視化**: グラフ・カレンダー・一覧表示
- **💾 完全ローカル保存**: IndexedDB 利用、バックエンド不要
- **📱 モバイルファースト/レスポンシブ**: 全デバイス最適化
- **🦾 アクセシビリティ強化**: WCAG 2.1 AA 準拠、スクリーンリーダー・キーボード操作対応
- **📤 データエクスポート**: CSV/JSON 形式で出力
- **🛡️ PWA 対応**: オフライン動作・インストール可

---

## 🚀 クイックスタート

### 必要環境

- Node.js 18 以上
- yarn（推奨）または npm

### インストール・起動

```bash
# リポジトリをクローン
git clone https://github.com/ted-sharp/aloe-wellness-log.git
cd aloe-wellness-log/src_react

# 依存関係をインストール
yarn install

# 開発サーバーを起動
yarn dev
```

ブラウザで `http://localhost:5173` にアクセスしてください。

### ビルド・デプロイ

```bash
# プロダクションビルド
yarn build

# ビルド結果のプレビュー
yarn preview
```

- GitHub Pages デプロイ: `yarn deploy`（docs/配下に出力）
- 本番 URL: https://ted-sharp.github.io/aloe-wellness-log/

---

## 📲 PWA インストール方法・推奨ブラウザ

- Chrome/Edge/Firefox/Safari（最新版）で PWA としてインストール可能
- アドレスバーの「インストール」アイコン、または「ホーム画面に追加」から
- iOS は Safari の共有メニュー →「ホーム画面に追加」
- アプリ内の「PWA インストール」ボタンも利用可（一部ブラウザのみ）
- [PWA インストールガイド](../doc/PWAインストールガイド.md) も参照

### 既知の制限

- iOS/Safari は一部 PWA 機能に制限あり
- Firefox モバイルはインストール UI が非表示の場合あり
- Service Worker/manifest の詳細は`public/`配下を参照

---

## 🦾 アクセシビリティ

- WCAG 2.1 AA 準拠
- スクリーンリーダー完全対応（NVDA/JAWS/VoiceOver 等）
- 全機能キーボード操作可（Tab/Escape/Enter/Space/矢印キー）
- フォーカストラップ・ライブリージョン・aria 属性徹底
- prefers-reduced-motion/ハイコントラスト/ダークモード自動対応
- [アクセシビリティ強化実装報告](../doc/アクセシビリティ強化実装完了_健康管理アプリ.md) も参照

---

## 📱 レスポンシブ・モバイルファースト

- Tailwind CSS 4 のモバイルファースト設計
- iOS/Android 推奨タッチサイズ・フォントサイズ最適化
- 全ページでスマホ・タブレット・PC に最適化
- [レスポンシブ対応詳細](../doc/レスポンシブ対応改善_モバイルファースト実装_2024-12-26.md) も参照

---

## 🏗️ 技術スタック

- **フロントエンド**: React 18 + TypeScript
- **状態管理**: Zustand 5
- **スタイリング**: Tailwind CSS 4
- **ルーティング**: React Router 7
- **グラフ/カレンダー**: Recharts, react-calendar
- **ドラッグ&ドロップ**: dnd-kit
- **データベース**: IndexedDB（ローカル保存）
- **ビルド**: Vite 6
- **テスト**: Playwright（E2E）, Vitest（ユニット）

---

## 🧪 テスト・品質保証

```bash
# ユニットテスト（Vitest）
yarn test
# E2Eテスト（Playwright）
yarn test:e2e
# テストUI
yarn test:ui
# ブラウザ表示でE2E
yarn test:e2e:headed
```

- 主要ユーザーフローの E2E 自動テストを網羅
- アクセシビリティ自動/手動テスト推奨
- 既知の問題: WebKit 系（Mobile Safari 等）で一部テストが動作しない場合あり（Chrome/Edge/Firefox は完全動作）

---

## 📊 データ仕様・カスタマイズ

### 記録データ（RecordItem）

```typescript
{
  id: string; // 一意識別子
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  datetime: string; // ISO8601形式
  fieldId: string; // 項目識別子
  value: number | string | boolean; // 記録値
}
```

### 記録項目（Field）

```typescript
{
  fieldId: string;      // 項目識別子
  name: string;         // 表示名
  unit?: string;        // 単位
  type: 'number' | 'string' | 'boolean';
  order?: number;       // 表示順序
  defaultDisplay?: boolean; // デフォルト表示
}
```

### 初期項目・カスタマイズ

- `src/store/records.ts`の`initialFields`で初期項目を定義
- `defaultDisplay: true`はデフォルト表示、`false`は一時表示（記録後自動非表示）
- 項目追加・編集・並び替え・非表示はアプリ UI から自由に可能

### データエクスポート/インポート

- 記録データは CSV/JSON 形式でエクスポート可
- バックアップ/リストアはエクスポート/インポート画面から
- データは全て IndexedDB にローカル保存

---

## 🎨 カスタマイズ

- Tailwind CSS の設定で色・スタイル変更可
- 初期項目は`src/store/records.ts`の`initialFields`を編集
- テーマ・ダークモードは OS 設定に自動追従

---

## 🤝 コントリビューション

1. フォーク作成
2. フィーチャーブランチ作成 (`git checkout -b feature/your-feature`)
3. 変更をコミット (`git commit -m 'Add your feature'`)
4. ブランチにプッシュ (`git push origin feature/your-feature`)
5. プルリクエスト作成

- バグ報告・要望は[GitHub Issues](https://github.com/ted-sharp/aloe-wellness-log/issues)へ

---

## 📝 ライセンス

MIT License（[LICENSE](../LICENSE)参照）

---

## 🙏 謝辞・依存 OSS

- React, Vite, TypeScript, Tailwind CSS, Zustand, React Router, Recharts, react-calendar, Heroicons, dnd-kit, Headless UI ほか

---

## 📚 参考ドキュメント

- [PWA インストールガイド](../doc/PWAインストールガイド.md)
- [アクセシビリティ強化実装報告](../doc/アクセシビリティ強化実装完了_健康管理アプリ.md)
- [レスポンシブ対応詳細](../doc/レスポンシブ対応改善_モバイルファースト実装_2024-12-26.md)
