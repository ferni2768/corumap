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
    };

    if (markerPositions.length === 0) return null; return (
        <>
            {markerPositions.map(marker => (
                <div
                    key={marker.id}
                    className="marker-hitbox"
                    style={{
                        left: `${marker.x}px`,
                        top: `${marker.y}px`,
                        transform: 'translate(-50%, -50%)'
                    }}
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