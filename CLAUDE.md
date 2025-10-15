# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a finance dashboard application built with vanilla HTML/CSS and design tokens extracted from Figma. The project uses a component-based architecture where each UI component is a standalone HTML file with embedded styles referencing a global design token system.

## Development Workflow

### Running the Application

Start a local development server:
```bash
npm start
# Serves on http://localhost:5501
```

### Figma Integration

This project has two Figma extraction workflows:

#### 1. Full File Export (via README workflow)
Exports complete Figma file details (styles, components, variables, comments) to `figma-export/`:
```bash
# Setup (first time only)
cp .env.example .env
# Edit .env and set FIGMA_PERSONAL_ACCESS_TOKEN and optionally FIGMA_FILE_KEY

npm install

# Export file
npm run figma:fetch -- --fileKey <FILE_KEY>

# Export with specific node IDs
npm run figma:fetch:nodes -- --fileKey <FILE_KEY> --ids 1:2,3:4
```

#### 2. Card Component Extraction (via extract-figma-cards.js)
Extracts specific card components and generates JSON specs to `figma-extract/`:
```bash
# Requires FIGMA_TOKEN environment variable
FIGMA_TOKEN=your_token node scripts/extract-figma-cards.js
# Or use the package.json script:
npm run extract-figma
```

**Note:** The two workflows use different scripts (`scripts/figma-fetch.js` vs `scripts/extract-figma-cards.js`) and different environment variable names (`FIGMA_PERSONAL_ACCESS_TOKEN` vs `FIGMA_TOKEN`). The card extraction script has hardcoded node IDs (21:5359, 21:5360) for specific card components.

## Architecture

### Design Token System

All styling is based on design tokens defined in `src/styles/global.css`. This file contains:

- **Typography tokens**: Font families, sizes (rem and px), weights, and styles for all text variants (xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl, 8xl, 9xl) in multiple weights (regular, medium, semi-bold, bold, extra-bold, black)
- **Color tokens**: Semantic color mappings (primary, secondary, tertiary, etc.) with variants (solid, border, text, bg, hover, pressed, disabled)
- **Spacing tokens**: Consistent spacing scale (from spacing/1 to spacing/32)
- **Effect tokens**: Drop shadows, elevations, and other visual effects
- **Utility classes**: Pre-built classes matching the token system (e.g., `.text-4xl-bold`, `.text-base-semi-bold`, `.text-xs-regular`)

**When modifying components:**
- ALWAYS use design tokens (CSS variables) instead of hardcoded values
- ALWAYS use typography utility classes from global.css for text styling
- Example: Use `.text-4xl-bold` instead of manual `font-size: 36px; font-weight: 700;`

### Component Structure

Components are organized into two categories:

**Base Components** (`src/components/`):
- `button.html` - Button component
- `category-icon.html` - Category icon with blend mode support
- `header.html` - Page header
- `icon-button.html` - Icon-only button
- `nav-item.html` - Navigation item
- `navbar.html` - Navigation bar
- `progress-bar.html` - Progress bar component

**Card Components** (`src/components/card/`):
All card components extracted from Figma with consistent structure:
- `advisor.html` - Advisor recommendation card
- `balance-chart.html` - Balance pie chart visualization
- `budget.html` - Budget summary card with progress
- `chart-double.html` - Dual chart display
- `chart-legend.html` - Chart legend component
- `goals.html` - Financial goals tracking
- `info-item.html` - Reusable info card with optional icon
- `insight.html` - Insights and recommendations
- `subscription.html` - Subscription tracking
- `transaction-horizontal.html` - Horizontal transaction layout
- `transaction-vertical.html` - Vertical transaction layout
- `cards.css` - Shared styles for all card components

### Component Guidelines

**HTML Structure:**
- Each component is a self-contained HTML file with inline `<style>` tags
- Import Figtree font from Google Fonts in every component
- Link to `../../styles/global.css` for design tokens
- Use Lucide icons via UMD CDN: `<script src="https://unpkg.com/lucide@latest"></script>`
- Initialize icons with `lucide.createIcons()` at end of file

**Styling Conventions:**
- Use design tokens for all colors, spacing, typography
- Card components use `drop-shadow-drop-shadow` or `drop-shadow-md`
- Icons use 2px stroke width consistently
- Progress bars are 16px height with borders and drop shadows
- All card components have rounded corners (typically 16px)

**Category Icons:**
- Use blend mode with `mix-blend-mode: plus-darker` with multiply fallback
- Enforce SVG stroke inheritance via `svg * { stroke: inherit }`
- Icons are 18×18 with 30×30 circle containers
- Each category has specific color mapping (see `category-icon.html`)

### Page Structure

Main pages (`index.html`, `advisor.html`, `budget.html`, `transactions.html`) are full dashboard views that compose components together. These pages were likely generated from Figma and have more complex, nested HTML structures.

### Figma Data

- `tokens.json` - Design tokens exported from Figma (very large file, 49k+ tokens)
- `figma-export/` - Contains CSS output from Figma exports
- `figma-extract/` - Contains JSON specs from card extraction script (gitignored)

## Important Notes

- This is a static HTML/CSS project with no build step or framework
- All JavaScript is minimal - primarily for Lucide icon initialization
- Components reference design tokens but maintain local styles for component-specific properties
- The codebase uses Figtree font family consistently across all components
- Recent commits show a pattern of Figma extraction → component creation → design token alignment
