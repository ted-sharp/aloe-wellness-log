import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';
import { HiArrowPath, HiExclamationTriangle, HiHome } from 'react-icons/hi2';
import i18n from '../i18n';
import type { UnifiedError } from '../utils/unifiedErrorHandler';
import {
  createUnifiedError,
  logUnifiedError,
} from '../utils/unifiedErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'section' | 'component';
  context?: string;
  onError?: (error: UnifiedError, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  enableNavigation?: boolean;
}

interface State {
  hasError: boolean;
  unifiedError: UnifiedError | null;
  retryCount: number;
  lastErrorTime: number;
}

/**
 * 強化されたError Boundary
 * - 自動回復機能
 * - 詳細なエラー情報
 * - ユーザーフレンドリーな回復オプション
 */
export class EnhancedErrorBoundary extends Component<Props, State> {
  private readonly maxRetries = 3;
  private readonly retryTimeout = 5000; // 5秒

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      unifiedError: null,
      retryCount: 0,
      lastErrorTime: 0,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      lastErrorTime: Date.now(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { context, onError } = this.props;

    // 統合エラーオブジェクトを作成
    const unifiedError = createUnifiedError(error, {
      source: 'error_boundary',
      level: this.props.level || 'component',
      context: context || 'Unknown',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // エラーログ出力
    logUnifiedError(unifiedError, `ErrorBoundary(${context || 'Unknown'})`);

    // 状態更新
    this.setState({
      unifiedError,
      retryCount: this.state.retryCount + 1,
    });

    // カスタムエラーハンドラー実行
    onError?.(unifiedError, errorInfo);

    // 自動リトライ（条件に応じて）
    this.scheduleAutoRetry(unifiedError);
  }

  private scheduleAutoRetry = (unifiedError: UnifiedError) => {
    const { enableRetry = true } = this.props;
    const { retryCount, lastErrorTime } = this.state;

    if (
      !enableRetry ||
      !unifiedError.retryable ||
      retryCount >= this.maxRetries ||
      Date.now() - lastErrorTime < this.retryTimeout
    ) {
      return;
    }

    // 一定時間後に自動リトライ
    setTimeout(() => {
      this.handleRetry();
    }, 2000 + Math.pow(retryCount, 2) * 1000); // 指数バックオフ
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      unifiedError: null,
      // retryCountはリセットしない（累積で管理）
    });
  };

  private handleReloadPage = () => {
    window.location.reload();
  };

  private handleNavigateHome = () => {
    window.location.href = '/';
  };

  private getErrorTitle = (): string => {
    const { level } = this.props;
    const { unifiedError } = this.state;

    if (unifiedError) {
      switch (unifiedError.type) {
        case 'rendering':
          return level === 'page'
            ? 'ページの表示エラー'
            : 'コンポーネントエラー';
        case 'database':
          return 'データ処理エラー';
        case 'network':
          return 'ネットワークエラー';
        default:
          return 'アプリケーションエラー';
      }
    }

    return level === 'page' ? 'ページエラー' : 'エラーが発生しました';
  };

  private getErrorMessage = (): string => {
    const { unifiedError } = this.state;

    if (unifiedError) {
      return unifiedError.userMessage;
    }

    return 'アプリケーションで予期しないエラーが発生いたしました。';
  };

  private canRetry = (): boolean => {
    const { enableRetry = true } = this.props;
    const { unifiedError, retryCount } = this.state;

    return (
      enableRetry &&
      retryCount < this.maxRetries &&
      (unifiedError?.retryable ?? true)
    );
  };

  private renderErrorContent = (): ReactNode => {
    const { level = 'component', enableNavigation = true } = this.props;
    const { retryCount } = this.state;
    const canRetry = this.canRetry();

    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <HiExclamationTriangle className="w-8 h-8 text-red-600" />
        </div>

        <h2 className="text-xl font-bold text-red-800 mb-2 text-center">
          {this.getErrorTitle()}
        </h2>

        <p className="text-red-700 mb-6 text-center max-w-md">
          {this.getErrorMessage()}
        </p>

        {retryCount > 0 && (
          <p className="text-sm text-red-600 mb-4">
            試行回数: {retryCount}/{this.maxRetries}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {canRetry && (
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              aria-label={i18n.t('common.retry')}
            >
              <HiArrowPath className="w-4 h-4" />
              再試行
            </button>
          )}

          <button
            onClick={this.handleReloadPage}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
            aria-label={i18n.t('errors.reloadPage')}
          >
            <HiArrowPath className="w-4 h-4" />
            ページ再読み込み
          </button>

          {enableNavigation && level === 'page' && (
            <button
              onClick={this.handleNavigateHome}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
              aria-label={i18n.t('actions.back')}
            >
              <HiHome className="w-4 h-4" />
              ホームに戻る
            </button>
          )}
        </div>

        {/* 開発環境でのデバッグ情報 */}
        {process.env.NODE_ENV === 'development' && this.state.unifiedError && (
          <details className="mt-6 w-full max-w-2xl">
            <summary className="cursor-pointer text-sm text-red-600 font-medium">
              デバッグ情報
            </summary>
            <div className="mt-2 p-4 bg-red-100 border border-red-300 rounded text-xs font-mono overflow-auto max-h-40">
              <div className="mb-2">
                <strong>エラーID:</strong> {this.state.unifiedError.id}
              </div>
              <div className="mb-2">
                <strong>タイプ:</strong> {this.state.unifiedError.type}
              </div>
              <div className="mb-2">
                <strong>重要度:</strong> {this.state.unifiedError.severity}
              </div>
              <div className="mb-2">
                <strong>リトライ可能:</strong>{' '}
                {this.state.unifiedError.retryable ? 'はい' : 'いいえ'}
              </div>
              {this.state.unifiedError.stack && (
                <div>
                  <strong>スタックトレース:</strong>
                  <pre className="whitespace-pre-wrap text-xs mt-1">
                    {this.state.unifiedError.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    );
  };

  public render() {
    const { children, fallback } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      // カスタムフォールバックがある場合はそれを使用
      if (fallback) {
        return fallback;
      }

      // デフォルトエラーUIを表示
      return this.renderErrorContent();
    }

    return children;
  }
}

// 利便性のためのラッパーコンポーネント
interface PageErrorBoundaryProps {
  children: ReactNode;
  context?: string;
  onError?: (error: UnifiedError, errorInfo: ErrorInfo) => void;
}

export const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({
  children,
  context = 'Page',
  onError,
}) => (
  <EnhancedErrorBoundary
    level="page"
    context={context}
    enableRetry={true}
    enableNavigation={true}
    onError={onError}
  >
    {children}
  </EnhancedErrorBoundary>
);

interface SectionErrorBoundaryProps {
  children: ReactNode;
  context?: string;
  onError?: (error: UnifiedError, errorInfo: ErrorInfo) => void;
}

export const SectionErrorBoundary: React.FC<SectionErrorBoundaryProps> = ({
  children,
  context = 'Section',
  onError,
}) => (
  <EnhancedErrorBoundary
    level="section"
    context={context}
    enableRetry={true}
    enableNavigation={false}
    onError={onError}
  >
    {children}
  </EnhancedErrorBoundary>
);

interface ComponentErrorBoundaryProps {
  children: ReactNode;
  context?: string;
  fallback?: ReactNode;
  onError?: (error: UnifiedError, errorInfo: ErrorInfo) => void;
}

export const ComponentErrorBoundary: React.FC<ComponentErrorBoundaryProps> = ({
  children,
  context = 'Component',
  fallback,
  onError,
}) => (
  <EnhancedErrorBoundary
    level="component"
    context={context}
    fallback={fallback}
    enableRetry={true}
    enableNavigation={false}
    onError={onError}
  >
    {children}
  </EnhancedErrorBoundary>
);
