import DeckGL from "@deck.gl/react";
import { Map as MapGL } from "react-map-gl";
import maplibregl from "maplibre-gl";
import { PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { FlyToInterpolator } from "deck.gl";
import { TripsLayer } from "@deck.gl/geo-layers";
import { useEffect, useRef, useState } from "react";
import { obtenerGrafoYNodoCercano, encontrarNodoCercanoEnGrafo } from "../services/MapService";
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
    const [cargandoNodoInicio, setCargandoNodoInicio] = useState(false);
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
        if(cargandoNodoInicio) return;

        // Si no hay nodo inicial, establecer el nodo inicial
        if(!nodoInicio) {
            // Mostrar marcador inmediatamente en la posición clickeada
            setNodoInicio({ lon: e.coordinate[0], lat: e.coordinate[1] });
            setCargandoNodoInicio(true);

            const manejadorCarga = setTimeout(() => {
                setCargando(true);
            }, 300);

            try {
                // Una sola petición: descarga el grafo y encuentra el nodo cercano localmente
                const { grafo, nodo, circulo } = await obtenerGrafoYNodoCercano(
                    e.coordinate[1], e.coordinate[0], radio ?? configuracion.radio
                );

                setNodoInicio(nodo);
                setCargandoNodoInicio(false);
                setRadioSeleccion([{ contour: circulo }]);
                estado.current.grafo = grafo;
                clearTimeout(manejadorCarga);
                setCargando(false);
                ui.current.showSnack("Nodo inicial seleccionado. Ahora selecciona el nodo final dentro del área verde.", "success");

            } catch (error) {
                console.error("Error al cargar el nodo inicial:", error);
                clearTimeout(manejadorCarga);
                setCargando(false);
                setCargandoNodoInicio(false);
                setNodoInicio(null);
                setRadioSeleccion([]);

                const mensaje = error.message || "Error al cargar el mapa. Intenta en otra ubicación.";
                ui.current.showSnack(mensaje, "error");
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
        limpiarRuta(false);
        estado.current.start(configuracion.algoritmo);
        setIniciado(true);
    }

    // Iniciar o pausar animación en ejecución
    function alternarAnimacion(bucle = true, direccion = 1) {
        if(tiempo === 0 && !animacionTerminada) return;
        setDireccionReproduccion(direccion);
        if(animacionTerminada) {
            // Si la animación terminó y está pausada, reiniciar y reproducir
            if(!reproduccionActiva) {
                setTiempo(0);
                setReproduccionActiva(true);
                setIniciado(true);
                refTiempoAnterior.current = null;
            } else {
                // Si está reproduciéndose, pausar
                setReproduccionActiva(false);
            }
            return;
        }
        setIniciado(!iniciado);
        if(iniciado) {
            refTiempoAnterior.current = null;
        }
    }

    function limpiarRuta(resetNodos = true) {
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
        if (resetNodos) {
            setNodoInicio(null);
            setNodoFin(null);
            setRadioSeleccion([]);
            setCargandoNodoInicio(false);
        }
    }

    // Añadir nuevo nodo a la propiedad puntosRuta e incrementar temporizador
    // batch=true omite el setState (para llamadas en bucle; llamar setDatosViajes manualmente después)
    function actualizarPuntosRuta(nodo, nodoReferente, color = "path", multiplicadorTiempo = 1, batch = false) {
        if(!nodo || !nodoReferente) return;

        const tiempoBase = 100;
        const tiempoAñadido = tiempoBase * multiplicadorTiempo;

        puntosRuta.current.push({
            path: [[nodoReferente.longitud, nodoReferente.latitud], [nodo.longitud, nodo.latitud]],
            timestamps: [temporizador.current, temporizador.current + tiempoAñadido],
            color
        });

        temporizador.current += tiempoAñadido;

        if (!batch) {
            setDatosViajes([...puntosRuta.current]);
        }
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
        if(!iniciado && !reproduccionActiva) return;

        let animacionId;
        const velocidad = configuracion?.velocidad || 1;
        // Pasos de algoritmo por segundo a velocidad 1x.
        // Cada velocidad es un multiplicador exacto: 2x = el doble de pasos/seg que 1x.
        const BASE_PASOS_POR_SEGUNDO = 5;
        let acumuladorPasos = 0;

        function animar(nuevoTiempo) {
            // Delta real entre frames, con tope de 100ms (evita saltos al cambiar de pestaña)
            const delta = refTiempoAnterior.current != null
                ? Math.min(nuevoTiempo - refTiempoAnterior.current, 100)
                : 16;

            // Fase exploración: ejecutar N pasos proporcionales a velocidad y tiempo real
            if (!estado.current.finished && iniciado && !animacionTerminada) {
                acumuladorPasos += delta * BASE_PASOS_POR_SEGUNDO * velocidad / 1000;
                const pasosAEjecutar = Math.floor(acumuladorPasos);
                acumuladorPasos -= pasosAEjecutar;

                if (pasosAEjecutar > 0) {
                    let huboActualizacion = false;
                    for (let i = 0; i < pasosAEjecutar; i++) {
                        if (estado.current.finished) break;
                        const nodosActualizados = estado.current.nextStep();
                        for(const nodoActualizado of nodosActualizados) {
                            actualizarPuntosRuta(nodoActualizado, nodoActualizado.referente, "path", 1, true);
                        }
                        if (nodosActualizados.length > 0) huboActualizacion = true;
                    }
                    if (huboActualizacion) {
                        setDatosViajes([...puntosRuta.current]);
                        setTiempo(temporizador.current);
                    }
                }
            }

            // Fase ruta: trazar camino más corto, también escalado por velocidad
            if(estado.current.finished && !animacionTerminada) {
                if(!nodoTraza.current) nodoTraza.current = estado.current.nodoFin;

                acumuladorPasos += delta * BASE_PASOS_POR_SEGUNDO * velocidad / 1000;
                const pasosRuta = Math.floor(acumuladorPasos);
                acumuladorPasos -= pasosRuta;

                let terminoRuta = false;
                for (let i = 0; i < pasosRuta; i++) {
                    const nodoPadre = nodoTraza.current?.padre;
                    if(nodoPadre !== null && nodoPadre !== undefined) {
                        actualizarPuntosRuta(nodoPadre, nodoTraza.current, "route", 1, true);
                        nodoTraza.current = nodoPadre;
                    } else {
                        terminoRuta = true;
                        break;
                    }
                }

                if (pasosRuta > 0) {
                    setDatosViajes([...puntosRuta.current]);
                    setTiempo(temporizador.current);
                }
                if (terminoRuta) setAnimacionTerminada(true);
            }

            // Fase reproducción (cuando ya terminó)
            if(refTiempoAnterior.current != null && animacionTerminada && reproduccionActiva) {
                const deltaTiempo = nuevoTiempo - refTiempoAnterior.current;
                if(direccionReproduccion !== -1) {
                    setTiempo(t => {
                        const nuevoT = Math.max(Math.min(t + deltaTiempo * 2 * direccionReproduccion, temporizador.current), 0);
                        if(nuevoT >= temporizador.current) {
                            setReproduccionActiva(false);
                        }
                        return nuevoT;
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
