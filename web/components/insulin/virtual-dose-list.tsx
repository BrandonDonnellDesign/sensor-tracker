'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, Syringe, Activity, Search, Filter } from 'lucide-react'
import { format } from 'date-fns'

// Temporarily disabled due to react-window import issues
// TODO: Fix react-window import or replace with alternative virtualization solution
const List: any = null

interface InsulinLog {
  id: string
  insulin_type: string
  units: number
  delivery_type: 'bolus' | 'basal'
  taken_at: string
  notes?: string
  confidence?: number
}

interface VirtualDoseListProps {
  doses: InsulinLog[]
  height?: number
  itemHeight?: number
}

interface DoseItemProps {
  index: number
  style: React.CSSProperties
  data: InsulinLog[]
}

const DoseItem = ({ index, style, data }: DoseItemProps) => {
  const dose = data[index]
  
  const getDeliveryIcon = (type: string) => {
    return type === 'bolus' ? <Syringe className="h-4 w-4" /> : <Activity className="h-4 w-4" />
  }

  const getDeliveryColor = (type: string) => {
    return type === 'bolus' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  return (
    <div style={style} className="px-4">
      <div className="flex items-center gap-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <div className={`p-2 rounded-full ${getDeliveryColor(dose.delivery_type)}`}>
          {getDeliveryIcon(dose.delivery_type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{dose.units}u</span>
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
            <div className="text-xs text-gray-400 mt-1 truncate">
              {dose.notes}
            </div>
          )}
        </div>
        
        <Badge 
          variant={dose.delivery_type === 'bolus' ? 'default' : 'secondary'}
          className="capitalize"
        >
          {dose.delivery_type}
        </Badge>
      </div>
    </div>
  )
}

export function VirtualDoseList({ 
  doses, 
  height = 400, 
  itemHeight = 80 
}: VirtualDoseListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'bolus' | 'basal'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'units' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter and sort doses
  const filteredAndSortedDoses = useMemo(() => {
    let filtered = doses

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(dose => 
        dose.insulin_type.toLowerCase().includes(term) ||
        dose.notes?.toLowerCase().includes(term) ||
        dose.units.toString().includes(term)
      )
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(dose => dose.delivery_type === filterType)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
          break
        case 'units':
          comparison = a.units - b.units
          break
        case 'type':
          comparison = a.delivery_type.localeCompare(b.delivery_type)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [doses, searchTerm, filterType, sortBy, sortOrder])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Dose History ({filteredAndSortedDoses.length} doses)
        </CardTitle>
        
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search doses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterType} onValueChange={(value: 'all' | 'bolus' | 'basal') => setFilterType(value)}>
            <SelectTrigger className="w-full sm:w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bolus">Bolus</SelectItem>
              <SelectItem value="basal">Basal</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [newSortBy, newSortOrder] = value.split('-')
            setSortBy(newSortBy as 'date' | 'units' | 'type')
            setSortOrder(newSortOrder as 'asc' | 'desc')
          }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="units-desc">Highest Units</SelectItem>
              <SelectItem value="units-asc">Lowest Units</SelectItem>
              <SelectItem value="type-asc">Type A-Z</SelectItem>
              <SelectItem value="type-desc">Type Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {filteredAndSortedDoses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No doses match your filters</p>
          </div>
        ) : (
          <List
            height={height}
            itemCount={filteredAndSortedDoses.length}
            itemSize={itemHeight}
            itemData={filteredAndSortedDoses}
            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {DoseItem}
          </List>
        )}
      </CardContent>
    </Card>
  )
}

// Hook for fetching large datasets
export function useVirtualDoseData(userId: string) {
  const [doses, setDoses] = useState<InsulinLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAllDoses = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch all doses without pagination for virtual scrolling
        const response = await fetch(`/api/insulin/logs?limit=10000`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch doses: ${response.statusText}`)
        }
        
        const result = await response.json()
        setDoses(result.data || [])
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load doses')
      } finally {
        setLoading(false)
      }
    }

    fetchAllDoses()
  }, [userId])

  return { doses, loading, error, refetch: () => setLoading(true) }
}