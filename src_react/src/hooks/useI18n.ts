import { useTranslation } from 'react-i18next';
import type { Language } from '../i18n';

/**
 * 国際化用カスタムフック
 * 翻訳機能と言語切り替え機能を提供
 */
export function useI18n() {
  const { t, i18n } = useTranslation();

  // 現在の言語を取得
  const currentLanguage = i18n.language as Language;

  // 言語切り替え関数
  const changeLanguage = async (language: Language) => {
    try {
      await i18n.changeLanguage(language);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  // RTL言語かどうかを判定（将来のアラビア語対応など）
  const isRTL = false; // 現在対応言語はLTRのみ

  // 数値フォーマット関数
  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(currentLanguage, options).format(value);
  };

  // 日付フォーマット関数
  const formatDate = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(currentLanguage, options).format(dateObj);
  };

  // 相対時間フォーマット関数
  const formatRelativeTime = (
    value: number,
    unit: Intl.RelativeTimeFormatUnit
  ) => {
    return new Intl.RelativeTimeFormat(currentLanguage, {
      numeric: 'auto',
    }).format(value, unit);
  };

  // 複数形対応翻訳関数
  const tp = (key: string, count?: number, options?: any) => {
    return t(key, { count, ...options });
  };

  // フィールド名翻訳（初期項目用）
  const translateFieldName = (fieldId: string): string => {
    const fieldTranslations: Record<string, string> = {
      weight: t('fields.weight'),
      systolic_bp: t('fields.systolicBp'),
      diastolic_bp: t('fields.diastolicBp'),
      exercise: t('fields.exercise'),
      diet: t('fields.diet'),
      sleep: t('fields.sleep'),
      heart_rate: t('fields.heartRate'),
      body_temperature: t('fields.bodyTemperature'),
      smoke: t('fields.smoke'),
      alcohol: t('fields.alcohol'),
      notes: t('pages.input.notes'),
    };

    return fieldTranslations[fieldId] || fieldId;
  };

  // エラーメッセージ翻訳
  const translateError = (errorType: string, message?: string) => {
    const errorKey = `errors.${errorType}`;
    if (message) {
      return t(errorKey, { message });
    }
    return t(errorKey, { defaultValue: t('errors.general') });
  };

  // ARIA ラベル生成
  const getAriaLabel = (key: string, params?: Record<string, any>) => {
    return t(`aria.${key}`, params);
  };

  // アクセシビリティアナウンス用翻訳
  const getAnnouncement = (key: string, params?: Record<string, any>) => {
    return t(`accessibility.announcements.${key}`, params);
  };

  // 言語に応じたフォントクラス取得
  const getFontClass = () => {
    switch (currentLanguage) {
      case 'ja':
        return 'font-japanese'; // 日本語フォント用クラス
      case 'en':
        return 'font-english'; // 英語フォント用クラス
      default:
        return '';
    }
  };

  return {
    // 基本翻訳機能
    t,
    tp,
    currentLanguage,
    changeLanguage,
    isRTL,

    // フォーマット機能
    formatNumber,
    formatDate,
    formatRelativeTime,

    // 専用翻訳機能
    translateFieldName,
    translateError,
    getAriaLabel,
    getAnnouncement,

    // UI関連
    getFontClass,
  };
}

/**
 * 言語切り替え専用フック
 * ヘッダーなどのUI部品用
 */
export function useLanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useI18n();

  const availableLanguages: { code: Language; name: string }[] = [
    { code: 'ja', name: '日本語' },
    { code: 'en', name: 'English' },
  ];

  const getLanguageName = (code: Language) => {
    const language = availableLanguages.find(lang => lang.code === code);
    return language?.name || code;
  };

  const getNextLanguage = () => {
    const currentIndex = availableLanguages.findIndex(
      lang => lang.code === currentLanguage
    );
    const nextIndex = (currentIndex + 1) % availableLanguages.length;
    return availableLanguages[nextIndex];
  };

  return {
    currentLanguage,
    changeLanguage,
    availableLanguages,
    getLanguageName,
    getNextLanguage,
  };
}
