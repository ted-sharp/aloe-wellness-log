## プログラミング学習サイトのデザインルール

### カラーシステム

Tailwind CSS ベースで色を定義します。

- **プライマリーカラー:** `blue-600`（#2563EB）

* **セカンダリーカラー:** `indigo-500`（#6366F1）
* **アクセントカラー:** `amber-400`（#FBBF24）
* **背景色:** `gray-50`（#F9FAFB）
* **テキストカラー:** `gray-800`（#1F2937）

### ボタンとテキストの追加色定義

- **保存:** `green-600` (#16A34A)
- **追加:** `teal-500` (#14B8A6)
- **一時表示:** `teal-400` (#2DD4BF)
- **編集:** `blue-500` (#3B82F6)
- **前回値:** `sky-500` (#0EA5E9)
- **キャンセル:** `gray-400` (#9CA3AF)
- **戻る:** `gray-500` (#6B7280)
- **削除:** `red-600` (#DC2626)
- **ダウンロード:** `purple-600` (#9333EA)

### タイポグラフィ

- **見出し:**

  - 大見出し（ページタイトル）: `text-4xl font-bold`
  - 中見出し（セクションタイトル）: `text-2xl font-semibold`
  - 小見出し（サブセクション）: `text-xl font-medium`

- **本文:**

  - 標準テキスト: `text-base font-normal`
  - 注釈テキスト: `text-sm text-gray-600`

### 余白・間隔

- **セクション間隔:** `my-12`
- **コンテンツ間隔:** `mb-8`
- **インライン間隔:**

  - 水平方向余白: `px-4`
  - 垂直方向余白: `py-2`

### 角丸

- 基本コンポーネントの角丸: `rounded-lg`
- 強調したボタンやカード: `rounded-2xl`

### 影の効果

- 基本カードの影: `shadow-sm`
- ボタンや重要カードの影: `shadow-md`
- ホバー時や強調表示の影: `hover:shadow-lg transition-shadow duration-200`

### コンポーネント設計

#### ボタン

- **基本ボタン:**

  - 通常: `bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md`
  - ホバー: `hover:bg-blue-700 transition-colors duration-200`

- **セカンダリーボタン:**

  - 通常: `bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md`
  - ホバー: `hover:bg-indigo-600 transition-colors duration-200`

- **アクセントボタン:**

  - 通常: `bg-amber-400 text-gray-800 px-4 py-2 rounded-lg shadow-md`
  - ホバー: `hover:bg-amber-500 transition-colors duration-200`

- **操作別推奨ボタン:**

  - 保存: `bg-green-600 text-white`
  - 追加: `bg-teal-500 text-white`
  - 一時表示: `bg-teal-400 text-white`
  - 編集: `bg-blue-500 text-white`
  - 前回値: `bg-sky-500 text-white`
  - キャンセル: `bg-gray-400 text-white`
  - 戻る: `bg-gray-500 text-white`
  - 削除: `bg-red-600 text-white`
  - ダウンロード: `bg-purple-600 text-white`

### カード

- 標準カード: `bg-white p-4 rounded-lg shadow-sm`
- 強調カード（重要情報など）: `bg-white p-6 rounded-2xl shadow-md`

### アクセシビリティ配慮

- 十分なコントラスト比を確保（WCAG AA 基準準拠）
- フォーカスリングを明確に表示（例：`focus:outline-none focus:ring-2 focus:ring-blue-600`）
- テキストサイズは最小でも`text-sm`を維持
- 色のみで情報を伝えず、アイコンやラベルで補足

これらのルールを統一することで、洗練されたデザインと高いユーザビリティを実現します。
