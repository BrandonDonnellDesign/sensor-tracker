# ⚡ Dashboard Customization - Quick Start

## TL;DR

The customizable dashboard lets users **drag, hide, and resize** widgets to create their perfect insulin management interface. Settings save automatically to their browser.

## 5-Minute Overview

### What Users See

1. **"Customize Dashboard" Button** - Click to enter edit mode
2. **Widget List** - All available dashboard components
3. **Drag Handles** (⋮⋮) - Grab and reorder widgets
4. **Eye Icons** (👁) - Show/hide widgets
5. **Size Buttons** [S][M][L][F] - Resize widgets
6. **Live Preview** - See changes in real-time
7. **Save Button** - Apply and persist changes

### How It Works (User Perspective)

```
Click "Customize" → Drag widgets → Toggle visibility → Change sizes → Save
                                                                        ↓
                                                            Saved to browser
                                                            Persists forever
```

### How It Works (Developer Perspective)

```typescript
// 1. Define widgets
const widgets = [
  { id: 'iob', type: 'iob-tracker', enabled: true, size: 'small', order: 0 },
  { id: 'tdi', type: 'tdi', enabled: true, size: 'large', order: 1 }
]

// 2. Render customizer
<DashboardCustomizer 
  widgets={widgets}
  onWidgetsChange={(newWidgets) => {
    setWidgets(newWidgets)
    localStorage.setItem('widgets', JSON.stringify(newWidgets))
  }}
/>

// 3. Render dashboard
<div className="grid grid-cols-3 gap-6">
  {widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order)
    .map(w => renderWidget(w))}
</div>
```

## Key Features

### 1. Drag & Drop Reordering
- **Library**: `@hello-pangea/dnd`
- **Interaction**: Grab handle, drag, drop
- **Keyboard**: Space to grab, Arrows to move
- **Touch**: Mobile-friendly

### 2. Visibility Toggle
- **On**: Green eye icon, widget visible
- **Off**: Gray eye icon, widget hidden
- **Instant**: Updates preview immediately

### 3. Size Options
- **Small** (S): 1 column - Quick actions
- **Medium** (M): 2 columns - Balanced views
- **Large** (L): 2 cols → 1 on large screens - Charts
- **Full** (F): Full width - Detailed analytics

### 4. Persistence
- **Storage**: Browser localStorage
- **Key**: `insulin-dashboard-widgets`
- **Format**: JSON array
- **Lifetime**: Permanent (until cleared)

## Available Widgets

| Widget | Best Size | Purpose |
|--------|-----------|---------|
| IOB Tracker | Small | Current insulin on board |
| Quick Dose Logger | Small | Fast dose entry |
| Insulin Calculator | Small | Carb calculations |
| TDI Dashboard | Large | Daily insulin totals |
| Basal Trends | Large | Basal rate patterns |
| IOB Decay Chart | Full | Insulin activity graph |
| Export Data | Medium | Data export tools |

## Code Examples

### Basic Implementation

```typescript
import { DashboardCustomizer } from '@/components/insulin/dashboard-customizer'

function Dashboard() {
  const [widgets, setWidgets] = useState(loadWidgets())
  
  return (
    <>
      <DashboardCustomizer 
        widgets={widgets}
        onWidgetsChange={setWidgets}
      />
      <DashboardGrid widgets={widgets} />
    </>
  )
}
```

### Load from Storage

```typescript
function loadWidgets() {
  const saved = localStorage.getItem('insulin-dashboard-widgets')
  return saved ? JSON.parse(saved) : DEFAULT_WIDGETS
}
```

### Save to Storage

```typescript
function saveWidgets(widgets) {
  localStorage.setItem('insulin-dashboard-widgets', JSON.stringify(widgets))
}
```

### Render Widget

```typescript
function renderWidget(widget) {
  const className = getSizeClass(widget.size)
  
  switch (widget.type) {
    case 'iob-tracker':
      return <IOBTracker className={className} />
    case 'tdi':
      return <TDIDashboard className={className} />
    // ... more cases
  }
}
```

### Size Classes

```typescript
function getSizeClass(size) {
  return {
    small: 'col-span-1',
    medium: 'col-span-2',
    large: 'col-span-2 lg:col-span-1',
    full: 'col-span-full'
  }[size]
}
```

## User Flow

```
1. User visits dashboard
   ↓
2. Sees default layout
   ↓
3. Clicks "Customize Dashboard"
   ↓
4. Edit mode opens
   ↓
5. User makes changes:
   • Drags "TDI Dashboard" to top
   • Hides "Export Data"
   • Changes "IOB Tracker" to Medium
   ↓
6. Sees live preview update
   ↓
7. Clicks "Save Changes"
   ↓
8. Dashboard updates
   ↓
9. Settings saved to browser
   ↓
10. Next visit: Same layout loads automatically
```

## Technical Stack

- **React**: Component state management
- **@hello-pangea/dnd**: Drag and drop
- **localStorage**: Persistence
- **Tailwind CSS**: Responsive grid
- **TypeScript**: Type safety

## Responsive Behavior

```
Mobile (< 768px):
  All widgets stack vertically
  Size preferences saved for desktop

Tablet (768px - 1024px):
  2-column grid
  Medium/Large span full width

Desktop (> 1024px):
  3-column grid
  All size options active
```

## Accessibility

- ✅ Keyboard navigation (Tab, Space, Arrows)
- ✅ Screen reader announcements
- ✅ Focus indicators
- ✅ ARIA labels
- ✅ Color contrast (WCAG AA)

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (iOS 13+)
- ✅ Mobile browsers

## Common Use Cases

### Scenario 1: Minimal Dashboard
**User**: "I only want IOB and quick dose entry"

**Solution**:
1. Hide all widgets except IOB Tracker and Quick Dose Logger
2. Set both to Small size
3. Save

**Result**: Clean, focused interface

### Scenario 2: Analytics Focus
**User**: "I want to see all my trends and charts"

**Solution**:
1. Move TDI Dashboard, Basal Trends to top
2. Set IOB Decay Chart to Full
3. Hide Quick Dose Logger
4. Save

**Result**: Data-rich analytics view

### Scenario 3: Mobile Optimized
**User**: "I use this on my phone mostly"

**Solution**:
1. Keep only essential widgets enabled
2. Use Small/Medium sizes
3. Order by frequency of use
4. Save

**Result**: Fast, mobile-friendly layout

## Troubleshooting

**Q: Changes not saving?**
- Check localStorage is enabled
- Look for browser errors in console
- Try incognito mode to test

**Q: Drag not working?**
- Ensure @hello-pangea/dnd is installed
- Check for CSS conflicts
- Try keyboard (Space + Arrows)

**Q: Layout looks broken?**
- Clear localStorage and reload
- Click "Reset" to restore defaults
- Check browser console for errors

## Next Steps

1. **Try it**: Visit `/dashboard/insulin/customize`
2. **Experiment**: Drag, hide, resize widgets
3. **Save**: Click "Save Changes"
4. **Enjoy**: Your personalized dashboard!

## Resources

- **Full Documentation**: `DASHBOARD_CUSTOMIZATION.md`
- **Flow Diagrams**: `CUSTOMIZATION_FLOW.md`
- **Component**: `components/insulin/dashboard-customizer.tsx`
- **Demo Page**: `app/dashboard/insulin/customize/page.tsx`

---

**Pro Tip**: Start with the default layout and make small changes. You can always click "Reset" to go back!
