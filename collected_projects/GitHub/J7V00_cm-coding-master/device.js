// Coding Master - Device Detection

const Device = {
    get type() {
        const ua = navigator.userAgent.toLowerCase();

        // iPad
        if (
            /ipad/.test(ua) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
        ) {
            return "ipad";
        }

        // iPhone / iPod
        if (/iphone|ipod/.test(ua)) {
            return "ios";
        }

        // Android
        if (/android/.test(ua)) {
            return "android";
        }

        // Windows
        if (/windows/.test(ua)) {
            return "windows";
        }

        // Mac
        if (/macintosh|mac os x/.test(ua)) {
            return "mac";
        }

        // Linux
        if (/linux/.test(ua)) {
            return "linux";
        }

        // Unknown
        return "unknown";
    },

    get isMobile() {
        return ["android", "ios", "ipad"].includes(this.type);
    },

    get isComputer() {
        return ["mac", "windows", "linux"].includes(this.type);
    }
};