import { describe, it, expect, vi } from 'vitest';
import { classifyError, getDisplayMessage, logError, ErrorType } from './errorHandler';

describe('errorHandler', () => {
  describe('classifyError', () => {
    it('ネットワークエラーを正しく分類する', () => {
      const networkError = new Error('Failed to fetch');
      const result = classifyError(networkError);
      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.originalError).toBe(networkError);
    });

    it('バリデーションエラーメッセージを正しく分類する', () => {
      const validationError = new Error('項目名は必須です');
      const result = classifyError(validationError);
      expect(result.type).toBe(ErrorType.VALIDATION);
      expect(result.message).toBe('項目名は必須です');
    });

    it('データベースエラーメッセージを正しく分類する', () => {
      const dbError = new Error('IndexedDB connection failed');
      const result = classifyError(dbError);
      expect(result.type).toBe(ErrorType.DATABASE);
      expect(result.message).toBe('データベース操作でエラーが発生しました');
    });

    it('パースエラーメッセージを正しく分類する', () => {
      const parseError = new Error('JSON parse error');
      const result = classifyError(parseError);
      expect(result.type).toBe(ErrorType.PARSE);
      expect(result.message).toBe('データの解析でエラーが発生しました');
    });

    it('未知のエラーをUNKNOWNとして分類する', () => {
      const unknownError = new Error('Something went wrong');
      const result = classifyError(unknownError);
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Something went wrong');
    });

    it('文字列エラーを正しく処理する', () => {
      const result = classifyError('予期しないエラー');
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('予期しないエラーが発生しました');
    });

    it('nullやundefinedを安全に処理する', () => {
      const resultNull = classifyError(null);
      expect(resultNull.type).toBe(ErrorType.UNKNOWN);

      const resultUndefined = classifyError(undefined);
      expect(resultUndefined.type).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('getDisplayMessage', () => {
    it('VALIDATIONエラーで元のメッセージを返す', () => {
      const appError = {
        type: ErrorType.VALIDATION,
        message: '項目名を入力してください'
      };
      expect(getDisplayMessage(appError)).toBe('項目名を入力してください');
    });

    it('DATABASEエラーで適切なメッセージを返す', () => {
      const appError = {
        type: ErrorType.DATABASE,
        message: 'Database error'
      };
      expect(getDisplayMessage(appError)).toBe('データの保存・読み込みに失敗いたしました。もう一度お試しくださいませ。');
    });

    it('PARSEエラーで適切なメッセージを返す', () => {
      const appError = {
        type: ErrorType.PARSE,
        message: 'Parse error'
      };
      expect(getDisplayMessage(appError)).toBe('ファイルの形式が正しくありません。ファイルの内容をご確認くださいませ。');
    });

    it('NETWORKエラーで適切なメッセージを返す', () => {
      const appError = {
        type: ErrorType.NETWORK,
        message: 'Network error'
      };
      expect(getDisplayMessage(appError)).toBe('ネットワーク接続に問題があります。接続状況をご確認くださいませ。');
    });

    it('PERMISSIONエラーで適切なメッセージを返す', () => {
      const appError = {
        type: ErrorType.PERMISSION,
        message: 'Permission denied'
      };
      expect(getDisplayMessage(appError)).toBe('この操作を実行する権限がありません。');
    });

    it('UNKNOWNエラーで元のメッセージを返す', () => {
      const appError = {
        type: ErrorType.UNKNOWN,
        message: 'Unknown error'
      };
      expect(getDisplayMessage(appError)).toBe('Unknown error');
    });
  });

  describe('logError', () => {
    it('console.errorが呼ばれることを確認', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const appError = {
        type: ErrorType.VALIDATION,
        message: 'Validation failed',
        originalError: new Error('Original error')
      };

      logError(appError, 'テストコンテキスト');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[テストコンテキスト] Validation failed',
        appError.originalError
      );

      consoleSpy.mockRestore();
    });

    it('コンテキストなしでログ出力', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const appError = {
        type: ErrorType.DATABASE,
        message: 'Database error',
        context: { detail: 'Additional info' }
      };

      logError(appError);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Database error',
        appError.context
      );

      consoleSpy.mockRestore();
    });
  });
});
