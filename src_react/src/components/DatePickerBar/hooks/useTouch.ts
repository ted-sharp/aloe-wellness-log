import { useEffect, useRef, useCallback } from 'react';
import { DATE_PICKER_CONFIG } from '../constants';
import type { TouchCoordinates } from '../types';

interface UseTouchProps {
  setCenterDate: (date: Date) => void;
}

/**
 * タッチ操作を管理するカスタムフック
 */
export const useTouch = ({ setCenterDate }: UseTouchProps) => {
  const touchRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<TouchCoordinates>({ startX: null, startY: null });

  /**
   * タッチ開始時の処理
   */
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    coordsRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
    };
  }, []);

  /**
   * タッチ終了時の処理（フリック判定・最適化版）
   */
  const handleTouchEnd = useCallback((e: TouchEvent) => {
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
      // 簡単なスワイプ処理 - 現在の日付から1日だけ移動
      const currentDate = new Date();
      const newDate = new Date(currentDate);
      if (diffX < 0) {
        // 左スワイプ → 未来へ
        newDate.setDate(currentDate.getDate() + 1);
      } else {
        // 右スワイプ → 過去へ
        newDate.setDate(currentDate.getDate() - 1);
      }
      setCenterDate(newDate);
    }

    // 座標をリセット
    coordsRef.current = { startX: null, startY: null };
  }, [setCenterDate]); // centerDateを依存関係から除外

  // タッチイベントリスナーの設定
  useEffect(() => {
    const element = touchRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return {
    touchRef,
  };
};