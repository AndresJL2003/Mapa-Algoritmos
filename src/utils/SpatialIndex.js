/**
 * Índice espacial basado en grid para búsqueda eficiente de nodos cercanos
 * Reduce la complejidad de O(n) a O(1) promedio
 */
export default class SpatialIndex {
    constructor(cellSize = 0.001) {
        // ~100m por celda a latitudes medias
        this.grid = new Map();
        this.cellSize = cellSize;
    }

    /**
     * Obtiene la clave de celda para una coordenada
     * @param {Number} lat 
     * @param {Number} lon 
     * @returns {String}
     */
    getCell(lat, lon) {
        const x = Math.floor(lon / this.cellSize);
        const y = Math.floor(lat / this.cellSize);
        return `${x},${y}`;
    }

    /**
     * Inserta un nodo en el índice espacial
     * @param {import("../models/Node").default} nodo 
     */
    insert(nodo) {
        const key = this.getCell(nodo.latitud, nodo.longitud);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(nodo);
    }

    /**
     * Encuentra el nodo más cercano a una coordenada
     * @param {Number} lat 
     * @param {Number} lon 
     * @param {Number} maxRadius radio de búsqueda en celdas
     * @returns {import("../models/Node").default|null}
     */
    findNearest(lat, lon, maxRadius = 3) {
        const centerX = Math.floor(lon / this.cellSize);
        const centerY = Math.floor(lat / this.cellSize);
        
        let closestNode = null;
        let minDistance = Infinity;

        // Buscar en celdas cercanas (búsqueda en espiral)
        for (let dx = -maxRadius; dx <= maxRadius; dx++) {
            for (let dy = -maxRadius; dy <= maxRadius; dy++) {
                const key = `${centerX + dx},${centerY + dy}`;
                const nodes = this.grid.get(key);
                
                if (!nodes) continue;

                for (const node of nodes) {
                    const distance = Math.sqrt(
                        Math.pow(node.latitud - lat, 2) + 
                        Math.pow(node.longitud - lon, 2)
                    );

                    if (distance < minDistance) {
                        minDistance = distance;
                        closestNode = node;
                    }
                }
            }
        }

        return closestNode;
    }

    /**
     * Limpia el índice
     */
    clear() {
        this.grid.clear();
    }
}
