// Central color theme for OSTREA dashboard
// Edit this file to customize the look and feel

export type RGBA = [number, number, number, number];

// Hex color to RGBA conversion
export function hexToRgba(hex: string, alpha: number = 255): RGBA {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0, alpha];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
    alpha,
  ];
}

// Color definitions in hex notation
const colors = {
  // Hex fill colors
  hovered: '#ffff00',
  default: '#c8c8c8',
  defaultAlpha: 80,

  // Stroke colors
  strokeDefault: '#505050',
  strokeDefaultAlpha: 180,
  noMetadata: '#808080',
  noMetadataAlpha: 180,

  // Highlight colors (chosen to not interfere with concentration scale)
  aquaculture: '#00c8ff',   // cyan
  restoration: '#00ff64',   // bright green
  disease: '#ff00ff',       // magenta
  selected: '#ff6600',      // orange

  // Relative concentration color scale (white to dark purple)
  concentration: [
    '#ffffff',
    '#feedb0',
    '#f29567',
    '#ce4356',
    '#821c63',
    '#2f0f3e',
  ],

  // UI colors
  controlPanelBg: '#000000',
  controlPanelBgAlpha: 0.9,
  controlPanelText: '#ffffff',
  infoBoxBg: '#dcdcdc',
  infoBoxBgAlpha: 0.95,
  infoBoxText: '#333333',
  tooltipBg: '#000000',
  tooltipBgAlpha: 0.75,
  tooltipText: '#ffffff',
};

// Interpolate between colors in the scale based on weight (0-1)
function interpolateColor(weight: number): RGBA {
  const scale = colors.concentration;
  const clampedWeight = Math.max(0, Math.min(1, weight));
  const scalePosition = clampedWeight * (scale.length - 1);
  const lowerIndex = Math.floor(scalePosition);
  const upperIndex = Math.min(lowerIndex + 1, scale.length - 1);
  const t = scalePosition - lowerIndex;

  const lower = hexToRgba(scale[lowerIndex]);
  const upper = hexToRgba(scale[upperIndex]);

  return [
    Math.round(lower[0] + (upper[0] - lower[0]) * t),
    Math.round(lower[1] + (upper[1] - lower[1]) * t),
    Math.round(lower[2] + (upper[2] - lower[2]) * t),
    255,
  ];
}

// Export theme with both hex values and RGBA accessors for deck.gl
export const theme = {
  // Raw color values (hex notation for IDE preview)
  colors,

  // Hex fill colors (as RGBA for deck.gl)
  hex: {
    hovered: hexToRgba(colors.hovered) as RGBA,
    default: hexToRgba(colors.default, colors.defaultAlpha) as RGBA,
    getWeightColor: interpolateColor,
  },

  // Hex elevation (3D)
  elevation: {
    maxHeight: 50000, // meters
    default: 0,
    highlighted: 15000, // base elevation for highlighted hexes
    getElevation: (weight: number) => weight * 50000,
  },

  // Hex stroke/line colors (as RGBA for deck.gl)
  stroke: {
    default: hexToRgba(colors.strokeDefault, colors.strokeDefaultAlpha) as RGBA,
    noMetadata: hexToRgba(colors.noMetadata, colors.noMetadataAlpha) as RGBA,
  },

  // Highlight colors (as RGBA for deck.gl)
  highlight: {
    aquaculture: hexToRgba(colors.aquaculture) as RGBA,
    restoration: hexToRgba(colors.restoration) as RGBA,
    disease: hexToRgba(colors.disease) as RGBA,
    selected: hexToRgba(colors.selected) as RGBA,
  },

  // UI panel colors (CSS strings)
  ui: {
    controlPanel: {
      background: `rgba(0,0,0,${colors.controlPanelBgAlpha})`,
      text: colors.controlPanelText,
    },
    infoBox: {
      background: `rgba(220,220,220,${colors.infoBoxBgAlpha})`,
      text: colors.infoBoxText,
    },
    tooltip: {
      background: `rgba(0,0,0,${colors.tooltipBgAlpha})`,
      text: colors.tooltipText,
    },
  },

  // Color scale for reference (e.g., for color bar)
  colorScale: colors.concentration,
};
