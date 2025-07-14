import React, { useState, useEffect, useRef, useCallback } from 'react';
import Superellipse from 'react-superellipse';
import { Preset } from "react-superellipse";
import '../styles/WelcomeCard.css';

interface WelcomeCardProps {
    isVisible: boolean;
    onToggle: () => void;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({ isVisible, onToggle }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [animationState, setAnimationState] = useState<'idle' | 'expanding' | 'collapsing' | 'preparing'>('idle');
    const [allowTransitions, setAllowTransitions] = useState(true);
    const [overlayFadingOut, setOverlayFadingOut] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const animationTimeoutRef = useRef<NodeJS.Timeout>();
    const transitionTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        const handleResize = () => {
            setAllowTransitions(false);

            // Re-enable transitions after a short delay to prevent animation during resize
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
            transitionTimeoutRef.current = setTimeout(() => {
                setAllowTransitions(true);
            }, 100);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
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
            document.body.classList.add('welcome-expanded');
        } else {
            document.body.classList.remove('welcome-expanded');
        }

        return () => {
            document.body.classList.remove('welcome-expanded');
        };
    }, [isExpanded]);

    const setInitialPosition = useCallback(() => {
        const infoButton = document.querySelector('.info-button');
        const root = document.documentElement;

        if (infoButton) {
            const rect = infoButton.getBoundingClientRect();
            // Use InfoButton's position and size as the initial position
            root.style.setProperty('--welcome-initial-top', `${rect.top}px`);
            root.style.setProperty('--welcome-initial-left', `${rect.left}px`);
            root.style.setProperty('--welcome-initial-width', `${rect.width}px`);
            root.style.setProperty('--welcome-initial-height', `${rect.height}px`);
        } else if (wrapperRef.current) {
            // Fallback to welcome card's own position if InfoButton not found
            const rect = wrapperRef.current.getBoundingClientRect();
            root.style.setProperty('--welcome-initial-top', `${rect.top}px`);
            root.style.setProperty('--welcome-initial-left', `${rect.left}px`);
            root.style.setProperty('--welcome-initial-width', `${rect.width}px`);
            root.style.setProperty('--welcome-initial-height', `${rect.height}px`);
        }
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
    }, []);

    const handleClose = useCallback(() => {
        if (animationState !== 'idle' && animationState !== 'expanding') return;

        clearAnimationTimeout();
        setOverlayFadingOut(true);
        setAllowTransitions(true);

        // Capture current expanded position before starting collapse
        if (wrapperRef.current) {
            const wrapper = wrapperRef.current;
            const rect = wrapper.getBoundingClientRect();

            const styles = {
                position: 'fixed',
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                transform: 'translateZ(0)',
                zIndex: '10003',
                margin: '0',
                padding: '0',
                willChange: 'top, left, width, height'
            };

            Object.assign(wrapper.style, styles);
        }

        setAnimationState('collapsing');
        setIsExpanded(false);

        // Set overlay to fade out after a short delay to allow it to be visible during collapse
        setTimeout(() => {
            setOverlayFadingOut(false);
        }, 200);

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
            const propsToRemove = ['--welcome-initial-top', '--welcome-initial-left', '--welcome-initial-width', '--welcome-initial-height'];
            propsToRemove.forEach(prop => root.style.removeProperty(prop));
        }, 400);
    }, [animationState, clearAnimationTimeout]);

    const handleExpand = useCallback(() => {
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
        } clearAnimationTimeout();

        setOverlayFadingOut(false);
        setAllowTransitions(true);
        setInitialPosition();
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
        }, 520);
    }, [animationState, isExpanded, handleClose, clearAnimationTimeout, setInitialPosition]);

    useEffect(() => {
        if (isVisible && !isExpanded && animationState === 'idle') {
            handleExpand();
        } else if (!isVisible && isExpanded && animationState === 'idle') {
            handleClose();
        }
    }, [isVisible, isExpanded, animationState, handleExpand, handleClose]);

    const handleOverlayClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        handleClose();
        onToggle(); // Notify parent that we're closing
    }, [handleClose, onToggle]);

    const handleCardClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        handleClose();
        onToggle(); // Notify parent that we're closing
    }, [handleClose, onToggle]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearAnimationTimeout();
        };
    }, [clearAnimationTimeout]);

    const getWrapperClasses = () => {
        const classes = ['welcome-wrapper'];

        if (isExpanded) classes.push('expanded');
        if (animationState === 'expanding') classes.push('expanding');
        if (animationState === 'collapsing') classes.push('collapsing');
        if (animationState === 'preparing') classes.push('preparing-expand');
        if (animationState !== 'idle') classes.push('animating');
        if (!allowTransitions) classes.push('no-transitions');

        return classes.join(' ');
    };

    return (
        <>
            {(isExpanded || overlayFadingOut) && (
                <div
                    className={`welcome-overlay ${overlayFadingOut ? 'fade-out' : ''}`}
                    onClick={handleOverlayClick}
                />
            )}

            <div
                ref={wrapperRef}
                className={getWrapperClasses()}
                onClick={handleCardClick}
            >
                <Superellipse
                    className="welcome-component"
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
                    <div className="welcome-content">
                        <div className="welcome-text">
                            <h2>CoruMap</h2>
                            <p>
                                <span className="accent-highlight">A Coruña's coast</span> at night is beautiful. I love my city and wanted to share it through an <span className="accent-highlight">interactive itinerary album</span>
                            </p>
                            <p>
                                I took these photos during an evening walk by the sea. I hope you enjoy them :)
                            </p>
                            <p className="welcome-close-hint">
                                Close this by clicking anywhere
                            </p>
                            <a
                                href="https://github.com/ferni2768/corumap"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="welcome-link"
                                onClick={(e) => e.stopPropagation()}
                            >
                                View the code
                            </a>
                        </div>
                    </div>
                </Superellipse>
            </div>
        </>
    );
};

export default WelcomeCard;
