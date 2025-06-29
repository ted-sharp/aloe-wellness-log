import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import Button from './components/Button';
import { PWAInstallButton } from './components/PWAInstallButton';
import QRCodeDisplay from './components/QRCodeDisplay';
import BloodPressureRecord from './pages/BloodPressureRecord';
import DailyRecord from './pages/DailyRecord';
import RecordGraph from './pages/RecordGraph';
import WeightRecord from './pages/WeightRecord';
import { useRecordsStore } from './store/records';
import {
  debugLog,
  detectReactDevTools,
  exposeDevTools,
  isDev,
  perfEnd,
  perfStart,
  showDevWarnings,
} from './utils/devTools';

// ローディング用コンポーネント
const PageLoader = ({ pageName }: { pageName?: string }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          {pageName ? `${pageName}を読み込み中...` : 'ページを読み込み中...'}
        </p>
        {isDev && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
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

  // モバイルメニューのbody overflow制御（SortModalとの競合を防ぐ）
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
    { path: '/daily', label: '日課', color: 'teal' },
    { path: '/weight', label: '体重', color: 'teal' },
    { path: '/bp', label: '血圧', color: 'teal' },
    { path: '/graph', label: 'グラフ', color: 'blue' },
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
        className="hidden md:flex justify-between items-center gap-4 mb-12 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg mx-4 mt-4"
        role="navigation"
        aria-label="メインへ移動"
      >
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
              aria-label="メインへ移動"
            >
              {item.label}
              {isCurrentPage(item.path) && (
                <span className="sr-only">現在のページ</span>
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* QRコードボタン（デスクトップ用） */}
          <QRCodeDisplay />
          {/* PWAインストールボタン（デスクトップ用） */}
          <PWAInstallButton className="ml-2" debug={import.meta.env.DEV} />
        </div>
      </nav>

      {/* モバイル用ヘッダー */}
      <div className="md:hidden flex justify-between items-center mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm mx-4 mt-4">
        <h1 className="text-base font-bold text-gray-800 dark:text-white whitespace-nowrap">
          App Title
        </h1>

        <div className="flex items-center">
          <button
            onClick={toggleMenu}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div
                className={`h-0.5 w-6 bg-gray-800 dark:bg-gray-200 transition-all duration-300 ${
                  isMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                }`}
              ></div>
              <div
                className={`h-0.5 w-6 bg-gray-800 dark:bg-gray-200 transition-all duration-300 ${
                  isMenuOpen ? 'opacity-0' : ''
                }`}
              ></div>
              <div
                className={`h-0.5 w-6 bg-gray-800 dark:bg-gray-200 transition-all duration-300 ${
                  isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
                }`}
              ></div>
            </div>
          </button>
        </div>
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
                    item.color === 'purple'
                      ? '!text-purple-600 dark:!text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 focus:bg-purple-50 dark:focus:bg-purple-900/20 hover:!text-purple-600 dark:hover:!text-purple-400 visited:!text-purple-600 dark:visited:!text-purple-400 active:!text-purple-600 dark:active:!text-purple-400'
                      : '!text-blue-500 dark:!text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-50 dark:focus:bg-blue-900/20 hover:!text-blue-500 dark:hover:!text-blue-400 visited:!text-blue-500 dark:visited:!text-blue-400 active:!text-blue-500 dark:active:!text-blue-400'
                  }`}
                  aria-current={isCurrentPage(item.path) ? 'page' : undefined}
                  aria-label="メインへ移動"
                >
                  {item.label}
                  {isCurrentPage(item.path) && (
                    <span className="sr-only">現在のページ</span>
                  )}
                </Link>
              ))}

              {/* 区切り線 */}
              <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>

              {/* QRコードとPWAボタン */}
              <div className="flex justify-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-600">
                <QRCodeDisplay className="text-sm px-3 py-2" />
                <PWAInstallButton
                  className="text-sm px-3 py-2"
                  debug={import.meta.env.DEV}
                />
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

const RecordExport = lazy(() => {
  perfStart('RecordExport-load');
  return import('./pages/RecordExport')
    .then(module => {
      perfEnd('RecordExport-load');
      return module;
    })
    .catch(error => {
      console.error('Failed to load RecordExport:', error);
      return {
        default: function ErrorComponent() {
          return (
            <div className="p-8 text-center">
              <h2 className="text-xl font-bold text-red-600 mb-4">
                ロードエラー
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                エクスポートページのロードに失敗しました。
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => window.location.reload()}
              >
                ページを再読み込み
              </Button>
            </div>
          );
        },
      };
    });
});

function App() {
  const { initializeFields, initializeFieldsWithTranslation } =
    useRecordsStore();

  useEffect(() => {
    try {
      if (isDev) {
        perfStart('App-initialization');
        debugLog('🚀 App initialization started');
      }

      // 開発ツールの初期化（エラーが発生しても続行）
      if (isDev) {
        try {
          exposeDevTools();
          detectReactDevTools();
          showDevWarnings();
        } catch (devError) {
          console.warn('⚠️ Development tools initialization failed:', devError);
        }
      }

      // フィールド初期化（国際化対応）
      initializeFieldsWithTranslation();

      if (isDev) {
        perfEnd('App-initialization');
        debugLog('✅ App initialization completed');
      }
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      // エラーが発生してもアプリは動作させる
      try {
        // フォールバックとして既存の初期化を使用
        initializeFields();
      } catch (fallbackError) {
        console.error('❌ Fallback initialization also failed:', fallbackError);
      }
    }
  }, [initializeFields, initializeFieldsWithTranslation]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <header role="banner">
        <Navigation />
      </header>

      <main id="main-content" role="main" className="px-4" tabIndex={-1}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
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
                  <WeightRecord />
                </Suspense>
              }
            />
            <Route
              path="/bp"
              element={
                <Suspense fallback={<PageLoader pageName="血圧" />}>
                  <BloodPressureRecord />
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
                  <RecordExport />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/daily" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
