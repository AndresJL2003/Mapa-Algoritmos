class PathfindingAlgorithm {
    constructor() {
        this.finished = false;
    }

    /**
     * Resetea el estado interno e inicializa nuevo pathfinding
     * @param {(import("./Node").default)} nodoInicio 
     * @param {(import("./Node").default)} nodoFin 
     */
    start(nodoInicio, nodoFin) {
        this.finished = false;
        this.nodoInicio = nodoInicio;
        this.nodoFin = nodoFin;
    }

    /**
     * Progresa el algoritmo de pathfinding por un paso/iteración
     * @returns {(import("./Node").default)[]} array de nodos que fueron actualizados
     */
    nextStep() {
        return [];
    }
}

export default PathfindingAlgorithm;