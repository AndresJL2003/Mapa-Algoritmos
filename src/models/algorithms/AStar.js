import PathfindingAlgorithm from "./PathfindingAlgorithm";
import MinHeap from "../../utils/MinHeap";

class AStar extends PathfindingAlgorithm {
    constructor() {
        super();
        this.listaAbierta = null;
        this.listaCerrada = new Set();
    }

    start(nodoInicio, nodoFin) {
        super.start(nodoInicio, nodoFin);
        
        // Usar MinHeap para obtener el nodo con menor f en O(log n)
        this.listaAbierta = new MinHeap((a, b) => 
            a.distanciaTotal - b.distanciaTotal
        );
        
        this.listaCerrada.clear();
        this.nodoInicio.distanciaDesdeInicio = 0;
        this.nodoInicio.distanciaAlFinal = Math.hypot(
            this.nodoInicio.longitud - this.nodoFin.longitud,
            this.nodoInicio.latitud - this.nodoFin.latitud
        );
        this.nodoInicio.enHeap = true;
        this.listaAbierta.push(this.nodoInicio);
    }

    nextStep() {
        if(this.listaAbierta.isEmpty()) {
            this.finished = true;
            return [];
        }

        const nodosActualizados = [];
        const nodoActual = this.listaAbierta.pop();
        nodoActual.enHeap = false;
        nodoActual.visitado = true;
        
        const aristaRef = nodoActual.aristas.find(a => 
            a.obtenerOtroNodo(nodoActual) === nodoActual.referente
        );
        if(aristaRef) aristaRef.visitado = true;

        // Encontró el nodo final
        if(nodoActual.id === this.nodoFin.id) {
            this.listaAbierta.clear();
            this.finished = true;
            return [nodoActual];
        }

        for(const v of nodoActual.vecinos) {
            const vecino = v.nodo;
            const arista = v.arista;
            
            // Llenar aristas que no están marcadas en el mapa
            if(vecino.visitado && !arista.visitado) {
                arista.visitado = true;
                vecino.referente = nodoActual;
                nodosActualizados.push(vecino);
            }

            // Saltar nodos ya procesados
            if(this.listaCerrada.has(vecino)) continue;

            const costoActualVecino = nodoActual.distanciaDesdeInicio + 
                Math.hypot(
                    vecino.longitud - nodoActual.longitud, 
                    vecino.latitud - nodoActual.latitud
                );

            // Si el vecino ya está en la lista abierta con mejor costo, saltar
            if(vecino.enHeap && vecino.distanciaDesdeInicio <= costoActualVecino) {
                continue;
            }

            // Actualizar o añadir vecino
            vecino.distanciaDesdeInicio = costoActualVecino;
            
            if(!vecino.enHeap) {
                vecino.distanciaAlFinal = Math.hypot(
                    vecino.longitud - this.nodoFin.longitud, 
                    vecino.latitud - this.nodoFin.latitud
                );
                vecino.enHeap = true;
                this.listaAbierta.push(vecino);
                
                // Añadir vecino a nodos actualizados para animación
                nodosActualizados.push(vecino);
            }

            vecino.referente = nodoActual;
            vecino.padre = nodoActual;
        }

        this.listaCerrada.add(nodoActual);

        // Siempre incluir el nodo actual al final
        nodosActualizados.push(nodoActual);
        return nodosActualizados;
    }
}

export default AStar;
