'use client'

import { useState, useEffect } from 'react'
import { DashboardCustomizer } from '@/components/insulin/dashboard-customizer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Grid, 
  ArrowLeft, 
  Info,
  Sparkles,
  Layout,
  Eye,
  Move
} from 'lucide-react'
import Link from 'next/link'

// Import the actual dashboard widgets
import { TDIDashboard } from '@/components/insulin/tdi-dashboard'
import { BasalTrends } from '@/components/insulin/basal-trends'
import { IOBDecayChart } from '@/components/insulin/iob-decay-chart'
import { IOBTracker } from '@/components/insulin/iob-tracker'
import { QuickDoseLogger } from '@/components/insulin/quick-dose-logger'
import { InsulinCalculatorWidget } from '@/components/food/insulin-calculator-widget'
import { ExportData } from '@/components/insulin/export-data'

interface DashboardWidget {
  id: string
  type: 'tdi' | 'basal-trends' | 'iob-decay' | 'iob-tracker' | 'quick-dose' | 'calculator' | 'stats' | 'export'
  title: string
  enabled: boolean
  size: 'small' | 'medium' | 'large' | 'full'
  order: number
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'iob-tracker', type: 'iob-tracker', title: 'IOB Tracker', enabled: true, size: 'small', order: 0 },
  { id: 'quick-dose', type: 'quick-dose', title: 'Quick Dose Logger', enabled: true, size: 'small', order: 1 },
  { id: 'calculator', type: 'calculator', title: 'Insulin Calculator', enabled: true, size: 'small', order: 2 },
  { id: 'tdi', type: 'tdi', title: 'TDI Dashboard', enabled: true, size: 'large', order: 3 },
  { id: 'basal-trends', type: 'basal-trends', title: 'Basal Trends', enabled: true, size: 'large', order: 4 },
  { id: 'iob-decay', type: 'iob-decay', title: 'IOB Decay Chart', enabled: true, size: 'full', order: 5 },
  { id: 'stats', type: 'stats', title: 'Statistics Cards', enabled: false, size: 'full', order: 6 },
  { id: 'export', type: 'export', title: 'Export Data', enabled: true, size: 'medium', order: 7 },
]

export default function CustomizeDashboardPage() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS)
  const [showPreview, setShowPreview] = useState(true)

  // Load saved configuration from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('insulin-dashboard-widgets')
    if (saved) {
      try {
        setWidgets(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load saved widgets:', error)
      }
    }
  }, [])

  const handleWidgetsChange = (newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets)
    localStorage.setItem('insulin-dashboard-widgets', JSON.stringify(newWidgets))
  }

  const getSizeClass = (size: DashboardWidget['size']) => {
    switch (size) {
      case 'small': return 'col-span-1'
      case 'medium': return 'col-span-1 md:col-span-2'
      case 'large': return 'col-span-1 md:col-span-2 lg:col-span-1'
      case 'full': return 'col-span-full'
      default: return 'col-span-1'
    }
  }

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.enabled) return null

    const commonProps = {
      className: getSizeClass(widget.size)
    }

    switch (widget.type) {
      case 'iob-tracker':
        return <IOBTracker key={widget.id} {...commonProps} showDetails />
      case 'quick-dose':
        return <QuickDoseLogger key={widget.id} {...commonProps} onDoseLogged={() => {}} />
      case 'calculator':
        return <InsulinCalculatorWidget key={widget.id} {...commonProps} />
      case 'tdi':
        return <TDIDashboard key={widget.id} {...commonProps} />
      case 'basal-trends':
        return <BasalTrends key={widget.id} {...commonProps} />
      case 'iob-decay':
        return <IOBDecayChart key={widget.id} {...commonProps} />
      case 'export':
        return <ExportData key={widget.id} {...commonProps} />
      case 'stats':
        return (
          <Card key={widget.id} className={commonProps.className}>
            <CardHeader>
              <CardTitle>Statistics Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Statistics overview would appear here</p>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  const enabledWidgets = widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/insulin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Grid className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold">Customize Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Personalize your insulin management dashboard layout
          </p>
        </div>
        
        <Button
          variant={showPreview ? "default" : "outline"}
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="h-4 w-4 mr-2" />
          {showPreview ? 'Hide' : 'Show'} Preview
        </Button>
      </div>

      {/* How It Works */}
      <Alert className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <Info className="h-4 w-4 text-indigo-600" />
        <AlertDescription className="text-indigo-900">
          <strong>How it works:</strong> Drag widgets to reorder them, toggle visibility with the eye icon, 
          and change sizes (Small, Medium, Large, Full-width). Your layout is saved automatically.
        </AlertDescription>
      </Alert>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Move className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900">Drag & Drop</h3>
                <p className="text-sm text-indigo-700">Reorder widgets by dragging</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">Show/Hide</h3>
                <p className="text-sm text-purple-700">Toggle widget visibility</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-pink-200 bg-pink-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-600 rounded-lg">
                <Layout className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-pink-900">Resize</h3>
                <p className="text-sm text-pink-700">4 size options per widget</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customizer Component */}
      <DashboardCustomizer 
        widgets={widgets}
        onWidgetsChange={handleWidgetsChange}
      />

      {/* Live Preview */}
      {showPreview && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-2xl font-bold">Live Preview</h2>
            <span className="text-sm text-gray-500">
              ({enabledWidgets.length} widgets visible)
            </span>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This is how your dashboard will look with the current configuration. 
              Changes are saved automatically to your browser.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enabledWidgets.map(widget => renderWidget(widget))}
          </div>

          {enabledWidgets.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Grid className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">No widgets enabled</p>
                <p className="text-sm text-gray-400">
                  Enable at least one widget to see your dashboard
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Technical Details */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Technical Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>Storage:</strong> Your layout preferences are saved in browser localStorage 
            and persist across sessions.
          </div>
          <div>
            <strong>Widget Sizes:</strong>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li><strong>Small:</strong> 1 column (ideal for quick actions)</li>
              <li><strong>Medium:</strong> 2 columns on desktop (balanced view)</li>
              <li><strong>Large:</strong> 2 columns, 1 on large screens (charts)</li>
              <li><strong>Full:</strong> Full width (detailed analytics)</li>
            </ul>
          </div>
          <div>
            <strong>Drag & Drop:</strong> Uses @hello-pangea/dnd library for smooth, 
            accessible drag-and-drop interactions.
          </div>
          <div>
            <strong>Responsive:</strong> Layout automatically adapts to screen size while 
            maintaining your preferred order and visibility settings.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}