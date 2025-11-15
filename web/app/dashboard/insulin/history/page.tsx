'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PaginatedDoseHistory } from '@/components/insulin/paginated-dose-history'
import { InfiniteScrollDoses } from '@/components/insulin/infinite-scroll-doses'
import { VirtualDoseList, useVirtualDoseData } from '@/components/insulin/virtual-dose-list'
import { BatchFileUpload } from '@/components/insulin/batch-file-upload'
import { VoiceDoseLogger } from '@/components/insulin/voice-dose-logger'
import { EnhancedDoseHistory } from '@/components/insulin/enhanced-dose-history'
import { Button } from '@/components/ui/button'
import { 
  History, 
  Upload, 
  Mic, 
  List, 
  Infinity, 
  Layers,
  ArrowLeft 
} from 'lucide-react'
import Link from 'next/link'

export default function InsulinHistoryPage() {
  const [activeTab, setActiveTab] = useState('enhanced')
  const [refreshKey, setRefreshKey] = useState(0)
  
  // For virtual scrolling demo
  const { doses, loading, error } = useVirtualDoseData('current-user')

  const handleDoseLogged = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/insulin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <History className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Insulin History</h1>
          </div>
          <p className="text-gray-600">
            View and manage your insulin dose history with advanced loading options
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="enhanced" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Enhanced</span>
          </TabsTrigger>
          <TabsTrigger value="paginated" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Paginated</span>
          </TabsTrigger>
          <TabsTrigger value="infinite" className="flex items-center gap-2">
            <Infinity className="h-4 w-4" />
            <span className="hidden sm:inline">Infinite</span>
          </TabsTrigger>
          <TabsTrigger value="virtual" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Virtual</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">Voice</span>
          </TabsTrigger>
        </TabsList>

        {/* Enhanced View with Bulk Actions */}
        <TabsContent value="enhanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Enhanced Dose History
              </CardTitle>
              <CardDescription>
                Advanced view with search, filters, bulk actions, and undo functionality. Perfect for managing large amounts of data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Features:</span>
                  <span>• Search & filter</span>
                  <span>• Bulk delete</span>
                  <span>• Undo actions</span>
                  <span>• Date range</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <EnhancedDoseHistory key={`enhanced-${refreshKey}`} />
        </TabsContent>

        {/* Paginated View */}
        <TabsContent value="paginated" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Paginated Dose History
              </CardTitle>
              <CardDescription>
                Traditional pagination with page numbers. Best for desktop users who want to jump to specific pages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Features:</span>
                  <span>• Page navigation</span>
                  <span>• Jump to page</span>
                  <span>• 50 entries per page</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <PaginatedDoseHistory 
            key={`paginated-${refreshKey}`}
            limit={50}
          />
        </TabsContent>

        {/* Infinite Scroll View */}
        <TabsContent value="infinite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Infinity className="h-5 w-5" />
                Infinite Scroll
              </CardTitle>
              <CardDescription>
                Automatically loads more doses as you scroll. Perfect for mobile devices and continuous browsing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Features:</span>
                  <span>• Auto-load on scroll</span>
                  <span>• Mobile optimized</span>
                  <span>• 25 entries per batch</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <InfiniteScrollDoses 
            key={`infinite-${refreshKey}`}
            limit={25}
          />
        </TabsContent>

        {/* Virtual Scroll View */}
        <TabsContent value="virtual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Virtual Scrolling
              </CardTitle>
              <CardDescription>
                Efficiently handles thousands of entries by only rendering visible items. Best for large datasets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Features:</span>
                  <span>• Handles 10,000+ entries</span>
                  <span>• Search & filter</span>
                  <span>• Sort options</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading dose history...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          ) : (
            <VirtualDoseList 
              doses={doses}
              height={600}
              itemHeight={80}
            />
          )}
        </TabsContent>

        {/* Batch Upload View */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Batch File Upload
              </CardTitle>
              <CardDescription>
                Upload multiple insulin data files at once. Supports CSV, JSON, and Excel formats from various sources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Supported:</span>
                  <span>• Glooko exports</span>
                  <span>• Medtronic CareLink</span>
                  <span>• Generic CSV/JSON</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <BatchFileUpload 
            onUploadComplete={handleUploadComplete}
            maxFiles={10}
            acceptedTypes={['.csv', '.json', '.xlsx']}
          />
        </TabsContent>

        {/* Voice Input View */}
        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Dose Logger
              </CardTitle>
              <CardDescription>
                Log insulin doses using voice commands. Hands-free logging for convenience and accessibility.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Examples:</span>
                  <span>• "5 units of Humalog"</span>
                  <span>• "Took 3 rapid acting"</span>
                  <span>• "Bolus 4 units"</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VoiceDoseLogger onDoseLogged={handleDoseLogged} />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Voice Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <InfiniteScrollDoses 
                  key={`voice-recent-${refreshKey}`}
                  limit={10}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Performance Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Performance Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Paginated:</strong> Best for desktop, allows jumping to specific pages</li>
                <li>• <strong>Infinite Scroll:</strong> Best for mobile, smooth continuous browsing</li>
                <li>• <strong>Virtual Scroll:</strong> Best for large datasets (1000+ entries), with search/filter</li>
                <li>• <strong>Batch Upload:</strong> Import multiple files simultaneously for faster data migration</li>
                <li>• <strong>Voice Input:</strong> Hands-free logging, great for accessibility and convenience</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}