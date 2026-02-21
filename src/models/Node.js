import Edge from "./Edge";

/**
 * @typedef {Object} VecinoNodo
 * @property {Node} nodo
 * @property {Edge} arista
 */

export default class Node {

    /**
     * 
     * @param {Number} id 
     * @param {Number} latitud 
     * @param {Number} longitud 
     */
    constructor(id, latitud, longitud) {
        this.aristas = [];
        this.reset();
        this.id = id;
        this.latitud = latitud;
        this.longitud = longitud;
        this.visitado = false;
    }

    /**
     * @returns {Number} f heurística
     */
    get distanciaTotal() {
        return this.distanciaDesdeInicio + this.distanciaAlFinal;
    }

    /**
     * @returns {VecinoNodo[]} lista de vecinos 
     */
    get vecinos() {
        return this.aristas.map(arista => ({ arista, nodo: arista.obtenerOtroNodo(this)}));
    }

    /**
     * 
     * @param {Node} nodo 
     */
    conectarA(nodo) {
        const arista = new Edge(this, nodo);
        this.aristas.push(arista);
        nodo.aristas.push(arista);
    }

    /**
     * Resetea el nodo a su estado por defecto
     */
    reset() {
        this.visitado = false;
        this.encolado = false;
        this.enHeap = false;
        this.distanciaDesdeInicio = 0;
        this.distanciaAlFinal = 0;
        this.padre = null;
        this.referente = null;

        for(const vecino of this.vecinos) {
            vecino.arista.visitado = false;
        }
    }
}