import React, { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import '../styles/Marker.css';

interface MarkerData {
    id: number;
    name: string;
    coordinates: [number, number];
}

interface MarkerProps {
    map: mapboxgl.Map | null;
    markers: MarkerData[];
    onMarkerClick?: (markerId: number) => void;
    triggerAnimation?: { markerId: number; timestamp: number } | null;
}

interface MarkerPosition {
    id: number;
    name: string;
    x: number;
    y: number;
}

const Marker: React.FC<MarkerProps> = ({ map, markers, onMarkerClick, triggerAnimation }) => {
    const [markerPositions, setMarkerPositions] = useState<MarkerPosition[]>([]);
    const [organicDelays] = useState<Map<number, number>>(() => {
        // Generate organic random delays once when component mounts
        const delayMap = new Map<number, number>();
        const baseInterval = 125; // Base interval in milliseconds

        markers.forEach((marker, index) => {
            // Calculate base delay for this marker
            const baseDelay = index * baseInterval;

            // Add more varied random variance (±100ms) for organic feel
            const variance = Math.random() * 100;
            const organicDelay = Math.max(0, baseDelay + variance);

            delayMap.set(marker.id, organicDelay);
        });

        return delayMap;
    });

    // Handle external animation trigger
    useEffect(() => {
        if (triggerAnimation) {
            const markerElement = document.querySelector(`[data-marker-id="${triggerAnimation.markerId}"]`);
            if (markerElement) {
                const visualElement = markerElement.querySelector('.marker-visual') as HTMLElement;
                markerElement.classList.add('arrow-triggered');

                // Temporarily disable any existing animations during arrow animation
                if (visualElement) {
                    visualElement.style.animationName = 'arrow-marker-pulse';
                    visualElement.style.animationDelay = '0s';
                    visualElement.style.animationDuration = '0.6s';
                    visualElement.style.animationTimingFunction = 'ease-in-out';
                }

                setTimeout(() => {
                    markerElement.classList.remove('arrow-triggered');
                    if (visualElement) {
                        visualElement.style.animationName = 'none';
                        visualElement.style.animationDelay = '';
                        visualElement.style.animationDuration = '';
                        visualElement.style.animationTimingFunction = '';
                    }
                }, 600);
            }
        }
    }, [triggerAnimation]);

    const updateMarkerPositions = () => {
        if (!map) return;

        const positions = markers.map(marker => {
            const point = map.project(marker.coordinates);
            return {
                id: marker.id,
                name: marker.name,
                x: point.x,
                y: point.y
            };
        });
        setMarkerPositions(positions);
    };

    useEffect(() => {
        if (!map) return;

        // Update position on map events
        const events = ['move', 'zoom', 'rotate', 'pitch'];
        events.forEach(event => map.on(event, updateMarkerPositions));
        updateMarkerPositions();

        return () => {
            events.forEach(event => map.off(event, updateMarkerPositions));
        };
    }, [map, markers]);

    const handleMarkerClick = (markerId: number) => {
        onMarkerClick?.(markerId);
    };

    const handleTouchStart = (event: React.TouchEvent) => {
        // Add active class for mobile touch
        const element = event.currentTarget as HTMLElement;
        element.classList.add('active');
    };

    const handleTouchEnd = (event: React.TouchEvent) => {
        // Remove active class after touch with proper delay
        const element = event.currentTarget as HTMLElement;
        setTimeout(() => {
            element.classList.remove('active');
        }, 50);
    };

    const handleMouseDown = (event: React.MouseEvent) => {
        // Ensure PC clicks work properly
        const element = event.currentTarget as HTMLElement;
        element.classList.add('active');
    };

    const handleMouseUp = (event: React.MouseEvent) => {
        // Remove active class after PC click
        const element = event.currentTarget as HTMLElement;
        setTimeout(() => {
            element.classList.remove('active');
        }, 50);
    };

    if (markerPositions.length === 0) return null;

    return (
        <>
            {markerPositions.map(marker => (<div
                key={marker.id}
                className="marker-hitbox"
                data-marker-id={marker.id}
                style={{
                    left: `${marker.x}px`,
                    top: `${marker.y}px`,
                    transform: 'translate(-50%, -50%)',
                    '--organic-delay': `${organicDelays.get(marker.id) || 0}ms`
                } as React.CSSProperties}
                title={marker.name}
                onClick={() => handleMarkerClick(marker.id)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div className="marker-visual" />
            </div>
            ))}
        </>
    );
};

export default Marker;