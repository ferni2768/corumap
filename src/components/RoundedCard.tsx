import React, { ReactNode, useState, useEffect } from 'react';
import Superellipse from 'react-superellipse';
import { Preset } from "react-superellipse";
import { PixelRatioManager } from '../utils/pixelRatio';
import '../styles/RoundedCard.css';

interface RoundedCardProps {
    children: ReactNode;
    className?: string;
    showDebugOverlay?: boolean;
}

const RoundedCard: React.FC<RoundedCardProps> = ({
    children,
    className = '',
    showDebugOverlay = false
}) => {
    const [debugVisible, setDebugVisible] = useState(showDebugOverlay);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'd' && event.ctrlKey) {
                event.preventDefault();
                setDebugVisible(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    useEffect(() => {
        const updateMobileStatus = () => {
            const pixelRatioManager = PixelRatioManager.getInstance();
            const newIsMobile = pixelRatioManager.isMobileDevice();
            setIsMobile(newIsMobile);
        };

        // Initial setup
        updateMobileStatus();

        // Listen for resize events
        window.addEventListener('resize', updateMobileStatus);
        window.addEventListener('orientationchange', updateMobileStatus);

        return () => {
            window.removeEventListener('resize', updateMobileStatus);
            window.removeEventListener('orientationchange', updateMobileStatus);
        };
    }, []);

    return (
        <div
            className={`rounded-card-container ${debugVisible ? 'debug' : ''} ${!isMobile ? 'desktop-scaled' : 'mobile-position'}`}
        >
            <Superellipse
                className={`rounded-card ${className} ${!isMobile ? 'inner-scaled' : ''}`}
                r1={Preset.iOS.r1}
                r2={Preset.iOS.r2}
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                }}
            >
                {children}
            </Superellipse>
        </div>
    );
};

export default RoundedCard;