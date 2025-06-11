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
        name: "1. Millenium Bench",
        coordinates: [-8.424606, 43.377608] as [number, number]
    },
    {
        id: 2,
        name: "2. Riazor Viewpoint",
        coordinates: [-8.414186, 43.370781] as [number, number]
    },
    {
        id: 3,
        name: "3. Rompeolas",
        coordinates: [-8.406707, 43.369615] as [number, number]
    },
    {
        id: 4,
        name: "4. Underground columns",
        coordinates: [-8.406837, 43.376709] as [number, number]
    },
    {
        id: 5,
        name: "5. Aquarium Viewpoint",
        coordinates: [-8.410986, 43.382821] as [number, number]
    },
    {
        id: 6,
        name: "6. Praia das Lapas",
        coordinates: [-8.407060, 43.383382] as [number, number]
    },
    {
        id: 7,
        name: "7. Rosa dos Ventos",
        coordinates: [-8.407725, 43.386702] as [number, number]
    },
    {
        id: 8,
        name: "8. Tower of Hercules viewpoint",
        coordinates: [-8.399772, 43.388004] as [number, number]
    },
    {
        id: 9,
        name: "9. Menhirs & Arab Graveyard",
        coordinates: [-8.392542, 43.385254] as [number, number]
    },
    {
        id: 10,
        name: "10. San Amaro",
        coordinates: [-8.395798, 43.381765] as [number, number]
    }
];

const MapContainer: React.FC = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [targetMarkerId, setTargetMarkerId] = useState<number | null>(null);
    const [currentMarkerLocation, setCurrentMarkerLocation] = useState<string>('1. Millenium Bench'); const [currentMarkerIndex, setCurrentMarkerIndex] = useState<number>(0); // Track current marker index
    const [fastAnimation, setFastAnimation] = useState<boolean>(false);
    const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward');
    const [hasExpandedImage, setHasExpandedImage] = useState(false);
    const [showRoundedCard, setShowRoundedCard] = useState(false);
    const [showImages, setShowImages] = useState(false);
    const [showMarkers, setShowMarkers] = useState(false);
    const [showCurve, setShowCurve] = useState(false); const [showAnimatedPath, setShowAnimatedPath] = useState(false);
    const [welcomingAnimationComplete, setWelcomingAnimationComplete] = useState(false);
    const [markerAnimationTrigger, setMarkerAnimationTrigger] = useState<{ markerId: number; timestamp: number } | null>(null);

    // Generate organic random delays for images
    const [organicImageDelays] = useState(() => {
        const baseDelay = 500; // Base delay in milliseconds (0.5s)
        const images = ['image-1', 'image-2', 'image-3'];

        return images.map((_,) => {
            // Add random variance (±100ms) for organic feel
            const variance = (Math.random() - 0.5) * 200; // ±100ms
            const organicDelay = Math.max(0, baseDelay + variance);
            return organicDelay;
        });
    });

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

        if (aspectRatio < 0.56) return [baseCenter[0] + 0.001, baseCenter[1] - 0.012]; // Narrow Portrait mode
        else if (aspectRatio < 1.5) return [baseCenter[0], baseCenter[1] - 0.0085]; // Portrait mode
        else return [baseCenter[0] + 0.0125, baseCenter[1]]; // Landscape mode
    };

    // Get responsive zoom based on aspect ratio
    const getResponsiveZoom = (): number => {
        const aspectRatio = window.innerWidth / window.innerHeight;

        if (aspectRatio < 0.6) return 12; // Narrow Portrait mode
        else if (aspectRatio < 1.5) return 11.85; // Portrait mode
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

        // Handle map resize for responsive design
        const handleMapResize = () => {
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

            if (map.current) {
                // Update center and bounds based on new aspect ratio
                const newCenter = getResponsiveCenter();
                const newZoom = getResponsiveZoom();
                const newBounds = calculateBounds(newZoom);

                map.current.resize();
                map.current.setCenter(newCenter);
                map.current.setZoom(newZoom);
                map.current.fitBounds(newBounds, { padding: 20, animate: false });
            }
        };

        // Add resize handlers immediately, even before map initialization
        window.addEventListener('resize', handleMapResize);
        window.addEventListener('orientationchange', handleMapResize);
        window.addEventListener('pixelRatioChanged', handleMapResize);

        const initMap = () => {
            try {
                // Always get current dimensions at the time of initialization
                const center = getResponsiveCenter();
                const zoom = getResponsiveZoom();

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

                    // Recalculate bounds with current dimensions when map loads
                    const currentCenter = getResponsiveCenter();
                    const currentZoom = getResponsiveZoom();
                    const currentBounds = calculateBounds(currentZoom);

                    // Update map to current dimensions
                    map.current.setCenter(currentCenter);
                    map.current.setZoom(currentZoom);
                    map.current.fitBounds(currentBounds, { padding: 20, animate: false });

                    // Disable all interactions
                    map.current.boxZoom.disable();
                    map.current.scrollZoom.disable();
                    map.current.dragPan.disable();
                    map.current.dragRotate.disable();
                    map.current.keyboard.disable();
                    map.current.doubleClickZoom.disable();
                    map.current.touchZoomRotate.disable();

                    // Start the welcoming animation sequence
                    startWelcomingAnimation();
                };

                const startWelcomingAnimation = () => {
                    setTimeout(() => setShowMarkers(true), 200);
                    setTimeout(() => setShowCurve(true), 1000);
                    setTimeout(() => setShowAnimatedPath(true), 2100);
                    setTimeout(() => setShowImages(true), 1300);
                    setTimeout(() => setShowRoundedCard(true), 1600);
                    setTimeout(() => setWelcomingAnimationComplete(true), 2950);
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

                return () => {
                    clearTimeout(timeout);
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

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleMapResize);
            window.removeEventListener('orientationchange', handleMapResize);
            window.removeEventListener('pixelRatioChanged', handleMapResize);
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [isMobile]);

    const handleMarkerClick = (markerId: number) => {
        // Calculate direction based on current vs target marker
        const targetIndex = MARKERS.findIndex(marker => marker.id === markerId);
        if (targetIndex !== -1) {
            const direction = targetIndex > currentMarkerIndex ? 'forward' : 'backward';
            setAnimationDirection(direction);

            // Calculate the jump distance to detect long jumps and enable fast animation
            const jumpDistance = Math.abs(targetIndex - currentMarkerIndex);
            if (jumpDistance > 6) {
                setFastAnimation(true);
                setTimeout(() => {
                    setFastAnimation(false);
                }, 1500);
            }
        }
        setTargetMarkerId(markerId);
    };

    const handleAnimationComplete = () => {
        setTargetMarkerId(null);
    };

    const handleCurrentMarkerChange = (_markerId: number, markerName: string) => {
        setCurrentMarkerLocation(markerName);
        // Update the current marker index based on the marker ID
        const markerIndex = MARKERS.findIndex(marker => marker.id === _markerId);
        if (markerIndex !== -1) {
            setCurrentMarkerIndex(markerIndex);
        }
    };

    const handlePreviousMarker = () => {
        if (currentMarkerIndex > 0) {
            setAnimationDirection('backward');
            const previousMarkerId = MARKERS[currentMarkerIndex - 1].id;
            setTargetMarkerId(previousMarkerId);

            // Trigger marker animation for the previous marker
            setMarkerAnimationTrigger({ markerId: previousMarkerId, timestamp: Date.now() });
        }
    };

    const handleNextMarker = () => {
        if (currentMarkerIndex < MARKERS.length - 1) {
            setAnimationDirection('forward');
            const nextMarkerId = MARKERS[currentMarkerIndex + 1].id;
            setTargetMarkerId(nextMarkerId);

            // Trigger marker animation for the next marker
            setMarkerAnimationTrigger({ markerId: nextMarkerId, timestamp: Date.now() });
        }
    };

    const canGoPrevious = currentMarkerIndex > 0;
    const canGoNext = currentMarkerIndex < MARKERS.length - 1;

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA') {
                return;
            } switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    if (currentMarkerIndex > 0) {
                        setAnimationDirection('backward');
                    }
                    handlePreviousMarker();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    if (currentMarkerIndex < MARKERS.length - 1) {
                        setAnimationDirection('forward');
                    }
                    handleNextMarker();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [currentMarkerIndex]);

    return (
        <>
            <div className="map-wrapper">
                <div ref={mapContainer} className="map-container" />
                <div className={`curve-wrapper ${showCurve ? 'fade-in' : 'fade-out'}`}>
                    <Curve map={map.current} markers={MARKERS} />
                </div>
                <div className={`marker-wrapper ${showMarkers ? 'scale-in' : 'scale-out'}`}>
                    <Marker map={map.current} markers={MARKERS} onMarkerClick={handleMarkerClick} triggerAnimation={markerAnimationTrigger} />
                </div>

                <div className={`animated-path-wrapper ${showAnimatedPath ? 'fade-in' : 'fade-out'}`}>
                    <AnimatedPath
                        map={map.current}
                        markers={MARKERS}
                        targetMarkerId={targetMarkerId}
                        onAnimationComplete={handleAnimationComplete}
                        onCurrentMarkerChange={handleCurrentMarkerChange}
                    />
                </div>
            </div>

            {/* UI Overlay - Outside pixelRatio-affected area */}
            <div className="ui-overlay">
                {/* Loading state */}
                {loading && (
                    <div className="loading-wrapper">
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p className="loading-text">Applying pixel ratio and loading map...</p>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="error-wrapper">
                        <div className="error-container">
                            <h2 className="error-title">Map Error</h2>
                            <p className="error-description">{error}</p>
                            <p className="error-help">Please check your internet connection and Mapbox token.</p>
                        </div>
                    </div>
                )}

                {/* Only show other UI elements when not in error state */}
                {!error && (
                    <>
                        <div className={`images-wrapper ${showImages ? 'fade-in' : 'fade-out'}`}>
                            <Image
                                className={`image-1 ${hasExpandedImage ? 'has-expanded-image' : ''}`}
                                alt="Image 1"
                                style={{ '--organic-image-delay': `${organicImageDelays[0]}ms` } as React.CSSProperties}
                            />
                            <Image
                                className={`image-2 ${hasExpandedImage ? 'has-expanded-image' : ''}`}
                                alt="Image 2"
                                style={{ '--organic-image-delay': `${organicImageDelays[1]}ms` } as React.CSSProperties}
                            />
                            <Image
                                className={`image-3 ${hasExpandedImage ? 'has-expanded-image' : ''}`}
                                alt="Image 3"
                                style={{ '--organic-image-delay': `${organicImageDelays[2]}ms` } as React.CSSProperties}
                            />
                        </div>

                        <div className={`rounded-card-wrapper ${showRoundedCard ? 'slide-up' : 'slide-down'} ${welcomingAnimationComplete ? 'welcome-animation-complete' : ''}`}>
                            <RoundedCard
                                showDebugOverlay={false}
                                markerLocationText={currentMarkerLocation}
                                onPreviousMarker={handlePreviousMarker}
                                onNextMarker={handleNextMarker}
                                canGoPrevious={canGoPrevious}
                                canGoNext={canGoNext}
                                fastAnimation={fastAnimation}
                                externalAnimationDirection={animationDirection}
                            />
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default MapContainer;
