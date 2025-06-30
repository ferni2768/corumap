import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import Superellipse from 'react-superellipse';
import { Preset } from "react-superellipse";
import { getThumbnailPath, getFullImageUrl } from '../utils/imageUtils';
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
    const [fullImageLoaded, setFullImageLoaded] = useState(false); const [isLocationChanging, setIsLocationChanging] = useState(false);
    const [previousThumbnailSrc, setPreviousThumbnailSrc] = useState<string>('');
    const [newThumbnailSrc, setNewThumbnailSrc] = useState<string>('');
    const [applyCrossfadeClasses, setApplyCrossfadeClasses] = useState(false);

    // Track what should be displayed (separate from loading state)
    const [displayThumbnailSrc, setDisplayThumbnailSrc] = useState<string>(''); const wrapperRef = useRef<HTMLDivElement>(null);
    const animationTimeoutRef = useRef<NodeJS.Timeout>();
    const transitionTimeoutRef = useRef<NodeJS.Timeout>();
    const crossfadeTimeoutRef = useRef<NodeJS.Timeout>();
    const lastLocationIdRef = useRef<number>(locationId || 1);
    const currentImageLoadRef = useRef<HTMLImageElement | null>(null);

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
            }, 150);
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

    // Handle locationId changes with crossfade effect
    useLayoutEffect(() => {
        const currentLocationId = locationId || 1;
        const lastLocationId = lastLocationIdRef.current;

        // Check if locationId actually changed and we can do crossfade
        if (currentLocationId !== lastLocationId &&
            animationState === 'idle' &&
            !isExpanded &&
            displayThumbnailSrc &&
            !src) {

            // Cancel any previous image loading
            if (currentImageLoadRef.current) {
                currentImageLoadRef.current.onload = null;
                currentImageLoadRef.current.onerror = null;
                currentImageLoadRef.current = null;
            }

            // Clear any pending crossfade timeouts
            if (crossfadeTimeoutRef.current) {
                clearTimeout(crossfadeTimeoutRef.current);
                crossfadeTimeoutRef.current = undefined;
            }

            // Store the current display thumbnail as previous for crossfade
            setPreviousThumbnailSrc(displayThumbnailSrc);
            setIsLocationChanging(true);
            setApplyCrossfadeClasses(false);

            // Load new thumbnail
            const newThumbnailPath = getThumbnailPath(currentLocationId, imageIndex);
            const img = new window.Image();
            currentImageLoadRef.current = img; img.onload = () => {
                // Check if this is still the current request (not cancelled)
                if (currentImageLoadRef.current !== img) {
                    return;
                }

                setNewThumbnailSrc(newThumbnailPath);
                // Wait for the actual DOM img element to be fully loaded before applying crossfade classes
                const checkDOMImageReady = () => {
                    if (currentImageLoadRef.current !== img) {
                        return;
                    }

                    // Look for the new image element with loading-for-crossfade class
                    const newImageElement = document.querySelector('.image-element.loading-for-crossfade') as HTMLImageElement;

                    if (newImageElement && newImageElement.complete && newImageElement.naturalHeight !== 0) {
                        setApplyCrossfadeClasses(true);
                    } else {
                        // Keep checking until DOM image is ready
                        requestAnimationFrame(checkDOMImageReady);
                    }
                };

                setTimeout(() => {
                    // Check one more time if still current
                    if (currentImageLoadRef.current === img) {
                        requestAnimationFrame(checkDOMImageReady);
                    }
                }, 10);

                // Complete crossfade after animation
                crossfadeTimeoutRef.current = setTimeout(() => {
                    // Check if this is still the current request
                    if (currentImageLoadRef.current !== img) {
                        return;
                    }

                    // After crossfade, update the display thumbnail and clean up
                    setDisplayThumbnailSrc(newThumbnailPath);
                    setIsLocationChanging(false);
                    setPreviousThumbnailSrc('');
                    setNewThumbnailSrc('');
                    setApplyCrossfadeClasses(false);
                    currentImageLoadRef.current = null;
                }, 200);
            };

            img.onerror = () => {
                // Check if this is still the current request (not cancelled)
                if (currentImageLoadRef.current !== img) {
                    return;
                }

                const fallbackPath = getThumbnailPath(currentLocationId, imageIndex);
                setDisplayThumbnailSrc(fallbackPath);
                setIsLocationChanging(false);
                setPreviousThumbnailSrc('');
                setNewThumbnailSrc('');
                setApplyCrossfadeClasses(false);
                currentImageLoadRef.current = null;
            };
            img.src = newThumbnailPath;
        }

        // Update the ref to track current locationId
        lastLocationIdRef.current = currentLocationId;
    }, [locationId, animationState, isExpanded, displayThumbnailSrc, imageIndex, src]);

    // Sync displayThumbnailSrc with thumbnailSrc when not crossfading
    useEffect(() => {
        if (!isLocationChanging && thumbnailSrc && thumbnailSrc !== displayThumbnailSrc) {
            setDisplayThumbnailSrc(thumbnailSrc);
        }
    }, [thumbnailSrc, isLocationChanging, displayThumbnailSrc]);

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
        if (crossfadeTimeoutRef.current) {
            clearTimeout(crossfadeTimeoutRef.current);
            crossfadeTimeoutRef.current = undefined;
        }
    }, []);

    const handleClose = useCallback(() => {
        if (animationState !== 'idle' && animationState !== 'expanding') return;

        // Reset image states immediately when starting collapse    
        clearAnimationTimeout();
        setShowFullImage(false);
        setFadeOutThumbnail(false); setIsLocationChanging(false);
        setPreviousThumbnailSrc('');
        setNewThumbnailSrc('');
        setApplyCrossfadeClasses(false);

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
                // Load thumbnail
                const thumbnailPath = getThumbnailPath(locationId, imageIndex);
                setThumbnailSrc(thumbnailPath);
                setImageLoadState('loading');

                // Load thumbnail
                const img = new window.Image();
                img.onload = () => {
                    setImageLoadState('thumbnail');
                };
                img.onerror = () => {
                    setImageLoadState('error');
                };
                img.src = thumbnailPath;

                // Set full image URL
                const fullImageUrl = getFullImageUrl(locationId, imageIndex);
                setFullImageSrc(fullImageUrl);

                // Load full image in background
                const fullImg = new window.Image();
                fullImg.onload = () => {
                    setFullImageLoaded(true);
                };
                fullImg.onerror = () => {
                    setFullImageLoaded(false);
                };
                fullImg.src = fullImageUrl;
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

                        {/* Previous thumbnail for crossfade (fading out) */}
                        {isLocationChanging && previousThumbnailSrc && (
                            <img
                                src={previousThumbnailSrc}
                                alt={alt}
                                className={`image-element ${applyCrossfadeClasses ? 'crossfade-out' : 'crossfade-ready'}`}
                            />
                        )}

                        {/* New thumbnail for crossfade (fading in) */}
                        {isLocationChanging && newThumbnailSrc && (
                            <img
                                src={newThumbnailSrc}
                                alt={alt}
                                className={`image-element ${applyCrossfadeClasses ? 'crossfade-in' : 'loading-for-crossfade'}`}
                            />
                        )}

                        {/* Current thumbnail image (normal state, not during crossfade) */}
                        {!isLocationChanging && displayThumbnailSrc && (
                            <img
                                src={displayThumbnailSrc}
                                alt={alt}
                                className={`image-element ${imageLoadState} ${fadeOutThumbnail ? 'fading-out' : ''}`}
                            />
                        )}

                        {/* Placeholder when no images available */}
                        {!displayThumbnailSrc && (
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
