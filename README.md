# Visualizador de Algoritmos de Pathfinding

Aplicación web interactiva para visualizar algoritmos de búsqueda de caminos (A*, BFS, DFS) sobre mapas reales usando datos de OpenStreetMap.

## Instalación

### Requisitos
- Node.js 16 o superior
- npm o yarn

### Pasos

1. Clonar el repositorio
```bash
git clone https://github.com/jhonw2004/Mapa_Algoritmos.git
cd Mapa_Algoritmos
```

2. Instalar dependencias
```bash
npm install
```

3. Iniciar el servidor de desarrollo
```bash
npm run dev
```

4. Abrir en el navegador: `http://localhost:5173`

## Uso

1. Haz clic en el mapa para seleccionar el punto inicial (aparecerá un área verde)
2. Haz clic dentro del área verde para seleccionar el punto final
3. Presiona Play para iniciar la visualización del algoritmo
4. Usa el panel lateral para cambiar algoritmo, radio de búsqueda y velocidad

## Scripts

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run preview  # Preview del build
npm run lint     # Ejecutar linter
```

## Tecnologías

- React 18 + Vite
- Deck.gl + MapLibre GL
- Material-UI
- OpenStreetMap (Overpass API)

## Licencia

MIT
