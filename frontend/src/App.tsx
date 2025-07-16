// Make sure to install the following dependencies:
// npm install @deck.gl/react @deck.gl/layers react-map-gl maplibre-gl
// npm install --save-dev @types/maplibre-gl

import { useEffect, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import StaticMap from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import ControlPanel from './ControlPanel';

// Open-source style URL (no Mapbox token required)
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

function App() {
  const [selectedDepth, setSelectedDepth] = useState<number>(50);
  const [feature, setFeature] = useState<any>(null);
  
  const [hoveredId, setHoveredId] = useState(null);

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
        );                                                      // ← see which keys each has

        setFeature(geojson);
      })
      .catch(console.error);
  }, [selectedDepth]);


  const initialViewState = {
    longitude: 6.5,
    latitude: 55.0,
    zoom: 7,
    pitch: 0,
    bearing: 0
  };

  const layers = feature
    ? [
        new GeoJsonLayer({
          id: 'geojson-layer',
          data: feature,
          filled: true,
          stroked: true,
          getFillColor: d => d.properties.id === hoveredId ? [255, 255, 0] : [0, 0, 255],
          updateTriggers: {
            getFillColor: [hoveredId]
          },
          onHover: info => {
            console.log("Hovered object: ", info.object);
            setHoveredId(info.object ? info.object.properties.id : null);
          },
          getLineColor: [0, 0, 128, 200],
          lineWidthMinPixels: 2,
          pickable: true,
          onClick: info => {
            if (info.object) {
              console.log("Clicked object: ", info.object);
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
	style={{ position: 'absolute', top: '0px', left: '0px', width: '1920px', height: '1080px' }}
     >
        <StaticMap
          reuseMaps
          mapLib={maplibregl as any}
          mapStyle={MAP_STYLE}
        />
      </DeckGL>
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, background: 'rgba(255,255,255,0.9)', padding: '8px', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
      <ControlPanel
        selectedDepth={selectedDepth}
        onDepthChange={setSelectedDepth}
      />
    </div>
    </div>
  );
}

export default App;
