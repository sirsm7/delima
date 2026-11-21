const Realtime = {
    presenceChannel: null,
    tableChannel: null,
    sessionUUID: null,
    presenceCallback: null,

    getTargetSchema() {
        return (window.APP_CONFIG && APP_CONFIG.SUPABASE_SCHEMA)
            ? APP_CONFIG.SUPABASE_SCHEMA
            : 'delima_data';
    },

    initPresence(onPresenceChangeCallback) {
        const client = window.supabaseClient || (window.API && window.API.client);
        if (!client) {
            return null;
        }

        if (typeof onPresenceChangeCallback === 'function') {
            this.presenceCallback = onPresenceChangeCallback;
        }

        if (this.presenceChannel) {
            client.removeChannel(this.presenceChannel);
            this.presenceChannel = null;
        }

        const channelName = (window.APP_CONFIG && window.APP_CONFIG.REALTIME && window.APP_CONFIG.REALTIME.PRESENCE_CHANNEL)
            ? APP_CONFIG.REALTIME.PRESENCE_CHANNEL
            : 'dashboard-viewers';

        if (!this.sessionUUID) {
            this.sessionUUID = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : 'user-' + Math.random().toString(36).substring(2, 11);
        }

        this.presenceChannel = client.channel(channelName);

        this.presenceChannel
            .on('presence', { event: 'sync' }, () => {
                if (!this.presenceChannel) return;
                const presenceState = this.presenceChannel.presenceState();
                const totalViewers = Object.keys(presenceState).length;

                if (typeof this.presenceCallback === 'function') {
                    this.presenceCallback(totalViewers);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && this.presenceChannel) {
                    await this.presenceChannel.track({
                        user: this.sessionUUID,
                        online_at: new Date().toISOString()
                    });
                }
            });

        return this.presenceChannel;
    },

    initTableSubscription() {
        const client = window.supabaseClient || (window.API && window.API.client);
        if (!client) {
            return null;
        }

        if (this.tableChannel) {
            client.removeChannel(this.tableChannel);
            this.tableChannel = null;
        }

        const targetSchema = this.getTargetSchema();
        const tableName = (window.APP_CONFIG && window.APP_CONFIG.REALTIME && window.APP_CONFIG.REALTIME.TABLE_WATCH_SEKOLAH)
            ? APP_CONFIG.REALTIME.TABLE_WATCH_SEKOLAH
            : 'delima_data_sekolah';

        this.tableChannel = client
            .channel(`watch-${targetSchema}-${tableName}`)
            .on(
                'postgres_changes',
                { event: '*', schema: targetSchema, table: tableName },
                (payload) => this.handleTableChange(payload)
            )
            .subscribe();

        return this.tableChannel;
    },

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
                        const hasTimestamps = Boolean(currentRecord.last_synced && newRecord.last_synced);
                        const currentSyncTime = hasTimestamps ? new Date(currentRecord.last_synced).getTime() : 0;
                        const newSyncTime = hasTimestamps ? new Date(newRecord.last_synced).getTime() : 0;

                        if (!hasTimestamps || newSyncTime >= currentSyncTime) {
                            const preservedDaerah = currentRecord.daerah;
                            cachedDashboard.schools[existingIndex] = {
                                ...newRecord,
                                daerah: newRecord.daerah || preservedDaerah
                            };

                            this.recalculateCachedTotals(cachedDashboard);
                            await window.IDBCache.set(storeName, cacheKey, cachedDashboard);

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
            }
        }
    },

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

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        if (Realtime.presenceChannel && Realtime.presenceChannel.state !== 'joined') {
            Realtime.initPresence();
        }
        if (Realtime.tableChannel && Realtime.tableChannel.state !== 'joined') {
            Realtime.initTableSubscription();
        }
    }
});

window.addEventListener('online', () => {
    if (Realtime.presenceChannel && Realtime.presenceChannel.state !== 'joined') {
        Realtime.initPresence();
    }
    if (Realtime.tableChannel && Realtime.tableChannel.state !== 'joined') {
        Realtime.initTableSubscription();
    }
});

window.addEventListener('beforeunload', () => {
    Realtime.cleanup();
});

window.Realtime = Realtime;