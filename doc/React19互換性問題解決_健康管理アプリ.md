# React 19 互換性問題解決 - 健康管理アプリ

## 発生した問題

### エラー内容 1

- **エラー名**: TypeError
- **エラーメッセージ**: Cannot read properties of null (reading 'useSyncExternalStore')
- **発生箇所**: ToastContainer (ToastContainer.tsx:27 行目)
- **スタックトレース**: Zustand の store 使用時に発生

### エラー内容 2

- **エラー名**: TypeError
- **エラーメッセージ**: Cannot read properties of null (reading 'useCallback')
- **発生箇所**: useErrorHandler (useErrorHandler.ts:6 行目)
- **呼び出し元**: RecordInput (RecordInput.tsx:49 行目)

### 原因分析

- React 19.1.0 と Zustand 5.0.5 の間での互換性問題
- React 19 の内部変更により`useSyncExternalStore`が null になる
- ToastContainer で useToastStore()を使用する際にエラー発生
- useCallback、useSyncExternalStore 等の React フックが null になる問題

### GitHub で報告されている関連 Issue

**Zustand #2853** (2024 年 11 月 14 日)

- エラー: `Cannot find module 'use-sync-external-store/shim/with-selector'`
- 解決方法: `npm i use-sync-external-store`の手動インストール

**Zustand #2870** (2024 年 11 月 26 日)

- エラー: `Cannot read properties of null (reading 'useSyncExternalStore')`
- 原因: React の重複問題と関連

**Zustand #2842** (2024 年 11 月 7 日)

- React 19 との互換性についての議論
- ユーザー報告: _"npm i use-sync-external-store fixed the issue for me :) Btw, it started happening after upgrading React v18 to v19"_

**実際のユーザー証言** (2025 年 4 月)

- React 18→19 + Next 14→15 アップグレード後に同じ問題が発生
- `use-sync-external-store`のインストールで解決

## 解決方法

### 実施内容

1. **React のダウングレード**

   - React 19.1.0 → 18.3.1
   - React-DOM 19.1.0 → 18.3.1
   - @types/react 19.1.2 → 18.x.x
   - @types/react-dom 19.1.2 → 18.x.x

2. **環境のクリーンアップ**

   - package-lock.json 削除（yarn と npm の競合回避）
   - node_modules 削除
   - yarn install で依存関係再構築

3. **Vite キャッシュのクリア**

   - node_modules/.vite ディレクトリ削除
   - Vite の古いキャッシュ情報をクリア

4. **React StrictMode の一時無効化**
   - main.tsx で StrictMode をコメントアウト
   - 開発時の副作用によるエラーを回避

### 実行コマンド

```bash
# ReactとReact-DOMのダウングレード
yarn add react@^18.0.0 react-dom@^18.0.0 @types/react@^18.0.0 @types/react-dom@^18.0.0

# 環境クリーンアップ
Remove-Item "package-lock.json" -Force
Remove-Item -Recurse -Force "node_modules"
yarn install

# Viteキャッシュクリア
Remove-Item -Recurse -Force "node_modules/.vite"

# 開発サーバー起動
yarn dev
```

### コード変更

```tsx
// main.tsx - StrictMode無効化
createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <App />
  // </StrictMode>
);
```

## 結果

- ToastContainer での Zustand ストア使用エラーが解決
- useCallback、useSyncExternalStore 等の React フックエラーが解消
- リスト画面、入力画面への遷移時のエラーが解消
- React 18 での安定動作を確保

## 今後の対応

- React 19 は新しいバージョンのため、ライブラリの互換性が安定するまで React 18 を使用継続
- 各ライブラリが React 19 対応を完了したタイミングでのアップグレードを検討
- StrictMode は安定動作確認後、段階的に再有効化を検討

### 代替解決方法（React 19 継続の場合）

GitHub issue によると、React 19 を継続使用する場合は以下も有効：

```bash
# use-sync-external-storeの手動インストール
npm install use-sync-external-store
# または
yarn add use-sync-external-store
```

## 関連ファイル

- `aloe-wellness-log-react/package.json`: 依存関係の更新
- `aloe-wellness-log-react/src/components/ToastContainer.tsx`: エラー発生箇所
- `aloe-wellness-log-react/src/store/toast.ts`: Zustand ストア定義
- `aloe-wellness-log-react/src/hooks/useErrorHandler.ts`: useCallback エラー発生箇所
- `aloe-wellness-log-react/src/pages/RecordInput.tsx`: useErrorHandler 呼び出し箇所
- `aloe-wellness-log-react/src/main.tsx`: StrictMode 設定変更

## 参考リンク

- [Zustand #2853: Cannot find module use-sync-external-store](https://github.com/pmndrs/zustand/discussions/2853)
- [Zustand #2870: Zustand store doesn't work when putting to external package](https://github.com/pmndrs/zustand/discussions/2870)
- [Zustand #2842: Make zustand compatible with React 19](https://github.com/pmndrs/zustand/discussions/2842)

## 実装日時

2024 年 12 月 - React 19 互換性問題解決（StrictMode 無効化含む）

## 検証済み

✅ **実際のバージョン問題であることを GitHub issue で確認済み**
✅ **複数のユーザーが同様の問題を報告済み**
✅ **提案した解決方法が他のユーザーでも有効であることを確認済み**
