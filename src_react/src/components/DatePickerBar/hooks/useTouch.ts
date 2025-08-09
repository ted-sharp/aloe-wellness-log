import { useCallback, useEffect, useRef } from 'react';
import { DATE_PICKER_CONFIG } from '../constants';
import { calculateDaysFromSwipe } from '../helpers';
import type { TouchCoordinates } from '../types';

interface UseTouchProps {
  setCenterDate: (date: Date) => void;
  // フリックの基準となる日付（タッチ開始時点の centerDate）を取得する関数
  getBaseDate: () => Date;
}

/**
 * タッチ操作を管理するカスタムフック
 * ポリシー:
 * - ユーザー主体の操作感を最優先とするため、
 *   フリック後に「自動で中央スクロール」や「スムースアニメーション」は行わない。
 * - 本フックは centerDate の更新のみに責務を限定する。
 */
export const useTouch = ({ setCenterDate, getBaseDate }: UseTouchProps) => {
  const touchRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<TouchCoordinates>({
    startX: null,
    startY: null,
  });
  const baseDateRef = useRef<Date | null>(null);

  /**
   * タッチ開始時の処理
   */
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      coordsRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
      };
      // タッチ開始時点の基準日をスナップショット
      baseDateRef.current = getBaseDate();
    },
    [getBaseDate]
  );

  // 初期対応へ戻す（moveは追跡しない）
  const handleTouchMove = useCallback((_e: TouchEvent) => {}, []);

  /**
   * タッチ終了時の処理（フリック判定・最適化版）
   */
  const finalizeSwipe = useCallback(
    (e: TouchEvent) => {
      const { startX, startY } = coordsRef.current;

      if (startX === null || startY === null) return;

      const touch = e.changedTouches[0];
      const diffX = touch.clientX - startX;
      const diffY = touch.clientY - startY;

      // 水平方向のスワイプを検出
      if (
        Math.abs(diffX) > Math.abs(diffY) &&
        Math.abs(diffX) > DATE_PICKER_CONFIG.TOUCH_THRESHOLD
      ) {
        // タッチ開始時点の centerDate を基準に、フリック距離に応じて複数日移動
        const baseDate = baseDateRef.current ?? getBaseDate();
        const days = calculateDaysFromSwipe(diffX);
        const newDate = new Date(baseDate);
        if (diffX < 0) {
          // 左スワイプ → 未来へ
          newDate.setDate(baseDate.getDate() + days);
        } else {
          // 右スワイプ → 過去へ
          newDate.setDate(baseDate.getDate() - days);
        }
        setCenterDate(newDate);
      }

      // 座標をリセット
      coordsRef.current = {
        startX: null,
        startY: null,
      };
      baseDateRef.current = null;
    },
    [setCenterDate, getBaseDate]
  ); // centerDateは直接参照せず、getBaseDateで取得

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => finalizeSwipe(e),
    [finalizeSwipe]
  );
  const handleTouchCancel = useCallback(
    (e: TouchEvent) => finalizeSwipe(e),
    [finalizeSwipe]
  );

  // タッチイベントリスナーの設定
  useEffect(() => {
    const element = touchRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, {
      passive: true,
    });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  return {
    touchRef,
  };
};
