import PathfindingAlgorithm from "./PathfindingAlgorithm";

class DFS extends PathfindingAlgorithm {
    constructor() {
        super();
        this.pila = [];
    }

    start(nodoInicio, nodoFin) {
        super.start(nodoInicio, nodoFin);
        this.pila = [nodoInicio];
        nodoInicio.distanciaDesdeInicio = 0;
        nodoInicio.encolado = true;
    }

    nextStep() {
        if (this.pila.length === 0) {
            this.finished = true;
            return [];
        }

        const nodosActualizados = [];
        const nodoActual = this.pila.pop(); // LIFO - Last In First Out
        
        // Si ya fue visitado, saltar sin recursión
        if(nodoActual.visitado) {
            return [];
        }
        
        nodoActual.visitado = true;
        
        const aristaRef = nodoActual.aristas.find(a => 
            a.obtenerOtroNodo(nodoActual) === nodoActual.referente
        );
        if(aristaRef) aristaRef.visitado = true;

        // Encontró el nodo final
        if (nodoActual.id === this.nodoFin.id) {
            this.pila = [];
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
            this.pila.push(vecino);
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

export default DFS;
