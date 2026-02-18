import AStar from "./algorithms/AStar";
import BFS from "./algorithms/BFS";
import DFS from "./algorithms/DFS";
import PathfindingAlgorithm from "./algorithms/PathfindingAlgorithm";

export default class PathfindingState {
    static #instancia;

    /**
     * Clase Singleton
     * @returns {PathfindingState}
     */
    constructor() {
        if (!PathfindingState.#instancia) {
            this.nodoFin = null;
            this.grafo = null;
            this.finished = false;
            this.algoritmo = new PathfindingAlgorithm();
            PathfindingState.#instancia = this;
        }
    
        return PathfindingState.#instancia;
    }

    get nodoInicio() {
        return this.grafo.nodoInicio;
    }

    /**
     * 
     * @param {Number} id ID del nodo OSM
     * @returns {import("./Node").default} nodo
     */
    obtenerNodo(id) {
        return this.grafo?.obtenerNodo(id);
    }

    /**
     * Resetea al estado por defecto
     */
    reset() {
        this.finished = false;
        if(!this.grafo) return;
        for(const clave of this.grafo.nodos.keys()) {
            this.grafo.nodos.get(clave).reset();
        }
    }

    /**
     * Resetea el estado e inicializa nueva animación de pathfinding
     */
    start(algoritmo) {
        this.reset();
        switch(algoritmo) {
            case "astar":
                this.algoritmo = new AStar();
                break;
            case "bfs":
                this.algoritmo = new BFS();
                break;
            case "dfs":
                this.algoritmo = new DFS();
                break;
            default:
                this.algoritmo = new AStar();
                break;
        }

        this.algoritmo.start(this.nodoInicio, this.nodoFin);
    }

    /**
     * Progresa el algoritmo de pathfinding por un paso/iteración
     * @returns {(import("./Node").default)[]} array de nodos que fueron actualizados
     */
    nextStep() {
        const nodosActualizados = this.algoritmo.nextStep();
        if(this.algoritmo.finished || nodosActualizados.length === 0) {
            this.finished = true;
        }

        return nodosActualizados;
    }
}