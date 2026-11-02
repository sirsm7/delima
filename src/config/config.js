/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: config.js (Konfigurasi Berpusat & Kunci Persekitaran)
 * ==============================================================================
 */

const APP_CONFIG = {
    // 1. Pangkalan Data Supabase (Dihala melalui Cloudflare Reverse Proxy)
    // URL sebenar dan Kunci Anon JWT disembunyikan sepenuhnya di Cloudflare Pages Functions
    SUPABASE_URL: `${window.location.origin}/api`,
    SUPABASE_ANON_KEY: "cloudflare-proxy-managed",

    // 2. Metadata Aplikasi
    DASHBOARD_TITLE: "Dashboard ID DELIMa Jabatan Pendidikan Negeri",

    // 3. Konfigurasi IndexedDB Cache Engine
    IDB: {
        DB_NAME: "delima_hybrid_db",
        DB_VERSION: 1,
        STORES: {
            DASHBOARD_CACHE: "dashboard_cache",
            SCHOOL_USERS: "school_users_cache"
        },
        DEFAULT_TTL_MS: 15 * 60 * 1000 // 15 Minit (Stale-While-Revalidate)
    },

    // 4. Konfigurasi Segerak Langsung (Supabase Realtime)
    REALTIME: {
        PRESENCE_CHANNEL: "dashboard-viewers",
        TABLE_WATCH_SEKOLAH: "delima_data_sekolah"
    }
};

// Mengelakkan manipulasi konfigurasi oleh skrip luar
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.IDB);
Object.freeze(APP_CONFIG.IDB.STORES);
Object.freeze(APP_CONFIG.REALTIME);