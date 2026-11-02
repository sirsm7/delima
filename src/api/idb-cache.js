/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: idb-cache.js (Enjin Pengurusan Cache Asli IndexedDB)
 * ==============================================================================
 */

window.__memoryCache = window.__memoryCache || {};

const IDBCache = {
    db: null,
    useMemoryFallback: false,

    /**
     * Inisialisasi sambungan pangkalan data IndexedDB
     */
    async init() {
        if (this.db) return this.db;

        if (!('indexedDB' in window)) {
            console.warn("IndexedDB tidak disokong pada pelayar ini. Menggunakan sandaran memori.");
            this.useMemoryFallback = true;
            return null;
        }

        return new Promise((resolve) => {
            try {
                const dbName = (window.APP_CONFIG && APP_CONFIG.IDB && APP_CONFIG.IDB.DB_NAME) 
                    ? APP_CONFIG.IDB.DB_NAME 
                    : "delima_hybrid_db";
                const dbVersion = (window.APP_CONFIG && APP_CONFIG.IDB && APP_CONFIG.IDB.DB_VERSION) 
                    ? APP_CONFIG.IDB.DB_VERSION 
                    : 1;

                const request = indexedDB.open(dbName, dbVersion);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    const stores = (window.APP_CONFIG && APP_CONFIG.IDB && APP_CONFIG.IDB.STORES)
                        ? Object.values(APP_CONFIG.IDB.STORES)
                        : ["dashboard_cache", "school_users_cache"];

                    stores.forEach((storeName) => {
                        if (!db.objectStoreNames.contains(storeName)) {
                            db.createObjectStore(storeName, { keyPath: "key" });
                        }
                    });
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    this.useMemoryFallback = false;
                    resolve(this.db);
                };

                request.onerror = (event) => {
                    console.warn("Akses IndexedDB disekat atau gagal. Menggunakan sandaran memori.", event.target.error);
                    this.useMemoryFallback = true;
                    resolve(null);
                };
            } catch (err) {
                console.warn("Ralat permulaan IndexedDB. Mengaktifkan sandaran memori.", err);
                this.useMemoryFallback = true;
                resolve(null);
            }
        });
    },

    /**
     * Dapatkan data daripada storan cache mengikut kunci (dengan semakan TTL)
     */
    async get(storeName, key) {
        await this.init();

        if (this.useMemoryFallback) {
            const memKey = `${storeName}:${key}`;
            const cachedItem = window.__memoryCache[memKey];
            if (!cachedItem) return null;

            if (cachedItem.expiry && Date.now() > cachedItem.expiry) {
                delete window.__memoryCache[memKey];
                return null;
            }
            return cachedItem.value;
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction([storeName], "readonly");
                const store = tx.objectStore(storeName);
                const request = store.get(key);

                request.onsuccess = () => {
                    const record = request.result;
                    if (!record) {
                        resolve(null);
                        return;
                    }

                    if (record.expiry && Date.now() > record.expiry) {
                        this.delete(storeName, key);
                        resolve(null);
                        return;
                    }

                    resolve(record.value);
                };

                request.onerror = () => resolve(null);
            } catch (err) {
                console.warn(`Ralat membaca IndexedDB bagi storan '${storeName}':`, err);
                resolve(null);
            }
        });
    },

    /**
     * Simpan data ke dalam storan cache dengan had tempoh sah laku (TTL)
     */
    async set(storeName, key, value, ttlMs) {
        await this.init();

        const defaultTTL = (window.APP_CONFIG && APP_CONFIG.IDB && APP_CONFIG.IDB.DEFAULT_TTL_MS)
            ? APP_CONFIG.IDB.DEFAULT_TTL_MS
            : 15 * 60 * 1000;

        const effectiveTTL = typeof ttlMs === "number" ? ttlMs : defaultTTL;
        const now = Date.now();
        const record = {
            key: key,
            value: value,
            storedAt: now,
            expiry: now + effectiveTTL
        };

        if (this.useMemoryFallback) {
            window.__memoryCache[`${storeName}:${key}`] = record;
            return true;
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction([storeName], "readwrite");
                const store = tx.objectStore(storeName);
                const request = store.put(record);

                request.onsuccess = () => resolve(true);
                request.onerror = () => {
                    window.__memoryCache[`${storeName}:${key}`] = record;
                    resolve(false);
                };
            } catch (err) {
                console.warn(`Ralat menulis IndexedDB bagi storan '${storeName}':`, err);
                window.__memoryCache[`${storeName}:${key}`] = record;
                resolve(false);
            }
        });
    },

    /**
     * Padam rekod tertentu daripada storan cache
     */
    async delete(storeName, key) {
        await this.init();

        if (this.useMemoryFallback) {
            delete window.__memoryCache[`${storeName}:${key}`];
            return true;
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction([storeName], "readwrite");
                const store = tx.objectStore(storeName);
                const request = store.delete(key);

                request.onsuccess = () => resolve(true);
                request.onerror = () => resolve(false);
            } catch (err) {
                resolve(false);
            }
        });
    },

    /**
     * Kosongkan keseluruhan storan cache yang dinamakan
     */
    async clear(storeName) {
        await this.init();

        if (this.useMemoryFallback) {
            const prefix = `${storeName}:`;
            Object.keys(window.__memoryCache).forEach((k) => {
                if (k.startsWith(prefix)) delete window.__memoryCache[k];
            });
            return true;
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction([storeName], "readwrite");
                const store = tx.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => resolve(true);
                request.onerror = () => resolve(false);
            } catch (err) {
                resolve(false);
            }
        });
    }
};

window.IDBCache = IDBCache;