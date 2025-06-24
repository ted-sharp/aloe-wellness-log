import React, { useCallback, useState } from 'react';
import { HiChevronDown, HiLanguage } from 'react-icons/hi2';
import { useDropdownAccessibility } from '../hooks/useAccessibility';
import { useI18n, useLanguageSwitcher } from '../hooks/useI18n';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean; // コンパクト表示（ヘッダー用）
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [, setSelectedIndex] = useState(0);

  const { t } = useI18n();
  const {
    currentLanguage,
    changeLanguage,
    availableLanguages,
    getLanguageName,
  } = useLanguageSwitcher();

  // 現在の言語のインデックスを取得
  const currentIndex = availableLanguages.findIndex(
    lang => lang.code === currentLanguage
  );

  // ドロップダウンアクセシビリティ
  const { comboboxProps, listboxProps } = useDropdownAccessibility({
    items: availableLanguages,
    isOpen,
    selectedIndex: currentIndex >= 0 ? currentIndex : 0,
    onSelectionChange: setSelectedIndex,
    onToggle: () => setIsOpen(!isOpen),
    onClose: () => setIsOpen(false),
  });

  // 言語選択ハンドラー
  const handleLanguageSelect = useCallback(
    async (index: number) => {
      const selectedLanguage = availableLanguages[index];
      if (selectedLanguage && selectedLanguage.code !== currentLanguage) {
        await changeLanguage(selectedLanguage.code);
        setIsOpen(false);
      }
    },
    [availableLanguages, currentLanguage, changeLanguage]
  );

  // オプションクリックハンドラー
  const handleOptionClick = useCallback(
    (index: number) => {
      handleLanguageSelect(index);
    },
    [handleLanguageSelect]
  );

  if (compact) {
    // コンパクト表示（モバイルヘッダー用）
    return (
      <div className={`relative ${className}`}>
        <button
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-1 rounded transition-colors duration-200"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t('language.switchTo', {
            language: getLanguageName(currentLanguage),
          })}
          {...comboboxProps}
        >
          <HiLanguage className="w-4 h-4" aria-hidden="true" />
          <span className="uppercase text-xs font-medium">
            {currentLanguage}
          </span>
          <HiChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 min-w-[120px]">
            <ul className="py-1" {...listboxProps}>
              {availableLanguages.map((language, index) => (
                <li key={language.code}>
                  <button
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 transition-colors duration-200 ${
                      language.code === currentLanguage
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                    onClick={() => handleOptionClick(index)}
                    role="option"
                    aria-selected={language.code === currentLanguage}
                    id={`language-option-${index}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="uppercase text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono">
                        {language.code}
                      </span>
                      <span>{language.name}</span>
                    </span>
                    {language.code === currentLanguage && (
                      <span className="sr-only">
                        {' '}
                        ({t('navigation.currentPage')})
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* オーバーレイ */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>
    );
  }

  // 通常表示（設定画面用）
  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
        <HiLanguage className="w-4 h-4 inline mr-1" aria-hidden="true" />
        {currentLanguage === 'ja'
          ? '表示言語 / Display Language'
          : 'Display Language / 表示言語'}
      </label>

      <div className="relative">
        <button
          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-400 focus:border-blue-600 dark:focus:border-blue-400 flex items-center justify-between"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t('language.switchTo', {
            language: getLanguageName(currentLanguage),
          })}
          {...comboboxProps}
        >
          <span className="flex items-center gap-2">
            <span className="uppercase text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded font-mono font-medium">
              {currentLanguage}
            </span>
            <span className="font-medium">
              {getLanguageName(currentLanguage)}
            </span>
          </span>
          <HiChevronDown
            className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
            <ul className="py-1 max-h-60 overflow-y-auto" {...listboxProps}>
              {availableLanguages.map((language, index) => (
                <li key={language.code}>
                  <button
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 transition-colors duration-200 ${
                      language.code === currentLanguage
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                    onClick={() => handleOptionClick(index)}
                    role="option"
                    aria-selected={language.code === currentLanguage}
                    id={`language-option-full-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="uppercase text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded font-mono font-medium">
                        {language.code}
                      </span>
                      <span className="font-medium">{language.name}</span>
                      {language.code === currentLanguage && (
                        <span className="ml-auto text-blue-600 dark:text-blue-400">
                          ✓
                          <span className="sr-only">
                            {' '}
                            ({t('navigation.currentPage')})
                          </span>
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* オーバーレイ */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {currentLanguage === 'ja'
          ? 'アプリケーションの表示言語を変更できます。設定は自動的に保存されます。'
          : 'You can change the display language of the application. Settings are automatically saved.'}
      </p>
    </div>
  );
};

export default LanguageSwitcher;
