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
     * FUNGSI 1: Menarik data metrik keseluruhan & Cantuman Data Daerah
     */
    async fetchDashboardData() {
        try {
            // Pelaksanaan 'Parallel Fetching' (Panggilan Serentak) untuk menjimatkan masa
            // Jadual 1: delima_data_sekolah (Metrik Penuh)
            // Jadual 2: smpid_sekolah_data (Hanya kod_sekolah & daerah untuk jimat bandwidth)
            const [delimaRes, smpidRes] = await Promise.all([
                supabaseClient
                    .from('delima_data_sekolah')
                    .select('*')
                    .order('jumlah_akaun', { ascending: false }),
                supabaseClient
                    .from('smpid_sekolah_data')
                    .select('kod_sekolah, daerah')
            ]);

            // Tangkap ralat jika mana-mana panggilan gagal
            if (delimaRes.error) throw delimaRes.error;
            if (smpidRes.error) throw smpidRes.error;

            // Membina Hash Map (Kamus) dari smpid_sekolah_data untuk kelajuan capaian O(1)
            const daerahMap = {};
            if (smpidRes.data) {
                smpidRes.data.forEach(item => {
                    if (item.kod_sekolah) {
                        daerahMap[item.kod_sekolah] = item.daerah;
                    }
                });
            }
            
            // Cantumkan data (Cross-reference Join) dan Format Respon
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
                    // Cari daerah menggunakan kod_sekolah di dalam Hash Map
                    let rawDaerah = daerahMap[school.kod_sekolah];
                    
                    // Sanitasi data kolum daerah untuk keseragaman UI (trim & uppercase)
                    return {
                        ...school,
                        daerah: (rawDaerah && rawDaerah.trim() !== '') 
                            ? rawDaerah.trim().toUpperCase() 
                            : 'TIADA MAKLUMAT DAERAH'
                    };
                })
            };

            // Pengiraan Automatik (Aggregation) di Pihak Klien untuk Keseluruhan Data (Negeri)
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
    },

    /**
     * FUNGSI 3: Carian Pengguna Global (Seluruh Negeri) dengan Result Capping
     * Keselamatan: Tiada kod sekolah diperlukan, tetapi WAJIB diletakkan .limit(15) 
     * bagi menghalang risiko kebocoran data berskala besar (Data Scraping).
     */
    async searchUsersGlobal(searchQuery) {
        try {
            // Carian merentas semua sekolah (.eq('kod_sekolah') dibuang)
            const { data, error } = await supabaseClient
                .from('delima_salinan_admin')
                .select('nama_penuh, emel, kategori, status, kod_sekolah')
                .or(`nama_penuh.ilike.%${searchQuery}%,emel.ilike.%${searchQuery}%`)
                .limit(15); 

            if (error) throw error;

            // Pemetaan format untuk antaramuka pengguna
            return {
                success: true,
                count: data.length,
                results: data.map(item => ({
                    nama: item.nama_penuh,
                    emel: item.emel,
                    kategori: item.kategori,
                    status: item.status,
                    kod_sekolah: item.kod_sekolah // Ekstra: Diperlukan UI untuk carian global
                }))
            };

        } catch (err) {
            console.error("Ralat Supabase (searchUsersGlobal):", err);
            return { success: false, message: err.message };
        }
    },

    /**
     * FUNGSI 4: Pemantauan Pengguna Aktif (Live Presence via WebSocket)
     * Menggunakan Supabase Realtime Channels untuk mengira sesi pelayar semasa.
     */
    setupLivePresence(onPresenceChangeCallback) {
        try {
            // Jana ID rawak bagi mewakili sesi unik pelayar web (browser session)
            const sessionUUID = typeof crypto !== 'undefined' && crypto.randomUUID 
                ? crypto.randomUUID() 
                : 'user-' + Math.random().toString(36).substr(2, 9);
            
            // Cipta laluan (Channel) khas untuk pemantauan pengguna papan pemuka
            const viewerChannel = supabaseClient.channel('dashboard-viewers');

            viewerChannel
                .on('presence', { event: 'sync' }, () => {
                    const presenceState = viewerChannel.presenceState();
                    // Kira jumlah UUID (peranti unik) yang bersambung ke channel
                    const totalViewers = Object.keys(presenceState).length;
                    
                    // Salurkan jumlah ini ke fail UI (app.js)
                    if (typeof onPresenceChangeCallback === 'function') {
                        onPresenceChangeCallback(totalViewers);
                    }
                })
                .subscribe(async (status) => {
                    // Hanya rekod kehadiran apabila sambungan WebSocket berjaya ditegakkan
                    if (status === 'SUBSCRIBED') {
                        await viewerChannel.track({
                            user: sessionUUID,
                            online_at: new Date().toISOString()
                        });
                    }
                });

            return viewerChannel;
        } catch (err) {
            console.error("Ralat Supabase (setupLivePresence):", err);
        }
    }
};