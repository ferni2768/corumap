import React, { useState, useEffect, useRef, useCallback } from 'react';
import Superellipse from 'react-superellipse';
import { Preset } from "react-superellipse";
import { getThumbnailPath, getFullImageUrl, preloadImage } from '../utils/imageUtils';
import '../styles/Image.css';

interface ImageProps {
    className?: string;
    src?: string;
    alt?: string;
    style?: React.CSSProperties;
    locationName?: string;
    imageIndex?: number;
    locationId?: number;
}

const Image: React.FC<ImageProps> = ({
    className = '',
    src,
    alt = 'Image placeholder',
    style,
    locationName,
    imageIndex = 1,
    locationId = 1
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [animationState, setAnimationState] = useState<'idle' | 'expanding' | 'collapsing' | 'preparing'>('idle');
    const [allowTransitions, setAllowTransitions] = useState(true);
    const [thumbnailSrc, setThumbnailSrc] = useState<string>('');
    const [fullImageSrc, setFullImageSrc] = useState<string>('');
    const [imageLoadState, setImageLoadState] = useState<'loading' | 'thumbnail' | 'expanding' | 'full' | 'error'>('loading');
    const [showFullImage, setShowFullImage] = useState(false);
    const [fadeOutThumbnail, setFadeOutThumbnail] = useState(false);
    const [fullImageLoaded, setFullImageLoaded] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const animationTimeoutRef = useRef<NodeJS.Timeout>();
    const transitionTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        const handleResize = () => {
            // Temporarily disable transitions during resize/orientation change
            setAllowTransitions(false);

            // Re-enable transitions after a short delay to prevent animation during resize
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
            transitionTimeoutRef.current = setTimeout(() => {
                setAllowTransitions(true);
            }, 100);
        };

        // Listen for resize events
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize); return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
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
    }, []); const clearAnimationTimeout = useCallback(() => {
        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = undefined;
        }
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = undefined;
        }
    }, []);

    const handleClose = useCallback(() => {
        if (animationState !== 'idle' && animationState !== 'expanding') return;

        clearAnimationTimeout();

        // Reset image states immediately when starting collapse
        setShowFullImage(false);
        setFadeOutThumbnail(false);
        if (imageLoadState === 'full' || imageLoadState === 'expanding') {
            setImageLoadState('thumbnail');
        }

        // Enable transitions for the close animation
        setAllowTransitions(true);

        // Capture current expanded position before starting collapse
        if (wrapperRef.current) {
            const wrapper = wrapperRef.current;
            const rect = wrapper.getBoundingClientRect();

            // Batch all style changes to minimize reflows + add hardware acceleration
            const styles = {
                position: 'fixed',
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                transform: 'translateZ(0)',
                zIndex: '10002',
                margin: '0',
                padding: '0',
                willChange: 'top, left, width, height'
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
        }, 300);
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

        // Enable transitions for the expand animation
        setAllowTransitions(true);

        // Capture current position for smooth transition
        setInitialPosition();

        // Prepare for expansion with position data
        setAnimationState('preparing');

        // Add hardware acceleration hint
        if (wrapperRef.current) {
            wrapperRef.current.style.transform = 'translateZ(0)';
            wrapperRef.current.style.willChange = 'top, left, width, height';
        }

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
        }, 300);
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
        if (!allowTransitions) classes.push('no-transitions');

        return classes.join(' ');
    };

    // Progressive image loading effect
    useEffect(() => {
        const loadImages = async () => {
            if (src) {
                setThumbnailSrc(src);
                setImageLoadState('thumbnail');
                return;
            }

            try {
                // Step 1: Load thumbnail immediately
                const thumbnailPath = getThumbnailPath(locationId, imageIndex);
                setThumbnailSrc(thumbnailPath);
                setImageLoadState('thumbnail');

                // Step 2: Preload full-resolution image in background
                const fullImageUrl = getFullImageUrl(locationId, imageIndex);
                setFullImageSrc(fullImageUrl);

                // Check if image is already loaded
                preloadImage(fullImageUrl)
                    .then(() => {
                        setFullImageLoaded(true);
                    })
                    .catch(() => {
                        setFullImageLoaded(false);
                    });

                // Step 3: Switch to full image when expanded, handled in expansion logic
            } catch (error) {
                setImageLoadState('error');
            }
        };

        loadImages();
    }, [src, locationId, imageIndex]);

    // Switch to full image when expanded with smooth fade
    useEffect(() => {
        if (isExpanded && imageLoadState === 'thumbnail') {
            // Step 1: Start expanding state (blur the thumbnail)
            setImageLoadState('expanding');

            // Check if full image is already loaded
            if (fullImageLoaded) {
                // Image is already preloaded, show it underneath
                setShowFullImage(true);
                // Wait for the actual DOM image element to be fully loaded
                const checkImageReady = () => {
                    const fullImageElement = document.querySelector('.image-element.full') as HTMLImageElement;
                    if (fullImageElement && fullImageElement.complete && fullImageElement.naturalHeight !== 0) {
                        // Image is fully loaded and rendered, now we can fade out
                        requestAnimationFrame(() => {
                            setFadeOutThumbnail(true);
                        });
                    } else {
                        // Check again in next frame
                        requestAnimationFrame(checkImageReady);
                    }
                };
                requestAnimationFrame(checkImageReady);
            } else {
                // Step 2: Load full image and wait for it to actually load
                const img = new window.Image();
                img.onload = () => {
                    // Show full image underneath
                    setShowFullImage(true);
                    setFullImageLoaded(true);
                    // Wait for the actual DOM image element to be fully loaded and rendered
                    const checkImageReady = () => {
                        const fullImageElement = document.querySelector('.image-element.full') as HTMLImageElement;
                        if (fullImageElement && fullImageElement.complete && fullImageElement.naturalHeight !== 0) {
                            // Image is fully loaded and rendered, now we can fade out
                            requestAnimationFrame(() => {
                                setFadeOutThumbnail(true);
                            });
                        } else {
                            // Check again in next frame
                            requestAnimationFrame(checkImageReady);
                        }
                    };
                    requestAnimationFrame(checkImageReady);
                };
                img.onerror = () => {
                    setImageLoadState('thumbnail');
                    setShowFullImage(false);
                };
                img.src = fullImageSrc;
            }

        } else if (!isExpanded) {
            // Reset all states when collapsed - ensure clean state
            setShowFullImage(false);
            setFadeOutThumbnail(false);
            if (imageLoadState === 'expanding') {
                setImageLoadState('thumbnail');
            }
        }
    }, [isExpanded, locationId, imageIndex, imageLoadState, fullImageSrc, fullImageLoaded]);

    // Clean up fade state when animation completes
    useEffect(() => {
        if (fadeOutThumbnail) {
            const cleanup = setTimeout(() => {
                // After 0.3s fade completes, we can set to 'full' state
                setImageLoadState('full');
            }, 300);

            return () => clearTimeout(cleanup);
        }
    }, [fadeOutThumbnail]);

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
                style={style}
            >
                <Superellipse
                    className={`image-component`}
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
                        {/* Full resolution image (shown underneath when ready) */}
                        {showFullImage && fullImageSrc && (
                            <img
                                src={fullImageSrc}
                                alt={alt}
                                className="image-element full"
                            />
                        )}

                        {/* Thumbnail image (fades out after full image loads) */}
                        {thumbnailSrc && (
                            <img
                                src={thumbnailSrc}
                                alt={alt}
                                className={`image-element ${imageLoadState} ${fadeOutThumbnail ? 'fading-out' : ''}`}
                            />
                        )}

                        {/* Placeholder when no images available */}
                        {!thumbnailSrc && (
                            <div className={`image-placeholder ${imageLoadState}`}>
                                {imageLoadState === 'loading' ? (
                                    <span>Loading...</span>
                                ) : imageLoadState === 'error' ? (
                                    <span>Failed to load</span>
                                ) : (
                                    <span>Image {imageIndex} from {locationName || 'Unknown Location'}</span>
                                )}
                            </div>
                        )}
                    </div>
                </Superellipse>
            </div>
        </>
    );
};

export default Image;
