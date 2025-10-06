interface StatsCardProps {
  title: string;
  value: string | number;
  icon: 'sensors' | 'alert' | 'check' | 'calendar' | 'photo';
  color: 'blue' | 'red' | 'green' | 'purple';
}

const icons = {
  sensors: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  alert: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  check: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  photo: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth={2} />
      <circle cx="8.5" cy="11.5" r="2.5" stroke="currentColor" strokeWidth={2} />
      <path d="M21 19l-5-5a3 3 0 00-4.24 0L3 19" stroke="currentColor" strokeWidth={2} />
    </svg>
  ),
};

const colorClasses = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25',
  red: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25',
  green: 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25',
};

export function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
        </div>
        <div className={`p-4 rounded-xl ${colorClasses[color]}`}>
          {icons[icon]}
        </div>
      </div>
    </div>
  );
}