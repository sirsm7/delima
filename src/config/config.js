const APP_CONFIG = {
    SUPABASE_URL: `${window.location.origin}/api`,
    SUPABASE_ANON_KEY: "cloudflare-proxy-managed",
    SUPABASE_SCHEMA: "delima_data",
    DASHBOARD_TITLE: "Dashboard ID DELIMa Jabatan Pendidikan Negeri",
    IDB: {
        DB_NAME: "delima_hybrid_db",
        DB_VERSION: 2,
        STORES: {
            DASHBOARD_CACHE: "dashboard_cache",
            SCHOOL_USERS: "school_users_cache"
        },
        DEFAULT_TTL_MS: 15 * 60 * 1000
    },
    REALTIME: {
        PRESENCE_CHANNEL: "dashboard-viewers",
        TABLE_WATCH_SEKOLAH: "delima_data_sekolah"
    }
};

Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.IDB);
Object.freeze(APP_CONFIG.IDB.STORES);
Object.freeze(APP_CONFIG.REALTIME);

window.APP_CONFIG = APP_CONFIG;