import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    const [isExpanded, setIsExpanded] = useState(false);
    const [animationState, setAnimationState] = useState<'idle' | 'expanding' | 'collapsing' | 'preparing'>('idle');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const animationTimeoutRef = useRef<NodeJS.Timeout>();

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

    useEffect(() => {
        // Notify document body of expansion state
        if (isExpanded) {
            document.body.classList.add('image-expanded');
        } else {
            document.body.classList.remove('image-expanded');
        }

        return () => {
            document.body.classList.remove('image-expanded');
        };
    }, [isExpanded]);

    const setInitialPosition = useCallback(() => {
        if (!wrapperRef.current) return;

        const rect = wrapperRef.current.getBoundingClientRect();
        const root = document.documentElement;

        // Use CSS custom properties for position data
        root.style.setProperty('--image-initial-x', `${rect.left}px`);
        root.style.setProperty('--image-initial-y', `${rect.top}px`);
        root.style.setProperty('--image-initial-width', `${rect.width}px`);
        root.style.setProperty('--image-initial-height', `${rect.height}px`);
    }, []);

    const clearAnimationTimeout = useCallback(() => {
        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = undefined;
        }
    }, []);

    const handleClose = useCallback(() => {
        if (animationState !== 'idle' && animationState !== 'expanding') return;

        clearAnimationTimeout();

        // Capture current expanded position before starting collapse
        if (wrapperRef.current) {
            const wrapper = wrapperRef.current;
            const rect = wrapper.getBoundingClientRect();

            // Batch all style changes to minimize reflows
            const styles = {
                position: 'fixed',
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                transform: 'none',
                zIndex: '10002',
                margin: '0',
                padding: '0',
                willChange: 'top, left, width, height, transform'
            };

            Object.assign(wrapper.style, styles);
        }

        setAnimationState('collapsing');
        setIsExpanded(false);

        // Double rAF for smooth transition
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (wrapperRef.current) {
                    const wrapper = wrapperRef.current;
                    // Clear styles
                    const stylesToClear = ['position', 'top', 'left', 'width', 'height', 'transform', 'zIndex', 'margin', 'padding', 'willChange'];
                    stylesToClear.forEach(prop => {
                        wrapper.style[prop as any] = '';
                    });
                }
            });
        });

        // Complete the animation
        animationTimeoutRef.current = setTimeout(() => {
            setAnimationState('idle');
            // Clear CSS properties
            const root = document.documentElement;
            const propsToRemove = ['--image-initial-x', '--image-initial-y', '--image-initial-width', '--image-initial-height'];
            propsToRemove.forEach(prop => root.style.removeProperty(prop));
        }, 600);
    }, [animationState, clearAnimationTimeout]);

    const handleImageClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();

        if (animationState !== 'idle') {
            if (isExpanded) {
                handleClose();
            }
            return;
        }

        // If expanded, close it
        if (isExpanded) {
            handleClose();
            return;
        }

        clearAnimationTimeout();

        // Capture current position for smooth transition
        setInitialPosition();

        // Prepare for expansion with position data
        setAnimationState('preparing');

        // Optimized animation sequence
        requestAnimationFrame(() => {
            setAnimationState('expanding');
            requestAnimationFrame(() => {
                setIsExpanded(true);
            });
        });

        // Complete the animation
        animationTimeoutRef.current = setTimeout(() => {
            setAnimationState('idle');
            // Reset will-change for performance
            if (wrapperRef.current) {
                wrapperRef.current.style.willChange = '';
            }
        }, 600);
    }, [animationState, isExpanded, handleClose, clearAnimationTimeout, setInitialPosition]);

    const handleOverlayClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        handleClose();
    }, [handleClose]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearAnimationTimeout();
        };
    }, [clearAnimationTimeout]);

    const getWrapperClasses = () => {
        const classes = ['image-wrapper', className];

        if (isExpanded) classes.push('expanded');
        if (animationState === 'expanding') classes.push('expanding');
        if (animationState === 'collapsing') classes.push('collapsing');
        if (animationState === 'preparing') classes.push('preparing-expand');
        if (animationState !== 'idle') classes.push('animating');

        return classes.join(' ');
    };

    return (
        <>
            {isExpanded && (
                <div
                    className="image-overlay"
                    onClick={handleOverlayClick}
                />
            )}

            <div
                ref={wrapperRef}
                className={getWrapperClasses()}
                onClick={handleImageClick}
            >
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
        </>
    );
};

export default Image;
