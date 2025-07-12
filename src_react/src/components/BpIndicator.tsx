import React from 'react';
import type { BpRecordV2 } from '../types/record';

// 血圧基準範囲帯の型定義
type BpBand = {
  min: number;
  max: number;
  color: string;
  label: string;
  range: string;
};

// 収縮期血圧の基準帯
const systolicBands: BpBand[] = [
  { min: 0, max: 90, color: '#6ec6f1', label: '低', range: '<90' },
  { min: 90, max: 120, color: '#7edfa0', label: '正常', range: '90-119' },
  { min: 120, max: 130, color: '#e6f7b2', label: '正常高値', range: '120-129' },
  { min: 130, max: 140, color: '#fff59d', label: '高値', range: '130-139' },
  { min: 140, max: 160, color: '#ffb74d', label: 'Ⅰ度', range: '140-159' },
  { min: 160, max: 180, color: '#ff7043', label: 'Ⅱ度', range: '160-179' },
  { min: 180, max: 300, color: '#d32f2f', label: 'Ⅲ度', range: '180+' },
];

// 拡張期血圧の基準帯
const diastolicBands: BpBand[] = [
  { min: 0, max: 60, color: '#6ec6f1', label: '低', range: '<60' },
  { min: 60, max: 80, color: '#7edfa0', label: '正常', range: '60-79' },
  { min: 80, max: 90, color: '#fff59d', label: '高値', range: '80-89' },
  { min: 90, max: 100, color: '#ffb74d', label: 'Ⅰ度', range: '90-99' },
  { min: 100, max: 110, color: '#ff7043', label: 'Ⅱ度', range: '100-109' },
  { min: 110, max: 200, color: '#d32f2f', label: 'Ⅲ度', range: '110+' },
];

// マーカーの位置を計算する関数
function getMarkerLeft(bands: BpBand[], value: number | null): number {
  if (value == null) return 0;
  let total = 0;
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    if (value < b.max) {
      const bandWidth = 100 / bands.length;
      const ratio = (value - b.min) / (b.max - b.min);
      return total + bandWidth * ratio;
    }
    total += 100 / bands.length;
  }
  return 100;
}

interface BpIndicatorProps {
  recordsOfDay: BpRecordV2[];
}

/**
 * 血圧インジケーターコンポーネント
 * 収縮期・拡張期血圧の正常値範囲を色付きバーで表示し、
 * 現在の血圧値をマーカーで示す
 */
const BpIndicator: React.FC<BpIndicatorProps> = ({ recordsOfDay }) => {
  // 最新値取得（時刻降順）
  const latest = recordsOfDay.length
    ? [...recordsOfDay].sort((a, b) =>
        (b.time || '').localeCompare(a.time || '')
      )[0]
    : null;
  
  const systolic = latest?.systolic ?? null;
  const diastolic = latest?.diastolic ?? null;
  const markerLeftSys = getMarkerLeft(systolicBands, systolic);
  const markerLeftDia = getMarkerLeft(diastolicBands, diastolic);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-2 mb-2">
      {/* 収縮期血圧帯 */}
      <div className="w-full flex flex-col items-center">
        <div
          className="relative w-full h-7 flex rounded overflow-hidden shadow"
          style={{ minWidth: 240 }}
        >
          {systolicBands.map(band => (
            <div
              key={band.label}
              className="flex-1 flex flex-col items-center justify-center"
              style={{ background: band.color, minWidth: 0 }}
            >
              <span
                className="text-[10px] font-bold text-gray-800 dark:text-gray-900 select-none"
                style={{ lineHeight: 1 }}
              >
                {band.label}
              </span>
            </div>
          ))}
          {/* 収縮期マーカー */}
          {systolic != null && (
            <div
              className="absolute left-0 top-0 w-full pointer-events-none"
              style={{ height: '100%' }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${markerLeftSys}% - 0.65em)`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#222',
                  fontSize: '1.3em',
                  textShadow: '0 0 2px #fff, 0 0 2px #fff, 1px 1px 2px #0002',
                  zIndex: 2,
                }}
                aria-label="現在の収縮期位置"
              >
                ▼
              </div>
            </div>
          )}
        </div>
        <div className="w-full flex justify-between mt-0.5 px-1">
          {systolicBands.map(band => (
            <span
              key={band.label + '-range'}
              className="text-[10px] text-gray-700 dark:text-gray-200"
              style={{ minWidth: 0 }}
            >
              {band.range}
            </span>
          ))}
        </div>
      </div>

      {/* 拡張期血圧帯 */}
      <div className="w-full flex flex-col items-center">
        <div
          className="relative w-full h-7 flex rounded overflow-hidden shadow"
          style={{ minWidth: 240 }}
        >
          {diastolicBands.map(band => (
            <div
              key={band.label}
              className="flex-1 flex flex-col items-center justify-center"
              style={{ background: band.color, minWidth: 0 }}
            >
              <span
                className="text-[10px] font-bold text-gray-800 dark:text-gray-900 select-none"
                style={{ lineHeight: 1 }}
              >
                {band.label}
              </span>
            </div>
          ))}
          {/* 拡張期マーカー */}
          {diastolic != null && (
            <div
              className="absolute left-0 top-0 w-full pointer-events-none"
              style={{ height: '100%' }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${markerLeftDia}% - 0.65em)`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#222',
                  fontSize: '1.3em',
                  textShadow: '0 0 2px #fff, 0 0 2px #fff, 1px 1px 2px #0002',
                  zIndex: 2,
                }}
                aria-label="現在の拡張期位置"
              >
                ▼
              </div>
            </div>
          )}
        </div>
        <div className="w-full flex justify-between mt-0.5 px-1">
          {diastolicBands.map(band => (
            <span
              key={band.label + '-range'}
              className="text-[10px] text-gray-700 dark:text-gray-200"
              style={{ minWidth: 0 }}
            >
              {band.range}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BpIndicator;