import { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import StaticMap from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import ControlPanel from './ControlPanel';
import InfoBox from './InfoBox';
import { theme } from './theme';

// Free map styles (no API key required):
// - https://tiles.openfreemap.org/styles/positron (minimal light gray)
// - https://tiles.openfreemap.org/styles/liberty (balanced, clean)
// - https://tiles.openfreemap.org/styles/bright (similar to liberty)
// - https://tiles.openfreemap.org/styles/dark (dark theme)
// - https://demotiles.maplibre.org/style.json (original colorful demo)
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

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

  // Helper: add z-coordinate to all positions in a geometry
  const addZToGeometry = (geometry: any, z: number): any => {
    const addZ = (coords: any): any => {
      if (typeof coords[0] === 'number') {
        // It's a position [lon, lat] or [lon, lat, z]
        return [coords[0], coords[1], z];
      }
      return coords.map(addZ);
    };
    return { ...geometry, coordinates: addZ(geometry.coordinates) };
  };

  // Helper: create feature with z-coordinate
  const featureWithZ = (f: Feature, z: number): Feature => ({
    ...f,
    geometry: addZToGeometry(f.geometry, z),
  });

  // Calculate connectivity height for a hex
  const getConnHeight = (id: number) => {
    const w = weightMap.get(id);
    return w !== undefined ? theme.elevation.getElevation(w) : 0;
  };

  // Common layer properties
  const commonLayerProps = {
    filled: true,
    stroked: true,
    extruded: true,
    wireframe: true,
    getLineColor: theme.stroke.default,
    getLineWidth: 1,
    lineWidthMinPixels: 3,
  };

  // Interaction handlers for base layer
  const interactionHandlers = {
    pickable: true,
    onHover: (info: any) => {
      setHoveredId(info.object ? info.object.properties.id : null);
      if (info.object) {
        if (!metadata) return;
        const escapeHtml = (str: string | number) =>
          String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const data = metadata[info.object.properties.id];
        if (!data) return;
        const weight = weightMap.get(info.object.properties.id);
        setTooltip({
          x: info.x,
          y: info.y,
          content: [
            `Id: ${escapeHtml(data.id)}`,
            `lon: ${escapeHtml(data.lon.toFixed(2))}`,
            `lat: ${escapeHtml(data.lat.toFixed(2))}`,
            `depth: ${escapeHtml(data.depth)}`,
            `disease: ${escapeHtml(data.disease)}`,
            `rest: ${escapeHtml(data.rest)}`,
            `aqc: ${escapeHtml(data.aqc)}`,
            `pop: ${escapeHtml(data.pop)}`,
            ...(weight !== undefined ? [`wgt: ${escapeHtml(weight.toExponential(2))}`] : []),
          ].join('\n'),
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
      } else {
        setClickIds(prev => prev.filter(x => x !== info.object.properties.id));
      }
    },
  };

  const catHeight = theme.elevation.categoryHeight;

  // Build layers: Connectivity at base, then REST, AQC, OUTBREAK stacked on top
  const layers = feature
    ? [
        // Layer 1: Base/Connectivity - z=0, height=weight-based or default
        new GeoJsonLayer({
          id: 'connectivity-layer',
          data: feature,
          ...commonLayerProps,
          ...interactionHandlers,
          updateTriggers: {
            getFillColor: [hoveredId, weightMap, clickIds],
            getElevation: [weightMap, clickIds],
          },
          getElevation: (d: any) => {
            const id = d.properties.id;
            const w = weightMap.get(id);
            const isSelected = clickIds.includes(id);
            if (w !== undefined) return theme.elevation.getElevation(w);
            if (isSelected) return catHeight; // Give selected hexes some height
            return theme.elevation.default;
          },
          getFillColor: (d: any) => {
            const id = d.properties.id;
            if (id === hoveredId) return theme.hex.hovered;
            if (clickIds.includes(id)) return [...theme.highlight.selected] as [number, number, number, number];
            const w = weightMap.get(id);
            if (w !== undefined) return theme.hex.getWeightColor(w);
            return theme.hex.default;
          },
        }),

        // Layer 2: REST - stacked on top of connectivity
        ...(isRestHighlighted && metadata ? [new GeoJsonLayer({
          id: 'rest-layer',
          data: {
            type: 'FeatureCollection',
            features: feature.features
              .filter((f: Feature) => metadata[f.properties.id]?.rest > 0)
              .map((f: Feature) => featureWithZ(f, getConnHeight(f.properties.id))),
          },
          ...commonLayerProps,
          pickable: true,
          onHover: (info: any) => setHoveredId(info.object?.properties.id ?? null),
          onClick: interactionHandlers.onClick,
          updateTriggers: { data: [weightMap], getFillColor: [hoveredId] },
          getElevation: catHeight,
          getFillColor: (d: any) => d.properties.id === hoveredId ? theme.hex.hovered : theme.highlight.restoration,
        })] : []),

        // Layer 3: AQC - stacked on top of REST
        ...(isAQCHighlighted && metadata ? [new GeoJsonLayer({
          id: 'aqc-layer',
          data: {
            type: 'FeatureCollection',
            features: feature.features
              .filter((f: Feature) => metadata[f.properties.id]?.aqc > 0)
              .map((f: Feature) => {
                const id = f.properties.id;
                const baseZ = getConnHeight(id) + (isRestHighlighted && metadata[id]?.rest > 0 ? catHeight : 0);
                return featureWithZ(f, baseZ);
              }),
          },
          ...commonLayerProps,
          pickable: true,
          onHover: (info: any) => setHoveredId(info.object?.properties.id ?? null),
          onClick: interactionHandlers.onClick,
          updateTriggers: { data: [weightMap, isRestHighlighted], getFillColor: [hoveredId] },
          getElevation: catHeight,
          getFillColor: (d: any) => d.properties.id === hoveredId ? theme.hex.hovered : theme.highlight.aquaculture,
        })] : []),

        // Layer 4: OUTBREAK/Disease - stacked on top of AQC
        ...(isDiseaseHighlighted && metadata ? [new GeoJsonLayer({
          id: 'disease-layer',
          data: {
            type: 'FeatureCollection',
            features: feature.features
              .filter((f: Feature) => metadata[f.properties.id]?.disease > 0)
              .map((f: Feature) => {
                const id = f.properties.id;
                const data = metadata[id];
                const baseZ = getConnHeight(id)
                  + (isRestHighlighted && data?.rest > 0 ? catHeight : 0)
                  + (isAQCHighlighted && data?.aqc > 0 ? catHeight : 0);
                return featureWithZ(f, baseZ);
              }),
          },
          ...commonLayerProps,
          pickable: true,
          onHover: (info: any) => setHoveredId(info.object?.properties.id ?? null),
          onClick: interactionHandlers.onClick,
          updateTriggers: { data: [weightMap, isRestHighlighted, isAQCHighlighted], getFillColor: [hoveredId] },
          getElevation: catHeight,
          getFillColor: (d: any) => d.properties.id === hoveredId ? theme.hex.hovered : theme.highlight.disease,
        })] : []),
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
        className="control-panel-container"
        style={{
          background: theme.ui.controlPanel.background,
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
        className="info-box-container"
        style={{
          background: theme.ui.infoBox.background,
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
          maxWidth: 320,
          boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
          whiteSpace: "pre",
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

