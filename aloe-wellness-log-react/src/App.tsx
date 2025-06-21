import { Suspense, lazy, useEffect, useState } from 'react';
import {
  Link,
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from 'react-router-dom';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import { PWAInstallButton } from './components/PWAInstallButton';
import ToastContainer from './components/ToastContainer';
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

// 動的インポート（Lazy Loading）でページコンポーネントを読み込み
const RecordInput = lazy(() => {
  perfStart('RecordInput-load');
  return import('./pages/RecordInput').then(module => {
    perfEnd('RecordInput-load');
    return module;
  });
});

const RecordList = lazy(() => {
  perfStart('RecordList-load');
  return import('./pages/RecordList').then(module => {
    perfEnd('RecordList-load');
    return module;
  });
});

const RecordGraph = lazy(() => {
  perfStart('RecordGraph-load');
  return import('./pages/RecordGraph').then(module => {
    perfEnd('RecordGraph-load');
    return module;
  });
});

const RecordCalendar = lazy(() => {
  perfStart('RecordCalendar-load');
  return import('./pages/RecordCalendar').then(module => {
    perfEnd('RecordCalendar-load');
    return module;
  });
});

const RecordExport = lazy(() => {
  perfStart('RecordExport-load');
  return import('./pages/RecordExport').then(module => {
    perfEnd('RecordExport-load');
    return module;
  });
});

// ローディング用コンポーネント
const PageLoader = ({ pageName }: { pageName?: string }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      <p className="text-gray-600 font-medium">
        {pageName ? `${pageName}を読み込み中...` : 'ページを読み込み中...'}
      </p>
      {isDev && (
        <p className="text-xs text-gray-400">
          Development: パフォーマンス測定中
        </p>
      )}
    </div>
  </div>
);

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

  const navItems = [
    { path: '/', label: '入力', color: 'green' },
    { path: '/list', label: '一覧', color: 'blue' },
    { path: '/graph', label: 'グラフ', color: 'blue' },
    { path: '/calendar', label: 'カレンダー', color: 'blue' },
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
        メインコンテンツにスキップ
      </a>

      {/* デスクトップ用ナビゲーション */}
      <nav
        className="hidden md:flex justify-between items-center gap-4 mb-12 p-4 bg-white rounded-lg shadow-lg mx-4 mt-4"
        role="navigation"
        aria-label="メインナビゲーション"
      >
        <div className="flex gap-4">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`${
                item.color === 'green'
                  ? 'bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700'
                  : item.color === 'purple'
                  ? 'bg-purple-600 border-purple-600 hover:bg-purple-700 hover:border-purple-700'
                  : 'bg-blue-500 border-blue-500 hover:bg-blue-600 hover:border-blue-600'
              } !text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200 font-medium text-base border-2 hover:!text-white visited:!text-white active:!text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              aria-current={isCurrentPage(item.path) ? 'page' : undefined}
              aria-label={`${item.label}ページに移動`}
            >
              {item.label}
              {isCurrentPage(item.path) && (
                <span className="sr-only">（現在のページ）</span>
              )}
            </Link>
          ))}
        </div>

        {/* PWAインストールボタン（デスクトップ用） */}
        <PWAInstallButton className="ml-4" />
      </nav>

      {/* モバイル用ヘッダー */}
      <div className="md:hidden flex justify-between items-center mb-4 p-4 bg-white rounded-lg shadow-sm mx-4 mt-4">
        <h1 className="text-lg font-semibold text-gray-800">
          🌿 アロエ健康ログ
        </h1>

        <div className="flex items-center gap-2">
          {/* PWAインストールボタン（モバイル用・小さめ） */}
          <PWAInstallButton className="text-xs px-3 py-1.5" />

          <button
            onClick={toggleMenu}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div
                className={`h-0.5 w-6 bg-gray-800 transition-all duration-300 ${
                  isMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                }`}
              ></div>
              <div
                className={`h-0.5 w-6 bg-gray-800 transition-all duration-300 ${
                  isMenuOpen ? 'opacity-0' : ''
                }`}
              ></div>
              <div
                className={`h-0.5 w-6 bg-gray-800 transition-all duration-300 ${
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
          className="md:hidden absolute top-full left-4 right-4 bg-white rounded-lg shadow-lg z-50 mb-4"
          role="dialog"
          aria-modal="true"
          aria-label="モバイルナビゲーションメニュー"
        >
          <nav role="navigation" aria-label="モバイルメインナビゲーション">
            <div className="flex flex-col">
              {navItems.map((item, index) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMenu}
                  className={`px-4 py-3 font-medium text-base hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                    index < navItems.length - 1
                      ? 'border-b border-gray-100'
                      : ''
                  } ${
                    item.color === 'green'
                      ? '!text-green-600 hover:bg-green-50 focus:bg-green-50 hover:!text-green-600 visited:!text-green-600 active:!text-green-600'
                      : item.color === 'purple'
                      ? '!text-purple-600 hover:bg-purple-50 focus:bg-purple-50 hover:!text-purple-600 visited:!text-purple-600 active:!text-purple-600'
                      : '!text-blue-500 hover:bg-blue-50 focus:bg-blue-50 hover:!text-blue-500 visited:!text-blue-500 active:!text-blue-500'
                  }`}
                  aria-current={isCurrentPage(item.path) ? 'page' : undefined}
                  aria-label={`${item.label}ページに移動`}
                >
                  {item.label}
                  {isCurrentPage(item.path) && (
                    <span className="sr-only">（現在のページ）</span>
                  )}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* オーバーレイ（メニューが開いている時） */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={closeMenu}
          aria-hidden="true"
        ></div>
      )}
    </div>
  );
}

function App() {
  const { initializeFields } = useRecordsStore();

  useEffect(() => {
    if (isDev) {
      perfStart('App-initialization');
      debugLog('🚀 App initialization started');
    }

    // 開発ツールの初期化
    if (isDev) {
      exposeDevTools();
      detectReactDevTools();
      showDevWarnings();
    }

    // フィールド初期化
    initializeFields();

    if (isDev) {
      perfEnd('App-initialization');
      debugLog('✅ App initialization completed');
    }
  }, [initializeFields]);

  return (
    <ErrorBoundary>
      <div className="bg-gray-50 min-h-screen">
        <ToastContainer />
        <Router>
          <header role="banner">
            <Navigation />
          </header>

          <main id="main-content" role="main" className="px-4" tabIndex={-1}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Suspense fallback={<PageLoader pageName="記録入力画面" />}>
                      <RecordInput />
                    </Suspense>
                  }
                />
                <Route
                  path="/list"
                  element={
                    <Suspense fallback={<PageLoader pageName="記録一覧画面" />}>
                      <RecordList />
                    </Suspense>
                  }
                />
                <Route
                  path="/graph"
                  element={
                    <Suspense fallback={<PageLoader pageName="グラフ画面" />}>
                      <RecordGraph />
                    </Suspense>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <Suspense
                      fallback={<PageLoader pageName="カレンダー画面" />}
                    >
                      <RecordCalendar />
                    </Suspense>
                  }
                />
                <Route
                  path="/export"
                  element={
                    <Suspense fallback={<PageLoader pageName="管理画面" />}>
                      <RecordExport />
                    </Suspense>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </Router>
      </div>
    </ErrorBoundary>
  );
}

export default App;
