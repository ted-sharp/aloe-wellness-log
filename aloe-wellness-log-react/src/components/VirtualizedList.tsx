import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useOptimizedMemo } from '../hooks/usePerformance';
import { isDev } from '../utils/devTools';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  estimatedItemHeight?: number;
  enableSmoothScrolling?: boolean;
}

// パフォーマンス最適化された仮想化リスト
function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  keyExtractor,
  overscan = 3,
  className = '',
  onScroll,
  estimatedItemHeight,
  enableSmoothScrolling = true,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout>();

  // 動的アイテム高さの管理
  const itemHeights = useRef<Map<number, number>>(new Map());
  const [totalHeight, setTotalHeight] = useState<number>(
    items.length * itemHeight
  );

  // 可視領域の計算（最適化済み）
  const { startIndex, endIndex, visibleItems } = useOptimizedMemo(
    () => {
      if (items.length === 0) {
        return { startIndex: 0, endIndex: 0, visibleItems: [] };
      }

      const actualItemHeight = estimatedItemHeight || itemHeight;
      const visibleStartIndex = Math.max(
        0,
        Math.floor(scrollTop / actualItemHeight) - overscan
      );
      const visibleCount = Math.ceil(height / actualItemHeight);
      const visibleEndIndex = Math.min(
        items.length - 1,
        visibleStartIndex + visibleCount + overscan * 2
      );

      const visible = [];
      let currentTop = 0;

      // 各アイテムの位置を計算
      for (let i = visibleStartIndex; i <= visibleEndIndex; i++) {
        if (i < items.length) {
          // アイテムごとの高さを考慮（動的高さ対応）
          const itemActualHeight =
            itemHeights.current.get(i) || actualItemHeight;

          // visibleStartIndexより前のアイテムの高さを累積
          if (i === visibleStartIndex) {
            currentTop = visibleStartIndex * actualItemHeight;
          }

          visible.push({
            item: items[i],
            index: i,
            top: currentTop,
            height: itemActualHeight,
          });

          currentTop += itemActualHeight;
        }
      }

      return {
        startIndex: visibleStartIndex,
        endIndex: visibleEndIndex,
        visibleItems: visible,
      };
    },
    [items, scrollTop, height, itemHeight, overscan, estimatedItemHeight],
    'virtualized-list-calculation'
  );

  // アイテム高さの測定と記録
  const measureItemHeight = useCallback(
    (index: number, element: HTMLElement) => {
      const measuredHeight = element.getBoundingClientRect().height;
      const previousHeight = itemHeights.current.get(index);

      if (previousHeight !== measuredHeight) {
        itemHeights.current.set(index, measuredHeight);

        // 総高さを再計算
        let newTotalHeight = 0;
        for (let i = 0; i < items.length; i++) {
          newTotalHeight +=
            itemHeights.current.get(i) || estimatedItemHeight || itemHeight;
        }
        setTotalHeight(newTotalHeight);
      }
    },
    [items.length, itemHeight, estimatedItemHeight]
  );

  // スクロールハンドラー（パフォーマンス最適化）
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = event.currentTarget.scrollTop;

      // スクロール状態の管理
      isScrolling.current = true;
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
      scrollingTimeoutRef.current = setTimeout(() => {
        isScrolling.current = false;
      }, 150);

      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);

      // 開発環境でのパフォーマンス監視
      if (isDev) {
        const startTime = performance.now();
        // スクロール処理のパフォーマンス測定
        const endTime = performance.now();
        if (endTime - startTime > 16) {
          console.warn(
            `🐌 Slow scroll processing: ${(endTime - startTime).toFixed(2)}ms`
          );
        }
      }
    },
    [onScroll]
  );

  // アイテムレンダラー（ref付き）
  const ItemRenderer = memo<{
    item: T;
    index: number;
    top: number;
    height: number;
  }>(({ item, index, top, height }) => {
    const itemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (itemRef.current && estimatedItemHeight) {
        measureItemHeight(index, itemRef.current);
      }
    }, [index, item]);

    return (
      <div
        ref={itemRef}
        style={{
          position: 'absolute',
          top,
          height: estimatedItemHeight ? 'auto' : height,
          width: '100%',
          minHeight: height,
        }}
        data-index={index}
      >
        {renderItem(item, index)}
      </div>
    );
  });

  ItemRenderer.displayName = 'VirtualizedListItem';

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${
        enableSmoothScrolling ? 'scroll-smooth' : ''
      } ${className}`}
      style={{ height }}
      onScroll={handleScroll}
      role="listbox"
      aria-label="仮想化リスト"
    >
      {/* 全体の高さを確保するためのコンテナ */}
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems.map(({ item, index, top, height }) => (
          <ItemRenderer
            key={keyExtractor(item, index)}
            item={item}
            index={index}
            top={top}
            height={height}
          />
        ))}
      </div>

      {/* 開発環境でのデバッグ情報 */}
      {isDev && (
        <div
          className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded font-mono"
          style={{ zIndex: 9999 }}
        >
          <div>Total: {items.length}</div>
          <div>Visible: {visibleItems.length}</div>
          <div>
            Range: {startIndex}-{endIndex}
          </div>
          <div>ScrollTop: {Math.round(scrollTop)}</div>
          <div>Scrolling: {isScrolling.current ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
}

// メモ化してエクスポート
export default memo(VirtualizedList) as <T>(
  props: VirtualizedListProps<T>
) => React.ReactElement;
