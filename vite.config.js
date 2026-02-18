import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            // Suprimir advertencia de mapbox-gl ya que usamos maplibre-gl
            'mapbox-gl': 'maplibre-gl'
        }
    },
    optimizeDeps: {
        exclude: ['mapbox-gl']
    }
});
