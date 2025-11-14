# Design System Reference

Comprehensive design system documentation based on reference designs, combining the detailed layout structure from screenshot-1 with subtle gradient aesthetics from screenshot-2.

## Design Philosophy

**Primary Inspiration**: Screenshot-1 layout (detailed, data-rich, professional)
**Visual Enhancement**: Screenshot-2 gradients (modern, subtle depth, vibrant)

### Core Principles
- **Information density**: Display maximum relevant data without overwhelming
- **Visual hierarchy**: Clear distinction between primary, secondary, and tertiary content
- **Subtle depth**: Use gradients to add dimension without distraction
- **Consistent spacing**: Maintain breathing room while maximizing content
- **Color as meaning**: Status and category colors provide instant context

---

## Layout Structure

### Three-Column Layout
The application uses a fixed three-column layout optimized for time tracking workflows:

```
┌─────────────┬──────────────────────────────┬─────────────┐
│   Sidebar   │      Main Content Area       │   Details   │
│   (256px)   │        (flexible)            │   (320px)   │
│             │                              │             │
│ Navigation  │  Filters + Calendar View     │  Issues     │
│ + Controls  │                              │  + Insights │
└─────────────┴──────────────────────────────┴─────────────┘
```

#### Left Sidebar (256px fixed)
- **Primary navigation** at top
- **Integration sections** below
- **User profile** anchored to bottom
- Subtle background differentiation (light gray/off-white)

#### Main Content Area (flexible)
- **Filters panel** at top (collapsible)
- **Calendar view** as primary content
- **Action buttons** in header (Export, Auto Reconcile)
- Clean white background

#### Right Sidebar (320px fixed)
- **Search functionality** at top
- **Relevant issues list** with status indicators
- **Quick insights panel** at bottom
- Subtle background differentiation

---

## Color System

### Primary Palette
Combines solid colors from screenshot-1 with gradient capabilities from screenshot-2.

#### Base Colors (Solid)
```
Brand Primary:   #6366F1 (Indigo)
Brand Secondary: #8B5CF6 (Purple)
Accent:          #EC4899 (Pink)
Success:         #10B981 (Green)
Warning:         #F59E0B (Orange/Amber)
Info:            #3B82F6 (Blue)
```

#### Gradient Overlays (Subtle, 10-20% opacity shift)
Each calendar event block uses a subtle vertical gradient:
- **Light to slightly lighter** (top to bottom)
- Approximately 5-10% luminosity difference
- Adds depth without competing with text

#### Example Gradient Applications
```css
/* API Development (Blue) */
background: linear-gradient(180deg, #DBEAFE 0%, #BFDBFE 100%);

/* UI Design (Purple) */
background: linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%);

/* Testing (Orange) */
background: linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%);

/* Code Review (Green) */
background: linear-gradient(180deg, #D1FAE5 0%, #A7F3D0 100%);

/* Meetings (Pink) */
background: linear-gradient(180deg, #FCE7F3 0%, #FBCFE8 100%);
```

#### Status Colors (Solid)
```
Backend:  #3B82F6 (Blue badge)
Frontend: #F59E0B (Orange badge)
Design:   #8B5CF6 (Purple badge)
High:     #EF4444 (Red badge)
Medium:   #F59E0B (Orange badge)
Low:      #6B7280 (Gray badge)
```

### Neutral Palette
```
Background:       #FFFFFF (Pure white)
Surface:          #F9FAFB (Off-white)
Border:           #E5E7EB (Light gray)
Text Primary:     #111827 (Near black)
Text Secondary:   #6B7280 (Medium gray)
Text Tertiary:    #9CA3AF (Light gray)
```

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI',
             Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

### Type Scale
```
Heading 1:  24px / 32px (600 weight) - Page titles
Heading 2:  20px / 28px (600 weight) - Section headers
Heading 3:  16px / 24px (600 weight) - Subsection headers
Body Large: 15px / 24px (400 weight) - Primary content
Body:       14px / 20px (400 weight) - Default text
Body Small: 13px / 18px (400 weight) - Secondary text
Caption:    12px / 16px (400 weight) - Labels, metadata
Tiny:       11px / 14px (500 weight) - Badges, time labels
```

### Font Weights
- **Regular**: 400 (body text)
- **Medium**: 500 (emphasis, labels)
- **Semibold**: 600 (headings, buttons)

---

## Spacing System

### Base Unit: 4px
All spacing uses multiples of 4px for consistency.

```
XS:  4px   (0.25rem)
SM:  8px   (0.5rem)
MD:  12px  (0.75rem)
LG:  16px  (1rem)
XL:  24px  (1.5rem)
2XL: 32px  (2rem)
3XL: 48px  (3rem)
4XL: 64px  (4rem)
```

### Component Spacing
- **Card padding**: 16px (LG)
- **Section gaps**: 24px (XL)
- **Input padding**: 12px horizontal, 8px vertical
- **Button padding**: 12px horizontal, 8px vertical
- **List item padding**: 12px vertical, 16px horizontal

---

## Components

### Calendar Event Blocks

The core component for displaying time allocations.

#### Visual Structure
```
┌─────────────────────────┐
│ Activity Name           │  12px top padding
│ PROJ-123               │  Bold project ID
│ 9:00 - 11:00           │  Time range
└─────────────────────────┘
```

#### Properties
- **Border radius**: 8px (rounded-lg)
- **Border**: 1px solid (color 20% darker than background)
- **Padding**: 12px
- **Min height**: 80px
- **Shadow**: subtle (0 1px 3px rgba(0,0,0,0.1))
- **Gradient**: Vertical, 10% luminosity shift
- **Text color**: Corresponding color at 700-800 weight

#### States
- **Default**: Base gradient, subtle shadow
- **Hover**: Slightly darker gradient (5%), shadow increase
- **Active/Selected**: Border thickens to 2px, shadow increase
- **Dragging**: Opacity 0.7, cursor grab

### Navigation Items

#### Visual Structure
```
┌─────────────────────────┐
│ 📅  Calendar            │  Icon + Label
└─────────────────────────┘
```

#### Properties
- **Height**: 40px
- **Padding**: 12px horizontal
- **Border radius**: 6px
- **Icon size**: 20px
- **Gap**: 12px between icon and text

#### States
- **Default**: Transparent background, text-gray-700
- **Hover**: Background gray-100
- **Active**: Background indigo-50, text-indigo-600, font-semibold

### Filter Controls

#### Date Range Picker
- Two date inputs side-by-side
- Calendar icon prefix
- Border: 1px solid gray-300
- Border radius: 6px
- Padding: 8px 12px

#### Dropdown Select
- Full width container
- Chevron down icon suffix
- Border: 1px solid gray-300
- Border radius: 6px
- Padding: 8px 12px
- Max height with scroll for long lists

#### User/Contributor List
- Checkbox + Avatar + Name
- 40px height per item
- 8px gap between checkbox and avatar
- 12px padding horizontal

### Issue Cards (Right Sidebar)

#### Visual Structure
```
┌─────────────────────────────────────┐
│ PROJ-142                      ⋮    │  Drag handle
│ Implement user authentication       │  Title
│ ┌─────────┐              12h ago   │  Badge + Time
│ │ Backend │                         │
└─────────────────────────────────────┘
```

#### Properties
- **Padding**: 12px
- **Border**: 1px solid gray-200
- **Border radius**: 8px
- **Gap**: 8px between elements
- **Badge**: 6px radius, 6px vertical + 10px horizontal padding

#### Sections
1. **Relevant Issues**: Manually tracked/selected
2. **From Activity Data**: Auto-detected from commits

### Status Badges

Small, colorful indicators for categorization.

#### Properties
- **Font size**: 11px
- **Font weight**: 500
- **Padding**: 4px 8px
- **Border radius**: 4px (pill-shaped)
- **Text color**: White or color-800 depending on background

#### Variants
```
Backend:  bg-blue-500, text-white
Frontend: bg-orange-500, text-white
Design:   bg-purple-500, text-white
High:     bg-red-500, text-white
Medium:   bg-orange-400, text-white
```

### Buttons

#### Primary Button
```css
background: linear-gradient(180deg, #6366F1 0%, #4F46E5 100%);
color: white;
padding: 8px 16px;
border-radius: 6px;
font-weight: 600;
shadow: 0 1px 2px rgba(0,0,0,0.1);
```

#### Secondary Button
```css
background: white;
color: #374151;
border: 1px solid #D1D5DB;
padding: 8px 16px;
border-radius: 6px;
font-weight: 600;
```

#### Icon Button
- Square (32px × 32px)
- Icon centered (16px size)
- Border radius: 6px
- Hover: background gray-100

### Loading States

#### Progress Bar
```
┌─────────────────────────────────────┐
│ Loading Data                   73% │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░    │
│ Loading worklogs: 1,247 entries    │
└─────────────────────────────────────┘
```

- Background: indigo-50
- Border: 1px solid indigo-200
- Progress bar: indigo-500
- Border radius: 6px

#### Changes Summary (Unsaved)
```
┌─────────────────────────────────────┐
│ Unsaved Changes                     │
│ New entries            3            │
│ Modified               7            │
│ Deleted                2            │
│ ┌─────────────────────────────────┐ │
│ │  🔄  Sync Changes               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- Background: orange-50
- Border: 1px solid orange-200
- Button: orange-500 gradient

### Quick Insights Panel

Collapsible panel at bottom of right sidebar.

```
┌─────────────────────────────────────┐
│ 👤 Quick Insights               ∨  │
│                                     │
│ Total hours (Week)           38h   │
│ Avg per day                  7.6h  │
│ Unlogged days                0     │
└─────────────────────────────────────┘
```

#### Properties
- **Background**: white
- **Border**: 1px solid gray-200
- **Border radius**: 8px
- **Padding**: 16px
- **Row height**: 32px
- **Label color**: text-gray-600
- **Value color**: text-gray-900, font-semibold

---

## Calendar View Details

### Time Grid

#### Structure
- **Time labels**: Left column, 60px width
- **Hour intervals**: Full hours (9:00 AM, 10:00 AM, etc.)
- **Row height**: 80px per hour
- **Grid lines**: 1px solid gray-200
- **Day columns**: Equal width, min 120px

#### Day Headers
```
┌──────────────────────────────────────────────────────────┐
│  MON    TUE    WED    THU    FRI    SAT    SUN          │
│   1      2      3      4      5      6      7           │
│                            Today                         │
└──────────────────────────────────────────────────────────┘
```

- **Day name**: 11px, uppercase, gray-500, font-medium
- **Date number**: 24px, gray-900, font-semibold
- **Today indicator**: Small label, indigo-600 text
- **Padding**: 16px vertical

### Week Navigation

```
┌────────────────────────────────────────────────┐
│  ← Jan 1 - Jan 7, 2024 →  Today  [Month][Week]│
└────────────────────────────────────────────────┘
```

- Arrow buttons: 32px square, hover bg-gray-100
- Date range: font-medium, 15px
- Today button: secondary button style
- View toggles: Toggle group, 32px height

---

## Interaction Patterns

### Drag and Drop
- **Event blocks**: Draggable to different times/days
- **Visual feedback**: Opacity 0.7, ghost outline at destination
- **Snap to grid**: 15-minute intervals
- **Cancel**: ESC key or drag outside calendar

### Hover States
- **Calendar events**: Shadow increase, slight scale (1.02)
- **Navigation items**: Background change
- **Issue cards**: Border color change to indigo-300
- **Buttons**: Shadow increase, slight brightness shift

### Selection
- **Single select**: Click event block → border thickens
- **Multi-select**: Cmd/Ctrl + Click → all selected have thick borders
- **Range select**: Shift + Click → all events in range selected

### Context Menus
- Right-click on event → Edit, Duplicate, Delete options
- Right-click on empty space → Create new entry

---

## Data Visualization

### Time Block Positioning
```
Position calculation:
- Top = (start_hour - 9) * 80px + (start_minutes / 60 * 80px)
- Height = (duration_minutes / 60 * 80px)
- Min height = 40px (30 minutes)
```

### Overlapping Events
- Side-by-side if overlap detected
- Each event width = column_width / overlap_count
- Small gap (4px) between overlapping events
- Z-index based on creation time (newer on top)

### Activity Colors

Consistent color mapping across views:

```
API Development:    Blue gradient (50-100)
UI Design:          Purple gradient (50-100)
Testing:            Orange gradient (50-100)
Code Review:        Green gradient (50-100)
Meetings:           Pink gradient (50-100)
DevOps:             Teal gradient (50-100)
Documentation:      Gray gradient (50-100)
```

---

## Responsive Behavior

### Breakpoints
```
SM:  640px   - Mobile
MD:  768px   - Tablet
LG:  1024px  - Small desktop
XL:  1280px  - Desktop
2XL: 1536px  - Large desktop
```

### Layout Adaptations
- **< 1024px**: Right sidebar collapses to drawer
- **< 768px**: Left sidebar becomes overlay
- **< 640px**: Calendar switches to day view only

### Mobile Optimizations
- Larger touch targets (44px minimum)
- Bottom navigation bar
- Swipe gestures for week navigation
- Simplified event creation (bottom sheet)

---

## Animation & Motion

### Transitions
```css
Default: all 150ms cubic-bezier(0.4, 0, 0.2, 1)
Slow:    all 300ms cubic-bezier(0.4, 0, 0.2, 1)
Fast:    all 100ms cubic-bezier(0.4, 0, 0.2, 1)
```

### Motion Patterns
- **Navigation**: Slide in/out (250ms)
- **Modals**: Fade + scale (200ms)
- **Dropdowns**: Slide down (150ms)
- **Tooltips**: Fade (100ms)
- **Loading**: Skeleton screens with shimmer

### Reduced Motion
Respect `prefers-reduced-motion` - disable all non-essential animations.

---

## Accessibility

### Keyboard Navigation
- **Tab**: Move focus through interactive elements
- **Enter/Space**: Activate buttons, select items
- **Arrow keys**: Navigate calendar grid, move between events
- **Cmd/Ctrl + N**: New entry
- **Cmd/Ctrl + S**: Save changes
- **ESC**: Close modals, cancel drag

### Screen Readers
- Semantic HTML elements (nav, main, aside, article)
- ARIA labels on icon-only buttons
- ARIA live regions for dynamic updates
- ARIA expanded/collapsed states for collapsible sections

### Color Contrast
- Text: Minimum 4.5:1 ratio (WCAG AA)
- Interactive elements: Minimum 3:1 ratio
- Status colors designed for colorblind accessibility

### Focus Indicators
- **Outline**: 2px solid indigo-500
- **Offset**: 2px
- **Visible on all interactive elements**

---

## Data States

### Empty States
```
┌─────────────────────────────────────┐
│                                     │
│         📅                          │
│    No entries for this week         │
│    Click '+' to add time            │
│                                     │
└─────────────────────────────────────┘
```

- Icon: 48px, gray-400
- Text: gray-500, 15px
- Action button: primary style

### Error States
- Red border on invalid inputs
- Error message below field (12px, red-600)
- Icon indicator (⚠️) for severe errors

### Loading States
- Skeleton screens for initial load
- Progress bars for long operations
- Inline spinners for partial updates

### Success States
- Green checkmark icon
- Toast notification (top-right)
- Auto-dismiss after 3 seconds

---

## Implementation Notes

### Gradient Implementation (Subtle)
```css
.event-block {
  background: linear-gradient(
    180deg,
    var(--color-base) 0%,
    var(--color-darker) 100%
  );
}

/* Where color-darker is 10% darker in HSL space */
/* Example for blue-100 base: */
--color-base: hsl(214, 100%, 92%);
--color-darker: hsl(214, 100%, 82%);
```

### Performance Considerations
- Virtualize calendar grid for large date ranges
- Lazy load issue details
- Debounce search inputs (300ms)
- Memoize calculated positions

### Browser Support
- Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ JavaScript features
- CSS Grid and Flexbox
- CSS Custom Properties

---

## Design Tokens

For implementation in Tailwind or CSS variables:

```css
:root {
  /* Colors */
  --color-brand-primary: #6366F1;
  --color-brand-secondary: #8B5CF6;
  --color-accent: #EC4899;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 0.75rem;
  --space-lg: 1rem;
  --space-xl: 1.5rem;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

  /* Layout */
  --sidebar-width: 256px;
  --details-width: 320px;
  --header-height: 64px;
}
```

---

## Next Steps for POC

1. **Create mockup page** with static data
2. **Implement gradient system** with CSS custom properties
3. **Build calendar grid** with time blocks
4. **Add filter controls** (date range, project, user)
5. **Style issue cards** with status badges
6. **Test interactions** (hover, selection, drag)
7. **Validate accessibility** (keyboard, screen reader)
8. **Review responsiveness** at key breakpoints

