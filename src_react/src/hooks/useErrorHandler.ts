// 後方互換性のための統一エラーハンドラーのエイリアス
// 既存のインポートを壊さないために、古いAPIを新しいAPIにマッピング

export {
  useUnifiedErrorHandler as useErrorHandler,
} from './useUnifiedErrorHandler';