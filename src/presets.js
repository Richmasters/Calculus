/**
 * Preset library. Each entry is a sparse patch over the defaults, so presets
 * stay readable and keep working when new parameters are added.
 */
export const PRESETS = [
  {
    id: 'neutral',
    name: 'Neutral',
    category: 'Basics',
    blurb: 'Factory settings — a light oil treatment to build from.',
    params: {}
  },
  {
    id: 'classic-oil',
    name: 'Classic Oil',
    category: 'Oils',
    blurb: 'Loaded bristle brush on canvas, thick and buttery.',
    params: {
      contrast: 0.08, vibrance: 0.18, clarity: 0.15,
      smoothRadius: 6, smoothPasses: 2, detailReturn: 0.15,
      brushSize: 18, brushLayers: 3, brushLength: 3.2, brushCurvature: 0.85,
      brushBristles: 4, brushOpacity: 0.92, brushColorJitter: 0.2, brushTaper: 0.35,
      brushDetailThreshold: 0.2, brushDensity: 1.05,
      surfaceType: 'canvas', surfaceStrength: 0.38, impasto: 0.5,
      vignette: 0.16, grain: 0.06, warmth: 0.06
    }
  },
  {
    id: 'impressionist',
    name: 'Impressionist',
    category: 'Oils',
    blurb: 'Broken colour in short, busy dabs — Monet at the pond.',
    params: {
      exposure: 0.05, vibrance: 0.35, saturation: 0.1, clarity: 0.1,
      smoothRadius: 5, smoothPasses: 2, detailReturn: 0.1,
      brushShape: 'dab', brushSize: 11, brushLayers: 3, brushLength: 1.6,
      brushCurvature: 0.7, brushAngleJitter: 0.35, brushDensity: 1.5,
      brushScatter: 1.1, brushOpacity: 0.8, brushColorJitter: 0.42,
      brushBristles: 2, brushTaper: 0.5, brushDetailThreshold: 0.16,
      underpaint: 0.85,
      surfaceType: 'canvas', surfaceStrength: 0.42, impasto: 0.45,
      bloom: 0.12, vignette: 0.14, grain: 0.08, warmth: 0.1
    }
  },
  {
    id: 'swirl',
    name: 'Starry Swirl',
    category: 'Oils',
    blurb: 'Long ropes of paint that spiral around every form.',
    params: {
      contrast: 0.14, saturation: 0.22, vibrance: 0.3, clarity: 0.25,
      smoothRadius: 7, smoothPasses: 2, smoothCrisp: 6, detailReturn: 0.08,
      brushSize: 13, brushLayers: 3, brushLength: 9, brushCurvature: 1,
      brushAngleJitter: 0.06, brushDensity: 1.4, brushScatter: 0.9,
      brushOpacity: 0.95, brushColorJitter: 0.26, brushBristles: 3,
      brushTaper: 0.55, brushEdgeAware: 0.55, brushDetailThreshold: 0.18,
      surfaceType: 'canvas', surfaceStrength: 0.3, impasto: 0.85, lightAngle: 120,
      vignette: 0.2, grain: 0.05
    }
  },
  {
    id: 'palette-knife',
    name: 'Palette Knife',
    category: 'Oils',
    blurb: 'Wide flat slabs of colour, edges left hard.',
    params: {
      contrast: 0.12, vibrance: 0.2,
      smoothRadius: 8, smoothPasses: 3, smoothCrisp: 12, posterize: 0.25,
      brushShape: 'flat', brushSize: 30, brushLayers: 3, brushSizeFalloff: 0.45,
      brushLength: 1.8, brushCurvature: 0.35, brushAngleJitter: 0.2,
      brushDensity: 0.9, brushScatter: 0.7, brushOpacity: 1,
      brushColorJitter: 0.12, brushBristles: 1, brushTaper: 0,
      brushEdgeAware: 0.85, brushDetailThreshold: 0.26,
      surfaceType: 'linen', surfaceStrength: 0.28, impasto: 0.8, lightAngle: 145,
      vignette: 0.14, grain: 0.04
    }
  },
  {
    id: 'acrylic-pop',
    name: 'Acrylic Pop',
    category: 'Oils',
    blurb: 'Bold, flat, high-key colour with crisp shapes.',
    params: {
      contrast: 0.2, saturation: 0.35, vibrance: 0.25, clarity: 0.2,
      smoothRadius: 7, smoothPasses: 3, smoothCrisp: 12,
      paletteSize: 14, paletteStrength: 0.8, posterize: 0.2,
      brushSize: 20, brushLayers: 3, brushLength: 2.2, brushCurvature: 0.6,
      brushOpacity: 1, brushColorJitter: 0.08, brushBristles: 2, brushTaper: 0.15,
      brushDetailThreshold: 0.24,
      inkStrength: 0.28, inkThreshold: 0.42, inkWidth: 1.4, inkColor: '#20161d',
      surfaceType: 'canvas', surfaceStrength: 0.22, impasto: 0.3,
      vignette: 0.1, grain: 0.03, finalContrast: 0.08
    }
  },
  {
    id: 'watercolour',
    name: 'Watercolour',
    category: 'Water-based',
    blurb: 'Transparent washes on cold-press paper, pigment pooling at the edges.',
    params: {
      exposure: 0.14, contrast: -0.1, highlights: 0.18, saturation: 0.05, vibrance: 0.25,
      smoothRadius: 8, smoothPasses: 2, smoothCrisp: 5, detailReturn: 0.12,
      paletteSize: 16, paletteStrength: 0.55,
      brushSize: 22, brushLayers: 3, brushSizeFalloff: 0.5, brushLength: 3.4,
      brushCurvature: 0.9, brushDensity: 1.15, brushScatter: 1.2,
      brushOpacity: 0.34, brushColorJitter: 0.22, brushBristles: 2, brushTaper: 0.6,
      brushEdgeAware: 0.55, brushDetailThreshold: 0.14, underpaint: 0.28,
      edgeDarkening: 0.65, inkThreshold: 0.28,
      paperColor: '#fbf8f1', surfaceType: 'paper', surfaceScale: 1.2,
      surfaceStrength: 0.32, impasto: 0,
      bloom: 0.1, vignette: 0.06, grain: 0.05, warmth: 0.05
    }
  },
  {
    id: 'ink-wash',
    name: 'Ink & Wash',
    category: 'Water-based',
    blurb: 'Sumi-e restraint: a few grey washes and a confident black line.',
    params: {
      exposure: 0.24, contrast: 0.3, saturation: -0.88, highlights: 0.34, shadows: -0.08,
      smoothRadius: 10, smoothPasses: 3, posterize: 0.45,
      brushSize: 28, brushLayers: 2, brushLength: 4.5, brushCurvature: 0.95,
      brushOpacity: 0.28, brushColorJitter: 0.1, brushBristles: 2, brushTaper: 0.75,
      brushDetailThreshold: 0.24, underpaint: 0.12,
      inkStrength: 0.85, inkThreshold: 0.4, inkWidth: 1.6, inkSoftness: 0.2,
      inkColor: '#14120f', edgeDarkening: 0.3,
      paperColor: '#f8f5ea', surfaceType: 'paper', surfaceStrength: 0.3, impasto: 0,
      vignette: 0.06, grain: 0.06, finalContrast: 0.08
    }
  },
  {
    id: 'gouache',
    name: 'Gouache',
    category: 'Water-based',
    blurb: 'Matte, opaque, poster-flat colour.',
    params: {
      contrast: 0.1, saturation: 0.12, vibrance: 0.2,
      smoothRadius: 8, smoothPasses: 3, smoothCrisp: 11,
      posterize: 0.4, paletteSize: 12, paletteStrength: 0.7,
      brushShape: 'flat', brushSize: 17, brushLayers: 3, brushLength: 2,
      brushCurvature: 0.5, brushOpacity: 1, brushColorJitter: 0.07,
      brushBristles: 1, brushTaper: 0.1, brushDetailThreshold: 0.22,
      paperColor: '#efe9dc', surfaceType: 'paper', surfaceStrength: 0.3, impasto: 0.12,
      vignette: 0.1, grain: 0.05
    }
  },
  {
    id: 'pastel',
    name: 'Soft Pastel',
    category: 'Dry media',
    blurb: 'Chalk dragged over toothy paper, colours smudging into each other.',
    params: {
      exposure: 0.08, contrast: -0.06, saturation: 0.08, vibrance: 0.3,
      smoothRadius: 6, smoothPasses: 2, detailReturn: 0.08,
      brushSize: 14, brushLayers: 3, brushLength: 2.6, brushCurvature: 0.8,
      brushAngleJitter: 0.25, brushDensity: 1.5, brushScatter: 1,
      brushOpacity: 0.45, brushColorJitter: 0.34, brushBristles: 5,
      brushTaper: 0.5, brushDetailThreshold: 0.15, underpaint: 0.55,
      paperColor: '#efe6d6', surfaceType: 'rough', surfaceScale: 0.7,
      surfaceStrength: 0.6, impasto: 0.15,
      vignette: 0.1, grain: 0.16, warmth: 0.08
    }
  },
  {
    id: 'charcoal',
    name: 'Charcoal Sketch',
    category: 'Dry media',
    blurb: 'Smudged black and white with a heavy contour line.',
    params: {
      contrast: 0.3, saturation: -1, highlights: 0.12, shadows: -0.1, clarity: 0.3,
      smoothRadius: 5, smoothPasses: 2, posterize: 0.2,
      brushSize: 12, brushLayers: 3, brushLength: 3.5, brushCurvature: 0.9,
      brushAngleJitter: 0.2, brushOpacity: 0.4, brushColorJitter: 0.12,
      brushBristles: 5, brushTaper: 0.6, brushDetailThreshold: 0.18, underpaint: 0.45,
      inkStrength: 0.7, inkThreshold: 0.3, inkWidth: 1, inkColor: '#171717',
      paperColor: '#f0ece2', surfaceType: 'rough', surfaceStrength: 0.5, impasto: 0.05,
      vignette: 0.18, grain: 0.18
    }
  },
  {
    id: 'pointillism',
    name: 'Pointillism',
    category: 'Dry media',
    blurb: 'Thousands of separate dots that mix in the eye, not on the palette.',
    params: {
      exposure: 0.06, saturation: 0.25, vibrance: 0.4,
      smoothRadius: 4, smoothPasses: 2,
      brushShape: 'dot', brushSize: 11, brushLayers: 2, brushSizeFalloff: 0.7,
      brushDensity: 1.8, brushScatter: 1.15, brushOpacity: 0.88,
      brushColorJitter: 0.45, brushDetailThreshold: 0.12, underpaint: 0.15,
      paperColor: '#f7f2e7', surfaceType: 'canvas', surfaceStrength: 0.3, impasto: 0.2,
      vignette: 0.12, grain: 0.05
    }
  },
  {
    id: 'cel',
    name: 'Cel Shade',
    category: 'Graphic',
    blurb: 'Animation cel: flat colour fills and a clean ink outline.',
    params: {
      contrast: 0.16, saturation: 0.28, vibrance: 0.2,
      smoothRadius: 9, smoothPasses: 3, smoothCrisp: 14, detailReturn: 0,
      paletteSize: 10, paletteStrength: 0.95, posterize: 0.3,
      brushEnabled: false,
      inkStrength: 0.9, inkThreshold: 0.34, inkWidth: 1.1, inkSoftness: 0.12,
      inkColor: '#191319',
      surfaceType: 'none', surfaceStrength: 0, impasto: 0,
      vignette: 0.06, grain: 0.02
    }
  },
  {
    id: 'fauvist',
    name: 'Fauvist',
    category: 'Graphic',
    blurb: 'Wild, unnatural colour laid on in confident blocks.',
    params: {
      contrast: 0.18, saturation: 0.6, vibrance: 0.4, hueRotate: 12,
      smoothRadius: 8, smoothPasses: 3, smoothCrisp: 10,
      paletteSize: 8, paletteStrength: 0.75,
      brushSize: 22, brushLayers: 2, brushLength: 2.4, brushCurvature: 0.6,
      brushOpacity: 0.95, brushColorJitter: 0.4, brushBristles: 2,
      brushTaper: 0.2, brushDetailThreshold: 0.24,
      inkStrength: 0.35, inkThreshold: 0.45, inkWidth: 1.8, inkColor: '#2a1030',
      surfaceType: 'canvas', surfaceStrength: 0.3, impasto: 0.35,
      vignette: 0.12, grain: 0.05, finalContrast: 0.1
    }
  },
  {
    id: 'fresco',
    name: 'Aged Fresco',
    category: 'Graphic',
    blurb: 'Chalky, sun-faded pigment on a rough plaster wall.',
    params: {
      exposure: 0.1, contrast: -0.14, saturation: -0.3, warmth: 0.35,
      highlights: 0.1, shadows: 0.15,
      smoothRadius: 7, smoothPasses: 3, posterize: 0.22,
      brushSize: 19, brushLayers: 2, brushLength: 2.2, brushCurvature: 0.55,
      brushOpacity: 0.6, brushColorJitter: 0.24, brushBristles: 4,
      brushTaper: 0.3, brushDetailThreshold: 0.2, underpaint: 0.7,
      paperColor: '#e8dfcb', surfaceType: 'rough', surfaceScale: 1.5,
      surfaceStrength: 0.55, impasto: 0.2,
      vignette: 0.24, grain: 0.2, finalContrast: -0.05
    }
  },
  {
    id: 'dry-brush',
    name: 'Dry Brush',
    category: 'Dry media',
    blurb: 'A barely-loaded brush skipping across the weave.',
    params: {
      contrast: 0.14, clarity: 0.25, vibrance: 0.15,
      smoothRadius: 5, smoothPasses: 2, detailReturn: 0.2,
      brushSize: 16, brushLayers: 3, brushLength: 4.5, brushCurvature: 0.8,
      brushDensity: 1.3, brushOpacity: 0.4, brushColorJitter: 0.2,
      brushBristles: 7, brushTaper: 0.7, brushEdgeAware: 0.6,
      brushDetailThreshold: 0.16, underpaint: 0.5,
      paperColor: '#eee7d8', surfaceType: 'linen', surfaceStrength: 0.55, impasto: 0.25,
      vignette: 0.14, grain: 0.1
    }
  }
];

export const PRESET_CATEGORIES = [...new Set(PRESETS.map((p) => p.category))];

export function findPreset(id) {
  return PRESETS.find((p) => p.id === id);
}
