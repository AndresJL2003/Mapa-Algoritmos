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
 * Obtiene datos de la API Overpass de OSM y retorna el nodo más cercano a las coordenadas especificadas
 * @param {Number} latitud 
 * @param {Number} longitud 
 * @returns {Promise<NodoOSM>} 
 */
export async function obtenerNodoCercano(latitud, longitud) {
    try {
        const circulo = createGeoJSONCircle([longitud, latitud], 0.1); // Reducido de 0.15 a 0.1 para mejor rendimiento
        const cajaDelimitadora = obtenerCajaDelimitadoraDePoligono(circulo);
        const respuesta = await fetchOverpassData(cajaDelimitadora);
        
        let datos;
        try {
            datos = await respuesta.json();
        } catch (parseError) {
            throw new Error("Error al procesar datos del servidor. Intenta en otra ubicación.");
        }

        if (!datos.elements || datos.elements.length === 0) {
            return null;
        }

        let resultado;
        for(const nodo of datos.elements) {
            if(nodo.type !== "node") continue;
            if(!resultado) {
                resultado = nodo;
                continue;
            }
            
            const nuevaDistancia = Math.sqrt(Math.pow(nodo.lat - latitud, 2) + Math.pow(nodo.lon - longitud, 2));
            const distanciaResultado = Math.sqrt(Math.pow(resultado.lat - latitud, 2) + Math.pow(resultado.lon - longitud, 2));

            if(nuevaDistancia < distanciaResultado) {
                resultado = nodo;
            }
        }

        return resultado;
    } catch (error) {
        console.error("Error en obtenerNodoCercano:", error);
        throw error;
    }
}

/**
 * Obtiene datos del mapa y los convierte en estructura de grafo
 * @param {Array} cajaDelimitadora array con 2 objetos que tienen propiedades latitude y longitude 
 * @param {Number} idNodoInicio 
 * @returns {Promise<Graph>}
 */
export async function obtenerGrafoMapa(cajaDelimitadora, idNodoInicio) {
    try {
        const respuesta = await fetchOverpassData(cajaDelimitadora);
        
        let datos;
        try {
            datos = await respuesta.json();
        } catch (parseError) {
            throw new Error("Error al procesar datos del servidor. Intenta en otra ubicación.");
        }

        if (!datos.elements || datos.elements.length === 0) {
            throw new Error("No se encontraron calles en esta área. Intenta en otra ubicación.");
        }

        const elementos = datos.elements;
        
        const grafo = new Graph();
        for(const elemento of elementos) {
            if(elemento.type === "node") {
                const nodo = grafo.agregarNodo(elemento.id, elemento.lat, elemento.lon);
                
                if(nodo.id === idNodoInicio) {
                    grafo.nodoInicio = nodo;
                }
            }
            else if(elemento.type === "way") {
                if(!elemento.nodes || elemento.nodes.length < 2) continue;

                for(let i = 0; i < elemento.nodes.length - 1; i++) {
                    const nodo1 = grafo.obtenerNodo(elemento.nodes[i]);
                    const nodo2 = grafo.obtenerNodo(elemento.nodes[i + 1]);

                    if(!nodo1 || !nodo2) {
                        continue;
                    }

                    nodo1.conectarA(nodo2);
                }
            }
        }

        if(!grafo.nodoInicio) {
            throw new Error("No se encontró el nodo de inicio en el área.");
        }

        return grafo;
    } catch (error) {
        console.error("Error en obtenerGrafoMapa:", error);
        throw error;
    }
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