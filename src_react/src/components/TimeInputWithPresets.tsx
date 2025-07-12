import { MdFlashOn } from 'react-icons/md';
import { TbSunrise } from 'react-icons/tb';

interface TimeInputWithPresetsProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

const getCurrentTimeString = (): string => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

export default function TimeInputWithPresets({
  value,
  onChange,
  className = '',
}: TimeInputWithPresetsProps) {
  const handleMorningTime = () => {
    onChange('07:00');
  };

  const handleCurrentTime = () => {
    onChange(getCurrentTimeString());
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <input
        type="time"
        className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[6.5em]"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <button
        type="button"
        className="h-10 px-3 rounded-xl bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-300/20 dark:hover:bg-yellow-300/40 border border-yellow-300 text-yellow-500 dark:text-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow flex items-center justify-center transition-colors duration-150"
        title="朝7時にセット"
        aria-label="朝7時にセット"
        onClick={handleMorningTime}
      >
        <TbSunrise className="w-6 h-6" />
      </button>
      <button
        type="button"
        className="h-10 px-3 rounded-xl bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-300/20 dark:hover:bg-yellow-300/40 border border-yellow-300 text-yellow-500 dark:text-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow flex items-center justify-center transition-colors duration-150"
        title="現在時刻にセット"
        aria-label="現在時刻にセット"
        onClick={handleCurrentTime}
      >
        <MdFlashOn className="w-6 h-6" />
      </button>
    </div>
  );
}