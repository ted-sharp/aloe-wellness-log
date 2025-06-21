// エラーの種類を定義
export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  PARSE = 'parse',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

// エラー情報の型定義
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  context?: Record<string, unknown>;
}

// エラー分類機能
export function classifyError(error: unknown): AppError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // データベース関連エラー
    if (message.includes('indexeddb') || message.includes('database') || message.includes('store')) {
      return {
        type: ErrorType.DATABASE,
        message: 'データベース操作でエラーが発生しました',
        originalError: error
      };
    }

    // パース関連エラー
    if (message.includes('parse') || message.includes('json') || message.includes('csv')) {
      return {
        type: ErrorType.PARSE,
        message: 'データの解析でエラーが発生しました',
        originalError: error
      };
    }

    // バリデーション関連エラー
    if (message.includes('validation') || message.includes('必須') || message.includes('形式')) {
      return {
        type: ErrorType.VALIDATION,
        message: error.message,
        originalError: error
      };
    }

    // ネットワーク関連エラー
    if (message.includes('network') || message.includes('fetch') || message.includes('request')) {
      return {
        type: ErrorType.NETWORK,
        message: 'ネットワークエラーが発生しました',
        originalError: error
      };
    }

    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    message: '予期しないエラーが発生しました',
    context: { originalError: error }
  };
}

// ユーザーフレンドリーなエラーメッセージを生成
export function getDisplayMessage(appError: AppError): string {
  switch (appError.type) {
    case ErrorType.VALIDATION:
      return appError.message;

    case ErrorType.DATABASE:
      return 'データの保存・読み込みに失敗いたしました。もう一度お試しくださいませ。';

    case ErrorType.PARSE:
      return 'ファイルの形式が正しくありません。ファイルの内容をご確認くださいませ。';

    case ErrorType.NETWORK:
      return 'ネットワーク接続に問題があります。接続状況をご確認くださいませ。';

    case ErrorType.PERMISSION:
      return 'この操作を実行する権限がありません。';

    default:
      return appError.message || '予期しないエラーが発生いたしました。';
  }
}

// エラーログ出力
export function logError(appError: AppError, context?: string): void {
  const logMessage = context ? `[${context}] ${appError.message}` : appError.message;

  if (appError.originalError) {
    console.error(logMessage, appError.originalError);
  } else {
    console.error(logMessage, appError.context);
  }
}
