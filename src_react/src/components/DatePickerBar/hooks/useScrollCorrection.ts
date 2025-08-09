import { useLayoutEffect } from 'react';
import type { DateRange, ScrollDirection } from '../types';

interface UseScrollCorrectionProps {
  containerRef: React.RefObject<HTMLDivElement>;
  lastEdgeRef: React.MutableRefObject<ScrollDirection | null>;
  prevWidthRef: React.MutableRefObject<number>;
  dateRange: DateRange;
}

/**
 * スクロール位置補正を管理するカスタムフック
 * 左端での日付範囲拡張時にスクロール位置を維持する
 */
export const useScrollCorrection = ({
  containerRef,
  lastEdgeRef,
  prevWidthRef,
  dateRange,
}: UseScrollCorrectionProps) => {
  // 日付範囲拡張時のスクロール位置補正（左端のみ）
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !lastEdgeRef.current) return;

    const prevWidth = prevWidthRef.current ?? 0;
    const diff = container.scrollWidth - prevWidth;

    if (lastEdgeRef.current === 'left' && diff > 0) {
      // 左端拡張時はスクロール位置を補正して表示位置を維持
      container.scrollLeft += diff;
    }

    // リセット
    if (lastEdgeRef.current) {
      (lastEdgeRef as React.MutableRefObject<ScrollDirection | null>).current =
        null;
    }
  }, [containerRef, lastEdgeRef, prevWidthRef, dateRange]);
};
