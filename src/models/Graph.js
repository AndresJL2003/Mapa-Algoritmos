import Node from "./Node";
import SpatialIndex from "../utils/SpatialIndex";

export default class Graph {
    constructor() {
        this.nodoInicio = null;
        this.nodos = new Map();
        this.spatialIndex = new SpatialIndex();
    }

    /**
     * 
     * @param {Number} id 
     * @returns nodo con el ID dado
     */
    obtenerNodo(id) {
        return this.nodos.get(id);
    }

    /**
     * 
     * @param {Number} id ID del nodo
     * @param {Number} latitud latitud del nodo
     * @param {Number} longitud longitud del nodo
     * @returns {Node} nodo creado
     */
    agregarNodo(id, latitud, longitud) {
        const nodo = new Node(id, latitud, longitud);
        this.nodos.set(nodo.id, nodo);
        this.spatialIndex.insert(nodo);
        return nodo;
    }

    /**
     * Encuentra el nodo más cercano usando el índice espacial
     * @param {Number} latitud 
     * @param {Number} longitud 
     * @returns {Node|null}
     */
    encontrarNodoCercano(latitud, longitud) {
        return this.spatialIndex.findNearest(latitud, longitud);
    }
}