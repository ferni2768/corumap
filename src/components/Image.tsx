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
    fastAnimation?: boolean;
}

const Image: React.FC<ImageProps> = ({
    className = '',
    src,
    alt = 'Image placeholder',
    style,
    locationName,
    imageIndex = 1,
    locationId = 1,
    fastAnimation = false
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
    const [crossfadeState, setCrossfadeState] = useState<'idle' | 'loading' | 'transitioning'>('idle');

    // Dual image system for seamless crossfade
    const [primaryImageSrc, setPrimaryImageSrc] = useState<string>('');
    const [secondaryImageSrc, setSecondaryImageSrc] = useState<string>('');
    const [activePrimary, setActivePrimary] = useState<boolean>(true);
    const [transitioningToPrimary, setTransitioningToPrimary] = useState<boolean>(false);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const animationTimeoutRef = useRef<NodeJS.Timeout>();
    const transitionTimeoutRef = useRef<NodeJS.Timeout>();
    const crossfadeTimeoutRef = useRef<NodeJS.Timeout>();
    const lastLocationIdRef = useRef<number>(locationId || 1);
    const currentImageLoadRef = useRef<HTMLImageElement | null>(null);
    const pendingLocationIdRef = useRef<number | null>(null);
    const mainImageLoadRef = useRef<{ thumbnail: HTMLImageElement | null; full: HTMLImageElement | null } | null>(null);
    const crossfadeDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const expansionImageLoadRef = useRef<HTMLImageElement | null>(null);

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

    // Handle locationId changes with seamless dual-image crossfade effect
    useLayoutEffect(() => {
        const currentLocationId = locationId || 1;
        const lastLocationId = lastLocationIdRef.current;

        // Check if locationId actually changed
        if (currentLocationId !== lastLocationId && !src) {

            // Clear any previous debounce timeout
            if (crossfadeDebounceRef.current) {
                clearTimeout(crossfadeDebounceRef.current);
                crossfadeDebounceRef.current = null;
            }

            // Cancel any previous image loading and timeouts
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

            // Set the pending locationId immediately
            pendingLocationIdRef.current = currentLocationId;

            // If we can do crossfade (idle state, not expanded, have images), do it
            if (animationState === 'idle' &&
                !isExpanded &&
                (primaryImageSrc || secondaryImageSrc)) {

                // Update ref only when we can actually process the change
                lastLocationIdRef.current = currentLocationId;

                // Debounce rapid locationId changes for crossfade
                crossfadeDebounceRef.current = setTimeout(() => {
                    // Double-check that this is still the desired locationId
                    if (pendingLocationIdRef.current !== currentLocationId) {
                        return;
                    }

                    setCrossfadeState('loading');
                    const newThumbnailPath = getThumbnailPath(currentLocationId, imageIndex);
                    const img = new window.Image();
                    currentImageLoadRef.current = img;

                    img.onload = () => {
                        // Check if this is still the current request and matches pending locationId
                        if (currentImageLoadRef.current !== img || pendingLocationIdRef.current !== currentLocationId) {
                            return;
                        }

                        // Load the new image into the inactive slot
                        if (activePrimary) {
                            setSecondaryImageSrc(newThumbnailPath);
                        } else {
                            setPrimaryImageSrc(newThumbnailPath);
                        }

                        // Wait for the new image element to be fully rendered in the DOM
                        const waitForImageRender = () => {
                            // Double-check if this is still the current request
                            if (currentImageLoadRef.current !== img || pendingLocationIdRef.current !== currentLocationId) {
                                return;
                            }

                            const newImageElement = document.querySelector(activePrimary ? '.image-element.secondary' : '.image-element.primary') as HTMLImageElement;

                            if (newImageElement &&
                                newImageElement.complete &&
                                newImageElement.naturalHeight !== 0 &&
                                newImageElement.offsetHeight > 0) {

                                // Image is fully rendered, now we can start crossfade
                                if (currentImageLoadRef.current === img && pendingLocationIdRef.current === currentLocationId) {
                                    setCrossfadeState('transitioning');

                                    // Complete transition after animation
                                    crossfadeTimeoutRef.current = setTimeout(() => {
                                        if (currentImageLoadRef.current === img && pendingLocationIdRef.current === currentLocationId) {
                                            // Start transitioning to the new image
                                            setTransitioningToPrimary(!activePrimary);

                                            // After a brief moment, complete the swap
                                            setTimeout(() => {
                                                // Final check before completing transition
                                                if (pendingLocationIdRef.current === currentLocationId) {
                                                    setActivePrimary(!activePrimary);
                                                    setTransitioningToPrimary(false);
                                                    setCrossfadeState('idle');
                                                    currentImageLoadRef.current = null;
                                                    pendingLocationIdRef.current = null;
                                                }
                                            }, fastAnimation ? 100 : 200);
                                        }
                                    }, fastAnimation ? 100 : 200);
                                }
                            } else {
                                // Keep checking until image is fully rendered, but only if still current
                                if (currentImageLoadRef.current === img && pendingLocationIdRef.current === currentLocationId) {
                                    requestAnimationFrame(waitForImageRender);
                                }
                            }
                        };

                        // Start checking after DOM update
                        requestAnimationFrame(() => {
                            requestAnimationFrame(waitForImageRender);
                        });
                    };

                    img.onerror = () => {
                        // On error, reset state only if this is still the current request
                        if (currentImageLoadRef.current === img && pendingLocationIdRef.current === currentLocationId) {
                            setCrossfadeState('idle');
                            currentImageLoadRef.current = null;
                            pendingLocationIdRef.current = null;
                        }
                    };

                    img.src = newThumbnailPath;
                }, fastAnimation ? 10 : 50); // Shorter debounce for fast animations

            } else {
                // If we can't do crossfade immediately, don't update the ref yet
                // This preserves the old locationId so we can detect the change later
                // The fallback effect or animation completion will handle the update
            }
        }
    }, [locationId, animationState, isExpanded, primaryImageSrc, secondaryImageSrc, imageIndex, src, activePrimary]);

    // Initialize first image when thumbnailSrc is loaded and slots are empty
    useEffect(() => {
        if (crossfadeState === 'idle' && thumbnailSrc && !primaryImageSrc && !secondaryImageSrc) {
            setPrimaryImageSrc(thumbnailSrc);
            setActivePrimary(true);
        }
    }, [thumbnailSrc, crossfadeState, primaryImageSrc, secondaryImageSrc]);

    // Ensures displayed image always matches current locationId
    useEffect(() => {
        // Only validate when in stable state
        if (animationState !== 'idle' || isExpanded || src || crossfadeState !== 'idle') {
            return;
        }

        // Only validate if we have images to display
        if (!primaryImageSrc && !secondaryImageSrc) {
            return;
        }

        const currentLocationId = locationId || 1;
        const expectedPath = getThumbnailPath(currentLocationId, imageIndex);
        const currentDisplayedPath = activePrimary ? primaryImageSrc : secondaryImageSrc;

        // If displayed image doesn't match expected, trigger crossfade
        if (currentDisplayedPath !== expectedPath) {
            // Update ref to prevent conflicts with main locationId effect
            lastLocationIdRef.current = currentLocationId;

            setCrossfadeState('loading');
            pendingLocationIdRef.current = currentLocationId;

            const img = new window.Image();
            currentImageLoadRef.current = img;

            img.onload = () => {
                if (currentImageLoadRef.current === img && pendingLocationIdRef.current === currentLocationId) {
                    // Load the correct image into the inactive slot
                    if (activePrimary) {
                        setSecondaryImageSrc(expectedPath);
                    } else {
                        setPrimaryImageSrc(expectedPath);
                    }

                    // Wait for the new image element to be fully rendered in the DOM (same as main crossfade)
                    const waitForImageRender = () => {
                        // Double-check if this is still the current request
                        if (currentImageLoadRef.current !== img || pendingLocationIdRef.current !== currentLocationId) {
                            return;
                        }

                        const newImageElement = document.querySelector(activePrimary ? '.image-element.secondary' : '.image-element.primary') as HTMLImageElement;

                        if (newImageElement &&
                            newImageElement.complete &&
                            newImageElement.naturalHeight !== 0 &&
                            newImageElement.offsetHeight > 0) {

                            // Image is fully rendered, now we can start crossfade
                            if (currentImageLoadRef.current === img && pendingLocationIdRef.current === currentLocationId) {
                                setCrossfadeState('transitioning');

                                // Complete transition after animation (same timing as main crossfade)
                                crossfadeTimeoutRef.current = setTimeout(() => {
                                    if (currentImageLoadRef.current === img && pendingLocationIdRef.current === currentLocationId) {
                                        // Start transitioning to the new image
                                        setTransitioningToPrimary(!activePrimary);

                                        // After a brief moment, complete the swap
                                        setTimeout(() => {
                                            // Final check before completing transition
                                            if (pendingLocationIdRef.current === currentLocationId) {
                                                setActivePrimary(!activePrimary);
                                                setTransitioningToPrimary(false);
                                                setCrossfadeState('idle');
                                                currentImageLoadRef.current = null;
                                                pendingLocationIdRef.current = null;
                                            }
                                        }, fastAnimation ? 100 : 200);
                                    }
                                }, fastAnimation ? 100 : 200);
                            }
                        } else {
                            // Keep checking until image is fully rendered, but only if still current
                            if (currentImageLoadRef.current === img && pendingLocationIdRef.current === currentLocationId) {
                                requestAnimationFrame(waitForImageRender);
                            }
                        }
                    };

                    // Start checking after DOM update
                    requestAnimationFrame(() => {
                        requestAnimationFrame(waitForImageRender);
                    });
                }
            };

            img.onerror = () => {
                if (currentImageLoadRef.current === img && pendingLocationIdRef.current === currentLocationId) {
                    setCrossfadeState('idle');
                    currentImageLoadRef.current = null;
                    pendingLocationIdRef.current = null;
                }
            };

            img.src = expectedPath;
        }
    });

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
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = undefined;
        }
        if (crossfadeTimeoutRef.current) {
            clearTimeout(crossfadeTimeoutRef.current);
            crossfadeTimeoutRef.current = undefined;
        }

        // Cancel crossfade image loading
        if (currentImageLoadRef.current) {
            currentImageLoadRef.current.onload = null;
            currentImageLoadRef.current.onerror = null;
            currentImageLoadRef.current = null;
        }

        // Cancel debounce timeout
        if (crossfadeDebounceRef.current) {
            clearTimeout(crossfadeDebounceRef.current);
            crossfadeDebounceRef.current = null;
        }

        // Cancel main image loading requests
        if (mainImageLoadRef.current) {
            if (mainImageLoadRef.current.thumbnail) {
                mainImageLoadRef.current.thumbnail.onload = null;
                mainImageLoadRef.current.thumbnail.onerror = null;
            }
            if (mainImageLoadRef.current.full) {
                mainImageLoadRef.current.full.onload = null;
                mainImageLoadRef.current.full.onerror = null;
            }
            mainImageLoadRef.current = null;
        }

        // Cancel expansion image loading
        if (expansionImageLoadRef.current) {
            expansionImageLoadRef.current.onload = null;
            expansionImageLoadRef.current.onerror = null;
            expansionImageLoadRef.current = null;
        }

        // Clear pending location reference
        pendingLocationIdRef.current = null;
        setCrossfadeState('idle');
    }, []);

    const handleClose = useCallback(() => {
        if (animationState !== 'idle' && animationState !== 'expanding') return;

        // Reset image states immediately when starting collapse    
        clearAnimationTimeout();
        setShowFullImage(false);
        setFadeOutThumbnail(false);

        // Reset crossfade state
        setCrossfadeState('idle');

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

            // Check if locationId needs updating after collapse completes
            const currentLocationId = locationId || 1;
            const lastLocationId = lastLocationIdRef.current;

            if (currentLocationId !== lastLocationId && !src) {
                // Now update the ref to trigger the fallback effect
                lastLocationIdRef.current = currentLocationId;
            }
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

            // Cancel any previous main image loading requests
            if (mainImageLoadRef.current) {
                if (mainImageLoadRef.current.thumbnail) {
                    mainImageLoadRef.current.thumbnail.onload = null;
                    mainImageLoadRef.current.thumbnail.onerror = null;
                }
                if (mainImageLoadRef.current.full) {
                    mainImageLoadRef.current.full.onload = null;
                    mainImageLoadRef.current.full.onerror = null;
                }
                mainImageLoadRef.current = null;
            }

            try {
                // Create new image loading refs for this request
                const thumbnailImg = new window.Image();
                const fullImg = new window.Image();

                mainImageLoadRef.current = {
                    thumbnail: thumbnailImg,
                    full: fullImg
                };

                const currentLocationId = locationId;
                const currentImageIndex = imageIndex;

                // Load thumbnail
                const thumbnailPath = getThumbnailPath(currentLocationId, currentImageIndex);
                setThumbnailSrc(thumbnailPath);
                setImageLoadState('loading');

                thumbnailImg.onload = () => {
                    // Check if this is still the current request
                    if (mainImageLoadRef.current?.thumbnail === thumbnailImg &&
                        locationId === currentLocationId &&
                        imageIndex === currentImageIndex) {
                        setImageLoadState('thumbnail');
                    }
                };

                thumbnailImg.onerror = () => {
                    // Check if this is still the current request
                    if (mainImageLoadRef.current?.thumbnail === thumbnailImg &&
                        locationId === currentLocationId &&
                        imageIndex === currentImageIndex) {
                        setImageLoadState('error');
                    }
                };

                thumbnailImg.src = thumbnailPath;

                // Set full image URL and start loading it in background
                const fullImageUrl = getFullImageUrl(currentLocationId, currentImageIndex);
                setFullImageSrc(fullImageUrl);

                fullImg.onload = () => {
                    // Check if this is still the current request
                    if (mainImageLoadRef.current?.full === fullImg &&
                        locationId === currentLocationId &&
                        imageIndex === currentImageIndex) {
                        setFullImageLoaded(true);
                    }
                };

                fullImg.onerror = () => {
                    // Check if this is still the current request
                    if (mainImageLoadRef.current?.full === fullImg &&
                        locationId === currentLocationId &&
                        imageIndex === currentImageIndex) {
                        setFullImageLoaded(false);
                    }
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
                // Cancel any previous expansion image loading
                if (expansionImageLoadRef.current) {
                    expansionImageLoadRef.current.onload = null;
                    expansionImageLoadRef.current.onerror = null;
                    expansionImageLoadRef.current = null;
                }

                const img = new window.Image();
                expansionImageLoadRef.current = img;
                const currentLocationId = locationId;
                const currentImageIndex = imageIndex;

                img.onload = () => {
                    // Check if this is still the current request
                    if (expansionImageLoadRef.current === img &&
                        locationId === currentLocationId &&
                        imageIndex === currentImageIndex &&
                        isExpanded) {
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
                    }
                };
                img.onerror = () => {
                    // Check if this is still the current request
                    if (expansionImageLoadRef.current === img &&
                        locationId === currentLocationId &&
                        imageIndex === currentImageIndex &&
                        isExpanded) {
                        setImageLoadState('thumbnail');
                        setShowFullImage(false);
                    }
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
                                crossOrigin="anonymous"
                                referrerPolicy="no-referrer"
                            />
                        )}

                        {/* Primary thumbnail image */}
                        {primaryImageSrc && (
                            <img
                                src={primaryImageSrc}
                                alt={alt}
                                className={`image-element primary ${imageLoadState} ${fadeOutThumbnail ? 'fading-out' : ''} ${fastAnimation ? 'fast-animation' : ''} ${activePrimary
                                    ? (crossfadeState === 'loading' ? 'crossfade-ready' : crossfadeState === 'transitioning' ? 'crossfade-out' : '')
                                    : transitioningToPrimary
                                        ? 'crossfade-in'
                                        : 'crossfade-hidden'
                                    }`}
                            />
                        )}

                        {/* Secondary thumbnail image */}
                        {secondaryImageSrc && (
                            <img
                                src={secondaryImageSrc}
                                alt={alt}
                                className={`image-element secondary ${imageLoadState} ${fadeOutThumbnail ? 'fading-out' : ''} ${fastAnimation ? 'fast-animation' : ''} ${!activePrimary
                                    ? (crossfadeState === 'loading' ? 'crossfade-ready' : crossfadeState === 'transitioning' ? 'crossfade-out' : '')
                                    : !transitioningToPrimary
                                        ? 'crossfade-in'
                                        : 'crossfade-hidden'
                                    }`}
                            />
                        )}

                        {/* Placeholder when no images available */}
                        {!primaryImageSrc && !secondaryImageSrc && (
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
