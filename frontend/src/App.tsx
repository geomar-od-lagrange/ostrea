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

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [clickId, setClickId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{x: number; y: number; content: string} | null>(null);

  // Fetch base feature(s) — unchanged logic (note: the map() result wasn't used)
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
    if (clickId == null) return;

    const ctrl = new AbortController();
    const fetchURL = `api/connectivity?depth=${encodeURIComponent(selectedDepths)}&time_range=${encodeURIComponent(selectedTimes)}&start_id=${encodeURIComponent(clickId)}&op=mean`;
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
  }, [clickId, selectedTimes, selectedDepths]);

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

          // Triggers: depend on what the accessor actually uses
          updateTriggers: {
            getFillColor: [hoveredId, weightMap],
            getLineColor: [clickId]
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

          getLineColor: (d: any) =>
            d.properties.id === clickId ? [255, 0, 0, 255] : [0, 0, 128, 30],

          onHover: (info: any) => {
            setHoveredId(info.object ? info.object.properties.id : null);
            
            if (info.object) {
              //console.log(metadata)
              setHoveredId(info.object.properties.id);
              setTooltip({
                x: info.x,
                y: info.y,
                content: `Id: ${encodeURIComponent(metadata[info.object.properties.id].id)}
                  lon: ${encodeURIComponent(metadata[info.object.properties.id].lon)}
                  lat: ${encodeURIComponent(metadata[info.object.properties.id].lat)}
                  Depth: ${encodeURIComponent(metadata[info.object.properties.id].depth)}
                  Disease: ${encodeURIComponent(metadata[info.object.properties.id].disease)}
                  rest: ${encodeURIComponent(metadata[info.object.properties.id].est)}
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
            setClickId(info.object.properties.id); // triggers the effect in UseEffect
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
        style={{ position: 'absolute', top: '0px', left: '0px', width: '1920px', height: '1080px' }}
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
        }}
      >
        {tooltip.content}
      </div>
    )}
    </div>
  );
}

export default App;

