'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSkeleton as Skeleton } from '@/components/ui/loading-skeleton'
import { Clock, Syringe, Activity, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface InsulinLog {
  id: string
  insulin_type: string
  units: number
  delivery_type: 'bolus' | 'basal'
  taken_at: string
  notes?: string
  confidence?: number
}

interface InfiniteScrollDosesProps {
  deliveryType?: 'bolus' | 'basal' | 'all'
  limit?: number
}

export function InfiniteScrollDoses({ 
  deliveryType = 'all',
  limit = 25 
}: InfiniteScrollDosesProps) {
  const [doses, setDoses] = useState<InsulinLog[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  const fetchDoses = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return
    
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        ...(deliveryType !== 'all' && { delivery_type: deliveryType })
      })
      
      const response = await fetch(`/api/insulin/logs?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch doses: ${response.statusText}`)
      }
      
      const result = await response.json()
      const newDoses = result.data || []
      
      setDoses(prev => reset ? newDoses : [...prev, ...newDoses])
      setHasMore(result.pagination?.hasNext || false)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load doses')
    } finally {
      setLoading(false)
    }
  }, [deliveryType, limit, loading])

  // Load more when intersection observer triggers
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1)
    }
  }, [hasMore, loading])

  // Set up intersection observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loadMore])

  // Fetch data when page changes
  useEffect(() => {
    fetchDoses(page)
  }, [page, fetchDoses])

  // Reset when filters change
  useEffect(() => {
    setDoses([])
    setPage(1)
    setHasMore(true)
    fetchDoses(1, true)
  }, [deliveryType, fetchDoses])

  const getDeliveryIcon = (type: string) => {
    return type === 'bolus' ? <Syringe className="h-4 w-4" /> : <Activity className="h-4 w-4" />
  }

  const getDeliveryColor = (type: string) => {
    return type === 'bolus' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return format(date, 'h:mm a')
    } else if (diffInHours < 168) { // 7 days
      return format(date, 'EEE h:mm a')
    } else {
      return format(date, 'MMM d, h:mm a')
    }
  }

  if (error && doses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Error Loading Doses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => fetchDoses(1, true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Doses
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {doses.length === 0 && loading ? (
            // Initial loading skeleton
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : doses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No doses found</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {doses.map((dose, index) => (
                  <div
                    key={`${dose.id}-${index}`}
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className={`p-2 rounded-full ${getDeliveryColor(dose.delivery_type)}`}>
                      {getDeliveryIcon(dose.delivery_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{dose.units}u</span>
                        <Badge variant="outline" className="text-xs">
                          {dose.insulin_type}
                        </Badge>
                        {dose.confidence && dose.confidence < 0.8 && (
                          <Badge variant="secondary" className="text-xs">
                            ⚠️
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        {formatTime(dose.taken_at)}
                      </div>
                      
                      {dose.notes && (
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          {dose.notes}
                        </div>
                      )}
                    </div>
                    
                    <Badge 
                      variant={dose.delivery_type === 'bolus' ? 'default' : 'secondary'}
                      className="capitalize text-xs"
                    >
                      {dose.delivery_type}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Loading indicator for infinite scroll */}
              {hasMore && (
                <div 
                  ref={loadingRef}
                  className="flex items-center justify-center py-4"
                >
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Loading more...
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">
                      Scroll for more
                    </div>
                  )}
                </div>
              )}

              {/* End of data indicator */}
              {!hasMore && doses.length > 0 && (
                <div className="text-center py-4 text-sm text-gray-400 border-t">
                  No more doses to load
                </div>
              )}
            </>
          )}
        </div>

        {error && doses.length > 0 && (
          <div className="p-4 bg-red-50 border-t border-red-200">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}