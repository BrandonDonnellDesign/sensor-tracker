'use client';

interface MiniChartProps {
  data: number[];
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  height?: number;
}

const colorClasses = {
  blue: 'stroke-blue-500',
  green: 'stroke-green-500',
  red: 'stroke-red-500',
  yellow: 'stroke-yellow-500',
  purple: 'stroke-purple-500',
};

export function MiniChart({ data, color = 'blue', height = 40 }: MiniChartProps) {
  if (!data || data.length === 0) {
    return <div className={`w-full h-[${height}px] bg-gray-100 dark:bg-slate-700 rounded`} />;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const width = 120;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full flex justify-end">
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className={colorClasses[color]}
        />
      </svg>
    </div>
  );
}