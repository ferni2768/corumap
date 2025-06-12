import React, { useState, useEffect } from 'react';
import '../styles/MiniLogo.css';

const SVG_COLORS = {
    stroke: '#bfe1ff'
};

interface MiniLogoProps {
    markerId: number;
    markerX: number;
    markerY: number;
    isMapMoving?: boolean;
    currentMarkerId?: number;
    showMarkers?: boolean;
    organicDelay?: number;
}

const LOGO_CONFIG = [
    { distance: 2, angle: 285, size: 2.5 },     // Marker 1
    { distance: 0.95, angle: 310, size: 2 },    // Marker 2
    { distance: 1.5, angle: 250, size: 2.2 },   // Marker 3
    { distance: 1.5, angle: 120, size: 2.4 },   // Marker 4
    { distance: 1.3, angle: 180, size: 2 },     // Marker 5
    { distance: 1.6, angle: 237, size: 2 },     // Marker 6
    { distance: 2.7, angle: 236, size: 2.5 },   // Marker 7
    { distance: 2.6, angle: 310, size: 2 },     // Marker 8
    { distance: 1.7, angle: 310, size: 2 },     // Marker 9
    { distance: 1.5, angle: 45, size: 2.2 },    // Marker 10
];

const MiniLogo: React.FC<MiniLogoProps> = ({
    markerId,
    markerX,
    markerY,
    isMapMoving,
    currentMarkerId,
    showMarkers,
    organicDelay
}) => {
    const [ownWelcomeComplete, setOwnWelcomeComplete] = useState(false);

    useEffect(() => {
        if (showMarkers && !ownWelcomeComplete) {
            // Calculate when this mini logo's welcome animation will complete
            const animationDuration = 600;
            const totalDuration = (organicDelay || 0) + animationDuration;

            const timer = setTimeout(() => {
                setOwnWelcomeComplete(true);
            }, totalDuration);

            return () => clearTimeout(timer);
        }
    }, [showMarkers, organicDelay, ownWelcomeComplete]);

    const config = LOGO_CONFIG[markerId - 1];
    if (!config) return null;

    // Calculate position based on distance and angle
    const angleRad = (config.angle * Math.PI) / 180;
    const [scaledDistance, setScaledDistance] = React.useState(0); React.useEffect(() => {
        const updateScaledDistance = () => {
            const rootStyles = getComputedStyle(document.documentElement);
            const markerSize = parseFloat(rootStyles.getPropertyValue('--marker-size')) || 10;
            const mobileScale = parseFloat(rootStyles.getPropertyValue('--marker-mobile-scale')) || 1;
            const pixelRatio = parseFloat(rootStyles.getPropertyValue('--pixel-ratio')) || 1;
            const vminInPixels = Math.min(window.innerWidth, window.innerHeight) / 100;

            const baseDistance = markerSize * mobileScale * (vminInPixels / 3);
            const scaledDistance = baseDistance * pixelRatio;

            // Distance is proportional to the scaled marker size
            const distance = config.distance * scaledDistance;
            setScaledDistance(distance);
        };

        updateScaledDistance();

        // Update on resize to handle viewport changes
        const handleResize = () => updateScaledDistance();
        window.addEventListener('resize', handleResize);
        const handlePixelRatioChange = () => updateScaledDistance();
        window.addEventListener('pixelRatioChanged', handlePixelRatioChange);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('pixelRatioChanged', handlePixelRatioChange);
        };
    }, [config.distance]); const logoX = markerX + scaledDistance * Math.cos(angleRad);

    const logoY = markerY + scaledDistance * Math.sin(angleRad);

    // Determine if this mini logo is currently active
    const isActive = currentMarkerId === markerId;
    const getClassName = () => {
        const classes = ['mini-logo'];

        if (isMapMoving) classes.push('map-moving');
        if (isActive) classes.push('active');

        const shouldShowWelcome = showMarkers === true && !ownWelcomeComplete;
        if (shouldShowWelcome) {
            classes.push('welcome-in');
        }

        // Add welcome-complete class when this mini logo's welcome animation has finished
        if (ownWelcomeComplete) {
            classes.push('welcome-complete');
        }

        return classes.join(' ');
    };

    const renderShape = () => {
        const size = `calc(var(--marker-size) * var(--marker-mobile-scale, 1) * var(--pixel-ratio, 1) * 1vmin/3 * ${config.size})`;

        // Millenium
        if (markerId === 1) {
            return (
                <svg className="mini-logo-svg" width={size} height={size} viewBox="0 0 400 400">
                    <path
                        d="M251.423,352.523L198.164,48.477l-56.587,302.9"
                        fill="none"
                        stroke={SVG_COLORS.stroke}
                        strokeWidth="25"
                        strokeLinecap="butt"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        }
        // Riazor
        if (markerId === 2) {
            return (
                <svg className="mini-logo-svg" width={size} height={size} viewBox="0 0 400 400">
                    <path
                        d="M280.564,316.6c-53.076-88.848,32.66-116.344,42.1-177.371s-83.812-63.348-126.316-32.915c-57.645,41.275-144.623,19.2-144.623,19.2"
                        fill="none"
                        stroke={SVG_COLORS.stroke}
                        strokeWidth="30"
                        strokeLinecap="butt"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        }
        // Rompeolas
        if (markerId === 3) {
            return (
                <svg className="mini-logo-svg" width={size} height={size} viewBox="0 0 400 400">
                    <path
                        d="M48,343L155.914,237.965S117.1,139.415,100.178,95.659c-6.6-32.2,39.618-51.367,55.736-11.294l73.525,168.282L367,181.494"
                        fill="none"
                        stroke={SVG_COLORS.stroke}
                        strokeWidth="29"
                        strokeLinecap="butt"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        }
        // Columns
        if (markerId === 4) {
            return (
                <svg className="mini-logo-svg" width={size} height={size} viewBox="0 0 400 400">
                    <g>
                        <path
                            d="M97,202c10.084,21.343,69.056,69.538,69.056,67.652,0-16.051,5.613-176.313,2.949-181.476C134.875,70.292,110,38,110,38"
                            fill="none"
                            stroke={SVG_COLORS.stroke}
                            strokeWidth="27"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M299,346c-28.585-8.736-70-42-70-42l4.134-183.047S279.6,152.935,313,161"
                            fill="none"
                            stroke={SVG_COLORS.stroke}
                            strokeWidth="27"
                            strokeLinejoin="round"
                        />
                    </g>
                </svg>
            );
        }
        // Aquarium
        if (markerId === 5) {
            return (
                <svg className="mini-logo-svg" width={size} height={size} viewBox="0 0 400 400">
                    <path
                        d="M224.237,369.726L207.062,241.313l-121.1-22.467,18.526-80.18,118.4,24.113L275.2,28.67"
                        fill="none"
                        stroke={SVG_COLORS.stroke}
                        strokeWidth="30"
                        strokeLinecap="square"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        }
        // Lapas
        if (markerId === 6) {
            return (
                <svg className="mini-logo-svg" width={size} height={size} viewBox="0 0 400 400">
                    <path
                        d="M57,229.861c99.847-14.248,172.624,86.317,242.893,80.92,61.679-4.736,48.224-63.229,6.515-86.259C242.584,189.281,139.117,88,139.117,88"
                        fill="none"
                        stroke={SVG_COLORS.stroke}
                        strokeWidth="30"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        }
        // Hercules
        if (markerId === 7) {
            return (
                <svg className="mini-logo-svg" width={size} height={size} viewBox="0 0 400 400">
                    <path
                        d="M78.037,354.383l73.137-15.017v-170.2l22.041-34.039,2-93.109,7.013,49.057h39.074l-1,41.048,26.049,37.043v172.2l75.14,18.021"
                        fill="none"
                        stroke={SVG_COLORS.stroke}
                        strokeWidth="25"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        }
        // Caracola
        if (markerId === 8) {
            return (
                <svg className="mini-logo-svg" width={size} height={size} viewBox="0 0 400 400">
                    <path
                        d="M67.349,330.545s53.3-70.848,57.285-119.032c4.744-57.444,7.2-62.341,16.366-85.513,20.792-52.544,111.559-107.872,199-21,27.545,27.366-56.429,77.091-80,77-5.88-.023-27.606-50.825-62.636-7.357C158.14,223.315,150.356,285.98,72,334"
                        fill="none"
                        stroke={SVG_COLORS.stroke}
                        strokeWidth="30"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        }
        // Menhir
        if (markerId === 9) {
            return (
                <svg className="mini-logo-svg" width={size} height={size} viewBox="0 0 400 400">
                    <g>
                        <path
                            d="M133,346s20.529-218.85,18-237c-2.806-20.138,54.828-73.571,80-56,19.608,13.686,26.084,40.323,21,73-4.46,28.672,34.392,125.732,24,178-6.141,30.889-8,46-8,46"
                            fill="none"
                            stroke={SVG_COLORS.stroke}
                            strokeWidth="30"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M192,188l-2,59,34-2-6-57H192Z"
                            fill={SVG_COLORS.stroke}
                        />
                    </g>
                </svg>
            );
        }
        // Amaro
        if (markerId === 10) {
            return (
                <svg className="mini-logo-svg" width={size} height={size} viewBox="0 0 400 400">
                    <g>
                        <path
                            d="M379,226H99L44,271H350"
                            fill="none"
                            stroke={SVG_COLORS.stroke}
                            strokeWidth="30"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M154,369V232m65.392,44.9L219,332"
                            fill="none"
                            stroke={SVG_COLORS.stroke}
                            strokeWidth="30"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M153,226l0.428-82.492L177.175,47H201l18.392,89.9L219,229"
                            fill="none"
                            stroke={SVG_COLORS.stroke}
                            strokeWidth="27"
                            strokeLinejoin="round"
                        />
                    </g>
                </svg>
            );
        }

        return null;
    }; return (
        <div
            className={getClassName()}
            data-logo-id={markerId}
            style={{
                left: `${logoX}px`,
                top: `${logoY}px`,
                '--mini-logo-stroke-width': 'calc(var(--marker-border) * var(--marker-mobile-scale, 1) * var(--pixel-ratio, 1) * 1vmin/3)',
                '--mini-logo-size': config.size,
                '--organic-delay': `${organicDelay || 0}ms`,
            } as React.CSSProperties}
        >
            {renderShape()}
        </div>
    );
};

export default MiniLogo;
