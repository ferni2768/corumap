import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { PixelRatioManager } from '../utils/pixelRatio';
import '../styles/MapContainer.css';

// Mapbox access token
const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

if (!accessToken) {
    throw new Error('VITE_MAPBOX_ACCESS_TOKEN is not defined. Please check your .env file.');
}

mapboxgl.accessToken = accessToken;

// Map zoom level
const MAP_ZOOM = 12;

const MapContainer: React.FC = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAndroid, setIsAndroid] = useState(false);

    // Initialize device info
    useEffect(() => {
        const pixelRatioManager = PixelRatioManager.getInstance();
        setIsAndroid(pixelRatioManager.isAndroidDevice());
    }, []);

    // Handle window and pixel ratio changes
    useEffect(() => {
        const handlePixelRatioChange = () => {
            // Force re-render when pixel ratio changes
        };

        window.addEventListener('pixelRatioChanged', handlePixelRatioChange);
        return () => window.removeEventListener('pixelRatioChanged', handlePixelRatioChange);
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

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        const initMap = () => {
            try {
                const center: [number, number] = [-8.409610, 43.378497];
                const bounds = calculateBounds(MAP_ZOOM);

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
                    if (map.current) {
                        map.current.boxZoom.disable();
                        map.current.scrollZoom.disable();
                        map.current.dragPan.disable();
                        map.current.dragRotate.disable();
                        map.current.keyboard.disable();
                        map.current.doubleClickZoom.disable();
                        map.current.touchZoomRotate.disable();
                    }
                };

                map.current.on('load', onLoad);
                map.current.on('idle', () => !isLoaded && onLoad());
                map.current.on('error', (e) => {
                    setError(`Map error: ${e.error?.message || 'Unknown error'}`);
                    setLoading(false);
                });

                // Android-specific setup
                if (isAndroid) {
                    map.current.on('load', () => {
                        setTimeout(() => PixelRatioManager.getInstance().initialize(), 200);
                    });
                }

                const timeout = setTimeout(() => {
                    if (!isLoaded) {
                        setError('Map loading timeout - please check your internet connection');
                        setLoading(false);
                    }
                }, 10000);

                const handleMapResize = () => {
                    if (map.current) {
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

        const timer = setTimeout(initMap, 100);
        return () => clearTimeout(timer);
    }, []);

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
    } return (
        <div className={`map-wrapper ${isAndroid ? 'android-device' : ''}`}>
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Loading A Coruña...</p>
                </div>
            )}
            <div ref={mapContainer} className="map-container" />
        </div>
    );
};

export default MapContainer;
