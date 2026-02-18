import DeckGL from "@deck.gl/react";
import { Map as MapGL } from "react-map-gl";
import maplibregl from "maplibre-gl";
import { PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { FlyToInterpolator } from "deck.gl";
import { TripsLayer } from "@deck.gl/geo-layers";
import { createGeoJSONCircle } from "../helpers";
import { useEffect, useRef, useState } from "react";
import { obtenerCajaDelimitadoraDePoligono, obtenerGrafoMapa, obtenerNodoCercano, encontrarNodoCercanoEnGrafo } from "../services/MapService";
import PathfindingState from "../models/PathfindingState";
import Interface from "./Interface";
import { INITIAL_COLORS, INITIAL_VIEW_STATE, MAP_STYLE } from "../config";

function Map() {
    const [nodoInicio, setNodoInicio] = useState(null);
    const [nodoFin, setNodoFin] = useState(null);
    const [radioSeleccion, setRadioSeleccion] = useState([]);
    const [datosViajes, setDatosViajes] = useState([]);
    const [iniciado, setIniciado] = useState();
    const [tiempo, setTiempo] = useState(0);
    const [animacionTerminada, setAnimacionTerminada] = useState(false);
    const [reproduccionActiva, setReproduccionActiva] = useState(false);
    const [direccionReproduccion, setDireccionReproduccion] = useState(1);
    const [cinematico, setCinematico] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [configuracion, setConfiguracion] = useState({ algoritmo: "astar", radio: 4, velocidad: 5 });
    const [colores, setColores] = useState(INITIAL_COLORS);
    const [estadoVista, setEstadoVista] = useState(INITIAL_VIEW_STATE);
    const ui = useRef();
    const refTiempoAnterior = useRef();
    const temporizador = useRef(0);
    const puntosRuta = useRef([]);
    const estado = useRef(new PathfindingState());
    const nodoTraza = useRef(null);
    const nodoTraza2 = useRef(null);

    async function clicMapa(e, _info, radio = null) {
        if(iniciado && !animacionTerminada) return;

        // Si no hay nodo inicial, establecer el nodo inicial
        if(!nodoInicio) {
            const manejadorCarga = setTimeout(() => {
                setCargando(true);
            }, 300);

            try {
                // Obtener nodo más cercano desde la API
                const nodo = await obtenerNodoCercano(e.coordinate[1], e.coordinate[0]);
                if(!nodo) {
                    ui.current.showSnack("No se encontró ninguna calle cerca. Intenta hacer clic en una calle visible.", "error");
                    clearTimeout(manejadorCarga);
                    setCargando(false);
                    return;
                }

                setNodoInicio(nodo);
                const circulo = createGeoJSONCircle([nodo.lon, nodo.lat], radio ?? configuracion.radio);
                setRadioSeleccion([{ contour: circulo}]);
                
                // Obtener nodos dentro del radio
                const grafo = await obtenerGrafoMapa(obtenerCajaDelimitadoraDePoligono(circulo), nodo.id);
                estado.current.grafo = grafo;
                clearTimeout(manejadorCarga);
                setCargando(false);
                ui.current.showSnack("Nodo inicial seleccionado. Ahora selecciona el nodo final dentro del área verde.", "success");
                
            } catch (error) {
                console.error("Error al cargar el nodo inicial:", error);
                clearTimeout(manejadorCarga);
                setCargando(false);
                
                // Mensajes de error más específicos
                const mensaje = error.message || "Error al cargar el mapa. Intenta en otra ubicación.";
                ui.current.showSnack(mensaje, "error");
                
                setNodoInicio(null);
                setRadioSeleccion([]);
            }
            
            return;
        }

        // Si ya hay nodo inicial, establecer el nodo final (búsqueda local, sin API)
        if(!estado.current.grafo) {
            ui.current.showSnack("Espera a que se cargue el área de búsqueda.", "warning");
            return;
        }

        const nodo = encontrarNodoCercanoEnGrafo(estado.current.grafo, e.coordinate[1], e.coordinate[0]);
        if(!nodo) {
            ui.current.showSnack("No se encontró ningún nodo en el grafo. Intenta más cerca del punto inicial.", "error");
            return;
        }

        const nodoFinalReal = estado.current.obtenerNodo(nodo.id);
        if(!nodoFinalReal) {
            ui.current.showSnack("El nodo final debe estar dentro del área verde. Intenta más cerca del punto inicial.", "warning");
            return;
        }
        
        setNodoFin(nodo);
        estado.current.nodoFin = nodoFinalReal;
        ui.current.showSnack("Nodo final seleccionado. Presiona Play para iniciar la visualización.", "success");
    }

    // Iniciar nueva animación de pathfinding
    function iniciarPathfinding() {
        limpiarRuta();
        estado.current.start(configuracion.algoritmo);
        setIniciado(true);
    }

    // Iniciar o pausar animación en ejecución
    function alternarAnimacion(bucle = true, direccion = 1) {
        if(tiempo === 0 && !animacionTerminada) return;
        setDireccionReproduccion(direccion);
        if(animacionTerminada) {
            if(bucle && tiempo >= temporizador.current) {
                setTiempo(0);
            }
            setIniciado(true);
            setReproduccionActiva(!reproduccionActiva);
            return;
        }
        setIniciado(!iniciado);
        if(iniciado) {
            refTiempoAnterior.current = null;
        }
    }

    function limpiarRuta() {
        setIniciado(false);
        setDatosViajes([]);
        setTiempo(0);
        estado.current.reset();
        puntosRuta.current = [];
        temporizador.current = 0;
        refTiempoAnterior.current = null;
        nodoTraza.current = null;
        nodoTraza2.current = null;
        setAnimacionTerminada(false);
        setNodoInicio(null);
        setNodoFin(null);
        setRadioSeleccion([]);
    }

    // Añadir nuevo nodo a la propiedad puntosRuta e incrementar temporizador
    function actualizarPuntosRuta(nodo, nodoReferente, color = "path", multiplicadorTiempo = 1) {
        if(!nodo || !nodoReferente) return;
        const distancia = Math.hypot(nodo.longitud - nodoReferente.longitud, nodo.latitud - nodoReferente.latitud);
        const tiempoAñadido = distancia * 50000 * multiplicadorTiempo;

        puntosRuta.current = [...puntosRuta.current,
            { 
                path: [[nodoReferente.longitud, nodoReferente.latitud], [nodo.longitud, nodo.latitud]],
                timestamps: [temporizador.current, temporizador.current + tiempoAñadido],
                color
            }
        ];

        temporizador.current += tiempoAñadido;
        setDatosViajes(() => puntosRuta.current);
    }

    function cambiarUbicacion(ubicacion) {
        setEstadoVista({ ...estadoVista, longitude: ubicacion.longitude, latitude: ubicacion.latitude, zoom: 13, transitionDuration: 1, transitionInterpolator: new FlyToInterpolator()});
    }

    function cambiarConfiguracion(nuevaConfiguracion) {
        setConfiguracion(nuevaConfiguracion);
        const items = { configuracion: nuevaConfiguracion, colores };
        localStorage.setItem("path_settings", JSON.stringify(items));
    }

    function cambiarColores(nuevosColores) {
        setColores(nuevosColores);
        const items = { configuracion, colores: nuevosColores };
        localStorage.setItem("path_settings", JSON.stringify(items));
    }

    function cambiarAlgoritmo(algoritmo) {
        limpiarRuta();
        cambiarConfiguracion({ ...configuracion, algoritmo });
    }

    function cambiarRadio(radio) {
        cambiarConfiguracion({...configuracion, radio});
        if(nodoInicio) {
            clicMapa({coordinate: [nodoInicio.lon, nodoInicio.lat]}, {}, radio);
        }
    }

    useEffect(() => {
        if(!iniciado) return;
        
        let animacionId;
        const velocidad = configuracion?.velocidad || 5;
        
        function animar(nuevoTiempo) {
            // Ejecutar pasos del algoritmo
            for(let i = 0; i < velocidad; i++) {
                const nodosActualizados = estado.current.nextStep();
                for(const nodoActualizado of nodosActualizados) {
                    actualizarPuntosRuta(nodoActualizado, nodoActualizado.referente);
                }

                // Encontró el final pero esperando que termine la animación
                if(estado.current.finished && !animacionTerminada) {
                    if(!nodoTraza.current) nodoTraza.current = estado.current.nodoFin;
                    const nodoPadre = nodoTraza.current.padre;
                    actualizarPuntosRuta(nodoPadre, nodoTraza.current, "route", Math.max(Math.log2(velocidad), 1));
                    nodoTraza.current = nodoPadre ?? nodoTraza.current;
                    if(nodoPadre == null) {
                        setAnimacionTerminada(true);
                    }
                }
            }

            // Progreso de animación
            if (refTiempoAnterior.current != null && !animacionTerminada) {
                const deltaTiempo = nuevoTiempo - refTiempoAnterior.current;
                setTiempo(t => t + deltaTiempo * direccionReproduccion);
            }

            // Progreso de reproducción
            if(refTiempoAnterior.current != null && animacionTerminada && reproduccionActiva) {
                const deltaTiempo = nuevoTiempo - refTiempoAnterior.current;
                if(direccionReproduccion !== -1) {
                    setTiempo(t => {
                        const nuevoTiempo = Math.max(Math.min(t + deltaTiempo * 2 * direccionReproduccion, temporizador.current), 0);
                        if(nuevoTiempo >= temporizador.current) {
                            setReproduccionActiva(false);
                        }
                        return nuevoTiempo;
                    });
                }
            }

            refTiempoAnterior.current = nuevoTiempo;
            animacionId = requestAnimationFrame(animar);
        }
        
        animacionId = requestAnimationFrame(animar);
        return () => {
            if(animacionId) cancelAnimationFrame(animacionId);
        };
    }, [iniciado, animacionTerminada, reproduccionActiva, direccionReproduccion, configuracion]);

    useEffect(() => {
        const configuracionGuardada = localStorage.getItem("path_settings");
        if(!configuracionGuardada) return;
        const items = JSON.parse(configuracionGuardada);

        // Compatibilidad con nombres antiguos
        if(items.settings) {
            setConfiguracion({
                algoritmo: items.settings.algorithm || "astar",
                radio: items.settings.radius || 4,
                velocidad: items.settings.speed || 5
            });
        } else if(items.configuracion) {
            setConfiguracion(items.configuracion);
        }
        
        if(items.colors) {
            setColores(items.colors);
        } else if(items.colores) {
            setColores(items.colores);
        }
    }, []);

    return (
        <>
            <div onContextMenu={(e) => { e.preventDefault(); }}>
                <DeckGL
                    initialViewState={estadoVista}
                    controller={{ doubleClickZoom: false, keyboard: false }}
                    onClick={clicMapa}
                >
                    <PolygonLayer 
                        id={"selection-radius"}
                        data={radioSeleccion}
                        pickable={true}
                        stroked={true}
                        getPolygon={d => d.contour}
                        getFillColor={[80, 210, 0, 10]}
                        getLineColor={[9, 142, 46, 175]}
                        getLineWidth={3}
                        opacity={0.6}
                    />
                    <TripsLayer
                        id={"pathfinding-layer"}
                        data={datosViajes}
                        opacity={1}
                        widthMinPixels={3}
                        widthMaxPixels={5}
                        fadeTrail={false}
                        currentTime={tiempo}
                        getColor={d => colores[d.color]}
                        updateTriggers={{
                            getColor: [colores.path, colores.route]
                        }}
                    />
                    <ScatterplotLayer 
                        id="start-end-points"
                        data={[
                            ...(nodoInicio ? [{ coordinates: [nodoInicio.lon, nodoInicio.lat], color: colores.startNodeFill, lineColor: colores.startNodeBorder }] : []),
                            ...(nodoFin ? [{ coordinates: [nodoFin.lon, nodoFin.lat], color: colores.endNodeFill, lineColor: colores.endNodeBorder }] : []),
                        ]}
                        pickable={true}
                        opacity={1}
                        stroked={true}
                        filled={true}
                        radiusScale={1}
                        radiusMinPixels={7}
                        radiusMaxPixels={20}
                        lineWidthMinPixels={1}
                        lineWidthMaxPixels={3}
                        getPosition={d => d.coordinates}
                        getFillColor={d => d.color}
                        getLineColor={d => d.lineColor}
                    />
                    <MapGL 
                        reuseMaps mapLib={maplibregl} 
                        mapStyle={MAP_STYLE} 
                        doubleClickZoom={false}
                    />
                </DeckGL>
            </div>
            <Interface 
                ref={ui}
                canStart={nodoInicio && nodoFin}
                started={iniciado}
                animationEnded={animacionTerminada}
                playbackOn={reproduccionActiva}
                time={tiempo}
                startPathfinding={iniciarPathfinding}
                toggleAnimation={alternarAnimacion}
                clearPath={limpiarRuta}
                timeChanged={setTiempo}
                changeLocation={cambiarUbicacion}
                maxTime={temporizador.current}
                settings={configuracion}
                setSettings={cambiarConfiguracion}
                changeAlgorithm={cambiarAlgoritmo}
                colors={colores}
                setColors={cambiarColores}
                loading={cargando}
                cinematic={cinematico}
                setCinematic={setCinematico}
                changeRadius={cambiarRadio}
            />

        </>
    );
}

export default Map;
