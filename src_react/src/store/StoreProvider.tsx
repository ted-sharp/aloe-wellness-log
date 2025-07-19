import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { RootStoreProvider, createRootStore, type RootStore } from './improved-index';

interface StoreProviderProps {
  children: React.ReactNode;
}

/**
 * アプリケーション全体のストアプロバイダー
 * ベストプラクティス: Dependency Injection + 適切な初期化
 */
export const StoreProvider: React.FC<StoreProviderProps> = observer(({ children }) => {
  const [store] = useState<RootStore>(() => createRootStore());
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const initializeStore = async () => {
      try {
        await store.initialize();
        
        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        if (isMounted) {
          setInitError(error instanceof Error ? error : new Error('Unknown error'));
        }
      }
    };

    initializeStore();

    // クリーンアップ
    return () => {
      isMounted = false;
      store.dispose();
    };
  }, [store]);

  // 初期化エラーの場合
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">
            初期化エラー
          </h1>
          <p className="text-gray-600">{initError.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // 初期化中の場合
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">アプリケーションを初期化中...</p>
        </div>
      </div>
    );
  }

  // 初期化完了
  return (
    <RootStoreProvider store={store}>
      {children}
    </RootStoreProvider>
  );
});

export default StoreProvider;