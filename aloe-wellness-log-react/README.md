# 🌿 アロエ健康管理ログ

体重、血圧、運動記録などを日々記録できるWebアプリケーションです。
データはブラウザ内（IndexedDB）に保存され、バックエンドサーバーは不要です。

## ✨ 特徴

- **📝 柔軟な記録入力**: 体重、血圧、心拍数、体温、運動・食事・睡眠の有無など
- **📊 カスタマイズ可能**: 記録項目の追加・編集・並び替えが可能
- **📈 データ可視化**: グラフやカレンダーでの記録表示
- **💾 完全ローカル**: データはブラウザ内に保存（プライベート保護）
- **📱 レスポンシブ**: PC・タブレット・スマートフォン対応
- **📤 データエクスポート**: CSV/JSON形式でのデータ出力

## 🚀 クイックスタート

### 必要環境
- Node.js 18以上
- yarn（推奨）または npm

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-username/aloe-wellness-log.git
cd aloe-wellness-log/aloe-wellness-log-react

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

## 📖 使い方

### 基本的な操作

1. **記録入力**: 体重や血圧などの健康データを入力
2. **記録一覧**: 過去の記録を時系列で確認
3. **グラフ表示**: データの推移をグラフで可視化
4. **カレンダー**: 日付別の記録状況を確認
5. **データ管理**: エクスポート・インポート・削除

### カスタマイズ

- **項目追加**: 記録したい項目を自由に追加可能
- **項目編集**: 既存項目の名前や単位を変更
- **表示順序**: ドラッグ&ドロップで項目の並び順を変更
- **表示/非表示**: 不要な項目を一時的に非表示に設定

## 🏗️ 技術仕様

### 技術スタック
- **フロントエンド**: React 19 + TypeScript
- **状態管理**: Zustand
- **スタイリング**: Tailwind CSS 4
- **データベース**: IndexedDB（ブラウザ内）
- **ビルドツール**: Vite
- **テスト**: Playwright（E2E）

### アーキテクチャ
- **縦持ちデータ構造**: 柔軟な項目追加に対応
- **型安全設計**: TypeScriptによる堅牢な型管理
- **コンポーネント駆動**: 再利用可能なUI部品
- **統一エラーハンドリング**: 一貫したエラー処理とユーザー通知

## 🧪 テスト

```bash
# E2Eテストを実行
yarn test

# テストをUI付きで実行
yarn test:ui

# ブラウザを表示してテスト
yarn test:headed
```

## 📊 データ形式

### 記録データ (RecordItem)
```typescript
{
  id: string;           // 一意識別子
  date: string;         // "YYYY-MM-DD"
  time: string;         // "HH:mm"
  datetime: string;     // ISO8601形式
  fieldId: string;      // 項目識別子
  value: number | string | boolean; // 記録値
}
```

### 記録項目 (Field)
```typescript
{
  fieldId: string;      // 項目識別子
  name: string;         // 表示名
  unit?: string;        // 単位（オプション）
  type: 'number' | 'string' | 'boolean'; // データ型
  order?: number;       // 表示順序
  defaultDisplay?: boolean; // デフォルト表示フラグ
}
```

## 🎨 カスタマイズ

### テーマ設定
Tailwind CSSの設定を変更することで、色やスタイルをカスタマイズできます。

### 初期項目の変更
`src/store/records.ts`の`initialFields`配列を編集することで、初期項目を変更できます。

## 🤝 コントリビューション

1. フォークを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は [LICENSE](../LICENSE) ファイルをご覧ください。

## 🐛 バグ報告・機能要望

[GitHub Issues](https://github.com/your-username/aloe-wellness-log/issues) にてバグ報告や機能要望をお受けしています。

## 🙏 謝辞

このプロジェクトは以下のオープンソースプロジェクトに依存しています：
- React・Vite・TypeScript・Tailwind CSS
- Zustand・React Router・Recharts・React Calendar
- Heroicons・dnd kit・Headless UI
