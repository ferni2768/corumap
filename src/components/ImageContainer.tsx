import React, { useState, useEffect } from 'react';
import { PixelRatioManager } from '../utils/pixelRatio';
import Image from './Image';
import '../styles/ImageContainer.css';

interface ImageContainerProps {
    className?: string;
    showDebugOverlay?: boolean;
    images?: Array<{
        src?: string;
        alt?: string;
    }>;
}

const ImageContainer: React.FC<ImageContainerProps> = ({
    className = '',
    showDebugOverlay = false,
    images = [
        { alt: 'Image 1' },
        { alt: 'Image 2' },
        { alt: 'Image 3' }
    ]
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
        <div className={`image-container ${debugVisible ? 'debug' : ''} ${!isMobile ? 'desktop-scaled' : 'mobile-position'} ${className}`}>
            <div className="images-wrapper">
                {images.slice(0, 3).map((image, index) => (
                    <Image
                        key={index}
                        className={`image-${index + 1}`}
                        src={image.src}
                        alt={image.alt}
                    />
                ))}
            </div>
        </div>
    );
};

export default ImageContainer;
