import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import { PWAInstallButton } from './components/PWAInstallButton';
import QRCodeDisplay from './components/QRCodeDisplay';
import TipsModal from './components/TipsModal';
import { STORAGE_KEYS } from './constants/storageKeys';
import tipsList from './data/tips';
import * as db from './db';
import { usePWAInstallStatus } from './hooks/usePWAInstallStatus';
import { rootStore } from './store';
import { isDev } from './utils/devTools';
// Lazy load for better performance
const BpRecord = lazy(() => import('./pages/BpRecord'));
const DailyRecord = lazy(() => import('./pages/DailyRecord'));
const GoalInput = lazy(() => import('./pages/GoalInput'));
const RecordGraph = lazy(() => import('./pages/RecordGraph'));
const WeightRecord = lazy(() => import('./pages/WeightRecord'));

// ローディング用コンポーネント
const PageLoader = ({ pageName }: { pageName?: string }) => {
  return (
    <div
      className="flex items-center justify-center min-h-[400px]"
      role="status"
      aria-live="polite"
      aria-label={pageName ? `${pageName}を読み込み中` : 'ページを読み込み中'}
    >
      <div className="flex flex-col items-center space-y-4">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
          aria-hidden="true"
        ></div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          {pageName ? `${pageName}を読み込み中...` : 'ページを読み込み中...'}
        </p>
        {isDev && (
          <p
            className="text-xs text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          >
            パフォーマンス測定中
          </p>
        )}
      </div>
    </div>
  );
};

// ナビゲーションコンポーネント
function Navigation() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { shouldShowPWAButton } = usePWAInstallStatus();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Escapeキーでメニューを閉じる
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isMenuOpen]);

  // モバイルメニューのbody overflow制御
  useEffect(() => {
    if (isMenuOpen) {
      // メニューが開いている時のみbody scrollを制御
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMenuOpen]);

  const navItems = [
    { path: '/weight', label: '体重', color: 'teal' },
    { path: '/daily', label: '日課', color: 'teal' },
    { path: '/bp', label: '血圧', color: 'teal' },
    { path: '/graph', label: 'グラフ', color: 'blue' },
    { path: '/goal', label: '目標', color: 'teal' },
    { path: '/export', label: '管理', color: 'purple' },
  ];

  const isCurrentPage = (path: string) => location.pathname === path;

  return (
    <div className="relative">
      {/* スキップリンク */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-4 py-2 rounded-lg z-50 font-medium"
      >
        スキップリンク
      </a>

      {/* デスクトップ用ナビゲーション */}
      <nav
        className="hidden md:block"
        role="navigation"
        aria-label="メインへ移動"
      >
        <div className="flex justify-between items-center gap-4 mb-12 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg mx-4 mt-4">
        <div className="flex gap-4">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`${
                item.color === 'purple'
                  ? 'bg-purple-600 border-purple-600 hover:bg-purple-700 hover:border-purple-700'
                  : 'bg-blue-500 border-blue-500 hover:bg-blue-600 hover:border-blue-600'
              } !text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200 font-medium text-base border-2 hover:!text-white visited:!text-white active:!text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              aria-current={isCurrentPage(item.path) ? 'page' : undefined}
              aria-label={item.label}
            >
              {item.label}
              {isCurrentPage(item.path) && (
                <span className="sr-only">現在のページ</span>
              )}
            </Link>
          ))}
        </div>

        <div className={`flex items-center ${shouldShowPWAButton ? 'gap-2' : ''}`}>
          {/* QRコードボタン（デスクトップ用） */}
          <QRCodeDisplay />
          {/* PWAインストールボタン（デスクトップ用） */}
          {shouldShowPWAButton && (
            <PWAInstallButton className="ml-2" debug={false} />
          )}
        </div>
        </div>
      </nav>

      {/* モバイル用ヘッダー（タブ風ナビゲーション） */}
      <div className="md:hidden flex w-full mb-4">
        <nav className="flex w-full">
          {['/weight', '/daily', '/bp', '/graph'].map((path, idx, arr) => {
            const item = navItems.find(i => i.path === path);
            if (!item) return null;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 text-center py-3 font-bold text-base transition-colors duration-200
                  ${
                    isCurrentPage(item.path)
                      ? 'bg-blue-600 text-white mobile-nav-current'
                      : 'bg-gray-100 dark:bg-gray-700 text-blue-700 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-800 mobile-nav-link'
                  }
                  ${idx === 0 ? 'rounded-l-xl' : ''}
                  ${idx === arr.length ? 'rounded-r-xl' : ''}
                  rounded-none focus:outline-none focus:ring-0 border-0`}
                aria-current={isCurrentPage(item.path) ? 'page' : undefined}
                aria-label={item.label}
                style={{ minWidth: 0 }}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            );
          })}
          {/* ハンバーガーアイコンもタブとして右端に */}
          <button
            onClick={toggleMenu}
            className="flex-1 text-center py-3 font-bold text-base bg-gray-100 dark:bg-gray-700 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-r-xl border-0 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            style={{ minWidth: 0 }}
          >
            <span className="inline-block align-middle">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <rect y="5" width="24" height="2" rx="1" fill="currentColor" />
                <rect y="11" width="24" height="2" rx="1" fill="currentColor" />
                <rect y="17" width="24" height="2" rx="1" fill="currentColor" />
              </svg>
            </span>
          </button>
        </nav>
      </div>

      {/* モバイル用メニュー */}
      {isMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden absolute top-full left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-40 mb-4"
          role="dialog"
          aria-modal="true"
          aria-label="モバイルメニュー"
        >
          <nav role="navigation" aria-label="モバイルメインナビゲーション">
            <div className="flex flex-col">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMenu}
                  className={`px-4 py-3 font-medium text-base hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 border-b border-gray-100 dark:border-gray-600 ${
                    isCurrentPage(item.path)
                      ? 'bg-blue-600 text-white'
                      : item.color === 'purple'
                      ? '!text-purple-600 dark:!text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 focus:bg-purple-50 dark:focus:bg-purple-900/20 hover:!text-purple-600 dark:hover:!text-purple-400 visited:!text-purple-600 dark:visited:!text-purple-400 active:!text-purple-600 dark:active:!text-purple-400'
                      : '!text-blue-500 dark:!text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-50 dark:focus:bg-blue-900/20 hover:!text-blue-500 dark:hover:!text-blue-400 visited:!text-blue-500 dark:visited:!text-blue-400 active:!text-blue-500 dark:active:!text-blue-400'
                  }`}
                  aria-current={isCurrentPage(item.path) ? 'page' : undefined}
                  aria-label={item.label}
                >
                  {item.label}
                  {isCurrentPage(item.path) && (
                    <span className="sr-only">現在のページ</span>
                  )}
                </Link>
              ))}

              {/* QRコードとPWAボタン */}
              <div className={`flex justify-center px-4 py-3 border-t border-gray-100 dark:border-gray-600 ${shouldShowPWAButton ? 'gap-2' : ''}`}>
                <QRCodeDisplay className="text-sm px-3 py-2" />
                {shouldShowPWAButton && (
                  <PWAInstallButton
                    className="text-sm px-3 py-2"
                    debug={false}
                  />
                )}
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* オーバーレイ（メニューが開いている時） */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={closeMenu}
          aria-hidden="true"
        ></div>
      )}
    </div>
  );
}

const RecordExport = lazy(() => import('./pages/RecordExport'));

function App() {
  const [tipsModalOpen, setTipsModalOpen] = useState(false);
  const [tipText, setTipText] = useState('');
  const [isDataInitialized, setIsDataInitialized] = useState(false);

  // tips表示制御: 未表示のものからランダムに選択し、全件表示後はリセット
  const SHOWN_TIPS_KEY = STORAGE_KEYS.shownTipIndices;

  const getShownTipIndices = (): number[] => {
    try {
      const raw = localStorage.getItem(SHOWN_TIPS_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      const arr = Array.isArray(data)
        ? data
        : data && Array.isArray(data.indices)
        ? data.indices
        : [];
      return (arr as unknown[])
        .map(n => (typeof n === 'number' ? n : Number.NaN))
        .filter(n => Number.isInteger(n) && n >= 0 && n < tipsList.length);
    } catch {
      return [];
    }
  };

  const saveShownTipIndices = (indices: number[]) => {
    try {
      localStorage.setItem(SHOWN_TIPS_KEY, JSON.stringify(indices));
    } catch {
      // no-op
    }
  };

  const pickNextTipIndex = (): number => {
    const shown = getShownTipIndices();
    const all = Array.from({ length: tipsList.length }, (_, i) => i);
    const unseen = all.filter(i => !shown.includes(i));
    const pool = unseen.length > 0 ? unseen : all;
    const idx = pool[Math.floor(Math.random() * pool.length)];
    const nextShownSet = new Set<number>(shown);
    nextShownSet.add(idx);
    if (nextShownSet.size >= all.length) {
      // 全件消化直後にリセットし、今回選ばれた1件のみを履歴に保持
      saveShownTipIndices([idx]);
    } else {
      saveShownTipIndices(Array.from(nextShownSet));
    }
    return idx;
  };

  // tips表示用関数（disableTipsをチェック）
  const showTipsModal = () => {
    const disableTips = localStorage.getItem(STORAGE_KEYS.disableTips) === '1';
    console.log('showTipsModal呼び出し - disableTips:', disableTips);
    if (disableTips) {
      console.log('TIPS表示無効化設定により表示をスキップ');
      return;
    }
    const idx = pickNextTipIndex();
    setTipText(tipsList[idx]);
    setTipsModalOpen(true);
  };

  // 開発者ツール用の強制表示関数（disableTipsを無視）
  const forceShowTipsModal = () => {
    console.log('開発者ツール: TIPS強制表示');
    const idx = pickNextTipIndex();
    setTipText(tipsList[idx]);
    setTipsModalOpen(true);
  };

  // データ初期化
  useEffect(() => {
    const initializeData = async () => {
      try {
        // MobXストアの初期化
        const cleanupStores = await rootStore.initialize();

        // 日課フィールドの初期化
        const baseDailyFieldStructure = [
          { fieldId: 'exercise', name: '運動', order: 6, display: true },
          { fieldId: 'meal', name: '食事', order: 7, display: true },
          { fieldId: 'sleep', name: '睡眠', order: 8, display: true },
          { fieldId: 'smoke', name: '喫煙', order: 9, display: false },
          { fieldId: 'alcohol', name: '飲酒', order: 10, display: false },
        ];

        const existingDailyFields = await db.getAllDailyFields();
        if (existingDailyFields.length === 0) {
          for (const field of baseDailyFieldStructure) {
            await db.addDailyField(field);
          }
        }

        setIsDataInitialized(true);

        // コンポーネントアンマウント時のクリーンアップ
        return () => {
          cleanupStores();
        };
      } catch (error) {
        console.error('データ初期化エラー:', error);
        // エラー発生時でもアプリは動作させるが、初期化フラグは立てない
      }
    };

    initializeData();
  }, []);

  // 初回マウント時のtips表示（日付チェック）
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const lastTipsDate = localStorage.getItem(STORAGE_KEYS.lastTipsDate);

    console.log('TIPS自動表示チェック:', {
      lastTipsDate,
      todayStr,
      shouldShow: lastTipsDate !== todayStr,
    });

    if (lastTipsDate !== todayStr) {
      showTipsModal(); // この中でdisableTipsをチェック
    }
  }, []);

  const handleCloseTips = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    localStorage.setItem(STORAGE_KEYS.lastTipsDate, todayStr);
    setTipsModalOpen(false);
  };

  return (
    <div>
      <TipsModal
        open={tipsModalOpen}
        onClose={handleCloseTips}
        tipText={tipText}
      />
      <header role="banner">
        <Navigation />
      </header>

      <main id="main-content" role="main" tabIndex={-1}>
        {!isDataInitialized ? (
          <PageLoader pageName="データ初期化中" />
        ) : (
          <Suspense fallback={<PageLoader pageName="日課" />}>
            <Routes>
              <Route
                path="/goal"
                element={
                  <Suspense fallback={<PageLoader pageName="目標" />}>
                    <GoalInput />
                  </Suspense>
                }
              />
              <Route
                path="/daily"
                element={
                  <Suspense fallback={<PageLoader pageName="日課" />}>
                    <DailyRecord />
                  </Suspense>
                }
              />
              <Route
                path="/weight"
                element={
                  <Suspense fallback={<PageLoader pageName="体重" />}>
                    <WeightRecord showTipsModal={showTipsModal} />
                  </Suspense>
                }
              />
              <Route
                path="/bp"
                element={
                  <Suspense fallback={<PageLoader pageName="血圧" />}>
                    <BpRecord />
                  </Suspense>
                }
              />
              <Route
                path="/graph"
                element={
                  <Suspense fallback={<PageLoader pageName="グラフ" />}>
                    <RecordGraph />
                  </Suspense>
                }
              />
              <Route
                path="/export"
                element={
                  <Suspense fallback={<PageLoader pageName="管理" />}>
                    <RecordExport showTipsModal={forceShowTipsModal} />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/weight" replace />} />
            </Routes>
          </Suspense>
        )}
      </main>
    </div>
  );
}

export default App;
