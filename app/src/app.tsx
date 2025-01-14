/* global fetch */
import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {Map} from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import {MapView} from '@deck.gl/core';
import {GeoJsonLayer} from '@deck.gl/layers';
import {scaleThreshold} from 'd3-scale';

import { load, parse } from "@loaders.gl/core";
import { ZipLoader } from "@loaders.gl/zip";
import {_GeoJSONLoader} from '@loaders.gl/json';

import type {Color, PickingInfo, MapViewState, ViewStateChangeParameters} from '@deck.gl/core';
import type {Feature, Polygon, MultiPolygon} from 'geojson';

import ControlPanel from './control_panel';

// Source data GeoJSON
const SERVER_URL = "http://localhost:8080"
const DATA_URL = SERVER_URL + '/hex_features_real_00d-07d_05m.zip'; // eslint-disable-line
const STARTING_DATA_FILENAME ='hex_features_real_00d-07d_05m.geojson'; 
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json'
const DATA_FILE_MAP = {
  "00d-07d_05m": "/hex_features_real_00d-07d_05m",
  "00d-07d_10m": "/hex_features_real_00d-07d_10m",
  "00d-07d_15m": "/hex_features_real_00d-07d_15m",
  "07d-14d_05m": "/hex_features_real_07d-14d_05m",
  "07d-14d_10m": "/hex_features_real_07d-14d_10m",
  "07d-14d_15m": "/hex_features_real_07d-14d_15m",
  "14d-28d_05m": "/hex_features_real_14d-28d_05m",
  "14d-28d_10m": "/hex_features_real_14d-28d_15m",
};

export const COLOR_SCALE_CONNECTED = scaleThreshold<number, Color>()
  .domain([0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45])
  .range([
    [255,255,217,200],
    [237,248,177,200],
    [199,233,180,200],
    [127,205,187,200],
    [65,182,196,200],
    [29,145,192,200],
    [34,94,168,200],
    [37,52,148,200],
    [8,29,88,200]
  ]);

  export const COLOR_SCALE_SELECTED = scaleThreshold<number, Color>()
  .domain([3, 6, 9, 12, 15, 18, 21, 24, 27])
  .range([
    [255,245,235,250],
    [254,230,206,250],
    [253,208,162,250],
    [253,174,107,250],
    [253,141,60,250],
    [241,105,19,250],
    [217,72,1,250],
    [166,54,3,250],
    [127,39,4,250],
  ]);

const INITIAL_VIEW_STATE_PROPS = {
  longitude: 2.0,
  latitude: 50.7,
  zoom: 4,
  maxZoom: 15,
  pitch: 30,
  bearing: 15
};

const INITIAL_VIEW_STATE: {
  main: MapViewState; 
  splitleft: MapViewState;
  splitright: MapViewState
} = {
  main: INITIAL_VIEW_STATE_PROPS,
  splitleft: INITIAL_VIEW_STATE_PROPS,
  splitright: INITIAL_VIEW_STATE_PROPS
};

const mainView = new MapView({
  id: 'main', 
  width: '100%',
  height: '100%',
  controller: true
});

const splitleftView = new MapView({
  id: 'splitleft', 
  width: '50%',
  height: '100%',
  x: '0%',
  controller: true,
});

const splitrightView = new MapView({
  id: 'splitright', 
  width: '50%',
  height: '100%',
  x: '50%',
  controller: true,
});

interface Dictionary<T> {
  [Key: string]: T;
}

// ['id', 'lon', 'lat', 'depth', 'disease', 'rest', 'aqc', 'pop', 'connectivity', 'geometry'],
type FeatureProperties = {
  id: number;
  lat: number;
  lon: number;
  depth: number;
  disease: boolean;
  rest: boolean;
  aqc: number;
  pop: number;
  connectivity: Dictionary<string>;
  number_affected?: number;
  dilution?: string;
};

type Shape = Feature<Polygon | MultiPolygon, FeatureProperties>;

function setSelectedShape(nextSelectShape) {
  if (!nextSelectShape) return null;

  let selected = [nextSelectShape];
  selected.forEach((element) => {
    // If connectivity is just a flat dictionary now:
    const connectivityDict = element.properties.connectivity;
    element.properties.number_affected = connectivityDict
      ? Object.keys(connectivityDict).length
      : 0; // fallback if somehow undefined
  });

  return selected;
}
function setConnectedShape(selectedShape, data) {
  if (!selectedShape || !data) return null;

  const connected_ids = selectedShape.properties.connectivity
    ? Object.keys(selectedShape.properties.connectivity).map(Number)
    : [];

  return data.filter((element) => connected_ids.includes(element.properties.id));
}

function getTooltip({object, layer}: PickingInfo<Shape>) {
  if (!object) return null;

  const TOOLTIP_BASE = `\
    ID: ${object.properties.id}
    Position: ${object.properties.lat.toFixed(4)} N, ${object.properties.lon.toFixed(4)} E
    Depth: ${object.properties.depth} m
    Restoration: ${Boolean(object.properties.rest)}
    Substrate: ${object.properties.aqc}
    Disease: ${Boolean(object.properties.disease)}
    Population: ${object.properties.pop}
  `;

  const TOOLTIP_CONNECTED = TOOLTIP_BASE + `\
    Dilution: ${object.properties.dilution}
  `;

  const TOOLTIP_SELECTED = TOOLTIP_CONNECTED + `\
    Number affected: ${object.properties.number_affected}
`;

  if (layer.id == 'base') {
    return object && TOOLTIP_BASE
  }
  else if (layer.id == "selected") {
      return object && TOOLTIP_SELECTED
  }
  else if (layer.id == "connected") {
      return object && TOOLTIP_CONNECTED
  }
}

/* eslint-disable react/no-deprecated */
export default function App({
  data,
  mapStyle = MAP_STYLE,
  multiView = false
}: {
  data?: Shape[];
  mapStyle?: string;
  multiView?: boolean
}) {

  // Which dataset is selected? We'll start with 00d-07d_05m:
  const [selectedDataset, setSelectedDataset] = useState("00d-07d_05m");

  // The actual GeoJSON features:
  const [geoJsonData, setGeoJsonData] = useState<any[]>([]);

  // Whenever selectedDataset changes, load the corresponding file:
  useEffect(() => {
    const loadGeoJson = async () => {
      const url =  SERVER_URL + DATA_FILE_MAP[selectedDataset];
      if (!url) {
        console.warn(`No URL found for dataset: ${selectedDataset}`);
        return;
      }
      try {
    	// Fetch the ZIP file from the HTTP server
    	const response = await fetch(url + ".zip");
    	console.log("Trying to fetch:", url + ".zip")
    	if (!response.ok) {
      	  throw new Error(`Failed to fetch file: ${response.statusText}`);
    	}
  	const zipBlob = await response.blob();
  	console.log("Trying to load:", DATA_FILE_MAP[selectedDataset] + ".geojson")
  	const zip = await load(zipBlob, ZipLoader);
  	const geojson =  await parse(zip[DATA_FILE_MAP[selectedDataset] + ".geojson"], _GeoJSONLoader);
  	const features = geojson["features"]
      } catch (err) {
        console.error(`Failed to load dataset ${selectedDataset}`, err);
      }
    };
    loadGeoJson();
  }, [selectedDataset]);
  
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [dataControlPanelSlider, setControlPanelSlider] = useState(2010)
  const [dataControlPanelRadioButtonDays, setControlPanelRadioButtonDays] = useState()
  const [dataControlPanelRadioButtonDepth, setControlPanelRadioButtonDepth] = useState()
  const [dataControlPanelCheckBox, setControlPanelCheckBox] = useState(true)

  const [nextSelectedShape, setNextSelectedShape] = useState<Shape>();
  const selectedShape = useMemo(() => setSelectedShape(
    dataControlPanelRadioButtonDays, dataControlPanelRadioButtonDepth, nextSelectedShape), 
    [nextSelectedShape, dataControlPanelRadioButtonDays, dataControlPanelRadioButtonDepth, dataControlPanelCheckBox]
  );
  const connectedShape = useMemo(() => setConnectedShape(
    dataControlPanelRadioButtonDays, dataControlPanelRadioButtonDepth, nextSelectedShape, data), 
    [nextSelectedShape, data, dataControlPanelRadioButtonDays, dataControlPanelRadioButtonDepth, dataControlPanelCheckBox]
  );

  const onViewStateChange = useCallback(
    ({viewState: newViewState}: ViewStateChangeParameters<MapViewState>) => {
      setViewState(currentViewState => ({
        main: newViewState,
        splitleft: newViewState,
        splitright: newViewState
      }));
    },
    []
  );

  const layers = [
    new GeoJsonLayer<FeatureProperties>({
      id: 'base',
      data: geoJsonData,
      stroked: true,
      filled: true,
      getFillColor: [200, 200, 200, 50],
      getLineColor: [100, 100, 100, 100],
      getLineWidth: 1000,
      onClick: ({object}) => setNextSelectedShape(object),
      pickable: true
    }),
    new GeoJsonLayer<FeatureProperties>({
      id: 'connected',
      data: connectedShape,
      stroked: true,
      filled: true,
      getLineWidth: 1000,
      getFillColor: d => COLOR_SCALE_CONNECTED(Math.sqrt(Number(d.properties.dilution))),
      onClick: ({object}) => {
      	setNextSelectedShape(object);
      	console.log('Connected layer clicked:', object);
      },
      pickable: true,
      extruded: dataControlPanelCheckBox,
      getElevation: d => Math.sqrt(Number(d.properties.dilution)) * 100000,
      wireframe: true,
      updateTriggers: {
        extruded: dataControlPanelCheckBox
      }
    }),
    new GeoJsonLayer<FeatureProperties>({
      id: 'selected',
      data: selectedShape,
      stroked: true,
      filled: true,
      getFillColor: d => COLOR_SCALE_CONNECTED(Math.sqrt(Number(d.properties.dilution))),
      pickable: true,
      extruded: dataControlPanelCheckBox,
      getElevation: d => Math.sqrt(Number(d.properties.dilution)) * 100000, 
      wireframe: true,
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 1000,
      updateTriggers: {
        extruded: dataControlPanelCheckBox
      }
    })
  ];

  return (
    <div>
      <div> 
        <DeckGL
          layers={layers}
          views={multiView ? [splitleftView, splitrightView] : mainView}
          viewState={viewState}
          onViewStateChange={onViewStateChange}
          // initialViewState={INITIAL_VIEW_STATE}
          // controller={true}
          getTooltip={getTooltip}
        >
          {/* <Map reuseMaps mapStyle={mapStyle}/> */}
          {
            multiView ? 
            <><Map id='splitleft' reuseMaps mapStyle={"https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"} interactive={false}/> 
            <Map id='spli' reuseMaps mapStyle={"https://basemaps.cartocdn.com/gl/matter-nolabels-gl-style/style.json"}/></> : 
            <Map id='main' reuseMaps mapStyle={mapStyle}/>
          }
        </DeckGL>
      </div>
      <div className="control-panel">
        <p><b>Oyster larvae dispersal (forward)</b></p>
        <ControlPanel 
        setControlPanelSlider={setControlPanelSlider} 
        setControlPanelRadioButtonDays={setControlPanelRadioButtonDays}
        setControlPanelRadioButtonDepth={setControlPanelRadioButtonDepth}
        setControlPanelCheckBox={setControlPanelCheckBox}/>
      </div>
    </div>
  );
}


export async function renderToDOM(container: HTMLDivElement) {
  const root = createRoot(container);
  root.render(<App />);


   try {
    // Fetch the ZIP file from the HTTP server
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
  const zipBlob = await response.blob();
  
  const zip = await load(zipBlob, ZipLoader);
  const geojson =  await parse(zip[STARTING_DATA_FILENAME], _GeoJSONLoader);
  const features = geojson["features"]

  root.render(<App data={features} />);
  }catch (error) {
    console.error("Error loading data:", error);
    root.render(<App error="Failed to load data" />);
  }
}


