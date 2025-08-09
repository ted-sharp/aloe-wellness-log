import { useCallback, useEffect, useState } from 'react';
import { formatDate } from '../../../utils/dateUtils';
import { DATE_PICKER_CONFIG } from '../constants';
import { calculateCenterScrollOffset } from '../helpers';

interface UseCenterScrollProps {
  centerDate: Date;
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * 中央スクロール機能を管理するカスタムフック
 * ポリシー:
 * - ユーザー主体の操作感を最優先。
 * - フリック操作後の自動センタリングは行わない（呼び出し元で抑制）。
 * - 初回表示や明示的操作（カレンダー選択など）のみ、
 *   必要に応じて即時スクロールで位置合わせを行う（スムース禁止）。
 */
export const useCenterScroll = ({
  centerDate,
  containerRef,
}: UseCenterScrollProps) => {
  const [pendingCenterScroll, setPendingCenterScroll] = useState(false);

  // 初回マウント時に中央スクロールフラグを立てる
  useEffect(() => {
    setPendingCenterScroll(true);
  }, []);

  /**
   * 中央スクロールの実行
   */
  const executeCenterScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !pendingCenterScroll) return;

    let tries = 0;

    const tryScroll = () => {
      const target = container.querySelector<HTMLButtonElement>(
        `button[data-date='${formatDate(centerDate)}']`
      );

      if (target) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset = calculateCenterScrollOffset(containerRect, targetRect);
        // スムーススクロールは行わず即時反映（アニメーション禁止）
        container.scrollBy({ left: offset });
        setPendingCenterScroll(false);
      } else if (tries < DATE_PICKER_CONFIG.SCROLL_RETRY_MAX) {
        tries++;
        setTimeout(tryScroll, DATE_PICKER_CONFIG.SCROLL_RETRY_DELAY);
      } else {
        setPendingCenterScroll(false);
      }
    };

    tryScroll();
  }, [centerDate, containerRef, pendingCenterScroll]);

  // centerDate変更時の中央スクロール実行
  useEffect(() => {
    executeCenterScroll();
  }, [executeCenterScroll]);

  /**
   * 手動で中央スクロールを要求する
   */
  const requestCenterScroll = useCallback(() => {
    setPendingCenterScroll(true);
  }, []);

  return {
    requestCenterScroll,
  };
};
