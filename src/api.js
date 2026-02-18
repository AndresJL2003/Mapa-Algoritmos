const highWayExclude = ["footway", "street_lamp", "steps", "pedestrian", "track", "path"];

// Servidores alternativos de Overpass API para balanceo de carga
const OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter"
];

let servidorActual = 0;

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
 * Obtiene el siguiente servidor de Overpass API en rotación
 * @returns {string}
 */
function obtenerSiguienteServidor() {
    const servidor = OVERPASS_SERVERS[servidorActual];
    servidorActual = (servidorActual + 1) % OVERPASS_SERVERS.length;
    return servidor;
}

/**
 * Realiza petición a la API de Overpass con reintentos y manejo de errores
 * @param {Array} boundingBox array con 2 objetos que tienen propiedades latitude y longitude
 * @param {number} intentosRestantes número de reintentos permitidos
 * @returns {Promise<Response>}
 */
export async function fetchOverpassData(boundingBox, intentosRestantes = 2) {
    // Verificar caché
    const claveCaché = generarClaveCaché(boundingBox);
    const datosEnCaché = cache.get(claveCaché);

    if (datosEnCaché && Date.now() - datosEnCaché.timestamp < CACHE_EXPIRATION) {
        return datosEnCaché.data;
    }

    const exclusion = highWayExclude.map(e => `[highway!="${e}"]`).join("");
    const query = `
    [out:json][timeout:25];(
        way[highway]${exclusion}[footway!="*"]
        (${boundingBox[0].latitude},${boundingBox[0].longitude},${boundingBox[1].latitude},${boundingBox[1].longitude});
        node(w);
    );
    out skel;`;

    const servidor = obtenerSiguienteServidor();

    try {
        // Crear AbortController para timeout manual
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const respuesta = await fetch(servidor, {
            method: "POST",
            body: query,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Si el servidor responde con error 429 (Too Many Requests) o 504 (Gateway Timeout)
        if (respuesta.status === 429 || respuesta.status === 504) {
            if (intentosRestantes > 0) {
                console.warn(`Servidor ${servidor} sobrecargado (${respuesta.status}). Reintentando con otro servidor...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // esperar 1 segundo
                return fetchOverpassData(boundingBox, intentosRestantes - 1);
            }
            throw new Error(`Servidor de mapas sobrecargado. Por favor, intenta en unos segundos.`);
        }

        if (!respuesta.ok) {
            throw new Error(`Error del servidor: ${respuesta.status} ${respuesta.statusText}`);
        }

        // Verificar que la respuesta sea JSON válido
        const contentType = respuesta.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("El servidor no devolvió datos válidos. Intenta en otra ubicación.");
        }

        // Guardar en caché y retornar datos parseados directamente
        const datos = await respuesta.json();
        cache.set(claveCaché, { data: datos, timestamp: Date.now() });

        // Limpiar caché antigua (mantener solo últimas 10 entradas)
        if (cache.size > 10) {
            const primeraClaveAntigua = cache.keys().next().value;
            cache.delete(primeraClaveAntigua);
        }

        return datos;

    } catch (error) {
        // Si es un error de timeout o red, reintentar con otro servidor
        if ((error.name === "AbortError" || error.name === "TypeError") && intentosRestantes > 0) {
            console.warn(`Error de conexión con ${servidor}. Reintentando con otro servidor...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchOverpassData(boundingBox, intentosRestantes - 1);
        }
        
        throw error;
    }
}