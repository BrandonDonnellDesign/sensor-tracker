'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Syringe, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Filter,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react';
import { GlookoCSVUpload } from './glooko-csv-upload';

interface InsulinLog {
  id: string;
  dosage_amount: number;
  dosage_unit: string;
  taken_at: string;
  injection_site?: string;
  notes?: string;
  user_medication: {
    custom_name?: string;
    brand_name?: string;
    medication_type?: {
      name: string;
      category: string;
    };
  };
}

interface InsulinHistoryProps {
  className?: string;
}

export function InsulinHistory({ className }: InsulinHistoryProps) {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<InsulinLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<InsulinLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('7'); // days
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const logsPerPage = 10;

  // Check URL params on mount
  useEffect(() => {
    if (searchParams?.get('upload') === 'true') {
      setShowUpload(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadInsulinLogs();
  }, [dateFilter]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, currentPage]);

  const loadInsulinLogs = async () => {
    setIsLoading(true);
    try {
      const daysBack = parseInt(dateFilter);
      const response = await fetch(`/api/insulin/logs?days=${daysBack}&limit=100`);
      
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match the expected format
        const transformedLogs = data.logs?.map((log: any) => ({
          id: log.id,
          dosage_amount: log.units,
          dosage_unit: 'units',
          taken_at: log.taken_at,
          injection_site: log.injection_site,
          notes: log.notes,
          user_medication: {
            custom_name: log.insulin_name,
            brand_name: log.insulin_name,
            medication_type: {
              name: `${log.insulin_type.charAt(0).toUpperCase() + log.insulin_type.slice(1)}-Acting Insulin`,
              category: 'insulin'
            }
          }
        })) || [];
        setLogs(transformedLogs);
      }
    } catch (error) {
      console.error('Error loading insulin logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_medication.custom_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_medication.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_medication.medication_type?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Calculate pagination
    const total = Math.ceil(filtered.length / logsPerPage);
    setTotalPages(total);

    // Apply pagination
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    setFilteredLogs(filtered.slice(startIndex, endIndex));
  };

  const calculateStats = () => {
    if (logs.length === 0) return { totalUnits: 0, avgDaily: 0, totalDoses: 0 };

    const totalUnits = logs.reduce((sum, log) => sum + log.dosage_amount, 0);
    const days = parseInt(dateFilter);
    const avgDaily = totalUnits / days;
    const totalDoses = logs.length;

    return { totalUnits, avgDaily, totalDoses };
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getMedicationName = (log: InsulinLog) => {
    return log.user_medication.medication_type?.name || 
           log.user_medication.custom_name || 
           log.user_medication.brand_name || 
           'Unknown Insulin';
  };

  const handleUploadComplete = (result: any) => {
    if (result.success && result.imported > 0) {
      // Refresh the logs after successful import
      loadInsulinLogs();
      setShowUpload(false);
    }
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Units
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalUnits.toFixed(1)}
                </p>
              </div>
              <Syringe className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Daily Average
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.avgDaily.toFixed(1)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Doses
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalDoses}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by notes, medication name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="14">Last 2 weeks</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
              </select>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowUpload(!showUpload)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSV Upload */}
      {showUpload && (
        <GlookoCSVUpload 
          onUploadComplete={handleUploadComplete}
          className="mb-6"
        />
      )}

      {/* Insulin Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Insulin History</CardTitle>
          <CardDescription>
            Your recent insulin doses and timing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Syringe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {searchTerm ? 'No insulin logs match your search' : 'No insulin logs found'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {searchTerm ? 'Try adjusting your search terms' : 'Start logging your insulin doses to see them here'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const { date, time } = formatDateTime(log.taken_at);
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                        <Syringe className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {getMedicationName(log)}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {log.dosage_amount} {log.dosage_unit}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {time}
                          </div>
                          {log.injection_site && (
                            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                              {log.injection_site}
                            </span>
                          )}
                        </div>
                        
                        {log.notes && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            {log.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}