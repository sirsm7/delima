/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: app.js (Orkestrator Utama & Pengurusan Aliran Aplikasi)
 * ==============================================================================
 */

// Inisialisasi aplikasi apabila struktur DOM selesai dimuatkan sepenuhnya
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Fungsi Permulaan Teras Aplikasi
 */
async function initApp() {
    try {
        // Tarik data daripada Supabase melalui enjin API (Stale-While-Revalidate & IDB Cache)
        const response = await API.fetchDashboardData();

        if (!response.success) {
            throw new Error(response.message || "Gagal memperoleh data daripada pangkalan data Supabase.");
        }

        // Simpan data ke dalam memori global untuk capaian penapis
        window.globalData = response;
        window.currentFilteredSchools = response.schools;

        // Format dan paparkan cap masa data terkini
        const dateObj = new Date(response.timestamp);
        const lastUpdatedEl = document.getElementById('lastUpdatedText');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = "Data Terkini: " + dateObj.toLocaleString('ms-MY');
        }

        // Isi kandungan dropdown penapis daerah secara dinamik
        populateDaerahDropdown(window.globalData.schools);

        // Pasang pendengar acara bagi penapis daerah
        setupDaerahFilter();

        // Bina antaramuka papan pemuka keseluruhan
        buildMetricsUI(window.globalData.overall, 'overallMetricsContainer');

        // Pastikan kontena papan pendahulu disembunyikan secara lalai pada muatan awal
        const lbContainer = document.getElementById('leaderboardContainer');
        if (lbContainer) {
            lbContainer.classList.add('hidden');
            lbContainer.textContent = '';
        }

        // Mulakan enjin carian sekolah utama (Autolengkap)
        setupMainSearchEngine();

        // Pasang pendengar acara butang tutup paparan sekolah
        const btnTutup = document.getElementById('btnTutupPaparan');
        if (btnTutup) {
            btnTutup.addEventListener('click', resetToOverallView);
        }

        // Inisialisasi ciri segerak masa nyata (Live Presence & Table Watch)
        initializeRealtimeFeatures();

        // Transisi antaramuka daripada keadaan pemuatan ke keadaan sedia
        const loadingState = document.getElementById('loadingState');
        const appContainer = document.getElementById('appContainer');
        if (loadingState) loadingState.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');

    } catch (error) {
        console.error("Ralat Permulaan Aplikasi:", error);
        displayCriticalError(error.message);
    }
}

/**
 * Inisialisasi Pemantauan Kehadiran Langsung & Langganan Jadual Realtime
 */
function initializeRealtimeFeatures() {
    if (!window.Realtime) return;

    // 1. Pemantauan kehadiran pengguna aktif secara langsung
    if (typeof window.Realtime.initPresence === 'function') {
        window.Realtime.initPresence((totalViewers) => {
            const indicatorEl = document.getElementById('liveViewerIndicator');
            const countEl = document.getElementById('liveViewerCount');

            if (indicatorEl && countEl) {
                countEl.textContent = totalViewers;

                if (totalViewers > 0) {
                    indicatorEl.classList.remove('hidden');
                    indicatorEl.classList.add('flex');
                } else {
                    indicatorEl.classList.add('hidden');
                    indicatorEl.classList.remove('flex');
                }
            }
        });
    }

    // 2. Langganan perubahan data jadual (postgres_changes)
    if (typeof window.Realtime.initTableSubscription === 'function') {
        window.Realtime.initTableSubscription();
    }
}

/**
 * Ekstrak Senarai Daerah Unik dan Isi Pilihan Dropdown
 */
function populateDaerahDropdown(schools) {
    const dropdown = document.getElementById('filterDaerah');
    if (!dropdown || !Array.isArray(schools)) return;

    const daerahSet = new Set();

    schools.forEach(school => {
        if (school.daerah && school.daerah.trim() !== '') {
            daerahSet.add(school.daerah.trim().toUpperCase());
        }
    });

    const sortedDaerah = Array.from(daerahSet).sort();
    const fragment = document.createDocumentFragment();

    sortedDaerah.forEach(daerah => {
        const option = document.createElement('option');
        option.value = daerah;
        option.textContent = daerah;
        option.className = "font-semibold";
        fragment.appendChild(option);
    });

    dropdown.appendChild(fragment);
}

/**
 * Tetapkan Pendengar Acara bagi Penapis Daerah
 */
function setupDaerahFilter() {
    const dropdown = document.getElementById('filterDaerah');
    if (!dropdown) return;

    dropdown.addEventListener('change', function(e) {
        applyDaerahFilter(e.target.value);
    });
}

/**
 * Logik Penapisan Data Mengikut Daerah dan Pengiraan Semula Metrik
 */
function applyDaerahFilter(selectedDaerah) {
    // Kembali ke paparan keseluruhan sekiranya paparan sekolah sedang aktif
    resetToOverallView();

    const badgeEl = document.getElementById('overallBadgeText');
    const lbContainer = document.getElementById('leaderboardContainer');

    if (lbContainer) {
        lbContainer.classList.add('hidden');
        lbContainer.textContent = '';
    }

    if (selectedDaerah === 'SEMUA') {
        window.currentFilteredSchools = window.globalData.schools;
        if (badgeEl) badgeEl.textContent = 'Peringkat Negeri';

        buildMetricsUI(window.globalData.overall, 'overallMetricsContainer');
    } else {
        window.currentFilteredSchools = window.globalData.schools.filter(
            s => s.daerah && s.daerah.trim().toUpperCase() === selectedDaerah
        );
        if (badgeEl) badgeEl.textContent = 'PPD ' + selectedDaerah;

        const recalculatedMetrics = recalculateOverallMetrics(window.currentFilteredSchools);
        buildMetricsUI(recalculatedMetrics, 'overallMetricsContainer');
    }

    const activeFilter = (typeof window.currentFilterType !== 'undefined') ? window.currentFilterType : 'keseluruhan';

    setTimeout(() => {
        applyLeaderboardFilter(activeFilter);
    }, 50);
}

/**
 * Enjin Agregasi untuk Menjumlahkan Metrik Tatasusunan Sekolah
 */
function recalculateOverallMetrics(filteredSchoolsArray) {
    const newMetrics = {
        jumlah_akaun: 0, jumlah_aktif: 0, jumlah_tidak_aktif: 0, jumlah_belum_login: 0,
        murid_keseluruhan: 0, murid_aktif: 0, murid_tidak_aktif: 0, murid_belum_login: 0,
        guru_keseluruhan: 0, guru_aktif: 0, guru_tidak_aktif: 0, guru_belum_login: 0,
        sekolah_keseluruhan: 0, sekolah_aktif: 0, sekolah_tidak_aktif: 0, sekolah_belum_login: 0
    };

    const metrikTeras = Object.keys(newMetrics);

    filteredSchoolsArray.forEach(school => {
        metrikTeras.forEach(key => {
            newMetrics[key] += (school[key] || 0);
        });
    });

    return newMetrics;
}

/**
 * Tetapkan Enjin Carian Autolengkap Sekolah
 */
function setupMainSearchEngine() {
    const input = document.getElementById('searchInput');
    const dropdown = document.getElementById('autocompleteDropdown');

    if (!input || !dropdown) return;

    input.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        input.value = input.value.toUpperCase();

        if (query.length === 0 || !window.currentFilteredSchools) {
            dropdown.classList.add('hidden');
            dropdown.textContent = '';
            return;
        }

        const results = window.currentFilteredSchools.filter(school => {
            return (school.nama_sekolah && school.nama_sekolah.toLowerCase().includes(query)) ||
                   (school.kod_sekolah && school.kod_sekolah.toLowerCase().includes(query));
        });

        renderAutocompleteDropdown(results, query);
    });

    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

/**
 * Paparkan Hasil Autolengkap Carian Sekolah (Bebas XSS dengan DocumentFragment)
 */
function renderAutocompleteDropdown(results, query) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (!dropdown) return;

    dropdown.textContent = '';

    if (results.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'p-4 text-sm text-red-500 font-semibold text-center bg-red-50';
        emptyDiv.textContent = 'Tiada sekolah ditemui. Sila cuba kata kunci lain.';
        dropdown.appendChild(emptyDiv);
    } else {
        const fragment = document.createDocumentFragment();
        const limit = Math.min(results.length, 50);

        for (let i = 0; i < limit; i++) {
            const s = results[i];
            const div = document.createElement('div');
            div.className = 'p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors flex justify-between items-center';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'truncate pr-4';

            const nameEl = document.createElement('p');
            nameEl.className = 'text-sm font-bold text-slate-800 truncate';
            nameEl.textContent = s.nama_sekolah || '';
            infoDiv.appendChild(nameEl);

            const metaEl = document.createElement('p');
            metaEl.className = 'text-[10px] font-semibold text-slate-500 mt-0.5';

            const daerahSpan = document.createElement('span');
            daerahSpan.className = 'text-purple-600 font-bold uppercase tracking-wider';
            daerahSpan.textContent = s.daerah || 'TIADA DAERAH';
            metaEl.appendChild(daerahSpan);

            metaEl.appendChild(document.createTextNode(' • '));

            const jenisSpan = document.createElement('span');
            jenisSpan.className = 'uppercase';
            jenisSpan.textContent = s.jenis_sekolah || 'LAIN-LAIN';
            metaEl.appendChild(jenisSpan);

            infoDiv.appendChild(metaEl);
            div.appendChild(infoDiv);

            const codeSpan = document.createElement('span');
            codeSpan.className = 'text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200';
            codeSpan.textContent = s.kod_sekolah || '';
            div.appendChild(codeSpan);

            div.addEventListener('click', () => renderSchoolView(s));
            fragment.appendChild(div);
        }

        if (results.length > 50) {
            const extraDiv = document.createElement('div');
            extraDiv.className = 'p-2 text-xs text-center font-medium text-slate-400 bg-slate-50 border-t border-slate-100';
            extraDiv.textContent = `... dan ${results.length - 50} keputusan lain.`;
            fragment.appendChild(extraDiv);
        }

        dropdown.appendChild(fragment);
    }

    dropdown.classList.remove('hidden');
}

/**
 * Paparkan Ralat Kritikal Antaramuka Sekiranya Inisialisasi Gagal
 */
function displayCriticalError(message) {
    const loadingState = document.getElementById('loadingState');
    if (!loadingState) return;

    loadingState.textContent = '';

    const errorWrapper = document.createElement('div');
    errorWrapper.className = 'flex flex-col items-center justify-center py-20 text-center px-4';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'text-red-500 mb-4';
    iconDiv.innerHTML = '<svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    errorWrapper.appendChild(iconDiv);

    const titleEl = document.createElement('h2');
    titleEl.className = 'text-xl font-bold text-slate-800';
    titleEl.textContent = 'Ralat Komunikasi API Supabase';
    errorWrapper.appendChild(titleEl);

    const msgEl = document.createElement('p');
    msgEl.className = 'text-sm text-slate-500 mt-2 max-w-md';
    msgEl.textContent = message || 'Gagal menyegerak data dengan pangkalan pelayan.';
    errorWrapper.appendChild(msgEl);

    const retryBtn = document.createElement('button');
    retryBtn.className = 'mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-sm hover:bg-blue-700 transition-colors';
    retryBtn.textContent = 'Cuba Semula';
    retryBtn.addEventListener('click', () => location.reload());
    errorWrapper.appendChild(retryBtn);

    loadingState.appendChild(errorWrapper);
    loadingState.classList.remove('hidden');
}