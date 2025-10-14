/**
 * Extract Figma nodes → HTML + CSS
 * Usage: node extract-figma-cards.js <FILE_ID>
 */

import fs from 'fs';
import fetch from 'node-fetch';

// --- CONFIG --- //
const FIGMA_TOKEN = process.env.FIGMA_TOKEN; // store securely in .env
const FILE_ID = process.argv[2] || 'zksBuILVajtp60Oca28Vnl'; // default to our file
const OUTPUT_DIR = './figma-extract';

// Helper: Figma API fetch
async function figmaRequest(endpoint) {
  const res = await fetch(`https://api.figma.com/v1/${endpoint}`, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  });
  if (!res.ok) throw new Error(`Figma API error: ${res.statusText}`);
  return res.json();
}

// Helper: Convert Figma color to CSS
function figmaColorToCSS(figmaColor) {
  if (!figmaColor) return 'transparent';
  const { r, g, b, a = 1 } = figmaColor;
  const alpha = a !== undefined ? a : 1;
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

// Helper: Map Figma colors to design tokens
function mapToDesignToken(color) {
  if (!color) return 'var(--fg-text)';
  
  const { r, g, b } = color;
  const hex = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
  
  // Map common colors to design tokens
  const colorMap = {
    '#ffffff': 'var(--white)',
    '#fcfcfc': 'var(--white)',
    '#030303': 'var(--black)',
    '#6b7280': 'var(--gray-500)',
    '#374151': 'var(--gray-700)',
    '#1f2937': 'var(--gray-800)',
    '#f3f4f6': 'var(--gray-100)',
    '#e5e7eb': 'var(--gray-200)',
    '#3b82f6': 'var(--blue-500)',
    '#1d4ed8': 'var(--blue-700)',
    '#dbeafe': 'var(--blue-100)',
    '#6366f1': 'var(--indigo-500)',
    '#8b5cf6': 'var(--violet-500)',
    '#ec4899': 'var(--pink-500)',
    '#f472b6': 'var(--pink-400)',
    '#fce7f3': 'var(--pink-100)',
  };
  
  return colorMap[hex] || figmaColorToCSS(color);
}

// Helper: Get text style from Figma node
function getTextStyle(node) {
  const style = node.style;
  if (!style) return {};
  
  return {
    fontFamily: style.fontFamily || 'var(--font-family-base)',
    fontSize: style.fontSize ? `${style.fontSize}px` : 'var(--text-base-regular-size-rem)',
    fontWeight: style.fontWeight || '400',
    letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : 'normal',
    lineHeight: style.lineHeightPx ? `${style.lineHeightPx}px` : 'normal',
  };
}

// --- STEP 1: GET SPECIFIC NODE DETAILS --- //
async function getNodeDetails(nodeId) {
  console.log(`Fetching node ${nodeId}...`);
  const data = await figmaRequest(`files/${FILE_ID}/nodes?ids=${nodeId}`);
  return data.nodes[nodeId];
}

// --- STEP 2: EXTRACT CARD SPECIFICATIONS --- //
function extractCardSpecs(node) {
  if (!node || !node.document) return null;
  
  const doc = node.document;
  const specs = {
    id: doc.id,
    name: doc.name,
    type: doc.type,
    dimensions: {
      width: doc.absoluteBoundingBox?.width || 0,
      height: doc.absoluteBoundingBox?.height || 0,
    },
    styles: {
      backgroundColor: null,
      borderRadius: doc.cornerRadius || 0,
      borderWidth: 0,
      borderColor: null,
    },
    children: [],
    text: [],
    colors: new Set(),
    typography: new Set(),
  };

  // Extract background color
  if (doc.fills && doc.fills.length > 0) {
    const fill = doc.fills[0];
    if (fill.type === 'SOLID') {
      specs.styles.backgroundColor = mapToDesignToken(fill.color);
      specs.colors.add(figmaColorToCSS(fill.color));
    }
  }

  // Extract border
  if (doc.strokes && doc.strokes.length > 0) {
    specs.styles.borderWidth = doc.strokeWeight || 1;
    const stroke = doc.strokes[0];
    if (stroke.type === 'SOLID') {
      specs.styles.borderColor = mapToDesignToken(stroke.color);
      specs.colors.add(figmaColorToCSS(stroke.color));
    }
  }

  // Recursively extract child components
  function traverseChildren(node, depth = 0) {
    if (!node || !node.children) return;
    
    node.children.forEach(child => {
      const childSpec = {
        id: child.id,
        name: child.name,
        type: child.type,
        depth,
        dimensions: {
          x: child.absoluteBoundingBox?.x || 0,
          y: child.absoluteBoundingBox?.y || 0,
          width: child.absoluteBoundingBox?.width || 0,
          height: child.absoluteBoundingBox?.height || 0,
        },
        styles: {
          backgroundColor: null,
          borderRadius: child.cornerRadius || 0,
        },
        textContent: null,
        textStyle: null,
      };

      // Extract child background
      if (child.fills && child.fills.length > 0) {
        const fill = child.fills[0];
        if (fill.type === 'SOLID') {
          childSpec.styles.backgroundColor = mapToDesignToken(fill.color);
          specs.colors.add(figmaColorToCSS(fill.color));
        }
      }

      // Extract text content and style
      if (child.type === 'TEXT' && child.characters) {
        childSpec.textContent = child.characters;
        childSpec.textStyle = getTextStyle(child);
        specs.typography.add(JSON.stringify(childSpec.textStyle));
      }

      specs.children.push(childSpec);
      
      // Continue traversing
      traverseChildren(child, depth + 1);
    });
  }

  traverseChildren(doc);

  return specs;
}

// --- STEP 3: GENERATE SPECIFICATION FILE --- //
function generateSpecFile(specs, cardName) {
  const output = {
    cardName,
    extractedAt: new Date().toISOString(),
    specifications: specs,
    designTokens: {
      colors: Array.from(specs.colors),
      typography: Array.from(specs.typography),
    },
    implementation: {
      htmlStructure: generateHTMLStructure(specs),
      cssClasses: generateCSSClasses(specs),
    }
  };

  return output;
}

// Helper: Generate HTML structure
function generateHTMLStructure(specs) {
  const mainClass = specs.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  let html = `<div class="${mainClass}">\n`;
  
  specs.children.forEach(child => {
    const childClass = child.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const indent = '  '.repeat(child.depth + 1);
    
    if (child.textContent) {
      html += `${indent}<span class="${childClass}">${child.textContent}</span>\n`;
    } else {
      html += `${indent}<div class="${childClass}"></div>\n`;
    }
  });
  
  html += '</div>';
  return html;
}

// Helper: Generate CSS classes
function generateCSSClasses(specs) {
  const mainClass = specs.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  let css = `.${mainClass} {\n`;
  css += `  width: ${specs.dimensions.width}px;\n`;
  css += `  height: ${specs.dimensions.height}px;\n`;
  if (specs.styles.backgroundColor) css += `  background-color: ${specs.styles.backgroundColor};\n`;
  if (specs.styles.borderRadius) css += `  border-radius: ${specs.styles.borderRadius}px;\n`;
  if (specs.styles.borderWidth) css += `  border-width: ${specs.styles.borderWidth}px;\n`;
  if (specs.styles.borderColor) css += `  border-color: ${specs.styles.borderColor};\n`;
  css += `}\n\n`;
  
  specs.children.forEach(child => {
    const childClass = child.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    css += `.${mainClass} .${childClass} {\n`;
    css += `  position: absolute;\n`;
    css += `  left: ${child.dimensions.x}px;\n`;
    css += `  top: ${child.dimensions.y}px;\n`;
    css += `  width: ${child.dimensions.width}px;\n`;
    css += `  height: ${child.dimensions.height}px;\n`;
    if (child.styles.backgroundColor) css += `  background-color: ${child.styles.backgroundColor};\n`;
    if (child.styles.borderRadius) css += `  border-radius: ${child.styles.borderRadius}px;\n`;
    if (child.textStyle) {
      Object.entries(child.textStyle).forEach(([prop, value]) => {
        css += `  ${prop}: ${value};\n`;
      });
    }
    css += `}\n\n`;
  });
  
  return css;
}

// --- MAIN EXTRACTION FUNCTION --- //
async function extractCardSpecifications() {
  console.log('🚀 Starting Figma card extraction...');
  
  if (!FIGMA_TOKEN) {
    throw new Error('FIGMA_TOKEN environment variable is required');
  }

  // Target node IDs from the provided URLs
  const nodeIds = [
    '21:5359', // Balance-pie chart
    '21:5360', // All other cards (multiple components on same frame)
  ];

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const allSpecs = [];

  for (const nodeId of nodeIds) {
    try {
      const nodeData = await getNodeDetails(nodeId);
      const specs = extractCardSpecs(nodeData);
      
      if (specs) {
        const cardName = specs.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const specFile = generateSpecFile(specs, cardName);
        
        fs.writeFileSync(
          `${OUTPUT_DIR}/${cardName}-specs.json`,
          JSON.stringify(specFile, null, 2)
        );
        
        console.log(`✅ Extracted ${cardName} (${specs.children.length} children)`);
        allSpecs.push(specFile);
      }
    } catch (error) {
      console.error(`❌ Failed to extract node ${nodeId}:`, error.message);
    }
  }

  // Generate summary file
  fs.writeFileSync(
    `${OUTPUT_DIR}/extraction-summary.json`,
    JSON.stringify({
      extractedAt: new Date().toISOString(),
      fileId: FILE_ID,
      totalCards: allSpecs.length,
      cards: allSpecs.map(spec => ({
        name: spec.cardName,
        children: spec.specifications.children.length,
        colors: spec.designTokens.colors.length,
        typography: spec.designTokens.typography.length,
      }))
    }, null, 2)
  );

  console.log(`\n✨ Extraction complete! ${allSpecs.length} cards extracted to ${OUTPUT_DIR}/`);
  console.log('📋 Review extraction-summary.json for overview');
  
  return allSpecs;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  extractCardSpecifications().catch(err => {
    console.error('💥 Extraction failed:', err);
    process.exit(1);
  });
}

export { extractCardSpecifications };
