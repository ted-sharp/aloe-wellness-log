/**
 * メール送信者情報のRepository
 * 単一レコードのみを管理（固定ID: 'default'）
 */

import type { MailSenderInfo } from '../../types/mailSender';
import { STORE_NAMES } from '../config';
import { executeTransaction } from '../connection';
import { trackDbOperation } from '../performance';
import type { OperationResult } from '../repository';

const FIXED_ID = 'default';

export class MailSenderRepository {
  /**
   * メール送信者情報の取得
   */
  async get(): Promise<OperationResult<MailSenderInfo | null>> {
    return trackDbOperation('mail-sender-get', async () => {
      try {
        const data = await executeTransaction(
          [STORE_NAMES.MAIL_SENDER],
          'readonly',
          async (_transaction, stores) => {
            const store = stores as IDBObjectStore;
            return new Promise<MailSenderInfo | null>((resolve, reject) => {
              const request = store.get(FIXED_ID);
              request.onsuccess = () => {
                const result = request.result as
                  | (MailSenderInfo & { id: string })
                  | undefined;
                if (result) {
                  // id を除外して返す
                  const { id: _id, ...info } = result;
                  resolve(info);
                } else {
                  resolve(null);
                }
              };
              request.onerror = () => reject(request.error);
            });
          }
        );

        return {
          success: true,
          data,
        };
      } catch (error) {
        console.error('Failed to get mail sender info:', error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get mail sender info',
        };
      }
    });
  }

  /**
   * メール送信者情報の保存
   */
  async save(info: MailSenderInfo): Promise<OperationResult<void>> {
    return trackDbOperation('mail-sender-save', async () => {
      try {
        await executeTransaction(
          [STORE_NAMES.MAIL_SENDER],
          'readwrite',
          async (_transaction, stores) => {
            const store = stores as IDBObjectStore;
            return new Promise<void>((resolve, reject) => {
              const dataWithId = {
                ...info,
                id: FIXED_ID,
                updatedAt: new Date().toISOString(),
              };
              const request = store.put(dataWithId);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        );

        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to save mail sender info:', error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to save mail sender info',
        };
      }
    });
  }

  /**
   * メール送信者情報の削除
   */
  async clear(): Promise<OperationResult<void>> {
    return trackDbOperation('mail-sender-clear', async () => {
      try {
        await executeTransaction(
          [STORE_NAMES.MAIL_SENDER],
          'readwrite',
          async (_transaction, stores) => {
            const store = stores as IDBObjectStore;
            return new Promise<void>((resolve, reject) => {
              const request = store.delete(FIXED_ID);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        );

        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to clear mail sender info:', error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to clear mail sender info',
        };
      }
    });
  }
}

// シングルトンインスタンス
export const mailSenderRepository = new MailSenderRepository();
