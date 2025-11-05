'use client';

import { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';


interface GlucoseReading {
  id: string;
  value: number;
  system_time: string;
  trend?: string | null;
  source: string | null;
  record_id?: string | null;
}

interface GlucoseReadingsListProps {
  readings: GlucoseReading[];
  loading: boolean;
  onRefresh: () => void;
}

export function GlucoseReadingsList({ readings, loading, onRefresh }: GlucoseReadingsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const filteredAndSortedReadings = useMemo(() => {
    let filtered = readings;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(reading => 
        reading.value.toString().includes(searchTerm) ||
        (reading.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(reading.system_time).toLocaleString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(reading => (reading.source || 'Unknown') === sourceFilter);
    }

    // Apply range filter
    if (rangeFilter !== 'all') {
      filtered = filtered.filter(reading => {
        const value = reading.value;
        switch (rangeFilter) {
          case 'low': return value < 70;
          case 'normal': return value >= 70 && value <= 180;
          case 'high': return value > 180;
          default: return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'glucose_value':
          aValue = a.value;
          bValue = b.value;
          break;
        case 'source':
          aValue = a.source || 'Unknown';
          bValue = b.source || 'Unknown';
          break;
        case 'system_time':
        default:
          aValue = new Date(a.system_time);
          bValue = new Date(b.system_time);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [readings, searchTerm, sourceFilter, rangeFilter, sortBy, sortOrder]);

  const paginatedReadings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedReadings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedReadings, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedReadings.length / itemsPerPage);

  const uniqueSources = useMemo(() => {
    return Array.from(new Set(readings.map(r => r.source || 'Unknown')));
  }, [readings]);

  const getTrendIcon = (trend?: string | null) => {
    switch (trend) {
      case 'rising':
      case 'rising_rapidly':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'falling':
      case 'falling_rapidly':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getGlucoseBadge = (value: number) => {
    if (value < 70) {
      return <Badge variant="destructive">Low</Badge>;
    } else if (value > 180) {
      return <Badge variant="secondary">High</Badge>;
    } else {
      return <Badge variant="default">Normal</Badge>;
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Glucose Value (mg/dL)', 'Trend', 'Source', 'Record ID'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedReadings.map(reading => [
        new Date(reading.system_time).toLocaleString(),
        reading.value,
        reading.trend || '',
        reading.source || 'Unknown',
        reading.record_id || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glucose-readings-${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 overflow-hidden">
      <div className="p-4 border-b border-slate-700/30">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">All Glucose Readings</h3>
            <p className="text-sm text-slate-400">
              {filteredAndSortedReadings.length} of {readings.length} readings
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToCSV}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh} 
              disabled={loading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search readings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
              />
            </div>
          </div>
          
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-slate-700 border-slate-600 text-slate-200">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all">All Sources</SelectItem>
              {uniqueSources.map(source => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={rangeFilter} onValueChange={setRangeFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-slate-700 border-slate-600 text-slate-200">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all">All Ranges</SelectItem>
              <SelectItem value="low">Low (&lt;70)</SelectItem>
              <SelectItem value="normal">Normal (70-180)</SelectItem>
              <SelectItem value="high">High (&gt;180)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border border-slate-700/30 bg-slate-800/20">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/30 hover:bg-slate-700/20">
                <TableHead 
                  className="cursor-pointer hover:bg-slate-700/30 text-slate-300"
                  onClick={() => handleSort('system_time')}
                >
                  Timestamp
                  {sortBy === 'system_time' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-slate-700/30 text-slate-300"
                  onClick={() => handleSort('glucose_value')}
                >
                  Glucose
                  {sortBy === 'glucose_value' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead className="text-slate-300">Trend</TableHead>
                <TableHead className="text-slate-300">Range</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-slate-700/30 text-slate-300"
                  onClick={() => handleSort('source')}
                >
                  Source
                  {sortBy === 'source' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : paginatedReadings.length === 0 ? (
                <TableRow className="border-slate-700/30">
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-slate-400">
                      {readings.length === 0 ? 'No glucose readings available' : 'No readings match your filters'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReadings.map((reading) => (
                  <TableRow key={reading.id} className="border-slate-700/30 hover:bg-slate-700/20">
                    <TableCell className="font-medium text-slate-200">
                      <div>
                        <div>{new Date(reading.system_time).toLocaleDateString()}</div>
                        <div className="text-sm text-slate-400">
                          {new Date(reading.system_time).toLocaleTimeString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200">{reading.value}</span>
                        <span className="text-sm text-slate-400">mg/dL</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(reading.trend)}
                        {reading.trend && (
                          <span className="text-sm capitalize">
                            {reading.trend.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getGlucoseBadge(reading.value)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">{reading.source || 'Unknown'}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-700/30">
            <div className="text-sm text-slate-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedReadings.length)} of {filteredAndSortedReadings.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Previous
              </Button>
              <span className="text-sm text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}