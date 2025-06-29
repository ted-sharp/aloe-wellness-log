import type { ReactNode } from 'react';
import React, { Component } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ラッパーでhookを使う
function ErrorBoundaryWrapper(props: ErrorBoundaryProps) {
  return <ErrorBoundaryInner {...props} />;
}

class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState & { copied?: boolean }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleCopy = async () => {
    const { error, errorInfo } = this.state;
    if (!error) return;
    const errorText =
      `エラー名: ${error.name}\nエラーメッセージ: ${error.message}\n` +
      (errorInfo ? `スタックトレース:\n${errorInfo.componentStack}` : '');
    await navigator.clipboard.writeText(errorText);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 1500);
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.handleReset);
      }
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2 text-center">
            エラーが発生しました
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-6 text-center max-w-md">
            申し訳ありません。予期しないエラーが発生しました。
            <br />
            ページを再読み込みしてください。
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              再試行
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
            >
              再読み込み
            </button>
          </div>
          <details className="mt-6 w-full max-w-2xl text-left">
            <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400 font-medium flex items-center justify-between">
              <span>詳細</span>
              <button
                type="button"
                onClick={this.handleCopy}
                className="ml-4 px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ minWidth: 60 }}
              >
                {this.state.copied ? 'コピーしました' : 'コピー'}
              </button>
            </summary>
            <div className="mt-2 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs font-mono overflow-auto max-h-40 text-left">
              <div className="mb-2 text-left">
                <strong>エラー名:</strong> {error.name}
              </div>
              <div className="mb-2 text-left">
                <strong>エラーメッセージ:</strong> {error.message}
              </div>
              {errorInfo && (
                <div className="text-left">
                  <strong>スタックトレース:</strong>
                  <pre className="whitespace-pre-wrap text-xs mt-1 text-left">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        </div>
      );
    }
    return children;
  }
}

export default ErrorBoundaryWrapper;
