import { FORCE_CACHE_REFRESH } from '../App';

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

    if (FORCE_CACHE_REFRESH) {
        const timestamp = Date.now();
        return `${GITHUB_CDN_BASE}/${filename}?v=${timestamp}&cache=false`;
    }

    return `${GITHUB_CDN_BASE}/${filename}`;
};

// Check if image exists (for fallback handling)
export const imageExists = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
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
