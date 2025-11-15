# Design System

This document describes the design system for the Hourly application, including colors, typography, spacing, and component patterns.

## Overview

Hourly uses a modern, pastel design system built on:
- **Tailwind CSS v4** with CSS-first configuration
- **OKLCH color space** for perceptually uniform colors
- **shadcn/ui** component library
- **Inter font family** with variable font support
- **Light and dark themes** with system preference detection

## Color Palette

### Semantic Color Roles

The design system now centers on a soft pastel palette with vibrant lavender, pink, and powder-blue accents. The semantic roles remain the same:

| Role | Description | Usage |
|------|-------------|-------|
| `background` | Main page background | Body, main containers |
| `foreground` | Primary text color | Body text, headings |
| `muted` | Muted/secondary text | Help text, placeholders |
| `border` | Border color | Component borders |
| `surface` | Elevated surface color | Cards, panels |
| `surface-muted` | Muted surface color | Hover states, secondary surfaces |
| `accent` | Accent/highlight color | Links, focus states |
| `accent-foreground` | Text on accent background | Button text on accent |
| `ring` | Focus ring color | Focus indicators |

### Color Palette Values

The application uses a pastel palette inspired by dreamy skies and soft florals. Each color includes a full scale from 100 (darkest) to 900 (lightest), with 500 being the base/default color. Core layout surfaces stay white or near-white; the palette is reserved for accents, controls, and data viz so the UI feels crisp without pink/purple wash across the canvas.

#### Thistle

Lavender-lilac tones that anchor the layout. Best for text accents, badges, and subtle dividers while keeping primary backgrounds white.

```css
--color-thistle-100: #2b1a36;
--color-thistle-200: #57346b;
--color-thistle-300: #824ea1;
--color-thistle-400: #a87ec1;
--color-thistle-500: #cdb4db;  /* DEFAULT */
--color-thistle-600: #d6c2e2;
--color-thistle-700: #e0d2e9;
--color-thistle-800: #ebe1f0;
--color-thistle-900: #f5f0f8;
```

Usage: `text-thistle-300` (muted text), `border-thistle-400`, `bg-thistle-800` (chips or tag fills)

#### Fairy Tale

Dreamy blush-pink shades for gentle highlights and empty-state fills.

```css
--color-fairy-tale-100: #5b0023;
--color-fairy-tale-200: #b60046;
--color-fairy-tale-300: #ff116c;
--color-fairy-tale-400: #ff6ca4;
--color-fairy-tale-500: #ffc8dd;  /* DEFAULT */
--color-fairy-tale-600: #ffd2e3;
--color-fairy-tale-700: #ffddea;
--color-fairy-tale-800: #ffe9f1;
--color-fairy-tale-900: #fff4f8;
```

Usage: `bg-fairy-tale-700` (empty states), `ring-fairy-tale-400`, `text-fairy-tale-300` (status text)

#### Carnation Pink

Bold coral-pink tones used for destructive states and high-energy notifications.

```css
--color-carnation-pink-100: #56001f;
--color-carnation-pink-200: #ab003f;
--color-carnation-pink-300: #ff025f;
--color-carnation-pink-400: #ff5895;
--color-carnation-pink-500: #ffafcc;  /* DEFAULT */
--color-carnation-pink-600: #ffbed6;
--color-carnation-pink-700: #ffcee0;
--color-carnation-pink-800: #ffdeea;
--color-carnation-pink-900: #ffeff5;
```

Usage: `bg-carnation-pink-500` (alert badges), `text-carnation-pink-200` (critical labels)

#### Uranian Blue

Feathery sky-blue shades that keep surfaces bright and focus rings legible.

```css
--color-uranian-blue-100: #012f57;
--color-uranian-blue-200: #035eaf;
--color-uranian-blue-300: #0f8dfb;
--color-uranian-blue-400: #66b6fd;
--color-uranian-blue-500: #bde0fe;  /* DEFAULT */
--color-uranian-blue-600: #cbe6fe;
--color-uranian-blue-700: #d8ecfe;
--color-uranian-blue-800: #e5f3ff;
--color-uranian-blue-900: #f2f9ff;
```

Usage: `ring-uranian-blue-400`, `bg-uranian-blue-800` for small callouts, gradients with light sky blue

#### Light Sky Blue

The saturated accent used for buttons, links, and emphasis text.

```css
--color-light-sky-blue-100: #002b54;
--color-light-sky-blue-200: #0056a7;
--color-light-sky-blue-300: #0082fb;
--color-light-sky-blue-400: #50aaff;
--color-light-sky-blue-500: #a2d2ff;  /* DEFAULT */
--color-light-sky-blue-600: #b6dcff;
--color-light-sky-blue-700: #c8e4ff;
--color-light-sky-blue-800: #daedff;
--color-light-sky-blue-900: #edf6ff;
```

Usage: `bg-light-sky-blue-500` (primary buttons), `text-light-sky-blue-300` (links), `border-light-sky-blue-400`

### Palette Reference Formats

For quick copy/paste, the palette is also available in several formats:

- **Tailwind object**

```js
{ 'thistle': { DEFAULT: '#cdb4db', 100: '#2b1a36', 200: '#57346b', 300: '#824ea1', 400: '#a87ec1', 500: '#cdb4db', 600: '#d6c2e2', 700: '#e0d2e9', 800: '#ebe1f0', 900: '#f5f0f8' }, 'fairy_tale': { DEFAULT: '#ffc8dd', 100: '#5b0023', 200: '#b60046', 300: '#ff116c', 400: '#ff6ca4', 500: '#ffc8dd', 600: '#ffd2e3', 700: '#ffddea', 800: '#ffe9f1', 900: '#fff4f8' }, 'carnation_pink': { DEFAULT: '#ffafcc', 100: '#56001f', 200: '#ab003f', 300: '#ff025f', 400: '#ff5895', 500: '#ffafcc', 600: '#ffbed6', 700: '#ffcee0', 800: '#ffdeea', 900: '#ffeff5' }, 'uranian_blue': { DEFAULT: '#bde0fe', 100: '#012f57', 200: '#035eaf', 300: '#0f8dfb', 400: '#66b6fd', 500: '#bde0fe', 600: '#cbe6fe', 700: '#d8ecfe', 800: '#e5f3ff', 900: '#f2f9ff' }, 'light_sky_blue': { DEFAULT: '#a2d2ff', 100: '#002b54', 200: '#0056a7', 300: '#0082fb', 400: '#50aaff', 500: '#a2d2ff', 600: '#b6dcff', 700: '#c8e4ff', 800: '#daedff', 900: '#edf6ff' } }
```

- **CSV**: `cdb4db,ffc8dd,ffafcc,bde0fe,a2d2ff`
- **With #**: `#cdb4db, #ffc8dd, #ffafcc, #bde0fe, #a2d2ff`
- **Array**: `["cdb4db","ffc8dd","ffafcc","bde0fe","a2d2ff"]`
- **Object**

```json
{"Thistle":"cdb4db","Fairy Tale":"ffc8dd","Carnation pink":"ffafcc","Uranian Blue":"bde0fe","Light Sky Blue":"a2d2ff"}
```

- **Extended Array**

```json
[{"name":"Thistle","hex":"cdb4db","rgb":[205,180,219],"cmyk":[6,18,0,14],"hsb":[278,18,86],"hsl":[278,35,78],"lab":[77,16,-16]},{"name":"Fairy Tale","hex":"ffc8dd","rgb":[255,200,221],"cmyk":[0,22,13,0],"hsb":[337,22,100],"hsl":[337,100,89],"lab":[86,23,-3]},{"name":"Carnation pink","hex":"ffafcc","rgb":[255,175,204],"cmyk":[0,31,20,0],"hsb":[338,31,100],"hsl":[338,100,84],"lab":[80,33,-3]},{"name":"Uranian Blue","hex":"bde0fe","rgb":[189,224,254],"cmyk":[26,12,0,0],"hsb":[208,26,100],"hsl":[208,97,87],"lab":[88,-5,-18]},{"name":"Light Sky Blue","hex":"a2d2ff","rgb":[162,210,255],"cmyk":[36,18,0,0],"hsb":[209,36,100],"hsl":[209,100,82],"lab":[82,-5,-27]}]
```

- **XML**

```xml
<palette>
  <color name="Thistle" hex="cdb4db" r="205" g="180" b="219" />
  <color name="Fairy Tale" hex="ffc8dd" r="255" g="200" b="221" />
  <color name="Carnation pink" hex="ffafcc" r="255" g="175" b="204" />
  <color name="Uranian Blue" hex="bde0fe" r="189" g="224" b="254" />
  <color name="Light Sky Blue" hex="a2d2ff" r="162" g="210" b="255" />
</palette>
```

### Color Scale Guidelines

- **100-300**: Dark shades - Use for text on light backgrounds, dark mode elements
- **400**: Medium dark - Useful for hover states and interactive elements
- **500**: Base/DEFAULT - The primary color value
- **600-700**: Light shades - Subtle backgrounds, hover states
- **800-900**: Very light shades - Minimal backgrounds, ghost elements

### Color Mapping

#### Light Theme

```css
@utility light-theme {
  /* Surface colors - neutral whites */
  --color-background: #ffffff;                /* Primary canvas */
  --color-surface: #f9fbff;                   /* Slightly tinted cards */
  --color-surface-muted: #f1f5fb;             /* Secondary blocks */

  /* Border and input */
  --color-border: #e4e8f2;                    /* Cool neutral border */

  /* Text colors */
  --color-foreground: #111322;                /* Neutral charcoal text */
  --color-muted: #5a5d73;                     /* Muted slate text */

  /* Accent colors */
  --color-accent: var(--color-light-sky-blue-500);        /* Palette-driven accent */
  --color-accent-foreground: var(--color-light-sky-blue-100);
  --color-ring: var(--color-uranian-blue-400);
}
```

#### Dark Theme

```css
@utility dark-theme {
  /* Surface colors - charcoal neutrals */
  --color-background: #0b0d14;
  --color-surface: #151926;
  --color-surface-muted: #1d2232;

  /* Border and input */
  --color-border: #2e3447;

  /* Text colors */
  --color-foreground: #f5f7ff;
  --color-muted: #c3c8df;

  /* Accent colors */
  --color-accent: var(--color-carnation-pink-500);
  --color-accent-foreground: var(--color-carnation-pink-100);
  --color-ring: var(--color-uranian-blue-400);
}
```

### Component-Specific Colors

Additional colors for specific components (from shadcn/ui):

```css
/* Card components */
--color-card: var(--color-background);
--color-card-foreground: var(--color-foreground);

/* Popovers and tooltips */
--color-popover: var(--color-surface);
--color-popover-foreground: var(--color-foreground);

/* Primary buttons and interactive elements */
--color-primary: var(--color-light-sky-blue-500);      /* #a2d2ff */
--color-primary-foreground: var(--color-light-sky-blue-100); /* #002b54 */

/* Secondary elements */
--color-secondary: var(--color-thistle-600);           /* #d6c2e2 */
--color-secondary-foreground: var(--color-thistle-100); /* #2b1a36 */

/* Destructive/error states */
--color-destructive: var(--color-carnation-pink-300);  /* #ff025f */

/* Input fields */
--color-input: var(--color-border);
```

### Chart Colors

For data visualization, using a range of pastel tones with good contrast:

```css
/* Light theme charts */
--color-chart-1: var(--color-light-sky-blue-500);  /* #a2d2ff */
--color-chart-2: var(--color-uranian-blue-400);    /* #66b6fd */
--color-chart-3: var(--color-thistle-500);         /* #cdb4db */
--color-chart-4: var(--color-fairy-tale-400);      /* #ff6ca4 */
--color-chart-5: var(--color-carnation-pink-500);  /* #ffafcc */

/* Dark theme charts - slightly more saturated for contrast */
--color-chart-1-dark: var(--color-light-sky-blue-400);  /* #50aaff */
--color-chart-2-dark: var(--color-uranian-blue-300);    /* #0f8dfb */
--color-chart-3-dark: var(--color-thistle-400);         /* #a87ec1 */
--color-chart-4-dark: var(--color-fairy-tale-300);      /* #ff116c */
--color-chart-5-dark: var(--color-carnation-pink-300);  /* #ff025f */
```

### Sidebar Colors

```css
--color-sidebar: var(--color-surface);
--color-sidebar-foreground: var(--color-foreground);
--color-sidebar-primary: var(--color-accent);
--color-sidebar-primary-foreground: var(--color-accent-foreground);
--color-sidebar-accent: var(--color-surface-muted);
--color-sidebar-accent-foreground: var(--color-foreground);
--color-sidebar-border: var(--color-border);
--color-sidebar-ring: var(--color-ring);
```

## Typography

### Font Family

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
```

With variable font support:
```css
--font-sans: "InterVariable", -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
```

### Font Features

- **Font smoothing**: Enabled via `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`
- **Optical sizing**: Automatic when using variable fonts
- **Variable font axes**: Weight, slant (when using InterVariable)

### Typography Scale

Use Tailwind's default typography scale:

| Class | Size | Line Height |
|-------|------|-------------|
| `text-xs` | 0.75rem (12px) | 1rem |
| `text-sm` | 0.875rem (14px) | 1.25rem |
| `text-base` | 1rem (16px) | 1.5rem |
| `text-lg` | 1.125rem (18px) | 1.75rem |
| `text-xl` | 1.25rem (20px) | 1.75rem |
| `text-2xl` | 1.5rem (24px) | 2rem |
| `text-3xl` | 1.875rem (30px) | 2.25rem |
| `text-4xl` | 2.25rem (36px) | 2.5rem |

## Spacing & Layout

### Border Radius

```css
--radius: 0.65rem;           /* Base radius */
--radius-sm: 0.45rem;        /* Small (--radius - 4px) */
--radius-md: 0.55rem;        /* Medium (--radius - 2px) */
--radius-lg: 0.65rem;        /* Large (--radius) */
--radius-xl: 0.75rem;        /* Extra large (--radius + 4px) */
```

### Spacing Scale

Use Tailwind's default spacing scale (0.25rem increments):

| Class | Size |
|-------|------|
| `p-1`, `m-1` | 0.25rem (4px) |
| `p-2`, `m-2` | 0.5rem (8px) |
| `p-3`, `m-3` | 0.75rem (12px) |
| `p-4`, `m-4` | 1rem (16px) |
| `p-6`, `m-6` | 1.5rem (24px) |
| `p-8`, `m-8` | 2rem (32px) |
| `p-12`, `m-12` | 3rem (48px) |

## Components

The application uses shadcn/ui components, customized with the pastel color palette:

### Available Components

- **Navigation**: Breadcrumb, Context Menu, Dropdown Menu, Sidebar
- **Forms**: Button, Checkbox, Input, Label, Select, Textarea, Calendar, Combobox, Command
- **Feedback**: Badge, Progress, Skeleton, Spinner, Sonner (toast), Empty
- **Layout**: Card, Dialog, Sheet, Popover, Scroll Area, Separator, Collapsible
- **Display**: Avatar, Chart, Tooltip

### Component Patterns

#### Buttons

```tsx
// Primary button (light sky blue accent)
<Button variant="default">Primary Action</Button>

// Secondary button (thistle-tinted background)
<Button variant="secondary">Secondary Action</Button>

// Outline button
<Button variant="outline">Cancel</Button>

// Destructive button (carnation pink)
<Button variant="destructive">Delete</Button>
```

#### Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

#### Input Groups

```tsx
<InputGroup>
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
  <InputGroupHelper>Enter your email address</InputGroupHelper>
</InputGroup>
```

## Theme Implementation

### Tailwind CSS v4 Configuration

Colors are defined using the `@theme` directive in CSS. Add this to your `global.css` or main CSS file:

```css
@theme {
  /* Thistle - Lavender base */
  --color-thistle-100: #2b1a36;
  --color-thistle-200: #57346b;
  --color-thistle-300: #824ea1;
  --color-thistle-400: #a87ec1;
  --color-thistle-500: #cdb4db;
  --color-thistle-600: #d6c2e2;
  --color-thistle-700: #e0d2e9;
  --color-thistle-800: #ebe1f0;
  --color-thistle-900: #f5f0f8;

  /* Fairy Tale - Dusty pink highlight */
  --color-fairy-tale-100: #5b0023;
  --color-fairy-tale-200: #b60046;
  --color-fairy-tale-300: #ff116c;
  --color-fairy-tale-400: #ff6ca4;
  --color-fairy-tale-500: #ffc8dd;
  --color-fairy-tale-600: #ffd2e3;
  --color-fairy-tale-700: #ffddea;
  --color-fairy-tale-800: #ffe9f1;
  --color-fairy-tale-900: #fff4f8;

  /* Carnation Pink - Bold coral accent */
  --color-carnation-pink-100: #56001f;
  --color-carnation-pink-200: #ab003f;
  --color-carnation-pink-300: #ff025f;
  --color-carnation-pink-400: #ff5895;
  --color-carnation-pink-500: #ffafcc;
  --color-carnation-pink-600: #ffbed6;
  --color-carnation-pink-700: #ffcee0;
  --color-carnation-pink-800: #ffdeea;
  --color-carnation-pink-900: #ffeff5;

  /* Uranian Blue - Pale sky blue */
  --color-uranian-blue-100: #012f57;
  --color-uranian-blue-200: #035eaf;
  --color-uranian-blue-300: #0f8dfb;
  --color-uranian-blue-400: #66b6fd;
  --color-uranian-blue-500: #bde0fe;
  --color-uranian-blue-600: #cbe6fe;
  --color-uranian-blue-700: #d8ecfe;
  --color-uranian-blue-800: #e5f3ff;
  --color-uranian-blue-900: #f2f9ff;

  /* Light Sky Blue - Vivid blue accent */
  --color-light-sky-blue-100: #002b54;
  --color-light-sky-blue-200: #0056a7;
  --color-light-sky-blue-300: #0082fb;
  --color-light-sky-blue-400: #50aaff;
  --color-light-sky-blue-500: #a2d2ff;
  --color-light-sky-blue-600: #b6dcff;
  --color-light-sky-blue-700: #c8e4ff;
  --color-light-sky-blue-800: #daedff;
  --color-light-sky-blue-900: #edf6ff;
}
```

Once defined in `@theme`, these colors are automatically available as Tailwind utilities:
- `bg-light-sky-blue-500`, `bg-fairy-tale-700`, etc.
- `text-thistle-300`, `text-fairy-tale-400`, etc.
- `border-thistle-400`, `ring-uranian-blue-400`, etc.
- Works with all Tailwind color utilities (ring, shadow, etc.)

### Theme Variants

Custom variants for theme-aware styling:

```css
@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));
@custom-variant light (&:where(.light, .light *, [data-theme="light"], [data-theme="light"] *));
```

### Theme Application

```css
/* Respect system preference */
@media (prefers-color-scheme: dark) {
  :root {
    @apply dark-theme;
  }
}

/* Manual theme override */
:root[data-theme="light"] {
  @apply light-theme;
}

:root[data-theme="dark"] {
  @apply dark-theme;
}
```

## Utilities

### Custom Utilities

#### No Scrollbar

```css
@utility no-scrollbar {
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

Usage:
```html
<div class="overflow-auto no-scrollbar">
  {/* Scrollable content without visible scrollbar */}
</div>
```

## Accessibility

### Color Contrast

All color combinations meet WCAG AA standards:
- **Standard text**: Maintain ≥ 4.5:1 contrast ratio (use palette shades 100-300 for text on light backgrounds)
- **Large text (≥24px or 18px bold)**: Maintain ≥ 3:1 contrast ratio
- **Pastel usage**: Apply pastel (500-900) tones only to surfaces/badges while pairing with darker 100-300 text shades
- **Accent colors**: Reserve saturated shades (100-400) for icons, focus, and tags; keep primary backgrounds white or #f9fbff

### Focus Indicators

- **Focus rings**: Visible on all interactive elements
- **Color**: Uses `--color-ring` for consistency
- **Width**: 2px solid ring with 50% opacity on outline

### Dark Mode

- Supports system preference detection
- Manual override via `data-theme` attribute
- All components adapt to theme changes

## File Structure

```
packages/web/app/
├── styles/
│   ├── global.css          # Main theme configuration
│   ├── shadcn.css          # shadcn/ui component styles
│   ├── react-big-calendar.css
│   └── fonts/
│       └── inter.css       # Inter font definitions
└── components/
    └── shadcn/
        └── ui/             # shadcn/ui components
```

## Usage Examples

### Using Semantic Colors

```tsx
// Background and foreground
<div className="bg-background text-foreground">
  Main content
</div>

// Muted text
<p className="text-muted">Secondary information</p>

// Accent color
<a className="text-accent hover:underline">Link</a>

// Surface elevation
<div className="bg-surface border border-border rounded-lg p-4">
  Card content
</div>
```

### Using Custom Colors

```tsx
// Direct color usage with variations
<div className="bg-light-sky-blue-500 text-light-sky-blue-100">
  Light sky blue background with deep navy text
</div>

// Using different shades
<button className="bg-light-sky-blue-400 hover:bg-light-sky-blue-500 text-white">
  Button with hover state
</button>

// Border colors
<div className="border-2 border-thistle-400 bg-white">
  Card with subtle border and neutral surface
</div>

// Chart colors
<div className="bg-chart-1">Chart element</div>

// Solid pastel cards (calendar/event blocks)
<div className="border border-light-sky-blue-400 bg-light-sky-blue-100 text-light-sky-blue-900 rounded-lg p-4">
  Solid pastel block with readable contrast
</div>
```

### Theme-Aware Styling

```tsx
// Different styles for light/dark
<div className="light:bg-white dark:bg-[#0b0d14]">
  Theme-aware content
</div>

// Theme-aware text colors
<p className="light:text-foreground dark:text-foreground">
  Adaptive text color
</p>

// Theme-aware accents
<button className="light:bg-light-sky-blue-500 dark:bg-carnation-pink-500 text-white">
  Themed button
</button>
```

## Best Practices

1. **Use semantic color names**: Prefer `bg-background` over direct color values for consistency
2. **Respect the color hierarchy**: Use `foreground` for primary text, `muted` for secondary
3. **Use accent sparingly**: Reserve accent colors for important interactive elements
4. **Choose appropriate shades**:
   - Use 100-300 for text on light backgrounds and dark mode surfaces
   - Use 500 as the base/default color
   - Use 600-900 for light backgrounds and subtle elements
5. **Test both themes**: Ensure components look good in both light and dark modes
6. **Leverage utility classes**: Use Tailwind utilities over custom CSS when possible
7. **Follow component patterns**: Use shadcn/ui components as the foundation
8. **Maintain contrast**: Ensure text is readable on all backgrounds
   - Dark text (100-300) on light backgrounds (500-900)
   - Light text (500-900) on dark backgrounds (100-300)
9. **Use border radius consistently**: Stick to the defined radius scale
10. **Gradients and transitions**: Use adjacent shades (e.g., 400-500-600) for smooth gradients
11. **Hover states**: Typically shift one shade darker or lighter (e.g., `bg-light-sky-blue-400 hover:bg-light-sky-blue-500`)

## Resources

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [OKLCH Color Space](https://oklch.com/)
- [Inter Font Family](https://rsms.me/inter/)

## Changelog

### 2025-11-15
- Initial design system documentation
- Defined soft pastel color palette with full 100-900 scale for each color
- Added 10 color families: Melon, Pale Dogwood, Misty Rose, Seashell, Platinum, Platinum Cool, Linen, Champagne Pink, Apricot, and Peach
- Documented complete Tailwind CSS v4 implementation with `@theme` directive
- Updated light and dark theme color mappings to use the new color scale
- Added component-specific colors and chart color variations
- Documented component patterns and usage examples
- Established semantic color roles and best practices for color usage
- Added color scale guidelines (100-900) with usage recommendations
