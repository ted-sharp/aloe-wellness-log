/**
 * テキスト処理ユーティリティ関数集
 *
 * 重複していた文字列処理関数を統一管理
 */

/**
 * テキストを指定された長さで切り詰める
 * @param text 対象のテキスト
 * @param maxLength 最大文字数（デフォルト: 30）
 * @returns 切り詰められたテキスト（必要に応じて省略記号付き）
 */
export function truncateText(text: string, maxLength: number = 30): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

/**
 * テキストが切り詰められるかどうかを判定
 * @param text 対象のテキスト
 * @param maxLength 最大文字数
 * @returns 切り詰めが必要かどうか
 */
export function needsTruncation(text: string, maxLength: number = 30): boolean {
  return text.length > maxLength;
}

/**
 * 安全な文字列変換（null/undefinedを空文字に変換）
 * @param value 変換対象の値
 * @returns 安全な文字列
 */
export function safeString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * 文字列の最初の文字を大文字にする
 * @param text 対象のテキスト
 * @returns 最初が大文字の文字列
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * 複数行テキストの行数を制限
 * @param text 対象のテキスト
 * @param maxLines 最大行数（デフォルト: 3）
 * @returns 行数制限されたテキスト
 */
export function limitLines(text: string, maxLines: number = 3): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return text;
  }
  return lines.slice(0, maxLines).join('\n') + '\n...';
}
