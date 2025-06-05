import React, { useState, useEffect } from 'react';
import Superellipse from 'react-superellipse';
import { Preset } from "react-superellipse";
import { PixelRatioManager } from '../utils/pixelRatio';
import '../styles/Image.css';

interface ImageProps {
    className?: string;
    src?: string;
    alt?: string;
}

const Image: React.FC<ImageProps> = ({
    className = '',
    src,
    alt = 'Image placeholder'
}) => {
    const [isMobile, setIsMobile] = useState(false);

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
        <div className={`image-wrapper ${className}`}>
            <Superellipse
                className={`image-component ${!isMobile ? 'inner-scaled' : ''}`}
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
                <div className="image-content">
                    {src ? (
                        <img src={src} alt={alt} className="image-element" />
                    ) : (
                        <div className="image-placeholder">
                            {/* Placeholder content */}
                        </div>
                    )}
                </div>
            </Superellipse>
        </div>
    );
};

export default Image;
