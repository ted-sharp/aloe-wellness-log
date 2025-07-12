import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { expandDateRange, getDateArray } from '../utils/dateUtils';

interface UseDateScrollOptions {
  centerDate: Date;
  setCenterDate: (date: Date) => void;
  buttonWidth?: number;
  extraScrollDays?: number;
  scrollExpandChunk?: number;
}

interface UseDateScrollReturn {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  minDate: Date;
  maxDate: Date;
  dateArray: Date[];
  pendingCenterScroll: boolean;
  handleScroll: () => void;
}

const BUTTON_WIDTH = 56;
const EXTRA_SCROLL_DAYS = 90; // 最低表示日数（片側）
const SCROLL_EXPAND_CHUNK = 30; // 端に来たら追加する日数

export function useDateScroll({
  centerDate,
  setCenterDate,
  buttonWidth = BUTTON_WIDTH,
  extraScrollDays = EXTRA_SCROLL_DAYS,
  scrollExpandChunk = SCROLL_EXPAND_CHUNK,
}: UseDateScrollOptions): UseDateScrollReturn {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 初期の日付範囲を設定
  const [minDate, setMinDate] = useState(() => {
    const { minDate } = expandDateRange(centerDate, extraScrollDays);
    return minDate;
  });
  
  const [maxDate, setMaxDate] = useState(() => {
    const { maxDate } = expandDateRange(centerDate, extraScrollDays);
    return maxDate;
  });

  const [pendingCenterScroll, setPendingCenterScroll] = useState(false);

  // centerDateが変更されたときに日付範囲を更新
  useEffect(() => {
    const { minDate: newMinDate, maxDate: newMaxDate } = expandDateRange(centerDate, extraScrollDays);
    setMinDate(newMinDate);
    setMaxDate(newMaxDate);
    setPendingCenterScroll(true);
  }, [centerDate, extraScrollDays]);

  // 日付配列を計算
  const dateArray = getDateArray(minDate, maxDate);

  // centerDateへのスクロール処理
  useLayoutEffect(() => {
    if (!pendingCenterScroll || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const centerIndex = dateArray.findIndex(
      date => date.toDateString() === centerDate.toDateString()
    );

    if (centerIndex !== -1) {
      const scrollPosition = centerIndex * buttonWidth - container.clientWidth / 2 + buttonWidth / 2;
      container.scrollLeft = Math.max(0, scrollPosition);
      setPendingCenterScroll(false);
    }
  }, [dateArray, centerDate, buttonWidth, pendingCenterScroll]);

  // スクロール位置に基づく日付範囲の動的拡張
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const isNearStart = scrollLeft < buttonWidth * 5;
    const isNearEnd = scrollLeft + clientWidth > scrollWidth - buttonWidth * 5;

    if (isNearStart) {
      // 開始日を過去に拡張
      const newMinDate = new Date(minDate);
      newMinDate.setDate(minDate.getDate() - scrollExpandChunk);
      setMinDate(newMinDate);
    }

    if (isNearEnd) {
      // 終了日を未来に拡張
      const newMaxDate = new Date(maxDate);
      newMaxDate.setDate(maxDate.getDate() + scrollExpandChunk);
      setMaxDate(newMaxDate);
    }

    // 現在の中央日付を更新
    const centerPosition = scrollLeft + clientWidth / 2;
    const centerIndex = Math.round(centerPosition / buttonWidth);
    
    if (centerIndex >= 0 && centerIndex < dateArray.length) {
      const newCenterDate = dateArray[centerIndex];
      if (newCenterDate.toDateString() !== centerDate.toDateString()) {
        setCenterDate(newCenterDate);
      }
    }
  }, [minDate, maxDate, dateArray, centerDate, setCenterDate, buttonWidth, scrollExpandChunk]);

  return {
    scrollContainerRef,
    minDate,
    maxDate,
    dateArray,
    pendingCenterScroll,
    handleScroll,
  };
}