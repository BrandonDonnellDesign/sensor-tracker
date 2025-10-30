import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';

// const fetcher = async (url: string) => {
//   const response = await fetch(url);
//   if (!response.ok) {
//     throw new Error('Failed to fetch data');
//   }
//   return response.json();
// };

const supabaseFetcher = async (table: string, userId?: string) => {
  let query = (supabase as any).from(table).select('*');
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

export function useSensors() {
  const { user } = useAuth();
  
  const { data, error, mutate, isLoading } = useSWR(
    user?.id ? ['sensors', user.id] : null,
    ([table, userId]) => supabaseFetcher(table, userId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // 30 seconds
      dedupingInterval: 5000, // 5 seconds
    }
  );

  return {
    sensors: data || [],
    isLoading,
    isError: error,
    mutate,
    refresh: () => mutate(),
  };
}

export function useSensor(sensorId: string) {
  const { user } = useAuth();
  
  const { data, error, mutate, isLoading } = useSWR(
    user?.id && sensorId ? ['sensor', sensorId] : null,
    async ([, id]) => {
      const { data, error } = await supabase
        .from('sensors')
        .select(`
          *,
          sensor_models (
            manufacturer,
            model_name,
            duration_days
          ),
          sensor_photos (
            id,
            photo_url,
            created_at
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    sensor: data,
    isLoading,
    isError: error,
    mutate,
    refresh: () => mutate(),
  };
}

export function useGlucoseReadings(limit = 50) {
  const { user } = useAuth();
  
  const { data, error, mutate, isLoading } = useSWR(
    user?.id ? ['glucose_readings', user.id, limit] : null,
    async ([table, userId, limitCount]) => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order('system_time', { ascending: false })
        .limit(limitCount);
      
      if (error) throw new Error(error.message);
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 60000, // 1 minute
    }
  );

  return {
    readings: data || [],
    isLoading,
    isError: error,
    mutate,
    refresh: () => mutate(),
  };
}

export function useFoodLogs(limit = 20) {
  const { user } = useAuth();
  
  const { data, error, mutate, isLoading } = useSWR(
    user?.id ? ['food_logs_with_cgm', user.id, limit] : null,
    async ([view, userId, limitCount]) => {
      const { data, error } = await (supabase as any)
        .from(view)
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(limitCount);
      
      if (error) throw new Error(error.message);
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // 30 seconds
    }
  );

  return {
    foodLogs: data || [],
    isLoading,
    isError: error,
    mutate,
    refresh: () => mutate(),
  };
}