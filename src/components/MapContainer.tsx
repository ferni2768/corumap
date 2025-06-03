import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { PixelRatioManager } from '../utils/pixelRatio';
import Marker from './Marker';
import Curve from './Curve';
import '../styles/MapContainer.css';

// Mapbox access token
const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

if (!accessToken) {
    throw new Error('VITE_MAPBOX_ACCESS_TOKEN is not defined. Please check your .env file.');
}

mapboxgl.accessToken = accessToken;

// Map zoom level
const MAP_ZOOM = 12;

// Markers data
const MARKERS = [
    {
        id: 1,
        name: "Millemnium Bench",
        coordinates: [-8.424606, 43.377608] as [number, number]
    },
    {
        id: 2,
        name: "Riazor Sea Sight",
        coordinates: [-8.414186, 43.370781] as [number, number]
    },
    {
        id: 3,
        name: "Rompeolas",
        coordinates: [-8.406707, 43.369615] as [number, number]
    },
    {
        id: 4,
        name: "Under the promenade columns",
        coordinates: [-8.406837, 43.376709] as [number, number]
    },
    {
        id: 5,
        name: "Aquarium sight",
        coordinates: [-8.410986, 43.382821] as [number, number]
    },
    {
        id: 6,
        name: "Tower of Hercules best sight",
        coordinates: [-8.407060, 43.383382] as [number, number]
    },
    {
        id: 7,
        name: "Rosa dos Ventos",
        coordinates: [-8.407725, 43.386702] as [number, number]
    },
    {
        id: 8,
        name: "Tower of Hercules far sight",
        coordinates: [-8.399772, 43.388004] as [number, number]
    },
    {
        id: 9,
        name: "Menhirs and Arab Graveyard",
        coordinates: [-8.392542, 43.385254] as [number, number]
    },
    {
        id: 10,
        name: "San Amaro",
        coordinates: [-8.395798, 43.381765] as [number, number]
    }
];

const MapContainer: React.FC = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Initialize device info
    useEffect(() => {
        const pixelRatioManager = PixelRatioManager.getInstance();
        setIsMobile(pixelRatioManager.isMobileDevice());
    }, []);

    // Calculate bounds based on zoom level
    const calculateBounds = (zoom: number): [[number, number], [number, number]] => {
        const center: [number, number] = [-8.408580, 43.375986];
        const factor = Math.pow(2, 12 - zoom) * 0.02;
        return [
            [center[0] - factor, center[1] - factor],
            [center[0] + factor, center[1] + factor]
        ];
    };

    // Get actual viewport dimensions for mobile devices
    const getViewportDimensions = () => {
        if (isMobile && 'visualViewport' in window && window.visualViewport) {
            return {
                width: window.visualViewport.width,
                height: window.visualViewport.height
            };
        }
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    };

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        const initMap = () => {
            try {
                const center: [number, number] = [-8.409610, 43.378497];
                const bounds = calculateBounds(MAP_ZOOM);

                // Set mobile container size before map initialization
                if (isMobile && mapContainer.current) {
                    const viewport = getViewportDimensions();
                    const mapWrapper = mapContainer.current.parentElement;

                    if (mapWrapper) {
                        mapWrapper.style.width = `${viewport.width}px`;
                        mapWrapper.style.height = `${viewport.height}px`;
                    }

                    mapContainer.current.style.width = `${viewport.width}px`;
                    mapContainer.current.style.height = `${viewport.height}px`;
                }

                map.current = new mapboxgl.Map({
                    container: mapContainer.current!,
                    style: 'mapbox://styles/mapbox/satellite-v9',
                    center: center,
                    zoom: MAP_ZOOM,
                    interactive: false,
                    attributionControl: true,
                    logoPosition: 'bottom-right',
                    preserveDrawingBuffer: true
                });

                let isLoaded = false;
                const onLoad = () => {
                    if (isLoaded || !map.current) return;
                    isLoaded = true;
                    setLoading(false);

                    map.current.fitBounds(bounds, { padding: 20, animate: false });

                    // Disable all interactions
                    map.current.boxZoom.disable();
                    map.current.scrollZoom.disable();
                    map.current.dragPan.disable();
                    map.current.dragRotate.disable();
                    map.current.keyboard.disable();
                    map.current.doubleClickZoom.disable();
                    map.current.touchZoomRotate.disable();
                };

                map.current.on('load', onLoad);
                map.current.on('idle', () => !isLoaded && onLoad());
                map.current.on('error', (e) => {
                    setError(`Map error: ${e.error?.message || 'Unknown error'}`);
                    setLoading(false);
                });

                // Mobile-specific setup
                if (isMobile) {
                    map.current.on('load', () => {
                        setTimeout(() => PixelRatioManager.getInstance().initialize(), 0);
                    });
                }

                // Timeout fallback
                const timeout = setTimeout(() => {
                    if (!isLoaded) {
                        setError('Map loading timeout - please check your internet connection');
                        setLoading(false);
                    }
                }, 10000);

                // Handle resize events
                const handleMapResize = () => {
                    if (map.current) {
                        // Update container dimensions for mobile devices
                        if (isMobile && mapContainer.current) {
                            const viewport = getViewportDimensions();
                            const mapWrapper = mapContainer.current.parentElement;

                            if (mapWrapper) {
                                mapWrapper.style.width = `${viewport.width}px`;
                                mapWrapper.style.height = `${viewport.height}px`;
                            }

                            mapContainer.current.style.width = `${viewport.width}px`;
                            mapContainer.current.style.height = `${viewport.height}px`;
                        }

                        map.current.resize();
                        map.current.fitBounds(bounds, { padding: 20, animate: false });
                    }
                };

                window.addEventListener('resize', handleMapResize);
                window.addEventListener('pixelRatioChanged', handleMapResize);

                return () => {
                    clearTimeout(timeout);
                    window.removeEventListener('resize', handleMapResize);
                    window.removeEventListener('pixelRatioChanged', handleMapResize);
                    if (map.current) {
                        map.current.remove();
                        map.current = null;
                    }
                };

            } catch (err) {
                setError(`Failed to initialize map: ${err instanceof Error ? err.message : 'Unknown error'}`);
                setLoading(false);
            }
        };

        const timer = setTimeout(initMap, 0);
        return () => clearTimeout(timer);
    }, [isMobile]);

    if (error) {
        return (
            <div className="map-container error">
                <div className="error-message">
                    <h2>Map Error</h2>
                    <p>{error}</p>
                    <p>Please check your internet connection and Mapbox token.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="map-wrapper">
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Loading A Coruña...</p>
                </div>
            )}
            <div ref={mapContainer} className="map-container" />
            <Curve map={map.current} markers={MARKERS} />
            <Marker map={map.current} markers={MARKERS} />
        </div>
    );
};

export default MapContainer;
