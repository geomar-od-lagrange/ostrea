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
  raw_weight?: number;
};

interface Metadata {
  id: number;
  lon: number;
  lat: number;
  depth: number;
  disease: number;
  rest: number;
  aqc: number;
  pop: number;
  his: number;
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
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['07d-14d']);
  const [feature, setFeature] = useState<FeatureCollection | null>(null);
  const [metadata, setMetadata] = useState<Record<number, Metadata> | null>(null);

  // TODO: Consolidate state management into single reducer or state object
  // Current fragmented state should be refactored for better maintainability
  
  const [isAQCHighlighted, setAQC] = useState<boolean>(true);
  const [isRestHighlighted, setRest] = useState<boolean>(true);
  const [isDiseaseHighlighted, setDisease] = useState<boolean>(true);
  const [isHabitableShown, setHabitable] = useState<boolean>(true);
  const [isHistoricHighlighted, setHistoric] = useState<boolean>(true);
  
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
        setMetadata(Object.fromEntries(data.map((m: Metadata) => [m.id, m])));
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
  const rawWeightMap = useMemo(
    () => new Map<number, number>(connections.filter(c => c.raw_weight != null).map(c => [c.end_id, c.raw_weight!])),
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
    // High ambient reduces side-face darkening and limits hue shift from directional light
    material: { ambient: 0.7, diffuse: 0.3, shininess: 0, specularColor: [0, 0, 0] as [number, number, number] },
  };

  // Shared hover handler for all layers (base + category)
  const handleHover = (info: any) => {
    setHoveredId(info.object ? info.object.properties.id : null);
    if (info.object) {
      if (!metadata) return;
      const escapeHtml = (str: string | number) =>
        String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const data = metadata[info.object.properties.id];
      if (!data) return;
      const rawWeight = rawWeightMap.get(info.object.properties.id);
      const concLine = (() => {
        if (rawWeight == null || rawWeight <= 0) return 'rel conc 0';
        const exp = Math.floor(Math.log10(rawWeight));
        const mantissa = rawWeight / Math.pow(10, exp);
        return `rel conc ${mantissa.toFixed(2)} \u00b7 10<sup>${exp}</sup>`;
      })();
      const categories = [
        data.disease > 0 && 'outbreak',
        data.aqc     > 0 && 'aquaculture',
        data.rest    > 0 && 'restoration',
        data.his     > 0 && 'historic',
        data.pop     > 0 && 'population',
      ].filter(Boolean) as string[];
      const catLine = categories.length > 0 ? categories.join(' · ') : '·';
      const lines = [
        concLine,
        catLine,
        `${Math.abs(data.lat).toFixed(1)}\u00b0${data.lat < 0 ? 'S' : 'N'} ${Math.abs(data.lon).toFixed(1)}\u00b0${data.lon < 0 ? 'W' : 'E'} \u00b7 ${data.depth} m`,
        `hex ${escapeHtml(data.id)}`,
      ];
      setTooltip({
        x: info.x,
        y: info.y,
        content: lines.join('\n'),
      });
    } else {
      setHoveredId(null);
      setTooltip(null);
    }
  };

  // Shared click handler for all layers
  const handleClick = (info: any) => {
    if (!info.object) return;
    if (clickIds.indexOf(info.object.properties.id) === -1) {
      setClickIds([...clickIds, info.object.properties.id]);
    } else {
      setClickIds(prev => prev.filter(x => x !== info.object.properties.id));
    }
  };

  // Interaction handlers for all layers
  const interactionHandlers = {
    pickable: true,
    onHover: handleHover,
    onClick: handleClick,
  };

  const catHeight = theme.elevation.categoryHeight;

  // Build layers: Connectivity at base, then HISTORIC, REST, AQC, OUTBREAK stacked on top
  const layers = feature
    ? [
        // Layer 1: Base/Connectivity - z=0, height=weight-based or default
        new GeoJsonLayer({
          id: 'connectivity-layer',
          data: feature,
          ...commonLayerProps,
          ...interactionHandlers,
          updateTriggers: {
            getFillColor: [hoveredId, weightMap, clickIds, isHabitableShown],
            getElevation: [weightMap, isHabitableShown],
          },
          getElevation: (d: any) => {
            const id = d.properties.id;
            if (isHabitableShown && metadata && (metadata[id]?.depth ?? 0) > 85) return 0;
            const w = weightMap.get(id);
            if (w !== undefined) return theme.elevation.getElevation(w);
            return theme.elevation.default;
          },
          getFillColor: (d: any) => {
            const id = d.properties.id;
            const isDeep = isHabitableShown && metadata && (metadata[id]?.depth ?? 0) > 85;
            if (id === hoveredId) return theme.hex.hovered;
            const w = weightMap.get(id);
            if (w !== undefined) {
              const c = theme.hex.getWeightColor(w);
              return isDeep ? [Math.round(c[0]*0.45+70*0.55), Math.round(c[1]*0.45+70*0.55), Math.round(c[2]*0.45+70*0.55), c[3]] as [number,number,number,number] : c;
            }
            if (isDeep) return theme.highlight.deepWater;
            return theme.hex.default;
          },
        }),

        // Layer 2: HISTORIC - stacked on top of connectivity
        ...(isHistoricHighlighted && metadata ? [new GeoJsonLayer({
          id: 'historic-layer',
          data: {
            type: 'FeatureCollection',
            features: feature.features
              .filter((f: Feature) => metadata[f.properties.id]?.his > 0)
              .map((f: Feature) => featureWithZ(f, getConnHeight(f.properties.id))),
          },
          ...commonLayerProps,
          ...interactionHandlers,
          updateTriggers: { data: [weightMap], getFillColor: [hoveredId] },
          getElevation: catHeight,
          getFillColor: (d: any) => d.properties.id === hoveredId ? theme.hex.hovered : theme.highlight.historic,
        })] : []),

        // Layer 3: REST - stacked on top of historic
        ...(isRestHighlighted && metadata ? [new GeoJsonLayer({
          id: 'rest-layer',
          data: {
            type: 'FeatureCollection',
            features: feature.features
              .filter((f: Feature) => metadata[f.properties.id]?.rest > 0)
              .map((f: Feature) => {
                const id = f.properties.id;
                const baseZ = getConnHeight(id) + (isHistoricHighlighted && metadata[id]?.his > 0 ? catHeight : 0);
                return featureWithZ(f, baseZ);
              }),
          },
          ...commonLayerProps,
          ...interactionHandlers,
          updateTriggers: { data: [weightMap, isHistoricHighlighted], getFillColor: [hoveredId] },
          getElevation: catHeight,
          getFillColor: (d: any) => d.properties.id === hoveredId ? theme.hex.hovered : theme.highlight.restoration,
        })] : []),

        // Layer 4: AQC - stacked on top of REST
        ...(isAQCHighlighted && metadata ? [new GeoJsonLayer({
          id: 'aqc-layer',
          data: {
            type: 'FeatureCollection',
            features: feature.features
              .filter((f: Feature) => metadata[f.properties.id]?.aqc > 0)
              .map((f: Feature) => {
                const id = f.properties.id;
                const data = metadata[id];
                const baseZ = getConnHeight(id)
                  + (isHistoricHighlighted && data?.his > 0 ? catHeight : 0)
                  + (isRestHighlighted && data?.rest > 0 ? catHeight : 0);
                return featureWithZ(f, baseZ);
              }),
          },
          ...commonLayerProps,
          ...interactionHandlers,
          updateTriggers: { data: [weightMap, isHistoricHighlighted, isRestHighlighted], getFillColor: [hoveredId] },
          getElevation: catHeight,
          getFillColor: (d: any) => d.properties.id === hoveredId ? theme.hex.hovered : theme.highlight.aquaculture,
        })] : []),

        // Layer 5: OUTBREAK/Disease - stacked on top of AQC
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
                  + (isHistoricHighlighted && data?.his > 0 ? catHeight : 0)
                  + (isRestHighlighted && data?.rest > 0 ? catHeight : 0)
                  + (isAQCHighlighted && data?.aqc > 0 ? catHeight : 0);
                return featureWithZ(f, baseZ);
              }),
          },
          ...commonLayerProps,
          ...interactionHandlers,
          updateTriggers: { data: [weightMap, isHistoricHighlighted, isRestHighlighted, isAQCHighlighted], getFillColor: [hoveredId] },
          getElevation: catHeight,
          getFillColor: (d: any) => d.properties.id === hoveredId ? theme.hex.hovered : theme.highlight.disease,
        })] : []),

        // Layer 6: SELECTED - one catHeight above all category layers
        ...(clickIds.length > 0 && metadata ? [new GeoJsonLayer({
          id: 'selected-layer',
          data: {
            type: 'FeatureCollection',
            features: feature.features
              .filter((f: Feature) => clickIds.includes(f.properties.id))
              .map((f: Feature) => {
                const id = f.properties.id;
                const data = metadata[id];
                const baseZ = getConnHeight(id)
                  + (isHistoricHighlighted && (data?.his ?? 0) > 0 ? catHeight : 0)
                  + (isRestHighlighted     && (data?.rest ?? 0) > 0 ? catHeight : 0)
                  + (isAQCHighlighted      && (data?.aqc ?? 0) > 0 ? catHeight : 0)
                  + (isDiseaseHighlighted  && (data?.disease ?? 0) > 0 ? catHeight : 0);
                return featureWithZ(f, baseZ);
              }),
          },
          ...commonLayerProps,
          ...interactionHandlers,
          updateTriggers: { data: [weightMap, clickIds, isHistoricHighlighted, isRestHighlighted, isAQCHighlighted, isDiseaseHighlighted], getFillColor: [hoveredId] },
          getElevation: catHeight,
          getFillColor: (d: any) => d.properties.id === hoveredId ? theme.hex.hovered : theme.highlight.selected,
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
          '--panel-font-size': theme.panel.fontSize,
          '--panel-border-radius': theme.panel.borderRadius,
          '--panel-box-shadow': theme.panel.boxShadow,
          '--panel-padding': theme.panel.padding,
          background: theme.ui.controlPanel.background,
          color: theme.ui.controlPanel.text,
        } as React.CSSProperties}
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
          isHabitableShown={isHabitableShown}
          onHabitableChange={setHabitable}
          isHistoricHighlighted={isHistoricHighlighted}
          onHistoricChange={setHistoric}
        />
      </div>

      <div
        className="info-box-container"
        style={{
          '--panel-font-size': theme.panel.fontSize,
          '--panel-border-radius': theme.panel.borderRadius,
          '--panel-box-shadow': theme.panel.boxShadow,
          '--panel-padding': theme.panel.padding,
          background: theme.ui.infoBox.background,
          color: theme.ui.infoBox.text,
        } as React.CSSProperties}
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
          padding: theme.ui.tooltip.padding,
          borderRadius: theme.ui.tooltip.borderRadius,
          fontSize: theme.ui.tooltip.fontSize,
          maxWidth: theme.ui.tooltip.maxWidth,
          boxShadow: theme.ui.tooltip.boxShadow,
          whiteSpace: "pre",
          overscrollBehavior: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: tooltip.content }}
      />
    )}
    </div>
  );
}

export default App;

