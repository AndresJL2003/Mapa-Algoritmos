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
 * Encuentra el nodo más cercano en un grafo ya cargado usando índice espacial
 * @param {Graph} grafo 
 * @param {Number} latitud 
 * @param {Number} longitud 
 * @returns {Object} nodo más cercano con formato {id, lat, lon}
 */
export function encontrarNodoCercanoEnGrafo(grafo, latitud, longitud) {
    const nodo = grafo.encontrarNodoCercano(latitud, longitud);
    
    if (!nodo) return null;

    return {
        id: nodo.id,
        lat: nodo.latitud,
        lon: nodo.longitud
    };
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

    // Optimización: procesar en una sola pasada
    const grafo = new Graph();
    const nodosMap = new Map();
    const ways = [];

    // Primera pasada: separar nodos y ways
    for(const elemento of datos.elements) {
        if(elemento.type === "node") {
            nodosMap.set(elemento.id, elemento);
        } else if(elemento.type === "way") {
            if(elemento.nodes && elemento.nodes.length >= 2) {
                ways.push(elemento);
            }
        }
    }

    // Segunda pasada: crear nodos en el grafo
    for(const [id, nodo] of nodosMap) {
        grafo.agregarNodo(id, nodo.lat, nodo.lon);
    }

    // Tercera pasada: conectar nodos según ways
    for(const way of ways) {
        for(let i = 0; i < way.nodes.length - 1; i++) {
            const nodo1 = grafo.obtenerNodo(way.nodes[i]);
            const nodo2 = grafo.obtenerNodo(way.nodes[i + 1]);
            if(nodo1 && nodo2) {
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