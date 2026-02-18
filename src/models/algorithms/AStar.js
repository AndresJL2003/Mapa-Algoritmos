import PathfindingAlgorithm from "./PathfindingAlgorithm";

class AStar extends PathfindingAlgorithm {
    constructor() {
        super();
        this.listaAbierta = [];
        this.listaCerrada = [];
    }

    start(nodoInicio, nodoFin) {
        super.start(nodoInicio, nodoFin);
        this.listaAbierta = [this.nodoInicio];
        this.listaCerrada = [];
        this.nodoInicio.distanciaDesdeInicio = 0;
        this.nodoInicio.distanciaAlFinal = 0;
    }

    nextStep() {
        if(this.listaAbierta.length === 0) {
            this.finished = true;
            return [];
        }

        const nodosActualizados = [];
        const nodoActual = this.listaAbierta.reduce((acc, actual) => 
            actual.distanciaTotal < acc.distanciaTotal ? actual : acc, 
            this.listaAbierta[0]
        );
        this.listaAbierta.splice(this.listaAbierta.indexOf(nodoActual), 1);
        nodoActual.visitado = true;
        const aristaRef = nodoActual.aristas.find(a => a.obtenerOtroNodo(nodoActual) === nodoActual.referente);
        if(aristaRef) aristaRef.visitado = true;

        // Encontró el nodo final
        if(nodoActual.id === this.nodoFin.id) {
            this.listaAbierta = [];
            this.finished = true;
            return [nodoActual];
        }

        for(const v of nodoActual.vecinos) {
            const vecino = v.nodo;
            const arista = v.arista;
            const costoActualVecino = nodoActual.distanciaDesdeInicio + 
                Math.hypot(vecino.longitud - nodoActual.longitud, vecino.latitud - nodoActual.latitud);

            // Llenar aristas que no están marcadas en el mapa
            if(vecino.visitado && !arista.visitado) {
                arista.visitado = true;
                vecino.referente = nodoActual;
                nodosActualizados.push(vecino);
            }

            if(this.listaAbierta.includes(vecino)) {
                if(vecino.distanciaDesdeInicio <= costoActualVecino) continue;
            }
            else if(this.listaCerrada.includes(vecino)) {
                if(vecino.distanciaDesdeInicio <= costoActualVecino) continue;
                this.listaCerrada.splice(this.listaCerrada.indexOf(vecino), 1);
                this.listaAbierta.push(vecino);
            }
            else {
                this.listaAbierta.push(vecino);
                vecino.distanciaAlFinal = Math.hypot(
                    vecino.longitud - this.nodoFin.longitud, 
                    vecino.latitud - this.nodoFin.latitud
                );
            }

            vecino.distanciaDesdeInicio = costoActualVecino;
            vecino.referente = nodoActual;
            vecino.padre = nodoActual;
        }

        this.listaCerrada.push(nodoActual);

        return [...nodosActualizados, nodoActual];
    }
}

export default AStar;