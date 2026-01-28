import { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import StaticMap from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import ControlPanel from './ControlPanel';
import InfoBox from './InfoBox';
import { theme } from './theme';

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

type Connection = {
  end_id: number;
  weight: number;
};

interface Metadata {
  id: number;
  lon: number;
  lat: number;
  depth: string;
  disease: number;
  rest: number;
  aqc: number;
  pop: number;
}

interface FeatureProperties {
  id: number;
}

interface Feature {
  type: 'Feature';
  properties: FeatureProperties;
  geometry: any; // GeoJSON geometry
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

function App() {
  const [selectedDepths, setSelectedDepths] = useState<string[]>(['05m']);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['00d-07d']);
  const [feature, setFeature] = useState<FeatureCollection | null>(null);
  const [metadata, setMetadata] = useState<Record<number, Metadata> | null>(null);

  // TODO: Consolidate state management into single reducer or state object
  // Current fragmented state should be refactored for better maintainability
  
  const [isAQCHighlighted, setAQC] = useState<boolean>(true);
  const [isRestHighlighted, setRest] = useState<boolean>(true);
  const [isDiseaseHighlighted, setDisease] = useState<boolean>(true);
  
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [clickIds, setClickIds] = useState<number[]>([]);
  const [tooltip, setTooltip] = useState<{x: number; y: number; content: string} | null>(null);

  //fetch geojson features for display
  useEffect(() => {
    fetch(`api/feature`)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        const geojson = data.type === 'FeatureCollection'
          ? data
          : { type: 'FeatureCollection', features: [data] };
        setFeature(geojson);
      })
      .catch(console.error);
    
    fetch(`api/metadata`)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        setMetadata(data);
      })
      .catch(console.error);  
  }, []);
  
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const initialViewState = {
    longitude: 1,
    latitude: 55.0,
    zoom: 5,
    pitch: 45,
    bearing: 0
  };

  const [connections, setConnections] = useState<Connection[]>([]);

  // Fetch connectivity whenever (clickId, selectedTime, selectedDepth) change
  useEffect(() => {
    if (clickIds?.length) {

      // TODO: Add request timeout (10s) for better UX
      const ctrl = new AbortController();
      const fetchURL = `api/connectivity?depth=${selectedDepths.join(',')}&time_range=${selectedTimes.join(',')}&start_id=${clickIds.join(',')}&op=mean`;
      console.log("Trying to fetch: ", fetchURL);
    
      (async () => {
        try {
          const res = await fetch(fetchURL, { signal: ctrl.signal });
          if (!res.ok) throw new Error(res.statusText);
          const data: Connection[] = await res.json();
          setConnections(data);
        } catch (e: any) {
          if (e.name !== 'AbortError') console.error('Fetch error:', e);
        }
      })();
    return () => ctrl.abort();
    }
    setConnections([]);
  }, [clickIds, selectedTimes, selectedDepths]);

  const clearHex = () => {
    setClickIds([]);
    setConnections([]);
  }

  // Derive weights from the latest connections; new Map reference whenever connections changes
  const weightMap = useMemo(
    () => new Map<number, number>(connections.map(c => [c.end_id, c.weight])),
    [connections]
  );


  const layers = feature
    ? [
        new GeoJsonLayer({
          id: 'geojson-layer',
          data: feature,
          filled: true,
          stroked: true,
          pickable: true,
          lineWidthMinPixels: 3,
          extruded: true,

          updateTriggers: {
            getFillColor: [hoveredId, weightMap, clickIds, isAQCHighlighted, isRestHighlighted, isDiseaseHighlighted],
            getLineColor: [clickIds, isAQCHighlighted, isRestHighlighted, isDiseaseHighlighted],
            getLineWidth: [clickIds, isAQCHighlighted, isRestHighlighted, isDiseaseHighlighted],
            getElevation: [weightMap, clickIds, isAQCHighlighted, isRestHighlighted, isDiseaseHighlighted]
          },

          getElevation: (d: any) => {
            const id = d.properties.id;
            const data = metadata?.[id];

            // Highlighted hexes get base elevation
            const isHighlighted = data && (
              (isAQCHighlighted && data.aqc > 0) ||
              (isRestHighlighted && data.rest > 0) ||
              (isDiseaseHighlighted && data.disease > 0)
            ) || clickIds.includes(id);

            const baseElevation = isHighlighted ? theme.elevation.highlighted : theme.elevation.default;

            const w = weightMap.get(id);
            return w !== undefined ? theme.elevation.getElevation(w) + baseElevation : baseElevation;
          },

          getFillColor: (d: any) => {
            const id: number = d.properties.id;

            if (id === hoveredId) return theme.hex.hovered;

            // Check for highlights - highlight colors take priority over selected
            const data = metadata?.[id];
            if (data) {
              const highlightColors: number[][] = [];
              if (isAQCHighlighted && data.aqc > 0) {
                highlightColors.push([...theme.highlight.aquaculture]);
              }
              if (isRestHighlighted && data.rest > 0) {
                highlightColors.push([...theme.highlight.restoration]);
              }
              if (isDiseaseHighlighted && data.disease > 0) {
                highlightColors.push([...theme.highlight.disease]);
              }
              // Use highlight colors if any, otherwise use selected color
              if (highlightColors.length > 0) {
                return highlightColors[0].map((_, i) =>
                  Math.round(highlightColors.reduce((sum, c) => sum + c[i], 0) / highlightColors.length)
                ) as [number, number, number, number];
              }
            }
            // Selected color only if no highlight colors apply
            if (clickIds.includes(id)) {
              return [...theme.highlight.selected] as [number, number, number, number];
            }

            const w = weightMap.get(id);
            if (w !== undefined) {
              return theme.hex.getWeightColor(w);
            }
            return theme.hex.default;
          },

          getLineColor: (d: any) => {
            const id = d.properties.id;
            // Selected hexes always get orange outline (top indicator)
            if (clickIds.includes(id)) {
              return [...theme.highlight.selected];
            }
            if (!metadata) return theme.stroke.noMetadata;
            const data = metadata[id];
            if (!data) return theme.stroke.noMetadata;

            const highlightColors: number[][] = [];

            if (isAQCHighlighted && data.aqc > 0) {
              highlightColors.push([...theme.highlight.aquaculture]);
            }
            if (isRestHighlighted && data.rest > 0) {
              highlightColors.push([...theme.highlight.restoration]);
            }
            if (isDiseaseHighlighted && data.disease > 0) {
              highlightColors.push([...theme.highlight.disease]);
            }

            if (highlightColors.length > 0) {
              return highlightColors[0].map((_, i) =>
                Math.round(highlightColors.reduce((sum, c) => sum + c[i], 0) / highlightColors.length)
              );
            }
            return theme.stroke.default;
          },

          getLineWidth: (d: any) => {
            const id = d.properties.id;
            if (!metadata) return 1;
            const data = metadata[id];
            if (!data) return 1;

            const isHighlighted =
              (isAQCHighlighted && data.aqc > 0) ||
              (isRestHighlighted && data.rest > 0) ||
              (isDiseaseHighlighted && data.disease > 0) ||
              clickIds.includes(id);

            return isHighlighted ? 5 : 1;
          },

          onHover: (info: any) => {
            setHoveredId(info.object ? info.object.properties.id : null);

            if (info.object) {
              if (!metadata) return;

              // Helper function to escape HTML
              const escapeHtml = (str: string | number) =>
                String(str)
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;');

              const data = metadata[info.object.properties.id];
              if (!data) return;
              setHoveredId(info.object.properties.id);
              setTooltip({
                x: info.x,
                y: info.y,
                content: `Id: ${escapeHtml(data.id)}
                  lon: ${escapeHtml(data.lon)}
                  lat: ${escapeHtml(data.lat)}
                  Depth: ${escapeHtml(data.depth)}
                  Disease: ${escapeHtml(data.disease)}
                  rest: ${escapeHtml(data.rest)}
                  aqc: ${escapeHtml(data.aqc)}
                  pop: ${escapeHtml(data.pop)}`,
              });
            } else {
              setHoveredId(null);
              setTooltip(null);
            }
          },

          onClick: (info: any) => {
            if (!info.object) return;
            if (clickIds.indexOf(info.object.properties.id) === -1) {
              setClickIds([...clickIds, info.object.properties.id]);
            }
            else {
              setClickIds(prev => prev.filter(x => x !== info.object.properties.id));
            }
          }
        })
      ]
    : [];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <DeckGL
        initialViewState={initialViewState}
        controller
        layers={layers}
        style={{ position: 'absolute', top: '0px', left: '0px', width: '100vw', height: '100vh', overscrollBehavior: 'none', }}
      >
        <StaticMap reuseMaps mapLib={maplibregl as any} mapStyle={MAP_STYLE} />
      </DeckGL>

      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1,
          background: theme.ui.controlPanel.background,
          padding: '8px',
          borderRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          color: theme.ui.controlPanel.text
        }}
      >
        <ControlPanel
          selectedDepths={selectedDepths}
          onDepthChange={setSelectedDepths}
          selectedTimes={selectedTimes}
          onTimeChange={setSelectedTimes}
          clearHex={clearHex}
          isAQCHighlighted={isAQCHighlighted}
          onAQCChange={setAQC}
          isRestHighlighted={isRestHighlighted}
          onRestChange={setRest}
          isDiseaseHighlighted={isDiseaseHighlighted}
          onDiseaseChange={setDisease}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          zIndex: 1,
          background: theme.ui.infoBox.background,
          padding: '8px',
          borderRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          color: theme.ui.infoBox.text
        }}
      >
        <InfoBox />
      </div>

    {tooltip && (
      <div
        style={{
          position: "absolute",
          left: tooltip.x + 10,
          top: tooltip.y + 10,
          zIndex: 2,
          pointerEvents: "none",
          background: theme.ui.tooltip.background,
          color: theme.ui.tooltip.text,
          padding: "6px 8px",
          borderRadius: "4px",
          fontSize: 12,
          maxWidth: 280,
          boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
          whiteSpace: "pre-line",
          overscrollBehavior: 'none',
        }}
      >
        {tooltip.content}
      </div>
    )}
    </div>
  );
}

export default App;

