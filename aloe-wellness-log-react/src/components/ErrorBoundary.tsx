import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { HiArrowPath, HiExclamationTriangle } from 'react-icons/hi2';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // エラーがあったかどうかを追跡
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーログを出力
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 本番環境では、エラー監視サービスに送信することも可能
    // if (process.env.NODE_ENV === 'production') {
    //   // エラー監視サービス（例：Sentry）にエラーを送信
    //   // errorReportingService.captureException(error, {
    //   //   contexts: { errorInfo }
    //   // });
    // }
  }

  public resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.resetError);
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 p-4 rounded-full">
                <HiExclamationTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              申し訳ございません
            </h1>

            <p className="text-gray-600 mb-6 leading-relaxed">
              予期しないエラーが発生いたしました。
              <br />
              ご不便をおかけして申し訳ございませんの。
            </p>

            {this.state.error && (
              <details className="text-left mb-6 bg-gray-50 p-4 rounded-lg">
                <summary className="cursor-pointer text-gray-700 font-medium mb-2">
                  技術的な詳細（クリックで表示）
                </summary>
                <div className="text-sm text-gray-600 font-mono bg-white p-3 rounded border overflow-auto max-h-32">
                  <p className="font-semibold mb-1">エラー名:</p>
                  <p className="mb-2">{this.state.error.name}</p>
                  <p className="font-semibold mb-1">エラーメッセージ:</p>
                  <p className="mb-2">{this.state.error.message}</p>
                  {this.state.error.stack && (
                    <>
                      <p className="font-semibold mb-1">スタックトレース:</p>
                      <pre className="text-xs whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={this.resetError}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <HiArrowPath className="w-5 h-5" />
                もう一度試す
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors duration-200"
              >
                ページを再読み込み
              </button>

              <p className="text-sm text-gray-500 mt-4">
                問題が続く場合は、ブラウザのキャッシュをクリアしてみてくださいませ。
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
