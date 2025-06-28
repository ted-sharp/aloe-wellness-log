import type { ReactNode } from 'react';
import React, { Component } from 'react';
import { useI18n } from '../hooks/useI18n';

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
  const { t } = useI18n();
  return <ErrorBoundaryInner {...props} t={t} />;
}

interface ErrorBoundaryInnerProps extends ErrorBoundaryProps {
  t: (key: string) => string;
}

class ErrorBoundaryInner extends Component<
  ErrorBoundaryInnerProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryInnerProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
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

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, t } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.handleReset);
      }
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2 text-center">
            {t('errorDialog.title')}
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-6 text-center max-w-md">
            {t('errorDialog.message')}
            <br />
            {t('errorDialog.reloadAdvice')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              {t('errorDialog.retry')}
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
            >
              {t('errorDialog.reload')}
            </button>
          </div>
          <details className="mt-6 w-full max-w-2xl text-left">
            <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400 font-medium">
              {t('errorDialog.details')}
            </summary>
            <div className="mt-2 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs font-mono overflow-auto max-h-40 text-left">
              <div className="mb-2 text-left">
                <strong>{t('errorDialog.errorName')}:</strong> {error.name}
              </div>
              <div className="mb-2 text-left">
                <strong>{t('errorDialog.errorMessage')}:</strong>{' '}
                {error.message}
              </div>
              {errorInfo && (
                <div className="text-left">
                  <strong>{t('errorDialog.stackTrace')}:</strong>
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
