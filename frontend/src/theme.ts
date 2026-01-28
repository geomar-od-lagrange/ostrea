// Central color theme for OSTREA dashboard
// Edit this file to customize the look and feel

type RGBA = [number, number, number, number];

// Hex color to RGBA conversion
function hexToRgba(hex: string, alpha: number = 255): RGBA {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0, alpha];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
    alpha,
  ];
}

// Relative concentration color scale (white to dark purple)
const REL_CONC_SCALE = [
  '#ffffff',
  '#feedb0',
  '#f29567',
  '#ce4356',
  '#821c63',
  '#2f0f3e',
];

// Interpolate between colors in the scale based on weight (0-1)
function interpolateColor(weight: number): RGBA {
  const clampedWeight = Math.max(0, Math.min(1, weight));
  const scalePosition = clampedWeight * (REL_CONC_SCALE.length - 1);
  const lowerIndex = Math.floor(scalePosition);
  const upperIndex = Math.min(lowerIndex + 1, REL_CONC_SCALE.length - 1);
  const t = scalePosition - lowerIndex;

  const lower = hexToRgba(REL_CONC_SCALE[lowerIndex]);
  const upper = hexToRgba(REL_CONC_SCALE[upperIndex]);

  return [
    Math.round(lower[0] + (upper[0] - lower[0]) * t),
    Math.round(lower[1] + (upper[1] - lower[1]) * t),
    Math.round(lower[2] + (upper[2] - lower[2]) * t),
    255,
  ];
}

// Export theme colors
export const theme = {
  // Hex fill colors
  hex: {
    hovered: [255, 255, 0, 255] as RGBA,
    default: [200, 200, 200, 80] as RGBA,
    getWeightColor: interpolateColor,
  },

  // Hex stroke/line colors
  stroke: {
    default: [100, 100, 100, 60] as RGBA,
    noMetadata: [128, 128, 128, 100] as RGBA,
    aquaculture: [255, 255, 0, 255] as RGBA,      // yellow
    restoration: [64, 224, 208, 255] as RGBA,    // turquoise
    disease: [255, 0, 0, 255] as RGBA,           // red
    selected: [255, 128, 0, 255] as RGBA,        // orange
  },

  // UI panel colors
  ui: {
    controlPanel: {
      background: 'rgba(0,0,0,0.9)',
      text: '#fff',
    },
    infoBox: {
      background: 'rgba(220,220,220,0.95)',
      text: '#333',
    },
    tooltip: {
      background: 'rgba(0,0,0,0.75)',
      text: '#fff',
    },
  },

  // Color scale for reference (e.g., for color bar)
  colorScale: REL_CONC_SCALE,
};
