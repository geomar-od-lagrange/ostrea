
import { useEffect, useState } from 'react';
import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import StaticMap from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import ControlPanel from './ControlPanel';

// Open-source style URL (no Mapbox token required)
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

type Connection = {
  end_id: number;
  weight: number
}

function App() {
  const [selectedDepth, setSelectedDepth] = useState<number>(50);
  const [selectedTime, setSelectedTime] = useState<string>('0-7');
  const [feature, setFeature] = useState<any>(null);
  
  const [hoveredId, setHoveredId] = useState(null);
  const [clickId, setClickId] = useState(null);

  useEffect(() => {
    if (!selectedDepth) return;

    fetch(`http://localhost:3000/feature?depth=${encodeURIComponent(selectedDepth)}`)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        const geojson = data.type === 'FeatureCollection'
          ? data
          : { type: 'FeatureCollection', features: [data] };
          geojson.features.map((f, i) => ({
            index: i,
            id: f.properties.id,
            otherProps: Object.keys(f.properties)
          }))              
        setFeature(geojson);
      })
      .catch(console.error);
  }, [selectedDepth]);


  const initialViewState = {
    longitude: 6.5,
    latitude: 55.0,
    zoom: 5,
    pitch: 0,
    bearing: 0
  };
  
  const [connections, setConnections] = useState<Connection[]>([]);
  
  const weightMap = useMemo(
    () => new Map(connections.map(c => [c.end_id, c.weight])),
    [connections]
  );
  
  const layers = feature
    ? [
        new GeoJsonLayer({
          id: 'geojson-layer',
          data: feature,
          filled: true,
          stroked: true,
          updateTriggers: {
            getFillColor: [hoveredId, connections],
            getLineColor: [clickId]
          },
          getFillColor: d => {
            const id = d.properties.id;
            
            if (d.properties.id == hoveredId) {
              return [255, 255, 0];
            }
            
            const w = weightMap.get(id);
            if (w !== undefined) {
              const green = Math.min(255, Math.round(w * 0.01 * 255));
              return [0, green, 0];
            }
            
            else {
              return [0, 0, 255];
            }
          },
          
          onHover: info => {
            setHoveredId(info.object ? info.object.properties.id : null);
          },
          getLineColor: d => d.properties.id === clickId ? [255, 0, 0] : [0, 0, 128],
          lineWidthMinPixels: 2,
          pickable: true,
          onClick: info => {
            if (info.object != null) {
              setClickId(info.object.properties.id);
            }
            if (info.object != null) {
              //console.log("Request:", `http://localhost:3000/connectivity?start_id=${encodeURIComponent(info.object.properties.id)}`);
              fetch(`http://localhost:3000/connectivity?start_id=${encodeURIComponent(info.object.properties.id)}`)
                .then(res => {
                if (!res.ok) throw new Error(res.statusText);
                  return res.json();
                })
                .then((data: Connection[]) => {
                  setConnections(data);
                  console.log('connections after fetch', data);
                })
                .catch(error => console.error('Fetch error:', error));
            }
          }
        })
      ]
    
    //const layers = feature
    //  ? [
      
      //]
    
    : [];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <DeckGL
        initialViewState={initialViewState}
        controller
        layers={layers}
	style={{ position: 'absolute', top: '0px', left: '0px', width: '1920px', height: '1080px' }}
     >
        <StaticMap
          reuseMaps
          mapLib={maplibregl as any}
          mapStyle={MAP_STYLE}
        />
      </DeckGL>
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, background: 'rgba(0,0,0,0.9)', padding: '8px', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
      <ControlPanel
        selectedDepth={selectedDepth}
        onDepthChange={setSelectedDepth}
        selectedTime={selectedTime}
        onTimeChange={setSelectedTime}
      />
    </div>
    </div>
  );
}

export default App;
