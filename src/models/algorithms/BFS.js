import PathfindingAlgorithm from "./PathfindingAlgorithm";

class BFS extends PathfindingAlgorithm {
    constructor() {
        super();
        this.cola = [];
    }

    start(nodoInicio, nodoFin) {
        super.start(nodoInicio, nodoFin);
        this.cola = [nodoInicio];
        nodoInicio.distanciaDesdeInicio = 0;
        nodoInicio.encolado = true;
    }

    nextStep() {
        if (this.cola.length === 0) {
            this.finished = true;
            return [];
        }

        const nodosActualizados = [];
        const nodoActual = this.cola.shift(); // FIFO - First In First Out
        nodoActual.visitado = true;
        
        const aristaRef = nodoActual.aristas.find(a => 
            a.obtenerOtroNodo(nodoActual) === nodoActual.referente
        );
        if(aristaRef) aristaRef.visitado = true;

        // Encontró el nodo final
        if (nodoActual.id === this.nodoFin.id) {
            this.cola = [];
            this.finished = true;
            return [nodoActual];
        }

        for (const v of nodoActual.vecinos) {
            const vecino = v.nodo;
            const arista = v.arista;

            // Llenar aristas que no están marcadas en el mapa
            if(vecino.visitado && !arista.visitado) {
                arista.visitado = true;
                vecino.referente = nodoActual;
                nodosActualizados.push(vecino);
            }

            if (vecino.visitado || vecino.encolado) continue;

            // Marcar como encolado en O(1) en lugar de usar includes() O(n)
            this.cola.push(vecino);
            vecino.encolado = true;
            vecino.distanciaDesdeInicio = nodoActual.distanciaDesdeInicio + 1;
            vecino.padre = nodoActual;
            vecino.referente = nodoActual;
            
            // Añadir vecino a nodos actualizados para animación
            nodosActualizados.push(vecino);
        }

        // Siempre incluir el nodo actual al final
        nodosActualizados.push(nodoActual);
        return nodosActualizados;
    }
}

export default BFS;
