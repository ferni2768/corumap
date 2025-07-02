import React from 'react';
import { MAP_STYLES, MapStyleInfo } from '../utils/mapStyleUtils';
import '../styles/Logo.css';

interface LogoProps {
    onStyleChange: (styleInfo: MapStyleInfo) => void;
}

const Logo: React.FC<LogoProps> = ({ onStyleChange }) => {
    // Load saved style index from localStorage, default to 0 if not found
    const [currentStyleIndex, setCurrentStyleIndex] = React.useState(() => {
        const savedStyleIndex = localStorage.getItem('corumap-logoStyleIndex');
        return savedStyleIndex !== null ? parseInt(savedStyleIndex, 10) : 0;
    });
    const [isChangingStyle, setIsChangingStyle] = React.useState(false);
    const [showHintAnimation, setShowHintAnimation] = React.useState(false);
    const [hasUserInteracted, setHasUserInteracted] = React.useState(() => {
        // Check if user has a saved style preference - if so, they've interacted
        return localStorage.getItem('corumap-logoStyleIndex') !== null;
    });
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

    const saveStyleIndex = (index: number) => {
        localStorage.setItem('corumap-logoStyleIndex', index.toString());
        setHasUserInteracted(true);
    };

    // Set up the hint animation - only if user hasn't interacted (no saved style)
    React.useEffect(() => {
        if (hasUserInteracted) {
            return;
        }

        // First animation after 10 seconds
        const firstTimeout = setTimeout(() => {
            setShowHintAnimation(true);
            setTimeout(() => setShowHintAnimation(false), 800);

            // Start the 15-second interval AFTER the first animation completes
            intervalRef.current = setInterval(() => {
                setShowHintAnimation(true);
                setTimeout(() => setShowHintAnimation(false), 800);
            }, 15000);
        }, 10000);

        return () => {
            clearTimeout(firstTimeout);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [hasUserInteracted]);

    const handleClick = () => {
        if (isChangingStyle) return;

        // Stop any ongoing animations
        setShowHintAnimation(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        setIsChangingStyle(true);

        const nextIndex = (currentStyleIndex + 1) % MAP_STYLES.length;
        const nextStyle = MAP_STYLES[nextIndex];

        setCurrentStyleIndex(nextIndex);
        saveStyleIndex(nextIndex); // Save the new style index
        onStyleChange(nextStyle);

        setTimeout(() => setIsChangingStyle(false), 750); // Prevent rapid clicking
    };

    return (
        <div className="logo" onClick={handleClick}>
            <img
                src="/corumap_logo_long.svg"
                alt="CoruMap Logo"
                className={`logo-image ${showHintAnimation ? 'logo-hint-animation' : ''}`}
            />
        </div>
    );
};

export default Logo;