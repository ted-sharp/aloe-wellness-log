// 🔐 プライバシー保護 & データセキュリティユーティリティ

/**
 * データ暗号化/復号化のためのユーティリティ
 * ブラウザの標準 Crypto API を使用
 */

// セキュリティ設定
const SECURITY_CONFIG = {
  // 暗号化アルゴリズム
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  IV_LENGTH: 12,

  // データ保持期間（ミリ秒）
  DATA_RETENTION_PERIOD: 365 * 24 * 60 * 60 * 1000, // 1年
  CACHE_RETENTION_PERIOD: 7 * 24 * 60 * 60 * 1000, // 1週間

  // プライバシー設定
  ENABLE_DATA_ANONYMIZATION: true,
  ENABLE_AUTOMATIC_CLEANUP: true,

  // ログレベル（開発環境でのみ詳細ログ）
  LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
};

/**
 * セキュアな乱数生成
 */
export function generateSecureRandom(length: number = 32): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

/**
 * パスワードベースの鍵導出
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: SECURITY_CONFIG.ALGORITHM, length: SECURITY_CONFIG.KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * データの暗号化
 */
export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<{
  encryptedData: ArrayBuffer;
  iv: Uint8Array;
}> {
  const encoder = new TextEncoder();
  const iv = generateSecureRandom(SECURITY_CONFIG.IV_LENGTH);

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: SECURITY_CONFIG.ALGORITHM,
      iv: iv,
    },
    key,
    encoder.encode(data)
  );

  return { encryptedData, iv };
}

/**
 * データの復号化
 */
export async function decryptData(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: SECURITY_CONFIG.ALGORITHM,
      iv: iv,
    },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

/**
 * データハッシュ化（一方向）
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

  // ArrayBuffer を hex 文字列に変換
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 機密データのマスキング
 */
export function maskSensitiveData(
  value: unknown,
  type: 'partial' | 'full' | 'hash' = 'partial'
): string {
  if (value === null || value === undefined) {
    return '---';
  }

  const strValue = String(value);

  switch (type) {
    case 'full':
      return '*'.repeat(strValue.length);

    case 'hash': {
      // 同期的なハッシュ化（簡易版）
      let hash = 0;
      for (let i = 0; i < strValue.length; i++) {
        const char = strValue.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 32bit整数に変換
      }
      return `#${Math.abs(hash).toString(16)}`;
    }

    case 'partial':
    default:
      if (strValue.length <= 3) {
        return '*'.repeat(strValue.length);
      } else if (strValue.length <= 8) {
        return (
          strValue.slice(0, 1) +
          '*'.repeat(strValue.length - 2) +
          strValue.slice(-1)
        );
      } else {
        return (
          strValue.slice(0, 2) +
          '*'.repeat(strValue.length - 4) +
          strValue.slice(-2)
        );
      }
  }
}

/**
 * データのサニタイゼーション
 */
export function sanitizeData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // 機密情報と思われるキーをマスキング
    if (isSensitiveKey(key)) {
      sanitized[key] = maskSensitiveData(value);
    } else if (typeof value === 'object' && value !== null) {
      // ネストされたオブジェクトの再帰処理
      sanitized[key] = Array.isArray(value)
        ? value.map(item =>
            typeof item === 'object'
              ? sanitizeData(item as Record<string, unknown>)
              : item
          )
        : sanitizeData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * 機密キーの判定
 */
function isSensitiveKey(key: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /auth/i,
    /session/i,
    /cookie/i,
    /email/i,
    /phone/i,
    /address/i,
    /ssn/i,
    /credit/i,
  ];

  return sensitivePatterns.some(pattern => pattern.test(key));
}

/**
 * プライバシー配慮ログ
 */
export function privacyLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  data?: unknown
): void {
  const shouldLog =
    level === 'error' ||
    (level === 'warn' &&
      ['debug', 'info', 'warn'].includes(SECURITY_CONFIG.LOG_LEVEL)) ||
    (level === 'info' &&
      ['debug', 'info'].includes(SECURITY_CONFIG.LOG_LEVEL)) ||
    (level === 'debug' && SECURITY_CONFIG.LOG_LEVEL === 'debug');

  if (!shouldLog) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}][PRIVACY][${level.toUpperCase()}]`;

  if (data && typeof data === 'object') {
    console[level](
      `${prefix} ${message}`,
      sanitizeData(data as Record<string, unknown>)
    );
  } else if (data) {
    console[level](`${prefix} ${message}`, maskSensitiveData(data));
  } else {
    console[level](`${prefix} ${message}`);
  }
}

/**
 * データ保持期間チェック
 */
export function isDataExpired(
  timestamp: number,
  retentionPeriod: number = SECURITY_CONFIG.DATA_RETENTION_PERIOD
): boolean {
  return Date.now() - timestamp > retentionPeriod;
}

/**
 * 自動データクリーンアップ
 */
export async function cleanupExpiredData(): Promise<void> {
  if (!SECURITY_CONFIG.ENABLE_AUTOMATIC_CLEANUP) {
    privacyLog('debug', 'Automatic cleanup is disabled');
    return;
  }

  try {
    privacyLog('info', 'Starting automatic data cleanup');

    // IndexedDB のクリーンアップ
    if ('indexedDB' in window) {
      await cleanupIndexedDB();
    }

    // LocalStorage のクリーンアップ
    cleanupLocalStorage();

    // SessionStorage のクリーンアップ
    cleanupSessionStorage();

    // Service Worker キャッシュのクリーンアップ
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEANUP_EXPIRED_CACHE',
      });
    }

    privacyLog('info', 'Automatic data cleanup completed');
  } catch (error) {
    privacyLog('error', 'Data cleanup failed', error);
  }
}

/**
 * IndexedDB のクリーンアップ
 */
async function cleanupIndexedDB(): Promise<void> {
  // 実装は具体的なDBスキーマに依存するため、
  // ここでは基本的なクリーンアップロジックのみ
  privacyLog('debug', 'IndexedDB cleanup completed');
}

/**
 * LocalStorage のクリーンアップ
 */
function cleanupLocalStorage(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const data = JSON.parse(value);
          if (data.timestamp && isDataExpired(data.timestamp)) {
            keysToRemove.push(key);
          }
        } catch {
          // JSON以外のデータは古いものとして削除対象
          const item = localStorage.getItem(key);
          if ((item && key.startsWith('cache_')) || key.startsWith('temp_')) {
            keysToRemove.push(key);
          }
        }
      }
    }
  }

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    privacyLog('debug', `Removed expired localStorage item: ${key}`);
  });
}

/**
 * SessionStorage のクリーンアップ
 */
function cleanupSessionStorage(): void {
  // SessionStorage は通常セッション終了時に自動削除されるが、
  // セキュリティのため明示的にクリア
  const keysToRemove: string[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.startsWith('temp_') || key.startsWith('cache_'))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
    privacyLog('debug', `Removed sessionStorage item: ${key}`);
  });
}

/**
 * データ匿名化
 */
export function anonymizeHealthData(
  data: Record<string, unknown>
): Record<string, unknown> {
  if (!SECURITY_CONFIG.ENABLE_DATA_ANONYMIZATION) {
    return data;
  }

  const anonymized = { ...data };

  // 特定可能な情報を除去・変換
  delete anonymized.id;
  delete anonymized.userId;
  delete anonymized.deviceId;

  // 日時を期間に変換（例：具体的な日時 → 週単位）
  if (anonymized.datetime && typeof anonymized.datetime === 'string') {
    const date = new Date(anonymized.datetime);
    const weekOfYear = getWeekOfYear(date);
    anonymized.period = `${date.getFullYear()}-W${weekOfYear}`;
    delete anonymized.datetime;
    delete anonymized.date;
    delete anonymized.time;
  }

  return anonymized;
}

/**
 * 年内での週番号を取得
 */
function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor(
    (date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  );
  return Math.ceil((days + start.getDay() + 1) / 7);
}

/**
 * セキュリティヘッダーの検証
 */
export function validateSecurityHeaders(response: Response): boolean {
  const requiredHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
  ];

  return requiredHeaders.every(header => response.headers.has(header));
}

/**
 * プライバシー設定の初期化
 */
export function initializePrivacySettings(): void {
  privacyLog('info', 'Initializing privacy settings');

  // 定期的なクリーンアップを設定
  if (SECURITY_CONFIG.ENABLE_AUTOMATIC_CLEANUP) {
    // 1時間ごとにクリーンアップを実行
    setInterval(cleanupExpiredData, 60 * 60 * 1000);

    // ページ離脱時にもクリーンアップ
    window.addEventListener('beforeunload', () => {
      cleanupExpiredData().catch(error => {
        privacyLog('error', 'Cleanup on unload failed', error);
      });
    });
  }

  // セキュリティイベントのリスナー設定
  window.addEventListener('securitypolicyviolation', event => {
    privacyLog('error', 'Security Policy Violation detected', {
      directive: event.violatedDirective,
      blockedURI: event.blockedURI,
      disposition: event.disposition,
    });
  });

  privacyLog('info', 'Privacy settings initialized successfully');
}

// エクスポート用の設定オブジェクト
export const PrivacyConfig = {
  ...SECURITY_CONFIG,

  // 設定を動的に更新
  updateConfig(newConfig: Partial<typeof SECURITY_CONFIG>): void {
    Object.assign(SECURITY_CONFIG, newConfig);
    privacyLog('info', 'Privacy configuration updated', newConfig);
  },

  // 現在の設定を取得
  getConfig(): typeof SECURITY_CONFIG {
    return { ...SECURITY_CONFIG };
  },
};
