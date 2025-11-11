# 🚀 Quick Reference - Customizable Dashboard

## For Users

### Access Customization
1. Go to main dashboard (`/dashboard`)
2. Click **"Customize Dashboard"** button (top right)
3. Make changes
4. Click **"Save Changes"**

### Actions
- **Drag** ⋮⋮ handle to reorder
- **Click** 👁 to show/hide
- **Click** [S][M][L][F] to resize
- **Filter** by category (All, Sensors, Insulin, Glucose, Food, General)
- **Reset** to restore defaults

### Keyboard Shortcuts
- `Tab` - Navigate widgets
- `Space` - Grab/release widget
- `↑↓` - Move widget up/down
- `Enter` - Toggle visibility
- `Esc` - Cancel drag

## For Developers

### Import Components
```typescript
import { UnifiedDashboardCustomizer } from '@/components/dashboard/unified-dashboard-customizer'
import { WidgetRenderer } from '@/components/dashboard/widget-renderer'
import { useDashboardWidgets } from '@/lib/hooks/use-dashboard-widgets'
```

### Use Hook
```typescript
const { 
  widgets,           // Current configuration
  updateWidgets,     // Save changes
  getEnabledWidgets, // Get visible widgets
  isWidgetEnabled,   // Check if enabled
  getWidgetSize      // Get widget size
} = useDashboardWidgets()
```

### Render Customizer
```typescript
<UnifiedDashboardCustomizer 
  widgets={widgets}
  onWidgetsChange={updateWidgets}
/>
```

### Render Widgets
```typescript
<div className="grid grid-cols-3 gap-4">
  {getEnabledWidgets().map((widget) => (
    <WidgetRenderer
      key={widget.id}
      widgetType={widget.type}
      widgetSize={widget.size}
      // ... data props
    />
  ))}
</div>
```

### Add New Widget

1. **Create component**
```typescript
export function MyWidget() {
  return <Card>...</Card>
}
```

2. **Add to defaults**
```typescript
// In unified-dashboard-customizer.tsx
{ 
  id: 'my-widget',
  type: 'my-widget',
  title: 'My Widget',
  category: 'general',
  enabled: false,
  size: 'medium',
  order: 13
}
```

3. **Add render case**
```typescript
// In widget-renderer.tsx
case 'my-widget':
  return <MyWidget className={fullClassName} />
```

4. **Update types**
```typescript
type: 'hero' | 'stats' | ... | 'my-widget'
```

## Widget Categories

### 🔵 Sensors
- `hero` - Current Sensor Status
- `stats` - Sensor Statistics
- `sensor-alerts` - Sensor Alerts

### 🟣 Insulin
- `iob-tracker` - IOB Tracker
- `quick-dose` - Quick Dose Logger
- `tdi` - Total Daily Insulin
- `basal-trends` - Basal Trends

### 🔴 Glucose
- `glucose-chart` - Glucose Trends

### 🟢 Food
- `food-summary` - Recent Meals

### ⚪ General
- `ai-insights` - AI Insights
- `activity-timeline` - Activity Timeline
- `gamification` - Achievements
- `quick-actions` - Quick Actions

## Widget Sizes

- **Small** (`small`) - 1 column
- **Medium** (`medium`) - 2 columns
- **Large** (`large`) - 2 cols → 1 on large screens
- **Full** (`full`) - Full width

## Storage

**Key**: `main-dashboard-widgets`  
**Location**: Browser localStorage  
**Format**: JSON array

```json
[
  {
    "id": "hero",
    "type": "hero",
    "title": "Current Sensor Status",
    "category": "sensors",
    "enabled": true,
    "size": "full",
    "order": 0
  }
]
```

## Common Tasks

### Enable Insulin Widgets
```typescript
const enableInsulinWidgets = () => {
  const updated = widgets.map(w => 
    w.category === 'insulin' ? { ...w, enabled: true } : w
  )
  updateWidgets(updated)
}
```

### Hide All Sensor Widgets
```typescript
const hideSensorWidgets = () => {
  const updated = widgets.map(w => 
    w.category === 'sensors' ? { ...w, enabled: false } : w
  )
  updateWidgets(updated)
}
```

### Reset to Defaults
```typescript
import { DEFAULT_DASHBOARD_WIDGETS } from '@/components/dashboard/unified-dashboard-customizer'

updateWidgets(DEFAULT_DASHBOARD_WIDGETS)
```

### Get Widgets by Category
```typescript
const insulinWidgets = widgets.filter(w => 
  w.category === 'insulin' && w.enabled
)
```

## Troubleshooting

### Widgets Not Saving
- Check localStorage is enabled
- Check browser console for errors
- Try incognito mode

### Drag Not Working
- Ensure `@hello-pangea/dnd` is installed
- Check for CSS conflicts
- Try keyboard (Space + Arrows)

### Layout Broken
- Click "Reset" button
- Clear localStorage: `localStorage.removeItem('main-dashboard-widgets')`
- Refresh page

## API Reference

### useDashboardWidgets()

```typescript
interface DashboardWidget {
  id: string
  type: string
  title: string
  category: 'sensors' | 'insulin' | 'food' | 'glucose' | 'general'
  enabled: boolean
  size: 'small' | 'medium' | 'large' | 'full'
  order: number
}

interface UseDashboardWidgets {
  widgets: DashboardWidget[]
  loading: boolean
  updateWidgets: (widgets: DashboardWidget[]) => void
  getEnabledWidgets: () => DashboardWidget[]
  getWidgetsByCategory: (category: string) => DashboardWidget[]
  isWidgetEnabled: (widgetId: string) => boolean
  getWidgetSize: (widgetId: string) => string
}
```

### WidgetRenderer Props

```typescript
interface WidgetRendererProps {
  widgetType: string
  widgetSize: string
  className?: string
  sensors?: Sensor[]
  currentSensor?: Sensor
  statsData?: any
  userAchievements?: any[]
  insightData?: any
  onRefresh?: () => void
  isRefreshing?: boolean
  problematicCount?: number
  onDoseLogged?: () => void
}
```

## Resources

- **Main Docs**: `MAIN_DASHBOARD_CUSTOMIZATION.md`
- **Technical Guide**: `DASHBOARD_CUSTOMIZATION.md`
- **Flow Diagrams**: `CUSTOMIZATION_FLOW.md`
- **Quick Start**: `CUSTOMIZATION_QUICK_START.md`
- **Visual Guide**: `CUSTOMIZATION_VISUAL_GUIDE.md`

## Support

For issues or questions:
1. Check documentation
2. Review console errors
3. Try reset to defaults
4. Clear localStorage and refresh

---

**Version**: 2.0  
**Last Updated**: Session 2  
**Status**: Production Ready ✅
