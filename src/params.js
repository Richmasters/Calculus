/**
 * Single source of truth for every adjustable value.
 *
 * The control panel, the preset system, save/load and URL sharing are all
 * generated from this schema, so adding a knob here is the only step needed
 * to expose it everywhere.
 */
export const PARAM_GROUPS = [
  {
    id: 'photo',
    label: 'Photo',
    hint: 'Grade the source before any paint is applied.',
    params: [
      { key: 'exposure', label: 'Exposure', min: -1, max: 1, step: 0.01, def: 0 },
      { key: 'contrast', label: 'Contrast', min: -1, max: 1, step: 0.01, def: 0 },
      { key: 'highlights', label: 'Highlights', min: -1, max: 1, step: 0.01, def: 0 },
      { key: 'shadows', label: 'Shadows', min: -1, max: 1, step: 0.01, def: 0 },
      { key: 'saturation', label: 'Saturation', min: -1, max: 1, step: 0.01, def: 0 },
      { key: 'vibrance', label: 'Vibrance', min: -1, max: 1, step: 0.01, def: 0 },
      { key: 'temperature', label: 'Temperature', min: -1, max: 1, step: 0.01, def: 0 },
      { key: 'tint', label: 'Tint', min: -1, max: 1, step: 0.01, def: 0 },
      { key: 'clarity', label: 'Clarity', min: -1, max: 1, step: 0.01, def: 0,
        hint: 'Local contrast lift before abstraction.' }
    ]
  },
  {
    id: 'abstraction',
    label: 'Abstraction',
    hint: 'Flatten photographic detail into paintable masses.',
    params: [
      { key: 'smoothRadius', label: 'Simplify', min: 0, max: 16, step: 1, def: 5,
        hint: 'Edge-preserving Kuwahara radius. The single most important dial.' },
      { key: 'smoothPasses', label: 'Passes', min: 1, max: 4, step: 1, def: 2 },
      { key: 'smoothCrisp', label: 'Region crispness', min: 1, max: 16, step: 0.5, def: 8 },
      { key: 'simplifyMix', label: 'Simplify amount', min: 0, max: 1, step: 0.01, def: 1 },
      { key: 'detailReturn', label: 'Detail return', min: 0, max: 1, step: 0.01, def: 0.12,
        hint: 'Adds fine photographic detail back over the flattened image.' }
    ]
  },
  {
    id: 'palette',
    label: 'Colour',
    hint: 'Mix from a limited set of tubes.',
    params: [
      { key: 'hueRotate', label: 'Hue shift', min: -180, max: 180, step: 1, def: 0, unit: '°' },
      { key: 'posterize', label: 'Posterise', min: 0, max: 1, step: 0.01, def: 0 },
      { key: 'paletteSize', label: 'Palette colours', min: 0, max: 32, step: 1, def: 0,
        hint: '0 keeps the full range; 6–14 gives a painter’s limited palette.' },
      { key: 'paletteStrength', label: 'Palette strength', min: 0, max: 1, step: 0.01, def: 0.85 }
    ]
  },
  {
    id: 'brush',
    label: 'Brush',
    hint: 'How the paint is actually laid down.',
    params: [
      { key: 'brushEnabled', label: 'Brush strokes', type: 'toggle', def: true },
      { key: 'brushShape', label: 'Shape', type: 'select', def: 'round',
        options: [
          { value: 'round', label: 'Round bristle' },
          { value: 'flat', label: 'Flat / knife' },
          { value: 'dab', label: 'Short dab' },
          { value: 'dot', label: 'Dot (pointillist)' }
        ] },
      { key: 'brushLayers', label: 'Layers', min: 1, max: 5, step: 1, def: 3,
        hint: 'Coarse-to-fine passes. Later passes only refine where needed.' },
      { key: 'brushSize', label: 'Brush size', min: 2, max: 64, step: 0.5, def: 16 },
      { key: 'brushSizeFalloff', label: 'Layer falloff', min: 0.3, max: 0.9, step: 0.01, def: 0.5 },
      { key: 'brushLength', label: 'Stroke length', min: 0.5, max: 12, step: 0.1, def: 3 },
      { key: 'brushCurvature', label: 'Follow contours', min: 0, max: 1, step: 0.01, def: 0.85 },
      { key: 'brushAngleFixed', label: 'Base angle', min: 0, max: 360, step: 1, def: 45, unit: '°',
        hint: 'Direction used where the image has no strong structure.' },
      { key: 'brushAngleJitter', label: 'Angle jitter', min: 0, max: 1, step: 0.01, def: 0.12 },
      { key: 'brushDensity', label: 'Density', min: 0.2, max: 3, step: 0.01, def: 1 },
      { key: 'brushScatter', label: 'Scatter', min: 0, max: 1.5, step: 0.01, def: 0.8 },
      { key: 'brushOpacity', label: 'Opacity', min: 0.05, max: 1, step: 0.01, def: 0.9 },
      { key: 'brushColorJitter', label: 'Colour variation', min: 0, max: 1, step: 0.01, def: 0.18 },
      { key: 'brushBristles', label: 'Bristles', min: 1, max: 8, step: 1, def: 3 },
      { key: 'brushTaper', label: 'Taper', min: 0, max: 1, step: 0.01, def: 0.3 },
      { key: 'brushEdgeAware', label: 'Respect edges', min: 0, max: 1, step: 0.01, def: 0.72,
        hint: 'Stops a stroke when it runs into a different colour.' },
      { key: 'brushDetailThreshold', label: 'Refine threshold', min: 0, max: 1, step: 0.01, def: 0.22,
        hint: 'Higher = later layers touch fewer areas, leaving broader strokes.' },
      { key: 'underpaint', label: 'Underpainting', min: 0, max: 1, step: 0.01, def: 1,
        hint: 'Lower values let bare paper show between strokes.' }
    ]
  },
  {
    id: 'ink',
    label: 'Line & edge',
    hint: 'Contour drawing and pigment build-up.',
    params: [
      { key: 'inkStrength', label: 'Outline strength', min: 0, max: 1, step: 0.01, def: 0 },
      { key: 'inkThreshold', label: 'Outline threshold', min: 0, max: 1, step: 0.01, def: 0.35 },
      { key: 'inkWidth', label: 'Outline width', min: 0.4, max: 6, step: 0.1, def: 1.2 },
      { key: 'inkSoftness', label: 'Outline softness', min: 0, max: 1, step: 0.01, def: 0.3 },
      { key: 'inkColor', label: 'Ink colour', type: 'color', def: '#1c1712' },
      { key: 'edgeDarkening', label: 'Pigment edges', min: 0, max: 1, step: 0.01, def: 0,
        hint: 'Watercolour-style darkening where a wash meets a boundary.' }
    ]
  },
  {
    id: 'surface',
    label: 'Surface',
    hint: 'What the paint sits on, and how it catches the light.',
    params: [
      { key: 'paperColor', label: 'Ground colour', type: 'color', def: '#f4efe4' },
      { key: 'surfaceType', label: 'Support', type: 'select', def: 'canvas',
        options: [
          { value: 'none', label: 'Smooth' },
          { value: 'canvas', label: 'Canvas weave' },
          { value: 'linen', label: 'Linen' },
          { value: 'paper', label: 'Cold-press paper' },
          { value: 'rough', label: 'Rough board' }
        ] },
      { key: 'surfaceScale', label: 'Texture scale', min: 0.2, max: 3, step: 0.01, def: 1 },
      { key: 'surfaceStrength', label: 'Texture depth', min: 0, max: 1, step: 0.01, def: 0.35 },
      { key: 'impasto', label: 'Impasto relief', min: 0, max: 1, step: 0.01, def: 0.4,
        hint: 'Lights the paint as if it were physically thick.' },
      { key: 'lightAngle', label: 'Light angle', min: 0, max: 360, step: 1, def: 135, unit: '°' }
    ]
  },
  {
    id: 'finish',
    label: 'Finish',
    hint: 'Varnish, framing and final grade.',
    params: [
      { key: 'bloom', label: 'Glow', min: 0, max: 1, step: 0.01, def: 0 },
      { key: 'vignette', label: 'Vignette', min: 0, max: 1, step: 0.01, def: 0.12 },
      { key: 'grain', label: 'Grain', min: 0, max: 1, step: 0.01, def: 0.06 },
      { key: 'warmth', label: 'Warmth', min: -1, max: 1, step: 0.01, def: 0 },
      { key: 'finalContrast', label: 'Final contrast', min: -1, max: 1, step: 0.01, def: 0 },
      { key: 'borderWidth', label: 'Border', min: 0, max: 120, step: 1, def: 0, unit: 'px' },
      { key: 'borderColor', label: 'Border colour', type: 'color', def: '#f7f3ea' }
    ]
  }
];

export const PARAM_INDEX = new Map();
for (const group of PARAM_GROUPS) {
  for (const p of group.params) PARAM_INDEX.set(p.key, { ...p, group: group.id });
}

export function defaultParams() {
  const out = { seed: 1 };
  for (const [key, p] of PARAM_INDEX) out[key] = p.def;
  return out;
}

/** Which parameters feed which stage — used for incremental re-rendering. */
export const STAGE_DEPS = {
  adjust: ['exposure', 'contrast', 'highlights', 'shadows', 'saturation', 'vibrance',
    'temperature', 'tint', 'clarity'],
  abstract: ['smoothRadius', 'smoothPasses', 'smoothCrisp', 'simplifyMix', 'detailReturn',
    'hueRotate', 'posterize', 'paletteSize', 'paletteStrength', 'seed'],
  paint: ['brushEnabled', 'brushShape', 'brushLayers', 'brushSize', 'brushSizeFalloff',
    'brushLength', 'brushCurvature', 'brushAngleFixed', 'brushAngleJitter', 'brushDensity',
    'brushScatter', 'brushOpacity', 'brushColorJitter', 'brushBristles', 'brushTaper',
    'brushEdgeAware', 'brushDetailThreshold', 'underpaint', 'paperColor', 'seed'],
  ink: ['inkStrength', 'inkThreshold', 'inkWidth', 'inkSoftness', 'inkColor', 'edgeDarkening'],
  surface: ['surfaceType', 'surfaceScale', 'surfaceStrength', 'impasto', 'lightAngle', 'seed'],
  finish: ['bloom', 'vignette', 'grain', 'warmth', 'finalContrast', 'borderWidth',
    'borderColor', 'seed']
};

export function stageKey(params, stage) {
  return STAGE_DEPS[stage].map((k) => `${k}:${params[k]}`).join('|');
}

/** Clamp/coerce an arbitrary object into a valid parameter set. */
export function sanitize(params) {
  const out = defaultParams();
  for (const [key, spec] of PARAM_INDEX) {
    const v = params?.[key];
    if (v === undefined || v === null) continue;
    if (spec.type === 'toggle') out[key] = Boolean(v);
    else if (spec.type === 'select') {
      out[key] = spec.options.some((o) => o.value === v) ? v : spec.def;
    } else if (spec.type === 'color') {
      out[key] = /^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : spec.def;
    } else {
      const num = Number(v);
      out[key] = Number.isFinite(num) ? Math.min(spec.max, Math.max(spec.min, num)) : spec.def;
    }
  }
  if (Number.isFinite(Number(params?.seed))) out.seed = Number(params.seed);
  return out;
}
