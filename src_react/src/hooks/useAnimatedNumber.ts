import { useEffect, useState } from 'react';

/**
 * 数値のアニメーション表示用カスタムフック
 * @param target 目標値
 * @param duration アニメーション時間（ミリ秒）
 * @returns アニメーション中の現在値
 */
export function useAnimatedNumber(target: number, duration: number = 800): number {
  const [animated, setAnimated] = useState(0);
  
  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return;
    
    const start = 0;
    const startTime = performance.now();
    
    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimated(start + (target - start) * progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimated(target);
      }
    }
    
    requestAnimationFrame(animate);
  }, [target, duration]);
  
  return animated;
}