/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: config.js (Konfigurasi Berpusat & Kunci Persekitaran)
 * ==============================================================================
 */

const APP_CONFIG = {
    // 1. Pangkalan Data Supabase (REST & Realtime)
    SUPABASE_URL: "https://app.tech4ag.my",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzczNjQ1LCJleHAiOjIwNzg3MzM2NDV9.vZOedqJzUn01PjwfaQp7VvRzSm4aRMr21QblPDK8AoY",

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