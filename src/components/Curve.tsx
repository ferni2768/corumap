import React, { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import '../styles/Curve.css';

interface MarkerData {
    id: number;
    name: string;
    coordinates: [number, number];
}

interface CurveProps {
    map: mapboxgl.Map | null;
    markers: MarkerData[];
}

interface CurvePoint {
    x: number;
    y: number;
}

interface CurveData {
    id: string;
    start: CurvePoint;
    end: CurvePoint;
    control1: CurvePoint;
    control2: CurvePoint;
    control3?: CurvePoint;
}

// Control points as percentages for each curve (relative to start-end line)
const CURVE_CONTROL_POINTS = [
    { cp1: { x: 0.5, y: -0.3 }, cp2: { x: 0.6, y: 0.5 } },                              // 1->2
    { cp1: { x: -0.2, y: 0.6 }, cp2: { x: 0.8, y: 0.3 } },                              // 2->3
    { cp1: { x: 0.5, y: 0.45 }, cp2: { x: 0.95, y: 0.45 }, cp3: { x: 0.94, y: 0.2 } },  // 3->4
    { cp1: { x: 0.6, y: 0.2 }, cp2: { x: 0.2, y: -0.3 } },                              // 4->5
    { cp1: { x: 0.3, y: -0.3 }, cp2: { x: 0.8, y: -0.4 } },                             // 5->6
    { cp1: { x: -0.3, y: 1.3 }, cp2: { x: 0.9, y: -0.7 } },                             // 6->7
    { cp1: { x: 0.3, y: -0.2 }, cp2: { x: 0.8, y: 0.4 } },                              // 7->8
    { cp1: { x: 0.5, y: -0.2 }, cp2: { x: 0.2, y: 0.4 } },                              // 8->9
    { cp1: { x: 0.2, y: 0.3 }, cp2: { x: 0.6, y: -0.5 } }                               // 9->10
];

const Curve: React.FC<CurveProps> = ({ map, markers }) => {
    const [curves, setCurves] = useState<CurveData[]>([]);

    const calculateControlPoint = (
        start: CurvePoint,
        end: CurvePoint,
        controlPercent: { x: number; y: number }
    ): CurvePoint => {
        // Calculate the vector from start to end
        const dx = end.x - start.x;
        const dy = end.y - start.y;

        // Calculate perpendicular vector
        const perpX = -dy;
        const perpY = dx;

        // Base point along the line
        const baseX = start.x + dx * controlPercent.x;
        const baseY = start.y + dy * controlPercent.x;

        // Add perpendicular offset
        const controlX = baseX + perpX * controlPercent.y;
        const controlY = baseY + perpY * controlPercent.y;

        return { x: controlX, y: controlY };
    };

    const updateCurves = () => {
        if (!map || markers.length < 2) return;

        const newCurves: CurveData[] = [];

        for (let i = 0; i < markers.length - 1; i++) {
            const startMarker = markers[i];
            const endMarker = markers[i + 1];
            const controlPoints = CURVE_CONTROL_POINTS[i];

            const startPoint = map.project(startMarker.coordinates);
            const endPoint = map.project(endMarker.coordinates);

            const control1 = calculateControlPoint(startPoint, endPoint, controlPoints.cp1);
            const control2 = calculateControlPoint(startPoint, endPoint, controlPoints.cp2);

            const curveData: CurveData = {
                id: `curve-${startMarker.id}-${endMarker.id}`,
                start: startPoint,
                end: endPoint,
                control1,
                control2
            };

            // Add third control point for curve 3->4 (index 2)
            if (i === 2 && controlPoints.cp3) {
                curveData.control3 = calculateControlPoint(startPoint, endPoint, controlPoints.cp3);
            }

            newCurves.push(curveData);
        }

        setCurves(newCurves);
    };

    useEffect(() => {
        if (!map) return;

        const events = ['move', 'zoom', 'rotate', 'pitch'];
        events.forEach(event => map.on(event, updateCurves));

        updateCurves();

        return () => {
            events.forEach(event => map.off(event, updateCurves));
        };
    }, [map, markers]);

    if (curves.length === 0) return null;

    return (
        <svg className="curve-container">
            {curves.map((curve) => (
                <g key={curve.id}>
                    <path
                        className="curve-path"
                        d={curve.control3 ?
                            `M ${curve.start.x} ${curve.start.y} C ${curve.control1.x} ${curve.control1.y}, ${curve.control2.x} ${curve.control2.y}, ${curve.control3.x} ${curve.control3.y} S ${curve.end.x} ${curve.end.y}, ${curve.end.x} ${curve.end.y}` :
                            `M ${curve.start.x} ${curve.start.y} C ${curve.control1.x} ${curve.control1.y}, ${curve.control2.x} ${curve.control2.y}, ${curve.end.x} ${curve.end.y}`
                        }
                    />
                </g>
            ))}
        </svg>
    );
};

export default Curve;