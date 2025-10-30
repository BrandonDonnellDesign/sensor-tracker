'use client';

import { useState, useEffect } from 'react';
import { TimelineEvent } from '@/lib/insulin-service';
import { format } from 'date-fns';

export function TimelineView() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchTimeline();
  }, [dateRange]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: new Date(dateRange.startDate).toISOString(),
        endDate: new Date(dateRange.endDate + 'T23:59:59').toISOString()
      });
      
      const response = await fetch(`/api/timeline?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const response = await fetch('/api/cgm/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookbackHours: 2 })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchTimeline(); // Refresh timeline
      } else {
        alert('Failed to backfill CGM readings');
      }
    } catch (error) {
      console.error('Error backfilling:', error);
      alert('Error backfilling CGM readings');
    } finally {
      setBackfilling(false);
    }
  };

  const getTrendArrow = (trend?: string) => {
    const arrows: Record<string, string> = {
      'doubleUp': '⇈',
      'singleUp': '↑',
      'fortyFiveUp': '↗',
      'flat': '→',
      'fortyFiveDown': '↘',
      'singleDown': '↓',
      'doubleDown': '⇊'
    };
    return trend ? arrows[trend] || '?' : '';
  };

  const getGlucoseColor = (value?: number) => {
    if (!value) return 'text-gray-500';
    if (value < 70) return 'text-red-600';
    if (value > 180) return 'text-orange-600';
    return 'text-green-600';
  };

  const renderEvent = (event: TimelineEvent) => {
    const time = format(new Date(event.timestamp), 'h:mm a');
    
    switch (event.type) {
      case 'meal':
        return (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              🍽️
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {event.data.product_name || event.data.custom_food_name}
                </h4>
                <span className="text-sm text-gray-500">{time}</span>
              </div>
              <p className="text-sm text-gray-600">
                {event.data.serving_size} {event.data.serving_unit}
                {event.data.total_carbs_g && ` • ${event.data.total_carbs_g}g carbs`}
                {event.data.meal_type && ` • ${event.data.meal_type}`}
              </p>
              {event.data.cgm_reading_at_meal && (
                <div className="mt-1 text-sm">
                  <span className={`font-medium ${getGlucoseColor(event.data.cgm_reading_at_meal)}`}>
                    {event.data.cgm_reading_at_meal} mg/dL
                  </span>
                  {event.data.cgm_trend_at_meal && (
                    <span className="ml-1">{getTrendArrow(event.data.cgm_trend_at_meal)}</span>
                  )}
                  {event.data.cgm_1hr_post_meal && (
                    <span className="ml-3 text-gray-600">
                      +1hr: <span className={getGlucoseColor(event.data.cgm_1hr_post_meal)}>
                        {event.data.cgm_1hr_post_meal}
                      </span>
                    </span>
                  )}
                  {event.data.cgm_2hr_post_meal && (
                    <span className="ml-3 text-gray-600">
                      +2hr: <span className={getGlucoseColor(event.data.cgm_2hr_post_meal)}>
                        {event.data.cgm_2hr_post_meal}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      
      case 'insulin':
        return (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              💉
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {event.data.insulin_name} - {event.data.units} units
                </h4>
                <span className="text-sm text-gray-500">{time}</span>
              </div>
              <p className="text-sm text-gray-600">
                {event.data.dose_type}
                {event.data.injection_site && ` • ${event.data.injection_site}`}
              </p>
              {event.data.cgm_reading_at_dose && (
                <div className="mt-1 text-sm">
                  <span className={`font-medium ${getGlucoseColor(event.data.cgm_reading_at_dose)}`}>
                    {event.data.cgm_reading_at_dose} mg/dL
                  </span>
                  {event.data.cgm_trend_at_dose && (
                    <span className="ml-1">{getTrendArrow(event.data.cgm_trend_at_dose)}</span>
                  )}
                  {event.data.cgm_at_peak && (
                    <span className="ml-3 text-gray-600">
                      Peak: <span className={getGlucoseColor(event.data.cgm_at_peak)}>
                        {event.data.cgm_at_peak}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      
      case 'glucose':
        return (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              📊
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className={`font-medium ${getGlucoseColor(event.data.value)}`}>
                  {event.data.value} mg/dL {getTrendArrow(event.data.trend)}
                </h4>
                <span className="text-sm text-gray-500">{time}</span>
              </div>
              {event.data.trend_rate && (
                <p className="text-sm text-gray-600">
                  Rate: {event.data.trend_rate > 0 ? '+' : ''}{event.data.trend_rate} mg/dL/min
                </p>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = format(new Date(event.timestamp), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end justify-between">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <button
          onClick={handleBackfill}
          disabled={backfilling}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
          title="Update CGM readings for recent meals and insulin doses"
        >
          {backfilling ? 'Updating...' : '🔄 Update CGM'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading timeline...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No events in this date range</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date}>
              <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-white py-2">
                {format(new Date(date), 'EEEE, MMMM d, yyyy')}
              </h3>
              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                {dayEvents.map((event) => (
                  <div key={event.id} className="pb-4">
                    {renderEvent(event)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
