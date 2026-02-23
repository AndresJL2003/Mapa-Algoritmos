/* global AggregateError */

const highWayExclude = [
    "footway", "street_lamp", "steps", "pedestrian",
    "track", "path", "cycleway", "bridleway",
    "construction", "proposed", "platform", "elevator"
];

// Servidores alternativos de Overpass API para balanceo de carga
const OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter"
];

// Caché simple para reducir llamadas repetidas
const cache = new Map();
const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutos

/**
 * Genera una clave de caché basada en la caja delimitadora
 * @param {Array} boundingBox
 * @returns {string}
 */
function generarClaveCaché(boundingBox) {
    return `${boundingBox[0].latitude.toFixed(4)},${boundingBox[0].longitude.toFixed(4)},${boundingBox[1].latitude.toFixed(4)},${boundingBox[1].longitude.toFixed(4)}`;
}

/**
 * Realiza la petición HTTP a un servidor Overpass y parsea la respuesta
 * @param {string} url
 * @param {string} query
 * @param {AbortSignal} signal
 * @returns {Promise<Object>}
 */
async function fetchDeServidor(url, query, signal) {
    const resp = await fetch(url, {
        method: "POST",
        body: query,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal
    });

    if (resp.status === 429 || resp.status === 504) throw new Error("sobrecargado");
    if (!resp.ok) throw new Error(`Error del servidor: ${resp.status} ${resp.statusText}`);

    const contentType = resp.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
        throw new Error("El servidor no devolvió datos válidos. Intenta en otra ubicación.");
    }

    return resp.json();
}

/**
 * Lanza una petición escalonada: espera `i * 4s` antes de iniciar,
 * permitiendo que el servidor anterior tenga prioridad.
 * @param {string} url
 * @param {number} i índice del servidor (0 = sin espera)
 * @param {string} query
 * @param {AbortController[]} controllers
 * @returns {Promise<Object>}
 */
async function peticionEscalonada(url, i, query, controllers) {
    if (i > 0) await new Promise(r => setTimeout(r, i * 4000));
    if (controllers[i].signal.aborted) throw new Error("cancelado");

    const timeoutId = setTimeout(() => controllers[i].abort(), 20000);
    try {
        const datos = await fetchDeServidor(url, query, controllers[i].signal);
        clearTimeout(timeoutId);
        return datos;
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

/**
 * Realiza petición a la API de Overpass con hedged requests:
 * arranca el servidor 2 si el servidor 1 tarda más de 4s,
 * y el servidor 3 si ambos tardan más de 8s. Usa el primero que responda.
 * @param {Array} boundingBox array con 2 objetos que tienen propiedades latitude y longitude
 * @param {number} intentosRestantes número de reintentos permitidos
 * @returns {Promise<Object>}
 */
export async function fetchOverpassData(boundingBox, intentosRestantes = 2) {
    // Verificar caché
    const claveCaché = generarClaveCaché(boundingBox);
    const datosEnCaché = cache.get(claveCaché);
    if (datosEnCaché && Date.now() - datosEnCaché.timestamp < CACHE_EXPIRATION) {
        return datosEnCaché.data;
    }

    const exclusion = highWayExclude.map(e => `[highway!="${e}"]`).join("");
    const bbox = `${boundingBox[0].latitude},${boundingBox[0].longitude},${boundingBox[1].latitude},${boundingBox[1].longitude}`;
    // out skel qt: formato mínimo + ordenamiento quad-tile (más rápido de procesar)
    const query = `[out:json][timeout:25];(way[highway]${exclusion}(${bbox});node(w););out skel qt;`;

    // Un AbortController por servidor para cancelar los perdedores
    const controllers = OVERPASS_SERVERS.map(() => new AbortController());

    // Hedged requests: servidor i arranca después de i*4 segundos
    // Si el servidor 0 responde en 3s, los servidores 1 y 2 nunca se usan
    // Si el servidor 0 tarda 5s, el servidor 1 ya arrancó al segundo 4
    const promesas = OVERPASS_SERVERS.map((url, i) => peticionEscalonada(url, i, query, controllers));

    try {
        const datos = await Promise.any(promesas);

        // Cancelar los requests que aún están en vuelo
        controllers.forEach(c => c.abort());

        // Guardar en caché
        cache.set(claveCaché, { data: datos, timestamp: Date.now() });
        if (cache.size > 10) cache.delete(cache.keys().next().value);

        return datos;

    } catch (error) {
        controllers.forEach(c => c.abort());

        if (intentosRestantes > 0) {
            console.warn("Todos los servidores fallaron. Reintentando...");
            await new Promise(r => setTimeout(r, 500));
            return fetchOverpassData(boundingBox, intentosRestantes - 1);
        }

        if (error instanceof AggregateError) {
            throw new Error("Servidor de mapas no disponible. Por favor, intenta en unos segundos.");
        }
        throw error;
    }
}
