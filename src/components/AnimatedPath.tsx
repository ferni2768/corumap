import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import '../styles/AnimatedPath.css';

interface MarkerData {
    id: number;
    name: string;
    coordinates: [number, number];
}

interface AnimatedPathProps {
    map: mapboxgl.Map | null;
    markers: MarkerData[];
    targetMarkerId: number | null;
    onAnimationComplete?: () => void;
    onCurrentMarkerChange?: (markerId: number, markerName: string) => void;
    isMapMoving?: boolean;
    welcomingAnimationComplete?: boolean;
}

interface CurvePoint {
    x: number;
    y: number;
}

// Same control points as the Curve component
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

const AnimatedPath: React.FC<AnimatedPathProps> = ({ map, markers, targetMarkerId, onAnimationComplete, onCurrentMarkerChange, isMapMoving, welcomingAnimationComplete }) => {
    const [position, setPosition] = useState<CurvePoint>({ x: 0, y: 0 });
    const [isVisible, setIsVisible] = useState(false);
    const [currentMarkerId, setCurrentMarkerId] = useState<number>(1); // Start at first marker

    const animationRef = useRef<number>();
    const startTimeRef = useRef<number>();
    const pathToFollowRef = useRef<number[]>([]);
    const isAnimatingRef = useRef<boolean>(false);
    const totalAnimationDurationRef = useRef<number>(2000);
    const currentExactPositionRef = useRef<number>(1);
    const isResizingRef = useRef<boolean>(false);
    const lastResizeTimeRef = useRef<number>(0);

    const calculateControlPoint = (
        start: CurvePoint,
        end: CurvePoint,
        controlPercent: { x: number; y: number }
    ): CurvePoint => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const perpX = -dy;
        const perpY = dx;
        const baseX = start.x + dx * controlPercent.x;
        const baseY = start.y + dy * controlPercent.x;
        const controlX = baseX + perpX * controlPercent.y;
        const controlY = baseY + perpY * controlPercent.y;
        return { x: controlX, y: controlY };
    };

    const getBezierPoint = (t: number, start: CurvePoint, cp1: CurvePoint, cp2: CurvePoint, end: CurvePoint, cp3?: CurvePoint): CurvePoint => {
        if (cp3) {
            const mt = 1 - t;
            const mt2 = mt * mt;
            const mt3 = mt2 * mt;
            const t2 = t * t;
            const t3 = t2 * t;

            return {
                x: mt3 * start.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * end.x,
                y: mt3 * start.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * end.y
            };
        } else {
            const mt = 1 - t;
            const mt2 = mt * mt;
            const mt3 = mt2 * mt;
            const t2 = t * t;
            const t3 = t2 * t;

            return {
                x: mt3 * start.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * end.x,
                y: mt3 * start.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * end.y
            };
        }
    };

    const generatePath = (from: number, to: number): number[] => {
        // Handle fractional starting positions
        const startMarkerId = Math.floor(from);
        const endMarkerId = to;

        // If we're between markers and want to go to the lower marker, 
        // we need to include the current segment
        if (startMarkerId === endMarkerId && from > startMarkerId) {
            return [Math.ceil(from), endMarkerId];
        }

        if (startMarkerId === endMarkerId) return [];

        const path: number[] = [];
        if (startMarkerId < endMarkerId) {
            for (let i = startMarkerId; i <= endMarkerId; i++) {
                path.push(i);
            }
        } else {
            for (let i = startMarkerId; i >= endMarkerId; i--) {
                path.push(i);
            }
        }
        return path;
    };

    const reportCurrentMarker = (markerId: number) => {
        const marker = markers.find(m => m.id === markerId);
        if (marker && onCurrentMarkerChange) {
            onCurrentMarkerChange(markerId, marker.name);
        }
    };

    const startAnimation = (targetId: number) => {
        // Only skip if we're already exactly at the target and not animating
        if (targetId === currentExactPositionRef.current && !isAnimatingRef.current) return;

        // Use the exact current position (don't round it)
        const startPosition = currentExactPositionRef.current;

        // Generate path from current position to target
        const path = generatePath(startPosition, targetId);
        if (path.length <= 1) return; // No animation needed if already at target or invalid path

        pathToFollowRef.current = path;
        startTimeRef.current = performance.now();
        isAnimatingRef.current = true;

        // Calculate remaining distance for dynamic duration - made slower
        const totalDistance = Math.abs(targetId - startPosition);
        totalAnimationDurationRef.current = Math.max(totalDistance * 8000, 4000);

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        animate();
    };

    const updatePosition = () => {
        if (!map || markers.length < 2 || !isAnimatingRef.current) return;

        const path = pathToFollowRef.current;
        if (path.length <= 1) return;

        const now = performance.now();
        if (!startTimeRef.current) startTimeRef.current = now;

        const totalDuration = totalAnimationDurationRef.current;
        const totalElapsed = now - startTimeRef.current;
        const totalProgress = Math.min(totalElapsed / totalDuration, 1);

        if (totalProgress >= 1) { // Animation complete
            isAnimatingRef.current = false;
            const finalMarkerId = path[path.length - 1];
            setCurrentMarkerId(finalMarkerId);
            currentExactPositionRef.current = finalMarkerId;

            // Report the new current marker
            reportCurrentMarker(finalMarkerId);

            // Position at the final marker
            const finalMarker = markers.find(m => m.id === finalMarkerId);
            if (finalMarker) {
                const finalPoint = map.project(finalMarker.coordinates);
                setPosition(finalPoint);
            }

            onAnimationComplete?.();
            return;
        }
        // Calculate the target position based on progress
        const animationStartPosition = currentExactPositionRef.current;
        const targetPosition = path[path.length - 1];
        const currentPosition = animationStartPosition + (targetPosition - animationStartPosition) * totalProgress;
        currentExactPositionRef.current = currentPosition;
        const startPosition = pathToFollowRef.current[0];
        const endPosition = pathToFollowRef.current[pathToFollowRef.current.length - 1];
        const isForwardTravel = endPosition > startPosition;

        let currentDisplayMarkerId: number;
        if (isForwardTravel) {
            // Forward: Show destination marker immediately when journey starts
            currentDisplayMarkerId = Math.ceil(currentPosition);
        } else {
            // Backward: Show current marker until actually leaving it
            const paddedPosition = currentPosition + 0.05;
            currentDisplayMarkerId = Math.floor(paddedPosition);
        }

        reportCurrentMarker(currentDisplayMarkerId);

        // Determine which segment we're currently on
        const lowerMarkerId = Math.floor(currentPosition);
        const higherMarkerId = lowerMarkerId + 1;
        const segmentT = currentPosition - lowerMarkerId;

        const lowerMarker = markers.find(m => m.id === lowerMarkerId);
        const higherMarker = markers.find(m => m.id === higherMarkerId);

        if (!lowerMarker || !higherMarker) return;

        // Use the lower marker ID for curve index (curves are defined 1->2, 2->3, etc.)
        const curveIndex = lowerMarkerId - 1;

        if (curveIndex < 0 || curveIndex >= CURVE_CONTROL_POINTS.length) return;

        const controlPoints = CURVE_CONTROL_POINTS[curveIndex];

        const curveStartPoint = map.project(lowerMarker.coordinates);
        const curveEndPoint = map.project(higherMarker.coordinates);

        // Calculate control points based on the curve definition
        const control1 = calculateControlPoint(curveStartPoint, curveEndPoint, controlPoints.cp1);
        const control2 = calculateControlPoint(curveStartPoint, curveEndPoint, controlPoints.cp2);
        const control3 = controlPoints.cp3 ? calculateControlPoint(curveStartPoint, curveEndPoint, controlPoints.cp3) : undefined;

        const newPosition = getBezierPoint(segmentT, curveStartPoint, control1, control2, curveEndPoint, control3);
        setPosition(newPosition);
        setIsVisible(true);
    };

    const animate = () => {
        updatePosition();
        if (isAnimatingRef.current) {
            animationRef.current = requestAnimationFrame(animate);
        }
    };

    // Initialize position at first marker
    useEffect(() => {
        if (!map || markers.length === 0) return;

        const firstMarker = markers[0];
        const point = map.project(firstMarker.coordinates);
        setPosition(point);
        setIsVisible(true);
        setCurrentMarkerId(firstMarker.id);
        currentExactPositionRef.current = firstMarker.id;

        // Report the initial marker
        reportCurrentMarker(firstMarker.id);
    }, [map, markers]);

    useEffect(() => {
        // Only allow position changes after welcome animation is complete
        if (welcomingAnimationComplete && targetMarkerId !== null && targetMarkerId !== currentExactPositionRef.current) {
            startAnimation(targetMarkerId);
        }
    }, [targetMarkerId, welcomingAnimationComplete]);

    // Handle map events
    useEffect(() => {
        if (!map) return; const handleResize = () => {
            isResizingRef.current = true;
            lastResizeTimeRef.current = performance.now();

            // Immediately update position during resize for instant response
            if (!isAnimatingRef.current) {
                const marker = markers.find(m => m.id === currentMarkerId);
                if (marker) {
                    const point = map.project(marker.coordinates);
                    setPosition(point);
                }
            }

            // Reset resize flag after a short delay
            setTimeout(() => {
                // Only reset if no recent resize events
                if (performance.now() - lastResizeTimeRef.current >= 50) {
                    isResizingRef.current = false;
                }
            }, 50);
        };

        const updatePositionOnMapChange = () => {
            // Skip position updates during resize to prevent unwanted animation
            if (isResizingRef.current || !map) return;

            if (!isAnimatingRef.current) {
                // Update position of stationary circle when map moves
                const marker = markers.find(m => m.id === currentMarkerId);
                if (marker) {
                    const point = map.project(marker.coordinates);
                    setPosition(point);
                }
            }
        };
        // Listen for resize events
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        window.addEventListener('pixelRatioChanged', handleResize);
        map.on('resize', handleResize);

        const events = ['move', 'zoom', 'rotate', 'pitch'];
        events.forEach(event => map.on(event, updatePositionOnMapChange)); return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            window.removeEventListener('pixelRatioChanged', handleResize);
            map.off('resize', handleResize);
            events.forEach(event => map.off(event, updatePositionOnMapChange));
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [map, markers, currentMarkerId]);

    if (!isVisible) return null;

    return (
        <div
            className={`animated-path-circle ${isMapMoving ? 'map-moving' : ''}`}
            style={{
                left: `${Math.round(position.x)}px`,
                top: `${Math.round(position.y)}px`
            }}
        />
    );
};

export default AnimatedPath;
