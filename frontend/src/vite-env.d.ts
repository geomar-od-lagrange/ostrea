/// <reference types="vite/client" />

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["@deck.gl/react", "@deck.gl/layers", "react-map-gl"]
  }
});

