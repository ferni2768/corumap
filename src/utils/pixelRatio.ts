export class PixelRatioManager {
    private static instance: PixelRatioManager;
    private pixelRatio: number = 10;
    private isMobile: boolean = false;
    private resizeTimeout: number | null = null;

    // Resolution thresholds for desktop
    private static readonly RESOLUTION_THRESHOLDS = [
        { maxWidth: 1920, maxHeight: 1080, pixelRatio: 3.16 },
        { maxWidth: 2560, maxHeight: 1440, pixelRatio: 2.5 },
        { maxWidth: 3840, maxHeight: 2160, pixelRatio: 2 },
        { maxWidth: Infinity, maxHeight: Infinity, pixelRatio: 2 }
    ]; static getInstance(): PixelRatioManager {
        if (!PixelRatioManager.instance) {
            PixelRatioManager.instance = new PixelRatioManager();
        }
        return PixelRatioManager.instance;
    }

    isMobileDevice(): boolean {
        return this.isMobile;
    }

    getPixelRatio(): number {
        return this.pixelRatio;
    }

    private detectMobile(): boolean {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'mobile', 'phone', 'tablet'];

        // Check user agent
        const hasMobileKeyword = mobileKeywords.some(keyword => userAgent.includes(keyword));
        // Check for touch capability
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        return hasMobileKeyword || (isTouchDevice);
    }

    private getViewportDimensions(): { width: number; height: number } {
        if (this.isMobile && 'visualViewport' in window && window.visualViewport) {
            return {
                width: window.visualViewport.width,
                height: window.visualViewport.height
            };
        }
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    private calculatePixelRatio(): void {
        if (this.isMobile) {
            this.pixelRatio = 3;
            return;
        }

        // Desktop resolution-based pixel ratio
        const { width, height } = this.getViewportDimensions();
        const threshold = PixelRatioManager.RESOLUTION_THRESHOLDS.find(
            t => width <= t.maxWidth && height <= t.maxHeight
        );
        this.pixelRatio = threshold?.pixelRatio || 2;
    }

    private applyPixelRatio(): void {
        // Set CSS custom property
        document.documentElement.style.setProperty('--pixel-ratio', this.pixelRatio.toString());

        // Set mobile scaling factor for markers
        if (this.isMobile) {
            document.documentElement.style.setProperty('--marker-mobile-scale', '0.33');
        } else {
            document.documentElement.style.setProperty('--marker-mobile-scale', '1');
        }

        if (this.isMobile) {
            this.applyMobileStyles();
        } else {
            this.applyDesktopStyles();
        }

        // Trigger map resize event
        window.dispatchEvent(new CustomEvent('pixelRatioChanged', {
            detail: { pixelRatio: this.pixelRatio }
        }));
    }

    private applyMobileStyles(): void {
        const { width, height } = this.getViewportDimensions();

        // Set viewport meta
        this.ensureViewportMeta();

        // Reset body styles for mobile
        Object.assign(document.body.style, {
            width: `${width}px`,
            height: `${height}px`,
            overflow: 'hidden',
            transform: 'none'
        });

        // Reset map scaling for mobile
        document.documentElement.style.setProperty('--map-scale', '1');
    }

    private applyDesktopStyles(): void {
        const scale = 1 / this.pixelRatio;

        // Reset body styles
        Object.assign(document.body.style, {
            transform: 'none',
            transformOrigin: 'initial',
            width: '100%',
            height: '100%'
        });

        // Apply scaling to map wrapper via CSS custom properties
        document.documentElement.style.setProperty('--map-scale', scale.toString());
    }

    private ensureViewportMeta(): void {
        let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }

    initialize(): void {
        this.isMobile = this.detectMobile();
        this.calculatePixelRatio();
        this.applyPixelRatio();

        const handleResize = () => {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }

            this.resizeTimeout = window.setTimeout(() => {
                this.calculatePixelRatio();
                this.applyPixelRatio();
            }, 100);
        };

        window.addEventListener('resize', handleResize);

        // Listen for mobile visual viewport changes
        if (this.isMobile && 'visualViewport' in window && window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
        }
    }
}