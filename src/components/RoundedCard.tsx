import React, { useState, useEffect, useRef } from 'react';
import Superellipse from 'react-superellipse';
import { Preset } from "react-superellipse";
import '../styles/RoundedCard.css';

interface RoundedCardProps {
    className?: string;
    showDebugOverlay?: boolean;
    markerLocationText?: string;
    onPreviousMarker?: () => void;
    onNextMarker?: () => void;
    canGoPrevious?: boolean;
    canGoNext?: boolean;
    fastAnimation?: boolean;
    externalAnimationDirection?: 'forward' | 'backward';
}

const RoundedCard: React.FC<RoundedCardProps> = ({
    className = '',
    showDebugOverlay = false,
    markerLocationText = 'No location selected',
    onPreviousMarker,
    onNextMarker,
    canGoPrevious = false,
    canGoNext = false,
    fastAnimation = false,
    externalAnimationDirection
}) => {
    const [debugVisible, setDebugVisible] = useState(showDebugOverlay);
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentText, setCurrentText] = useState(markerLocationText);
    const [nextText, setNextText] = useState(markerLocationText);
    const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward');
    const [primaryIsActive, setPrimaryIsActive] = useState(true);
    const [isPositioned, setIsPositioned] = useState(true);
    const previousTextRef = useRef(markerLocationText);
    const pendingDirectionRef = useRef<'forward' | 'backward'>('forward');
    const animationQueueRef = useRef<Array<{ text: string; direction: 'forward' | 'backward' }>>([]);
    const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Process animation queue
    const processQueue = () => {
        if (animationQueueRef.current.length === 0 || isAnimating) return;

        const nextAnimation = animationQueueRef.current.shift();
        if (!nextAnimation) return;

        setNextText(nextAnimation.text);
        setAnimationDirection(nextAnimation.direction);

        if (nextAnimation.direction === 'backward') {
            setIsPositioned(false);
            requestAnimationFrame(() => {
                setIsPositioned(true);
                setIsAnimating(true);
            });
        } else {
            setIsAnimating(true);
        }

        previousTextRef.current = nextAnimation.text;
    };

    // Handle text changes and trigger animations
    useEffect(() => {
        if (markerLocationText === previousTextRef.current) return;

        // Use external direction if provided, otherwise use the pending direction
        const direction = externalAnimationDirection || pendingDirectionRef.current;

        const newAnimation = {
            text: markerLocationText,
            direction: direction
        };

        if (isAnimating) {
            // If animating, add to queue but limit queue size for rapid changes
            animationQueueRef.current.push(newAnimation);

            // Keep only the latest 2 items in queue to prevent buildup
            if (animationQueueRef.current.length > 2) {
                animationQueueRef.current = animationQueueRef.current.slice(-2);
            }
        } else {
            // If not animating, process immediately
            animationQueueRef.current = [newAnimation];
            processQueue();
        }
    }, [markerLocationText, isAnimating, externalAnimationDirection]);

    // Handle animation completion
    const handleAnimationEnd = () => {
        setCurrentText(nextText);
        setPrimaryIsActive(!primaryIsActive);
        setIsAnimating(false);
        setIsPositioned(true);

        // Clear any pending timeout and process next in queue
        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
        }

        // Small delay to ensure state is stable before next animation
        animationTimeoutRef.current = setTimeout(() => {
            processQueue();
        }, 10);
    };

    // Handle navigation with direction
    const handlePreviousClick = () => {
        if (canGoPrevious && onPreviousMarker) {
            pendingDirectionRef.current = 'backward';
            onPreviousMarker();
        }
    };

    const handleNextClick = () => {
        if (canGoNext && onNextMarker) {
            pendingDirectionRef.current = 'forward';
            onNextMarker();
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className={`rounded-card-container ${debugVisible ? 'debug' : ''}`}>
            <Superellipse
                className={`rounded-card ${className}`}
                r1={Preset.iOS.r1}
                r2={Preset.iOS.r2}
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                }}
            />
            <div className="card-content">
                <div
                    className={`card-text-primary ${isAnimating ? `animate-${animationDirection}` : ''} ${primaryIsActive ? 'active' : 'inactive'} ${fastAnimation ? 'fast-animation' : ''} ${!isPositioned && animationDirection === 'backward' && !primaryIsActive ? 'backward-start' : ''}`}
                    data-positioned={isPositioned}
                    onTransitionEnd={primaryIsActive && isAnimating ? handleAnimationEnd : undefined}
                >
                    {primaryIsActive ? currentText : nextText}
                </div>
                <div
                    className={`card-text-secondary ${isAnimating ? `animate-${animationDirection}` : ''} ${!primaryIsActive ? 'active' : 'inactive'} ${fastAnimation ? 'fast-animation' : ''} ${!isPositioned && animationDirection === 'backward' && primaryIsActive ? 'backward-start' : ''}`}
                    data-positioned={isPositioned}
                    onTransitionEnd={!primaryIsActive && isAnimating ? handleAnimationEnd : undefined}
                >
                    {!primaryIsActive ? currentText : nextText}
                </div>
            </div>
            <div
                className={`card-arrow card-arrow-left ${!canGoPrevious ? 'disabled' : ''}`}
                onClick={handlePreviousClick}
            />
            <div
                className={`card-arrow card-arrow-right ${!canGoNext ? 'disabled' : ''}`}
                onClick={handleNextClick}
            />
        </div>
    );
};

export default RoundedCard;