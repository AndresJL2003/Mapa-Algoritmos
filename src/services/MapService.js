import { fetchOverpassData } from "../api";
import { createGeoJSONCircle } from "../helpers";
import Graph from "../models/Graph";

/**
 * @typedef {Object} NodoOSM
 * @property {String} type
 * @property {Number} id
 * @property {Number} lat
 * @property {Number} lon
 */

/**
 * Encuentra el nodo más cercano en un grafo ya cargado
 * @param {Graph} grafo 
 * @param {Number} latitud 
 * @param {Number} longitud 
 * @returns {Object} nodo más cercano con formato {id, lat, lon}
 */
export function encontrarNodoCercanoEnGrafo(grafo, latitud, longitud) {
    let nodoMasCercano = null;
    let distanciaMinima = Infinity;

    for(const [id, nodo] of grafo.nodos) {
        const distancia = Math.sqrt(
            Math.pow(nodo.latitud - latitud, 2) + 
            Math.pow(nodo.longitud - longitud, 2)
        );

        if(distancia < distanciaMinima) {
            distanciaMinima = distancia;
            nodoMasCercano = {
                id: nodo.id,
                lat: nodo.latitud,
                lon: nodo.longitud
            };
        }
    }

    return nodoMasCercano;
}

/**
 * Obtiene el grafo del área y el nodo de calle más cercano al clic en UNA SOLA petición.
 * El nodo cercano se busca localmente sobre los datos ya descargados.
 * @param {Number} latitud
 * @param {Number} longitud
 * @param {Number} radio en kilómetros
 * @returns {Promise<{grafo: Graph, nodo: NodoOSM, circulo: Number[][]}>}
 */
export async function obtenerGrafoYNodoCercano(latitud, longitud, radio) {
    const circulo = createGeoJSONCircle([longitud, latitud], radio);
    const cajaDelimitadora = obtenerCajaDelimitadoraDePoligono(circulo);

    const datos = await fetchOverpassData(cajaDelimitadora);

    if (!datos.elements || datos.elements.length === 0) {
        throw new Error("No se encontraron calles en esta área. Intenta en otra ubicación.");
    }

    const grafo = new Graph();
    for(const elemento of datos.elements) {
        if(elemento.type === "node") {
            grafo.agregarNodo(elemento.id, elemento.lat, elemento.lon);
        }
        else if(elemento.type === "way") {
            if(!elemento.nodes || elemento.nodes.length < 2) continue;
            for(let i = 0; i < elemento.nodes.length - 1; i++) {
                const nodo1 = grafo.obtenerNodo(elemento.nodes[i]);
                const nodo2 = grafo.obtenerNodo(elemento.nodes[i + 1]);
                if(!nodo1 || !nodo2) continue;
                nodo1.conectarA(nodo2);
            }
        }
    }

    const nodoCercano = encontrarNodoCercanoEnGrafo(grafo, latitud, longitud);
    if (!nodoCercano) {
        throw new Error("No se encontró ninguna calle cerca. Intenta hacer clic en una calle visible.");
    }

    grafo.nodoInicio = grafo.obtenerNodo(nodoCercano.id);
    return { grafo, nodo: nodoCercano, circulo };
}

/**
 * 
 * @param {Number[][]} poligono 
 * @returns {Array} array con 2 objetos que contienen propiedades latitude y longitude
 */
export function obtenerCajaDelimitadoraDePoligono(poligono) {
    const cajaDelimitadora = { 
        minLat: Number.MAX_VALUE, 
        maxLat: -Number.MAX_VALUE, 
        minLon: Number.MAX_VALUE, 
        maxLon: -Number.MAX_VALUE 
    };
    
    for(const coordenada of poligono) {
        if(coordenada[0] < cajaDelimitadora.minLon) cajaDelimitadora.minLon = coordenada[0];
        if(coordenada[0] > cajaDelimitadora.maxLon) cajaDelimitadora.maxLon = coordenada[0];
        if(coordenada[1] < cajaDelimitadora.minLat) cajaDelimitadora.minLat = coordenada[1];
        if(coordenada[1] > cajaDelimitadora.maxLat) cajaDelimitadora.maxLat = coordenada[1];
    }

    const formateado = [
        { latitude: cajaDelimitadora.minLat, longitude: cajaDelimitadora.minLon }, 
        { latitude: cajaDelimitadora.maxLat, longitude: cajaDelimitadora.maxLon }
    ];
    return formateado;
}