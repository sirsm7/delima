/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: api.js (Enjin Perhubungan Pangkalan Data Supabase)
 * ==============================================================================
 */

// Inisialisasi Klien Supabase (Bergantung kepada config.js)
const supabaseClient = supabase.createClient(
    APP_CONFIG.SUPABASE_URL,
    APP_CONFIG.SUPABASE_ANON_KEY
);

const API = {
    /**
     * FUNGSI 1: Menarik data metrik keseluruhan untuk Papan Pemuka
     */
    async fetchDashboardData() {
        try {
            // Mengambil semua data dari jadual delima_data_sekolah
            const { data, error } = await supabaseClient
                .from('delima_data_sekolah')
                .select('*')
                .order('jumlah_akaun', { ascending: false });

            if (error) throw error;
            
            // Format Respon Selari dengan Struktur Asal
            const result = {
                success: true,
                timestamp: new Date().toISOString(),
                overall: {
                    jumlah_akaun: 0, jumlah_aktif: 0, jumlah_tidak_aktif: 0, jumlah_belum_login: 0,
                    murid_keseluruhan: 0, murid_aktif: 0, murid_tidak_aktif: 0, murid_belum_login: 0,
                    guru_keseluruhan: 0, guru_aktif: 0, guru_tidak_aktif: 0, guru_belum_login: 0,
                    sekolah_keseluruhan: 0, sekolah_aktif: 0, sekolah_tidak_aktif: 0, sekolah_belum_login: 0
                },
                schools: data
            };

            // Pengiraan Automatik (Aggregation) di Pihak Klien
            const metrikTeras = [
                'jumlah_akaun', 'jumlah_aktif', 'jumlah_tidak_aktif', 'jumlah_belum_login',
                'murid_keseluruhan', 'murid_aktif', 'murid_tidak_aktif', 'murid_belum_login',
                'guru_keseluruhan', 'guru_aktif', 'guru_tidak_aktif', 'guru_belum_login',
                'sekolah_keseluruhan', 'sekolah_aktif', 'sekolah_tidak_aktif', 'sekolah_belum_login'
            ];

            data.forEach(school => {
                metrikTeras.forEach(key => {
                    result.overall[key] += (school[key] || 0);
                });
            });

            return result;

        } catch (err) {
            console.error("Ralat Supabase (fetchDashboardData):", err);
            return { success: false, message: err.message };
        }
    },

    /**
     * FUNGSI 2: Carian Pengguna Spesifik Berkelajuan Tinggi (High-Speed Search)
     */
    async searchUsers(kodSekolah, searchQuery) {
        try {
            // Carian serentak (OR) pada nama atau emel menggunakan .ilike (Case Insensitive)
            const { data, error } = await supabaseClient
                .from('delima_salinan_admin')
                .select('nama_penuh, emel, kategori, status')
                .eq('kod_sekolah', kodSekolah)
                .or(`nama_penuh.ilike.%${searchQuery}%,emel.ilike.%${searchQuery}%`)
                .limit(100); // Mengehadkan hasil carian untuk prestasi terbaik

            if (error) throw error;

            // Pemetaan format untuk antaramuka pengguna
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
    }
};