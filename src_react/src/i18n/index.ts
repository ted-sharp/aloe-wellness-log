import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// 言語リソースのインポート
import en from './locales/en.json';
import ja from './locales/ja.json';

// 利用可能な言語の定義
export const languages = {
  en: 'English',
  ja: '日本語',
} as const;

export type Language = keyof typeof languages;

// デフォルト言語
export const defaultLanguage: Language = 'ja';

// i18nの設定
const resources = {
  en: {
    translation: en,
  },
  ja: {
    translation: ja,
  },
};

i18n
  // ブラウザ言語検出プラグイン
  .use(LanguageDetector)
  // React用プラグイン
  .use(initReactI18next)
  // 初期化
  .init({
    // 言語リソース
    resources,

    // フォールバック言語
    fallbackLng: defaultLanguage,

    // デバッグモード（開発時のみ）
    debug: import.meta.env.MODE === 'development',

    // キーが見つからない場合の表示
    missingKeyHandler: (lng, _ns, key) => {
      if (import.meta.env.MODE === 'development') {
        console.warn(`Missing translation key: ${key} for language: ${lng}`);
      }
    },

    // 補間設定
    interpolation: {
      escapeValue: false, // React内では不要
    },

    // 言語検出設定
    detection: {
      // 検出順序（navigator を最初に、localStorage を後に）
      order: ['navigator', 'localStorage', 'htmlTag'],

      // ローカルストレージのキー
      lookupLocalStorage: 'i18nextLng',

      // キャッシュ設定
      caches: ['localStorage'],
    },

    // ホワイトリスト（対応言語のみ）
    supportedLngs: Object.keys(languages),

    // 非対応言語の場合のフォールバック
    nonExplicitSupportedLngs: true,
  });

export default i18n;
