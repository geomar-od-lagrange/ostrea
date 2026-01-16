// Type declarations for deck.gl modules without official types
declare module '@deck.gl/react' {
  import { Component } from 'react';

  export interface DeckGLProps {
    initialViewState?: any;
    controller?: boolean | any;
    layers?: any[];
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }

  export default class DeckGL extends Component<DeckGLProps> {}
}

declare module '@deck.gl/layers' {
  export class GeoJsonLayer {
    constructor(props: any);
  }
}
