export class PixelRatioManager {
    private static instance: PixelRatioManager;
    private pixelRatio: number = 10;
    private autoThresholds: boolean = true;
    private isAndroid: boolean = false;

    // Resolution thresholds
    private static readonly RESOLUTION_THRESHOLDS = [
        { maxWidth: 1280, maxHeight: 720, pixelRatio: 3.25 },
        { maxWidth: 1920, maxHeight: 1080, pixelRatio: 3 },
        { maxWidth: 2560, maxHeight: 1440, pixelRatio: 2.5 },
        { maxWidth: 3840, maxHeight: 2160, pixelRatio: 2 },
        { maxWidth: Infinity, maxHeight: Infinity, pixelRatio: 2 }
    ]; static getInstance(): PixelRatioManager {
        if (!PixelRatioManager.instance) {
            PixelRatioManager.instance = new PixelRatioManager();
        }
        return PixelRatioManager.instance;
    }

    private detectAndroid(): boolean {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('android');
    }

    setPixelRatio(ratio: number): void {
        this.pixelRatio = ratio;
        this.autoThresholds = false;
        this.applyPixelRatio();
    }

    setAutoThresholds(enabled: boolean): void {
        this.autoThresholds = enabled;
        if (enabled) {
            this.applyResolutionThreshold();
        }
    } isAutoThresholdsEnabled(): boolean {
        return this.autoThresholds;
    }

    isAndroidDevice(): boolean {
        return this.isAndroid;
    }

    getPixelRatio(): number {
        return this.pixelRatio;
    } private applyResolutionThreshold(): void {
        if (!this.autoThresholds) return;

        // For Android devices, always use pixel ratio 1.5
        if (this.isAndroid) {
            if (this.pixelRatio !== 1.5) {
                this.pixelRatio = 1.5;
                this.applyPixelRatio();
            }
            return;
        }

        const resolution = this.getCurrentResolution();
        const threshold = PixelRatioManager.RESOLUTION_THRESHOLDS.find(
            t => resolution.width <= t.maxWidth && resolution.height <= t.maxHeight
        );

        if (threshold && threshold.pixelRatio !== this.pixelRatio) {
            this.pixelRatio = threshold.pixelRatio;
            this.applyPixelRatio();
        }
    }

    private getCurrentResolution(): { width: number; height: number } {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    } private applyPixelRatio(): void {
        const root = document.documentElement;
        root.style.setProperty('--pixel-ratio', this.pixelRatio.toString());

        const androidClass = 'android-device';

        if (this.isAndroid) {
            document.documentElement.classList.add(androidClass);
            document.body.classList.add(androidClass);
            this.setAndroidStyles();
        } else {
            document.documentElement.classList.remove(androidClass);
            document.body.classList.remove(androidClass);
            this.setDesktopStyles();
        }

        this.updateCanvasContexts();
        this.triggerMapResize();
    }

    private setAndroidStyles(): void {
        const body = document.body;
        Object.assign(body.style, {
            transform: '',
            transformOrigin: '',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden'
        });

        this.ensureViewportMeta();
    }

    private setDesktopStyles(): void {
        const body = document.body;
        const scale = 1 / this.pixelRatio;
        Object.assign(body.style, {
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${100 * this.pixelRatio}%`,
            height: `${100 * this.pixelRatio}%`
        });
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

    private triggerMapResize(): void {
        window.dispatchEvent(new CustomEvent('pixelRatioChanged', {
            detail: { pixelRatio: this.pixelRatio }
        }));

        if (this.isAndroid) {
            setTimeout(() => this.handleAndroidMapCanvas(), 100);
        }
    }

    private handleAndroidMapCanvas(): void {
        const mapboxCanvases = document.querySelectorAll('.mapboxgl-canvas') as NodeListOf<HTMLCanvasElement>;
        mapboxCanvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * this.pixelRatio;
                canvas.height = rect.height * this.pixelRatio;
                canvas.style.width = rect.width + 'px';
                canvas.style.height = rect.height + 'px';
            }
        });
    }

    private updateCanvasContexts(): void {
        const canvases = document.querySelectorAll('canvas') as NodeListOf<HTMLCanvasElement>;
        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            if (this.isAndroid) {
                ctx.scale(this.pixelRatio, this.pixelRatio);
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * this.pixelRatio;
                canvas.height = rect.height * this.pixelRatio;
            } else {
                ctx.scale(this.pixelRatio, this.pixelRatio);
            }
        });
    } initialize(): void {
        // Detect Android first
        this.isAndroid = this.detectAndroid();

        this.applyResolutionThreshold();
        this.applyPixelRatio();

        // Listen for resolution changes
        window.addEventListener('resize', () => {
            if (this.autoThresholds) {
                this.applyResolutionThreshold();
            }
        });
    }
}
