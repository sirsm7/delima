/**
 * ==============================================================================
 * SYSTEM ARCHITECTURE: HYBRID DASHBOARD
 * FILE: app.js (Main Orchestrator & Initialization)
 * ==============================================================================
 */

// Initialize the application once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Core Initialization Function
 */
async function initApp() {
    try {
        // Fetch data from Supabase via API Engine
        const response = await API.fetchDashboardData();

        if (!response.success) {
            throw new Error(response.message || "Failed to fetch data from Supabase.");
        }

        // Store data globally for access by dashboard.js filter functions
        window.globalData = response;
        
        // PEMBAIKAN: Default tatasusunan data yang aktif (Semua Negeri)
        window.currentFilteredSchools = response.schools;

        // Format and Display Last Updated Timestamp
        const dateObj = new Date(response.timestamp);
        const lastUpdatedEl = document.getElementById('lastUpdatedText');
        if (lastUpdatedEl) {
            lastUpdatedEl.innerText = "Data Terkini: " + dateObj.toLocaleString('ms-MY');
        }

        // PEMBAIKAN: Isi kandungan Dropdown Penapis Daerah secara dinamik
        populateDaerahDropdown(window.globalData.schools);

        // PEMBAIKAN: Aktifkan pendengar acara (event listener) untuk Penapis Daerah
        setupDaerahFilter();

        // Build Overall Dashboard UI
        buildMetricsUI(window.globalData.overall, 'overallMetricsContainer');

        // Build Default Leaderboard (Overall/Keseluruhan)
        buildLeaderboardTable(window.currentFilteredSchools, 'keseluruhan');

        // Setup Main Search Engine (Autocomplete)
        setupMainSearchEngine();

        // Attach Global Event Listeners
        document.getElementById('btnTutupPaparan')?.addEventListener('click', resetToOverallView);

        // Transition UI from Loading to Ready State
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');

    } catch (error) {
        console.error("Initialization Error:", error);
        displayCriticalError(error.message);
    }
}

/**
 * Extract Unique Districts and Populate the Filter Dropdown
 */
function populateDaerahDropdown(schools) {
    const dropdown = document.getElementById('filterDaerah');
    if (!dropdown) return;

    // Use a Set to ensure unique values
    const daerahSet = new Set();
    
    schools.forEach(school => {
        if (school.daerah && school.daerah.trim() !== '') {
            daerahSet.add(school.daerah.trim().toUpperCase());
        }
    });

    // Sort alphabetically
    const sortedDaerah = Array.from(daerahSet).sort();

    // Append options to dropdown
    sortedDaerah.forEach(daerah => {
        const option = document.createElement('option');
        option.value = daerah;
        option.text = daerah;
        option.className = "font-semibold";
        dropdown.appendChild(option);
    });
}

/**
 * Setup Event Listener for District Filter
 */
function setupDaerahFilter() {
    const dropdown = document.getElementById('filterDaerah');
    if (!dropdown) return;

    dropdown.addEventListener('change', function(e) {
        applyDaerahFilter(e.target.value);
    });
}

/**
 * Core Logic to Filter Data and Recalculate Metrics
 */
function applyDaerahFilter(selectedDaerah) {
    // Return to overall view if a specific school is currently being viewed
    resetToOverallView();

    const badgeEl = document.getElementById('overallBadgeText');
    
    if (selectedDaerah === 'SEMUA') {
        // Reset to state-level view
        window.currentFilteredSchools = window.globalData.schools;
        if(badgeEl) badgeEl.innerText = 'Peringkat Negeri';
        
        buildMetricsUI(window.globalData.overall, 'overallMetricsContainer');
    } else {
        // Filter array for the specific district
        window.currentFilteredSchools = window.globalData.schools.filter(
            s => s.daerah && s.daerah.trim().toUpperCase() === selectedDaerah
        );
        if(badgeEl) badgeEl.innerText = 'PPD ' + selectedDaerah;
        
        // Recalculate metrics based on the subset array
        const recalculatedMetrics = recalculateOverallMetrics(window.currentFilteredSchools);
        buildMetricsUI(recalculatedMetrics, 'overallMetricsContainer');
    }

    // Rebuild leaderboard maintaining the current metric filter (e.g., 'murid', 'aktif')
    // currentFilterType variable is exposed via dashboard.js state memory
    if (typeof currentFilterType !== 'undefined') {
        buildLeaderboardTable(window.currentFilteredSchools, currentFilterType);
    } else {
        buildLeaderboardTable(window.currentFilteredSchools, 'keseluruhan');
    }
}

/**
 * Aggregation Engine to Sum Metrics for a Custom Array of Schools
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
 * Setup the Autocomplete Search Engine for Schools
 */
function setupMainSearchEngine() {
    const input = document.getElementById('searchInput');
    const dropdown = document.getElementById('autocompleteDropdown');

    if (!input || !dropdown) return;

    input.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        input.value = input.value.toUpperCase(); // Force uppercase visually
        
        // PEMBAIKAN: Hanya cari dalam senarai sekolah yang ditapis ketika ini
        if (query.length === 0 || !window.currentFilteredSchools) {
            dropdown.classList.add('hidden');
            return;
        }

        // Filter Schools Data based on Name or Code
        const results = window.currentFilteredSchools.filter(school => {
            return (school.nama_sekolah && school.nama_sekolah.toLowerCase().includes(query)) || 
                   (school.kod_sekolah && school.kod_sekolah.toLowerCase().includes(query));
        });

        renderAutocompleteDropdown(results, query);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

/**
 * Render Autocomplete Dropdown Items
 */
function renderAutocompleteDropdown(results, query) {
    const dropdown = document.getElementById('autocompleteDropdown');
    dropdown.innerHTML = '';

    if (results.length === 0) {
        dropdown.innerHTML = '<div class="p-4 text-sm text-red-500 font-semibold text-center bg-red-50">Tiada sekolah ditemui. Sila cuba kata kunci lain.</div>';
    } else {
        const limit = Math.min(results.length, 50); // Performance cap
        
        for (let i = 0; i < limit; i++) {
            const s = results[i];
            const div = document.createElement('div');
            div.className = 'p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors flex justify-between items-center';
            div.innerHTML = `
                <div class="truncate pr-4">
                    <p class="text-sm font-bold text-slate-800 truncate">${s.nama_sekolah}</p>
                    <p class="text-[10px] font-semibold text-slate-500 mt-0.5">
                        <span class="text-purple-600 font-bold uppercase tracking-wider">${s.daerah || 'TIADA DAERAH'}</span> &bull; 
                        <span class="uppercase">${s.jenis_sekolah || 'LAIN-LAIN'}</span>
                    </p>
                </div>
                <span class="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">${s.kod_sekolah}</span>
            `;
            // Trigger school view transition on click
            div.onclick = () => renderSchoolView(s);
            dropdown.appendChild(div);
        }
        
        if (results.length > 50) {
            dropdown.innerHTML += `<div class="p-2 text-xs text-center font-medium text-slate-400 bg-slate-50 border-t border-slate-100">... dan ${results.length - 50} keputusan lain.</div>`;
        }
    }
    dropdown.classList.remove('hidden');
}

/**
 * Display Critical Error UI if App Fails to Initialize
 */
function displayCriticalError(message) {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.innerHTML = `
            <div class="text-red-500 mb-4">
                <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h2 class="text-xl font-bold text-slate-800">Ralat Komunikasi API Supabase</h2>
            <p class="text-sm text-slate-500 mt-2">${message}</p>
            <button onclick="location.reload()" class="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-sm hover:bg-blue-700">Cuba Semula</button>
        `;
    }
}