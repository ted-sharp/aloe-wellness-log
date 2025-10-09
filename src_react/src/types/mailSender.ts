/**
 * メール送信者情報の型定義
 * メールページで入力する差出人情報
 * 年齢・性別は目標ページから参照
 */
export type MailSenderInfo = {
  name: string; // 氏名（必須）
  contact: string; // 連絡先（電話番号やメールアドレスなど）
  updatedAt?: string; // 最終更新日時
};
