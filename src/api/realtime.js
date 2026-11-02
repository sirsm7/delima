/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: realtime.js (Pengurusan Saluran Segerak & Kehadiran Supabase Realtime)
 * ==============================================================================
 */

const Realtime = {
    presenceChannel: null,
    tableChannel: null,
    sessionUUID: null,

    /**
     * Inisialisasi pemantauan pengguna langsung (Live Presence)
     */
    initPresence(onPresenceChangeCallback) {
        const client = window.supabaseClient || (window.API && window.API.client);
        if (!client) {
            console.warn("Klien Supabase belum sedia untuk Realtime Presence.");
            return null;
        }

        const channelName = (window.APP_CONFIG && APP_CONFIG.REALTIME && APP_CONFIG.REALTIME.PRESENCE_CHANNEL)
            ? APP_CONFIG.REALTIME.PRESENCE_CHANNEL
            : 'dashboard-viewers';

        this.sessionUUID = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'user-' + Math.random().toString(36).substring(2, 11);

        this.presenceChannel = client.channel(channelName);

        this.presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = this.presenceChannel.presenceState();
                const totalViewers = Object.keys(presenceState).length;

                if (typeof onPresenceChangeCallback === 'function') {
                    onPresenceChangeCallback(totalViewers);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await this.presenceChannel.track({
                        user: this.sessionUUID,
                        online_at: new Date().toISOString()
                    });
                }
            });

        return this.presenceChannel;
    },

    /**
     * Inisialisasi langganan perubahan data (postgres_changes)
     */
    initTableSubscription() {
        const client = window.supabaseClient || (window.API && window.API.client);
        if (!client) {
            console.warn("Klien Supabase belum sedia untuk Table Subscription.");
            return null;
        }

        const tableName = (window.APP_CONFIG && APP_CONFIG.REALTIME && APP_CONFIG.REALTIME.TABLE_WATCH_SEKOLAH)
            ? APP_CONFIG.REALTIME.TABLE_WATCH_SEKOLAH
            : 'delima_data_sekolah';

        this.tableChannel = client
            .channel(`watch-${tableName}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: tableName },
                (payload) => this.handleTableChange(payload)
            )
            .subscribe();

        return this.tableChannel;
    },

    /**
     * Mengendalikan acara perubahan data dengan semakan konflik (Idempotency)
     */
    async handleTableChange(payload) {
        if (!payload || !payload.new) return;

        const newRecord = payload.new;
        const kodSekolah = newRecord.kod_sekolah;
        if (!kodSekolah) return;

        const storeName = (window.APP_CONFIG && APP_CONFIG.IDB && APP_CONFIG.IDB.STORES)
            ? APP_CONFIG.IDB.STORES.DASHBOARD_CACHE
            : 'dashboard_cache';
        const cacheKey = 'main_dashboard_data';

        if (window.IDBCache) {
            try {
                const cachedDashboard = await window.IDBCache.get(storeName, cacheKey);
                if (cachedDashboard && cachedDashboard.schools) {
                    const existingIndex = cachedDashboard.schools.findIndex(s => s.kod_sekolah === kodSekolah);

                    if (existingIndex !== -1) {
                        const currentRecord = cachedDashboard.schools[existingIndex];

                        // Semakan cap masa konflik: pastikan rekod baharu lebih terkini atau setara
                        const currentSyncTime = currentRecord.last_synced ? new Date(currentRecord.last_synced).getTime() : 0;
                        const newSyncTime = newRecord.last_synced ? new Date(newRecord.last_synced).getTime() : Date.now();

                        if (newSyncTime >= currentSyncTime) {
                            const preservedDaerah = currentRecord.daerah;
                            cachedDashboard.schools[existingIndex] = {
                                ...newRecord,
                                daerah: newRecord.daerah || preservedDaerah
                            };

                            // Kira semula agregasi data keseluruhan
                            this.recalculateCachedTotals(cachedDashboard);

                            // Simpan semula ke dalam IDBCache
                            await window.IDBCache.set(storeName, cacheKey, cachedDashboard);

                            // Pancarkan CustomEvent untuk pengemaskinian nod DOM bersasar
                            window.dispatchEvent(new CustomEvent('delima:school-updated', {
                                detail: {
                                    school: cachedDashboard.schools[existingIndex],
                                    overall: cachedDashboard.overall,
                                    allSchools: cachedDashboard.schools
                                }
                            }));
                        }
                    }
                }
            } catch (err) {
                console.error("Ralat mengendalikan perubahan data langsung (handleTableChange):", err);
            }
        }
    },

    /**
     * Kira semula agregasi metrik data keseluruhan apabila rekod dikemas kini
     */
    recalculateCachedTotals(dashboardObj) {
        const metrikTeras = [
            'jumlah_akaun', 'jumlah_aktif', 'jumlah_tidak_aktif', 'jumlah_belum_login',
            'murid_keseluruhan', 'murid_aktif', 'murid_tidak_aktif', 'murid_belum_login',
            'guru_keseluruhan', 'guru_aktif', 'guru_tidak_aktif', 'guru_belum_login',
            'sekolah_keseluruhan', 'sekolah_aktif', 'sekolah_tidak_aktif', 'sekolah_belum_login'
        ];

        const totals = {};
        metrikTeras.forEach(key => { totals[key] = 0; });

        dashboardObj.schools.forEach(school => {
            metrikTeras.forEach(key => {
                totals[key] += (school[key] || 0);
            });
        });

        dashboardObj.overall = totals;
        dashboardObj.timestamp = new Date().toISOString();
    },

    /**
     * Nyahlanggan dan bersihkan semua saluran aktif Supabase Realtime
     */
    cleanup() {
        const client = window.supabaseClient || (window.API && window.API.client);
        if (!client) return;

        if (this.presenceChannel) {
            client.removeChannel(this.presenceChannel);
            this.presenceChannel = null;
        }

        if (this.tableChannel) {
            client.removeChannel(this.tableChannel);
            this.tableChannel = null;
        }
    }
};

// Pengurusan kitaran hayat sambungan pelayar
window.addEventListener('beforeunload', () => {
    Realtime.cleanup();
});

window.Realtime = Realtime;