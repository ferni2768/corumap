const GITHUB_CDN_BASE = import.meta.env.VITE_GITHUB_CDN_BASE;

if (!GITHUB_CDN_BASE) {
    throw new Error('VITE_GITHUB_CDN_BASE environment variable is required');
}

// Generate image filename based on location and image index
export const generateImageFilename = (locationId: number, imageIndex: number): string => {
    return `location-${locationId}-image-${imageIndex}.jpg`;
};

// Get thumbnail path (local, bundled with app)
export const getThumbnailPath = (locationId: number, imageIndex: number): string => {
    const filename = generateImageFilename(locationId, imageIndex);
    return `/thumbnails/${filename}`;
};

// Get full-resolution image URL (external CDN)
export const getFullImageUrl = (locationId: number, imageIndex: number): string => {
    const filename = generateImageFilename(locationId, imageIndex);
    return `${GITHUB_CDN_BASE}/${filename}`;
};

// Preload image utility
export const preloadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new HTMLImageElement();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
};

// Check if image exists (for fallback handling)
export const imageExists = async (url: string): Promise<boolean> => {
    try {
        await preloadImage(url);
        return true;
    } catch {
        return false;
    }
};

// Get all images for a location
export const getLocationImages = (locationId: number) => {
    return {
        thumbnails: [1, 2, 3].map(index => getThumbnailPath(locationId, index)),
        fullImages: [1, 2, 3].map(index => getFullImageUrl(locationId, index))
    };
};
