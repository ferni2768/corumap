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
}

interface MarkerPosition {
    id: number;
    name: string;
    x: number;
    y: number;
}

const Marker: React.FC<MarkerProps> = ({ map, markers, onMarkerClick }) => {
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

        // Initial position update
        updateMarkerPositions();

        return () => {
            events.forEach(event => map.off(event, updateMarkerPositions));
        };
    }, [map, markers]);

    const handleMarkerClick = (markerId: number) => {
        onMarkerClick?.(markerId);
    }; if (markerPositions.length === 0) return null;

    return (
        <>
            {markerPositions.map(marker => (
                <div
                    key={marker.id}
                    className="marker-hitbox"
                    style={{
                        left: `${marker.x}px`,
                        top: `${marker.y}px`,
                        transform: 'translate(-50%, -50%)',
                        '--organic-delay': `${organicDelays.get(marker.id) || 0}ms`
                    } as React.CSSProperties}
                    title={marker.name}
                    onClick={() => handleMarkerClick(marker.id)}
                >
                    <div className="marker-visual" />
                </div>
            ))}
        </>
    );
};

export default Marker;