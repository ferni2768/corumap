export interface MapStyleInfo {
    url: string;
    name: string;
    config?: {
        hideAllLabels?: boolean;
    };
}

export const MAP_STYLES: MapStyleInfo[] = [
    {
        url: 'mapbox://styles/mapbox/satellite-v9',
        name: 'Satellite v9'
    },
    {
        url: 'mapbox://styles/mapbox/navigation-night-v1',
        name: 'Night-1',
        config: {
            hideAllLabels: true
        }
    },
    {
        url: 'mapbox://styles/mapbox/dark-v11',
        name: 'Night-2',
        config: {
            hideAllLabels: true
        }
    }
];

/**
 * Permanently hides all labels from a map style - applies immediately and persistently
 */
export const hideAllLabelsForever = (map: any) => {
    if (!map) return;

    const hideLabels = () => {
        try {
            const style = map.getStyle();
            if (style && style.layers) {
                style.layers.forEach((layer: any) => {
                    // Hide all symbol layers (which contain text)
                    if (layer.type === 'symbol') {
                        try {
                            map.setLayoutProperty(layer.id, 'visibility', 'none');
                        } catch (error) {
                            // Ignore errors for already hidden layers
                        }
                    }

                    // Also hide layers that might contain text based on their IDs
                    const isTextLayer = layer.id.includes('label') ||
                        layer.id.includes('text') ||
                        layer.id.includes('place') ||
                        layer.id.includes('poi') ||
                        layer.id.includes('transit') ||
                        layer.id.includes('road') ||
                        layer.id.includes('street') ||
                        layer.id.includes('highway') ||
                        layer.id.includes('state') ||
                        layer.id.includes('country') ||
                        layer.id.includes('city') ||
                        layer.id.includes('town') ||
                        layer.id.includes('village') ||
                        layer.id.includes('settlement');

                    if (isTextLayer && layer.type !== 'line' && layer.type !== 'fill') {
                        try {
                            map.setLayoutProperty(layer.id, 'visibility', 'none');
                        } catch (error) {
                            // Ignore errors for already hidden layers
                        }
                    }
                });
            }
        } catch (error) {
            // Handle any errors silently
        }
    };

    // Hide labels immediately if style is already loaded
    if (map.isStyleLoaded()) {
        hideLabels();
    }

    // Hide labels whenever style loads/reloads and on style changes
    map.on('styledata', hideLabels);
    map.on('style.load', hideLabels);

    // Additional safety - hide labels on any data update
    map.on('data', (e: any) => {
        if (e.dataType === 'style') {
            // Small delay to ensure style is fully loaded
            setTimeout(hideLabels, 0);
        }
    });
};

/**
 * Applies custom configuration to hide labels from dark-v11 style
 */
export const applyCustomStyleConfig = async (map: any, styleInfo: MapStyleInfo) => {
    if (styleInfo.config?.hideAllLabels && map) {
        hideAllLabelsForever(map);
        return;
    }

    // Legacy implementation for backward compatibility
    if (styleInfo.config?.hideAllLabels && map) {
        try {
            // Wait for style to load completely
            const waitForStyleLoad = () => {
                return new Promise((resolve) => {
                    if (map.isStyleLoaded()) {
                        resolve(null);
                    } else {
                        map.once('styledata', resolve);
                    }
                });
            };

            await waitForStyleLoad();

            // Get all layers and hide text/symbol layers
            const style = map.getStyle();
            if (style && style.layers) {
                style.layers.forEach((layer: any) => {
                    // Hide all symbol layers (which contain text)
                    if (layer.type === 'symbol') {
                        try {
                            map.setLayoutProperty(layer.id, 'visibility', 'none');
                        } catch (error) {
                            // Ignore errors for already hidden layers
                        }
                    }

                    // Also hide layers that might contain text based on their IDs
                    const isTextLayer = layer.id.includes('label') ||
                        layer.id.includes('text') ||
                        layer.id.includes('place') ||
                        layer.id.includes('poi') ||
                        layer.id.includes('transit') ||
                        layer.id.includes('road') ||
                        layer.id.includes('street') ||
                        layer.id.includes('highway') ||
                        layer.id.includes('state') ||
                        layer.id.includes('country') ||
                        layer.id.includes('city') ||
                        layer.id.includes('town') ||
                        layer.id.includes('village') ||
                        layer.id.includes('settlement');

                    if (isTextLayer && layer.type !== 'line' && layer.type !== 'fill') {
                        try {
                            map.setLayoutProperty(layer.id, 'visibility', 'none');
                        } catch (error) {
                            // Ignore errors for already hidden layers
                        }
                    }
                });
            }

            // Also listen for future style changes to ensure labels stay hidden
            map.on('styledata', () => {
                if (styleInfo.config?.hideAllLabels) {
                    setTimeout(() => {
                        const currentStyle = map.getStyle();
                        if (currentStyle && currentStyle.layers) {
                            currentStyle.layers.forEach((layer: any) => {
                                if (layer.type === 'symbol') {
                                    try {
                                        map.setLayoutProperty(layer.id, 'visibility', 'none');
                                    } catch (error) {
                                        // Ignore errors for already hidden layers
                                    }
                                }
                            });
                        }
                    }, 100);
                }
            });

        } catch (error) {
            // Handle any errors that occur while applying the style
        }
    }
};
