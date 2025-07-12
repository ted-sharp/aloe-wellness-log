import { useEffect, useRef, useCallback } from 'react';
import { isAtScrollEdge } from '../helpers';
import type { ScrollDirection } from '../types';

interface UseScrollableProps {
  onScrollEdge: (direction: ScrollDirection, scrollWidth: number) => void;
}

/**
 * スクロール機能を管理するカスタムフック
 */
export const useScrollable = ({ onScrollEdge }: UseScrollableProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * ホイールイベントの処理（縦スクロールを横スクロールに変換）
   */
  const handleWheel = useCallback((e: WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      // 縦ホイールを横スクロールに変換
      container.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, []);

  /**
   * スクロール端での範囲拡張処理
   */
  const handleScrollEdge = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const { isAtLeft, isAtRight } = isAtScrollEdge(scrollLeft, scrollWidth, clientWidth);

    if (isAtRight) {
      onScrollEdge('right', scrollWidth);
    }
    
    if (isAtLeft) {
      onScrollEdge('left', scrollWidth);
    }
  }, [onScrollEdge]);

  // ホイールイベントリスナーの設定
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // スクロールイベントリスナーの設定
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScrollEdge, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScrollEdge);
    };
  }, [handleScrollEdge]);

  return {
    containerRef,
  };
};