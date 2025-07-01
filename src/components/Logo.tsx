import React from 'react';
import { MAP_STYLES, MapStyleInfo } from '../utils/mapStyleUtils';
import '../styles/Logo.css';

interface LogoProps {
    onStyleChange: (styleInfo: MapStyleInfo) => void;
}

const Logo: React.FC<LogoProps> = ({ onStyleChange }) => {
    const [currentStyleIndex, setCurrentStyleIndex] = React.useState(0);
    const [isChangingStyle, setIsChangingStyle] = React.useState(false);
    const [showHintAnimation, setShowHintAnimation] = React.useState(false);
    const [hasUserInteracted, setHasUserInteracted] = React.useState(() => {
        return localStorage.getItem('corumap-hasInteractedWithLogo') === 'true';
    });
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

    const markLogoAsInteracted = () => {
        localStorage.setItem('corumap-hasInteractedWithLogo', 'true');
        setHasUserInteracted(true);
    };

    // Set up the hint animation
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
        markLogoAsInteracted();

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