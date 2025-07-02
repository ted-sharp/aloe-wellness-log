import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import Button from './components/Button';
import { PWAInstallButton } from './components/PWAInstallButton';
import QRCodeDisplay from './components/QRCodeDisplay';
import DailyRecord from './pages/DailyRecord';
import GoalInput from './pages/GoalInput';
import OtherRecord from './pages/OtherRecord';
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
    { path: '/weight', label: '体重', color: 'teal' },
    { path: '/daily', label: '日課', color: 'teal' },
    { path: '/other', label: 'その他', color: 'teal' },
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

      {/* モバイル用ヘッダー（タブ風ナビゲーション） */}
      <div className="md:hidden flex w-full mb-4">
        <nav className="flex w-full">
          {['/weight', '/daily', '/other', '/graph'].map((path, idx, arr) => {
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
                  aria-label="メインへ移動"
                >
                  {item.label}
                  {isCurrentPage(item.path) && (
                    <span className="sr-only">現在のページ</span>
                  )}
                </Link>
              ))}

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
  const {
    initializeFields,
    loadFields,
    fieldsOperation,
    recordsOperation,
    loadRecords,
  } = useRecordsStore();

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

      // 初回マウント時のみfields初期化→ロード
      initializeFields().then(() => {
        loadFields();
      });

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
  }, [initializeFields, loadFields]);

  // fieldsの初期化が終わったらrecordsもロード
  useEffect(() => {
    if (!fieldsOperation.loading) {
      loadRecords();
    }
  }, [fieldsOperation.loading, loadRecords]);

  return (
    <div>
      <header role="banner">
        <Navigation />
      </header>

      <main id="main-content" role="main" tabIndex={-1}>
        {fieldsOperation &&
        recordsOperation &&
        (fieldsOperation.loading || recordsOperation.loading) ? (
          <PageLoader pageName="初期化中" />
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
                    <WeightRecord />
                  </Suspense>
                }
              />
              <Route
                path="/other"
                element={
                  <Suspense fallback={<PageLoader pageName="その他" />}>
                    <OtherRecord />
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
        )}
      </main>
    </div>
  );
}

export default App;
