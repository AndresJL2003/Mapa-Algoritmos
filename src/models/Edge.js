export default class Edge {

    /**
     * 
     * @param {import("./Node").default} nodo1 
     * @param {import("./Node").default} nodo2 
     */
    constructor(nodo1, nodo2) {
        this.nodo1 = nodo1;
        this.nodo2 = nodo2;
        this.visitado = false;
    }

    /**
     * 
     * @param {import("./Node").default} nodo 
     * @returns {import("./Node").default} el otro nodo
     */
    obtenerOtroNodo(nodo) {
        return nodo === this.nodo1 ? this.nodo2 : this.nodo1;
    }

    /**
     * 
     * @returns peso de la arista
     */
    get peso() {
        return Math.hypot(this.nodo1.latitud - this.nodo2.latitud, this.nodo1.longitud - this.nodo2.longitud);
    }
}