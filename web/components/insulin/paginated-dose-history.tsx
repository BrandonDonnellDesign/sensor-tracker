'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSkeleton as Skeleton } from '@/components/ui/loading-skeleton'
import { ChevronLeft, ChevronRight, Clock, Syringe, Activity } from 'lucide-react'
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

interface PaginatedResponse {
  data: InsulinLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface PaginatedDoseHistoryProps {
  limit?: number
  deliveryType?: 'bolus' | 'basal' | 'all'
}

export function PaginatedDoseHistory({ 
  limit = 50, 
  deliveryType = 'all' 
}: PaginatedDoseHistoryProps) {
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchData = async (page: number) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(deliveryType !== 'all' && { delivery_type: deliveryType })
      })
      
      const response = await fetch(`/api/insulin/logs?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dose history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(currentPage)
  }, [currentPage, deliveryType, limit])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    // Smooth scroll to top of component
    document.getElementById('dose-history-top')?.scrollIntoView({ 
      behavior: 'smooth' 
    })
  }

  const getDeliveryIcon = (type: string) => {
    return type === 'bolus' ? <Syringe className="h-4 w-4" /> : <Activity className="h-4 w-4" />
  }

  const getDeliveryColor = (type: string) => {
    return type === 'bolus' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Dose History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Clock className="h-5 w-5" />
            Dose History - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchData(currentPage)} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Dose History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No insulin doses found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { data: doses, pagination } = data

  return (
    <Card>
      <CardHeader id="dose-history-top">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Dose History
          </CardTitle>
          <div className="text-sm text-gray-500">
            {pagination.total} total doses
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {doses.map((dose) => (
            <div
              key={dose.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${getDeliveryColor(dose.delivery_type)}`}>
                  {getDeliveryIcon(dose.delivery_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{dose.units}u</span>
                    <Badge variant="outline" className="text-xs">
                      {dose.insulin_type}
                    </Badge>
                    {dose.confidence && dose.confidence < 0.8 && (
                      <Badge variant="secondary" className="text-xs">
                        Low Confidence
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(dose.taken_at), 'MMM d, yyyy h:mm a')}
                  </div>
                  {dose.notes && (
                    <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                      {dose.notes}
                    </div>
                  )}
                </div>
              </div>
              <Badge 
                variant={dose.delivery_type === 'bolus' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {dose.delivery_type}
              </Badge>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev || loading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i
                  } else {
                    pageNum = pagination.page - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === pagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext || loading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Loading...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}