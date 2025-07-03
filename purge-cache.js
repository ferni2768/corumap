const GITHUB_CDN_BASE = 'https://cdn.jsdelivr.net/gh/ferni2768/corumap-images@main';

const purgeJSDelivrCache = async (filename) => {
    try {
        const purgeUrl = `https://purge.jsdelivr.net/gh/ferni2768/corumap-images@main/${filename}`;
        const response = await fetch(purgeUrl, { method: 'POST' });
        return response.ok;
    } catch (error) {
        return false;
    }
};

const purgeAllImages = async () => {
    const purgePromises = [];

    for (let locationId = 1; locationId <= 10; locationId++) {
        for (let imageIndex = 1; imageIndex <= 3; imageIndex++) {
            const filename = `location-${locationId}-image-${imageIndex}.jpg`;
            purgePromises.push(purgeJSDelivrCache(filename));
        }
    }

    try {
        await Promise.allSettled(purgePromises);
    } catch (error) {
        // Silent fail
    }
};

// Run the purge
purgeAllImages();
