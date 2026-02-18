import Node from "./Node";

export default class Graph {
    constructor() {
        this.nodoInicio = null;
        this.nodos = new Map();
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
        return nodo;
    }
}