import { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import StaticMap from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import ControlPanel from './ControlPanel';

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

type Connection = {
  end_id: number;
  weight: number;
};

function App() {
  const [selectedDepths, setSelectedDepths] = useState<string[]>(['05m']);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['00d-07d']);
  const [feature, setFeature] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  
  const [isAQCHighlighted, setAQC] = useState<boolean>(false);
  const [isRestHighlighted, setRest] = useState<boolean>(false);
  const [isDiseaseHighlighted, setDisease] = useState<boolean>(false);
  
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
    pitch: 0,
    bearing: 0
  };

  const [connections, setConnections] = useState<Connection[]>([]);

  // Fetch connectivity whenever (clickId, selectedTime, selectedDepth) change
  useEffect(() => {
    if (clickIds?.length) {

      const ctrl = new AbortController();
      const fetchURL = `api/connectivity?depth=${encodeURIComponent(selectedDepths)}&time_range=${encodeURIComponent(selectedTimes)}&start_id=${encodeURIComponent(clickIds)}&op=mean`;
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
          lineWidthMinPixels: 2,

          updateTriggers: {
            getFillColor: [hoveredId, weightMap],
            getLineColor: [clickIds, isAQCHighlighted, isRestHighlighted, isDiseaseHighlighted]
          },

          getFillColor: (d: any) => {
            const id: number = d.properties.id;

            if (id === hoveredId) return [255, 255, 0, 255];

            const w = weightMap.get(id);
            if (w !== undefined) {
              const green = Math.min(255, Math.round(w * 255));
              return [0, green, 0, 255];
            }
            return [0, 0, 255, 100];
          },

          getLineColor: (d: any) => {
            const id = d.properties.id;
            const data = metadata[id];

            const colors: number[][] = [];

            if (isAQCHighlighted && data.aqc > 0) {
              colors.push([255, 255, 0, 255]);   // yellow
            }
            if (isRestHighlighted && data.rest > 0) {
              colors.push([64, 224, 208, 255]);  // turquoise
            }
            if (isDiseaseHighlighted && data.disease > 0) {
              colors.push([255, 0, 0, 255]);     // red
            }
            if (clickIds.includes(id)) {
              colors.push([255, 128, 0, 255]);   // orange
            } 

            if (colors.length === 0) return [0, 0, 128, 30]; // default
              // Blend
            return colors[0].map((_, i) =>
              Math.round(colors.reduce((sum, c) => sum + c[i], 0) / colors.length)
            );
          },

          
          onHover: (info: any) => {
            setHoveredId(info.object ? info.object.properties.id : null);
            
            if (info.object) {
              setHoveredId(info.object.properties.id);
              setTooltip({
                x: info.x,
                y: info.y,
                content: `Id: ${encodeURIComponent(metadata[info.object.properties.id].id)}
                  lon: ${encodeURIComponent(metadata[info.object.properties.id].lon)}
                  lat: ${encodeURIComponent(metadata[info.object.properties.id].lat)}
                  Depth: ${encodeURIComponent(metadata[info.object.properties.id].depth)}
                  Disease: ${encodeURIComponent(metadata[info.object.properties.id].disease)}
                  rest: ${encodeURIComponent(metadata[info.object.properties.id].rest)}
                  aqc: ${encodeURIComponent(metadata[info.object.properties.id].aqc)}
                  pop: ${encodeURIComponent(metadata[info.object.properties.id].pop)}`,
              });
            } else {
              setHoveredId(null);
              setTooltip(null);
            }
          },

          onClick: (info: any) => {
            if (!info.object) return;
            if (clickIds.indexOf(info.object.properties.id) == -1) {
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
          background: 'rgba(0,0,0,0.9)',
          padding: '8px',
          borderRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          color: '#fff'
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
          onRestChange={setRest}
          onDiseaseChange={setDisease}
        />
      </div>
      
    {tooltip && (
      <div
        style={{
          position: "absolute",
          left: tooltip.x + 10,
          top: tooltip.y + 10,
          zIndex: 2,
          pointerEvents: "none",
          background: "rgba(0,0,0,0.75)",
          color: "#fff",
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

