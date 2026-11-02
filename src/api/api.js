/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: api.js (Enjin Perhubungan Pangkalan Data Supabase & Integrasi Cache)
 * ==============================================================================
 */

// Inisialisasi Klien Supabase (Beroperasi melalui Cloudflare Reverse Proxy)
const supabaseClient = supabase.createClient(
    APP_CONFIG.SUPABASE_URL,
    APP_CONFIG.SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);

// Pendedahan rujukan klien Supabase untuk kegunaan modul segerak (realtime.js)
window.supabaseClient = supabaseClient;

const API = {
    client: supabaseClient,

    /**
     * FUNGSI 1: Menarik data metrik keseluruhan & Cantuman Data Daerah
     * Menggunakan strategi Stale-While-Revalidate dengan sandaran IndexedDB.
     */
    async fetchDashboardData(forceRefresh = false) {
        const storeName = (window.APP_CONFIG && APP_CONFIG.IDB && APP_CONFIG.IDB.STORES)
            ? APP_CONFIG.IDB.STORES.DASHBOARD_CACHE
            : 'dashboard_cache';
        const cacheKey = 'main_dashboard_data';

        // 1. Semak data sedia ada dalam IndexedDB jika bukan mod muat semula paksa
        if (!forceRefresh && window.IDBCache) {
            try {
                const cachedData = await window.IDBCache.get(storeName, cacheKey);
                if (cachedData) {
                    // Cetuskan penyelarasan latar belakang tanpa menyekat UI (Background Revalidation)
                    this.revalidateDashboardData(storeName, cacheKey);
                    return cachedData;
                }
            } catch (cacheErr) {
                console.warn("Ralat membaca cache IndexedDB:", cacheErr);
            }
        }

        // 2. Tarik data terus dari pelayan sekiranya cache tiada atau luput
        return await this.fetchFreshDashboardData(storeName, cacheKey);
    },

    /**
     * Tarik data segar daripada pelayan Supabase dan simpan ke dalam cache
     */
    async fetchFreshDashboardData(storeName, cacheKey) {
        try {
            // Panggilan serentak (Parallel Fetching) bagi jadual metrik dan daerah
            const [delimaRes, smpidRes] = await Promise.all([
                supabaseClient
                    .from('delima_data_sekolah')
                    .select('*')
                    .order('jumlah_akaun', { ascending: false }),
                supabaseClient
                    .from('smpid_sekolah_data')
                    .select('kod_sekolah, daerah')
            ]);

            if (delimaRes.error) throw delimaRes.error;
            if (smpidRes.error) throw smpidRes.error;

            // Membina Hash Map daerah untuk pemetaan pantas O(1)
            const daerahMap = {};
            if (smpidRes.data) {
                smpidRes.data.forEach(item => {
                    if (item.kod_sekolah) {
                        daerahMap[item.kod_sekolah] = item.daerah;
                    }
                });
            }

            // Cantuman data silang (Cross-reference Join)
            const result = {
                success: true,
                timestamp: new Date().toISOString(),
                overall: {
                    jumlah_akaun: 0, jumlah_aktif: 0, jumlah_tidak_aktif: 0, jumlah_belum_login: 0,
                    murid_keseluruhan: 0, murid_aktif: 0, murid_tidak_aktif: 0, murid_belum_login: 0,
                    guru_keseluruhan: 0, guru_aktif: 0, guru_tidak_aktif: 0, guru_belum_login: 0,
                    sekolah_keseluruhan: 0, sekolah_aktif: 0, sekolah_tidak_aktif: 0, sekolah_belum_login: 0
                },
                schools: delimaRes.data.map(school => {
                    let rawDaerah = daerahMap[school.kod_sekolah];
                    return {
                        ...school,
                        daerah: (rawDaerah && rawDaerah.trim() !== '') 
                            ? rawDaerah.trim().toUpperCase() 
                            : 'TIADA MAKLUMAT DAERAH'
                    };
                })
            };

            // Pengiraan agregasi metrik di peringkat klien
            const metrikTeras = [
                'jumlah_akaun', 'jumlah_aktif', 'jumlah_tidak_aktif', 'jumlah_belum_login',
                'murid_keseluruhan', 'murid_aktif', 'murid_tidak_aktif', 'murid_belum_login',
                'guru_keseluruhan', 'guru_aktif', 'guru_tidak_aktif', 'guru_belum_login',
                'sekolah_keseluruhan', 'sekolah_aktif', 'sekolah_tidak_aktif', 'sekolah_belum_login'
            ];

            result.schools.forEach(school => {
                metrikTeras.forEach(key => {
                    result.overall[key] += (school[key] || 0);
                });
            });

            // Simpan salinan terkini ke dalam IndexedDB
            if (window.IDBCache && storeName && cacheKey) {
                await window.IDBCache.set(storeName, cacheKey, result);
            }

            return result;

        } catch (err) {
            console.error("Ralat Supabase (fetchFreshDashboardData):", err);

            // Sandaran luar talian: Kembalikan rekod cache lapuk jika rangkaian gagal
            if (window.IDBCache && storeName && cacheKey) {
                const fallbackData = await window.IDBCache.get(storeName, cacheKey);
                if (fallbackData) {
                    console.info("Rangkaian terputus. Menggunakan salinan cache setempat IndexedDB.");
                    return fallbackData;
                }
            }

            return { success: false, message: err.message };
        }
    },

    /**
     * Penyelarasan semula di latar belakang (Background Revalidation)
     */
    async revalidateDashboardData(storeName, cacheKey) {
        try {
            const freshData = await this.fetchFreshDashboardData(storeName, cacheKey);
            if (freshData && freshData.success && typeof window.dispatchEvent === 'function') {
                window.dispatchEvent(new CustomEvent('delima:dashboard-revalidated', {
                    detail: freshData
                }));
            }
        } catch (e) {
            console.warn("Penyelarasan latar belakang gagal:", e);
        }
    },

    /**
     * FUNGSI 2: Carian Pengguna Spesifik Sekolah Berkelajuan Tinggi
     */
    async searchUsers(kodSekolah, searchQuery) {
        try {
            const { data, error } = await supabaseClient
                .from('delima_salinan_admin')
                .select('nama_penuh, emel, kategori, status')
                .eq('kod_sekolah', kodSekolah)
                .or(`nama_penuh.ilike.%${searchQuery}%,emel.ilike.%${searchQuery}%`)
                .limit(100);

            if (error) throw error;

            return {
                success: true,
                count: data.length,
                results: data.map(item => ({
                    nama: item.nama_penuh,
                    emel: item.emel,
                    kategori: item.kategori,
                    status: item.status
                }))
            };
        } catch (err) {
            console.error("Ralat Supabase (searchUsers):", err);
            return { success: false, message: err.message };
        }
    },

    /**
     * FUNGSI 3: Carian Pengguna Global (Seluruh Negeri) dengan Sekatan Bilangan Had (Capping)
     * Menguatkuasakan had 15 rekod bagi menghalang pengekstrakan data pukal.
     */
    async searchUsersGlobal(searchQuery) {
        try {
            const { data, error } = await supabaseClient
                .from('delima_salinan_admin')
                .select('nama_penuh, emel, kategori, status, kod_sekolah')
                .or(`nama_penuh.ilike.%${searchQuery}%,emel.ilike.%${searchQuery}%`)
                .limit(15);

            if (error) throw error;

            return {
                success: true,
                count: data.length,
                results: data.map(item => ({
                    nama: item.nama_penuh,
                    emel: item.emel,
                    kategori: item.kategori,
                    status: item.status,
                    kod_sekolah: item.kod_sekolah
                }))
            };
        } catch (err) {
            console.error("Ralat Supabase (searchUsersGlobal):", err);
            return { success: false, message: err.message };
        }
    },

    /**
     * FUNGSI 4: Ekstrak Penuh Data Pengguna Sekolah (Dengan Sokongan Cache Tempatan)
     */
    async exportSchoolUsers(kodSekolah, forceRefresh = false) {
        const storeName = (window.APP_CONFIG && APP_CONFIG.IDB && APP_CONFIG.IDB.STORES)
            ? APP_CONFIG.IDB.STORES.SCHOOL_USERS
            : 'school_users_cache';

        // Semak data dalam storan IndexedDB jika tidak dipaksa muat semula
        if (!forceRefresh && window.IDBCache) {
            const cached = await window.IDBCache.get(storeName, kodSekolah);
            if (cached) return cached;
        }

        try {
            const { data, error } = await supabaseClient
                .from('delima_salinan_admin')
                .select('nama_penuh, emel, kategori, status')
                .eq('kod_sekolah', kodSekolah);

            if (error) throw error;

            const formattedResult = {
                success: true,
                count: data.length,
                results: data.map(item => ({
                    nama: item.nama_penuh,
                    emel: item.emel,
                    kategori: item.kategori,
                    status: item.status
                }))
            };

            // Simpan ke storan IndexedDB
            if (window.IDBCache) {
                await window.IDBCache.set(storeName, kodSekolah, formattedResult);
            }

            return formattedResult;
        } catch (err) {
            console.error("Ralat Supabase (exportSchoolUsers):", err);

            // Sandaran cache tempatan jika panggilan pelayan gagal
            if (window.IDBCache) {
                const fallback = await window.IDBCache.get(storeName, kodSekolah);
                if (fallback) return fallback;
            }

            return { success: false, message: err.message };
        }
    }
};

window.API = API;