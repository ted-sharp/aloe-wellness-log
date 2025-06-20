## サイトのデザインルール

### カラーシステム

Tailwind CSSベースで色を定義します。

* **プライマリーカラー:** `blue-600`（#2563EB）
* **セカンダリーカラー:** `indigo-500`（#6366F1）
* **アクセントカラー:** `amber-400`（#FBBF24）
* **背景色:** `gray-50`（#F9FAFB）
* **テキストカラー:** `gray-800`（#1F2937）

### タイポグラフィ

* **見出し:**

  * 大見出し（ページタイトル）: `text-4xl font-bold`
  * 中見出し（セクションタイトル）: `text-2xl font-semibold`
  * 小見出し（サブセクション）: `text-xl font-medium`

* **本文:**

  * 標準テキスト: `text-base font-normal`
  * 注釈テキスト: `text-sm text-gray-600`

### 余白・間隔

* **セクション間隔:** `my-12`
* **コンテンツ間隔:** `mb-8`
* **インライン間隔:**

  * 水平方向余白: `px-4`
  * 垂直方向余白: `py-2`

### 角丸

* 基本コンポーネントの角丸: `rounded-lg`
* 強調したボタンやカード: `rounded-2xl`

### 影の効果

* 基本カードの影: `shadow-sm`
* ボタンや重要カードの影: `shadow-md`
* ホバー時や強調表示の影: `hover:shadow-lg transition-shadow duration-200`

### コンポーネント設計

#### ボタン

* **基本ボタン:**

  * 通常: `bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md`
  * ホバー: `hover:bg-blue-700 transition-colors duration-200`

* **セカンダリーボタン:**

  * 通常: `bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md`
  * ホバー: `hover:bg-indigo-600 transition-colors duration-200`

* **アクセントボタン:**

  * 通常: `bg-amber-400 text-gray-800 px-4 py-2 rounded-lg shadow-md`
  * ホバー: `hover:bg-amber-500 transition-colors duration-200`

#### カード

* 標準カード: `bg-white p-4 rounded-lg shadow-sm`
* 強調カード（重要情報など）: `bg-white p-6 rounded-2xl shadow-md`

### アクセシビリティ配慮

* 十分なコントラスト比を確保（WCAG AA基準準拠）
* フォーカスリングを明確に表示（例：`focus:outline-none focus:ring-2 focus:ring-blue-600`）
* テキストサイズは最小でも`text-sm`を維持
* 色のみで情報を伝えず、アイコンやラベルで補足

これらのルールを統一することで、洗練されたデザインと高いユーザビリティを実現します。
