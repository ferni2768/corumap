import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { PixelRatioManager } from '../utils/pixelRatio';
import Marker from './Marker';
import Curve from './Curve';
import AnimatedPath from './AnimatedPath';
import RoundedCard from './RoundedCard';
import Image from './Image';
import '../styles/MapContainer.css';

// Mapbox access token
const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

if (!accessToken) {
    throw new Error('VITE_MAPBOX_ACCESS_TOKEN is not defined. Please check your .env file.');
}

mapboxgl.accessToken = accessToken;

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
    const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false); const [targetMarkerId, setTargetMarkerId] = useState<number | null>(null);
    const [currentMarkerLocation, setCurrentMarkerLocation] = useState<string>('Millemnium Bench');
    const [currentMarkerIndex, setCurrentMarkerIndex] = useState<number>(0); // Track current marker index
    const [hasExpandedImage, setHasExpandedImage] = useState(false);    // Initialize device info
    useEffect(() => {
        const pixelRatioManager = PixelRatioManager.getInstance();
        setIsMobile(pixelRatioManager.isMobileDevice());
    }, []);

    // Track expanded image state
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const hasExpanded = document.body.classList.contains('image-expanded');
                    setHasExpandedImage(hasExpanded);
                }
            });
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    // Calculate bounds based on zoom level and responsive center
    const calculateBounds = (zoom: number): [[number, number], [number, number]] => {
        const center = getResponsiveCenter();
        const factor = Math.pow(2, 12 - zoom) * 0.02;
        return [
            [center[0] - factor, center[1] - factor],
            [center[0] + factor, center[1] + factor]
        ];
    };

    // Get responsive center based on aspect ratio
    const getResponsiveCenter = (): [number, number] => {
        const aspectRatio = window.innerWidth / window.innerHeight;
        const baseCenter: [number, number] = [-8.409610, 43.378497];

        if (aspectRatio < 1.5) return [baseCenter[0], baseCenter[1] - 0.005]; // Portrait mode
        else return [baseCenter[0] + 0.01, baseCenter[1]]; // Landscape mode
    };

    // Get responsive zoom based on aspect ratio
    const getResponsiveZoom = (): number => {
        const aspectRatio = window.innerWidth / window.innerHeight;

        if (aspectRatio < 1.5) return 12; // Portrait mode
        else return 12.5; // Landscape mode
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
                const center = getResponsiveCenter();
                const zoom = getResponsiveZoom();
                const bounds = calculateBounds(zoom);

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
                    zoom: zoom,
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
                        // Update center and bounds based on new aspect ratio
                        const newCenter = getResponsiveCenter();
                        const newZoom = getResponsiveZoom();
                        const newBounds = calculateBounds(newZoom);

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
                        map.current.setCenter(newCenter);
                        map.current.setZoom(newZoom);
                        map.current.fitBounds(newBounds, { padding: 20, animate: false });
                    }
                };

                window.addEventListener('resize', handleMapResize);
                window.addEventListener('orientationchange', handleMapResize);
                window.addEventListener('pixelRatioChanged', handleMapResize);

                return () => {
                    clearTimeout(timeout);
                    window.removeEventListener('resize', handleMapResize);
                    window.removeEventListener('orientationchange', handleMapResize);
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

    const handleMarkerClick = (markerId: number) => {
        setTargetMarkerId(markerId);
    }; const handleAnimationComplete = () => {
        setTargetMarkerId(null);
    }; const handleCurrentMarkerChange = (_markerId: number, markerName: string) => {
        setCurrentMarkerLocation(markerName);
        // Update the current marker index based on the marker ID
        const markerIndex = MARKERS.findIndex(marker => marker.id === _markerId);
        if (markerIndex !== -1) {
            setCurrentMarkerIndex(markerIndex);
        }
    };

    const handlePreviousMarker = () => {
        if (currentMarkerIndex > 0) {
            const previousMarkerId = MARKERS[currentMarkerIndex - 1].id;
            setTargetMarkerId(previousMarkerId);
        }
    };

    const handleNextMarker = () => {
        if (currentMarkerIndex < MARKERS.length - 1) {
            const nextMarkerId = MARKERS[currentMarkerIndex + 1].id;
            setTargetMarkerId(nextMarkerId);
        }
    };

    const canGoPrevious = currentMarkerIndex > 0;
    const canGoNext = currentMarkerIndex < MARKERS.length - 1;

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
            <Marker map={map.current} markers={MARKERS} onMarkerClick={handleMarkerClick} />
            <AnimatedPath
                map={map.current}
                markers={MARKERS}
                targetMarkerId={targetMarkerId}
                onAnimationComplete={handleAnimationComplete}
                onCurrentMarkerChange={handleCurrentMarkerChange}
            />
            <RoundedCard
                showDebugOverlay={false}
                markerLocationText={currentMarkerLocation}
                onPreviousMarker={handlePreviousMarker}
                onNextMarker={handleNextMarker}
                canGoPrevious={canGoPrevious}
                canGoNext={canGoNext}
            />
            <Image
                className={`image-1 ${hasExpandedImage ? 'has-expanded-image' : ''} ${!isMobile ? 'desktop-scaled' : 'mobile-position'}`}
                alt="Image 1"
            />
            <Image
                className={`image-2 ${hasExpandedImage ? 'has-expanded-image' : ''} ${!isMobile ? 'desktop-scaled' : 'mobile-position'}`}
                alt="Image 2"
            />
            <Image
                className={`image-3 ${hasExpandedImage ? 'has-expanded-image' : ''} ${!isMobile ? 'desktop-scaled' : 'mobile-position'}`}
                alt="Image 3"
            />
        </div>
    );
};

export default MapContainer;
