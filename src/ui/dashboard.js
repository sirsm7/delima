/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: dashboard.js (Logik Pemaparan Antara Muka & Papan Pendahulu)
 * ==============================================================================
 */

// Memori Tempatan Modul (State)
let currentLeaderboardData = [];
let currentFilterType = 'keseluruhan';
let activeSchoolCode = null; 

// State tambahan untuk senarai pengguna spesifik
window.currentFilteredSpecificList = [];

/**
 * Membina Antaramuka Kad Metrik Secara Dinamik
 */
function buildMetricsUI(dataObj, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = ''; 

    const isOverallView = containerId === 'overallMetricsContainer';
    const baseCardClass = "bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col";
    
    // Asas responsif untuk klik
    const baseInteractive = " cursor-pointer hover:ring-2 hover:ring-blue-400 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1";

    // PENGASINGAN LOGIK KLIK (Overall vs Specific School)
    const clickKeseluruhan = isOverallView ? `onclick="applyLeaderboardFilter('keseluruhan')"` : "";
    const classKeseluruhan = isOverallView ? baseInteractive : "";

    const clickAktif = isOverallView 
        ? `onclick="applyLeaderboardFilter('aktif')"` 
        : `onclick="fetchAndRenderSchoolSpecificList('${dataObj.kod_sekolah}', 'AKTIF', 'Aktif Log Masuk')"`;
    const classAktif = baseInteractive; // Aktif di kedua-dua paparan

    const clickTidakAktif = isOverallView 
        ? `onclick="applyLeaderboardFilter('tidak_aktif')"` 
        : `onclick="fetchAndRenderSchoolSpecificList('${dataObj.kod_sekolah}', 'TIDAK AKTIF', 'Tidak Aktif (>90 Hari)')"`;
    const classTidakAktif = baseInteractive; // Aktif di kedua-dua paparan

    const clickBelumLogin = isOverallView 
        ? `onclick="applyLeaderboardFilter('belum_login')"` 
        : `onclick="fetchAndRenderSchoolSpecificList('${dataObj.kod_sekolah}', 'BELUM LOGIN', 'Belum Pernah Login')"`;
    const classBelumLogin = baseInteractive; // Aktif di kedua-dua paparan

    const clickMurid = isOverallView ? `onclick="applyLeaderboardFilter('murid')"` : "";
    const clickGuru = isOverallView ? `onclick="applyLeaderboardFilter('guru')"` : "";
    const clickSekolah = isOverallView ? `onclick="applyLeaderboardFilter('sekolah')"` : "";
    const classKategori = isOverallView ? baseInteractive : "";

    const f = (num) => new Intl.NumberFormat('ms-MY').format(num || 0);
    const calcPct = (part, total) => total > 0 ? ((part / total) * 100).toFixed(1) : "0.0";

    const tooltipAction = isOverallView ? "Klik untuk tapis Papan Pendahulu" : "Klik untuk papar senarai nama ID";

    const htmlStructure = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div ${clickKeseluruhan} class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-l-4 border-l-blue-600 ${classKeseluruhan}" title="${isOverallView ? 'Klik untuk papar Semua Data' : 'Jumlah Keseluruhan'}">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Akaun</p>
                <h3 class="text-3xl font-extrabold text-slate-800">${f(dataObj.jumlah_akaun)}</h3>
            </div>
            <div ${clickAktif} class="bg-emerald-50 rounded-xl shadow-sm border border-emerald-100 p-5 ${classAktif}" title="${tooltipAction}">
                <div class="flex justify-between items-start">
                    <p class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Aktif Log Masuk</p>
                    <span class="bg-emerald-200 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">${calcPct(dataObj.jumlah_aktif, dataObj.jumlah_akaun)}%</span>
                </div>
                <h3 class="text-2xl font-extrabold text-emerald-900">${f(dataObj.jumlah_aktif)}</h3>
            </div>
            <div ${clickTidakAktif} class="bg-rose-50 rounded-xl shadow-sm border border-rose-100 p-5 ${classTidakAktif}" title="${tooltipAction}">
                <div class="flex justify-between items-start">
                    <p class="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">Tidak Aktif (>90 Hari)</p>
                    <span class="bg-rose-200 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded">${calcPct(dataObj.jumlah_tidak_aktif, dataObj.jumlah_akaun)}%</span>
                </div>
                <h3 class="text-2xl font-extrabold text-rose-900">${f(dataObj.jumlah_tidak_aktif)}</h3>
            </div>
            <div ${clickBelumLogin} class="bg-amber-50 rounded-xl shadow-sm border border-amber-100 p-5 ${classBelumLogin}" title="${tooltipAction}">
                <div class="flex justify-between items-start">
                    <p class="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Belum Pernah Login</p>
                    <span class="bg-amber-200 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">${calcPct(dataObj.jumlah_belum_login, dataObj.jumlah_akaun)}%</span>
                </div>
                <h3 class="text-2xl font-extrabold text-amber-900">${f(dataObj.jumlah_belum_login)}</h3>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- KAD MURID -->
            <div ${clickMurid} class="${baseCardClass}${classKategori}" title="${isOverallView ? 'Klik untuk tapis Papan Pendahulu' : ''}">
                <div class="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h4 class="font-bold text-slate-800 uppercase tracking-wide text-sm">Akaun Murid</h4>
                    <span class="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded shadow-sm">${f(dataObj.murid_keseluruhan)}</span>
                </div>
                <div class="p-5 flex-grow space-y-4">
                    ${generateProgressRow('Aktif', dataObj.murid_aktif, dataObj.murid_keseluruhan, 'bg-emerald-500', 'text-emerald-700')}
                    ${generateProgressRow('Tidak Aktif', dataObj.murid_tidak_aktif, dataObj.murid_keseluruhan, 'bg-rose-500', 'text-rose-700')}
                    ${generateProgressRow('Belum Login', dataObj.murid_belum_login, dataObj.murid_keseluruhan, 'bg-amber-500', 'text-amber-700')}
                </div>
            </div>

            <!-- KAD GURU -->
            <div ${clickGuru} class="${baseCardClass}${classKategori}" title="${isOverallView ? 'Klik untuk tapis Papan Pendahulu' : ''}">
                <div class="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h4 class="font-bold text-slate-800 uppercase tracking-wide text-sm">Akaun Guru</h4>
                    <span class="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded shadow-sm">${f(dataObj.guru_keseluruhan)}</span>
                </div>
                <div class="p-5 flex-grow space-y-4">
                    ${generateProgressRow('Aktif', dataObj.guru_aktif, dataObj.guru_keseluruhan, 'bg-emerald-500', 'text-emerald-700')}
                    ${generateProgressRow('Tidak Aktif', dataObj.guru_tidak_aktif, dataObj.guru_keseluruhan, 'bg-rose-500', 'text-rose-700')}
                    ${generateProgressRow('Belum Login', dataObj.guru_belum_login, dataObj.guru_keseluruhan, 'bg-amber-500', 'text-amber-700')}
                </div>
            </div>

            <!-- KAD SEKOLAH -->
            <div ${clickSekolah} class="${baseCardClass}${classKategori}" title="${isOverallView ? 'Klik untuk tapis Papan Pendahulu' : ''}">
                <div class="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h4 class="font-bold text-slate-800 uppercase tracking-wide text-sm">Akaun Sekolah</h4>
                    <span class="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded shadow-sm">${f(dataObj.sekolah_keseluruhan)}</span>
                </div>
                <div class="p-5 flex-grow space-y-4">
                    ${generateProgressRow('Aktif', dataObj.sekolah_aktif, dataObj.sekolah_keseluruhan, 'bg-emerald-500', 'text-emerald-700')}
                    ${generateProgressRow('Tidak Aktif', dataObj.sekolah_tidak_aktif, dataObj.sekolah_keseluruhan, 'bg-rose-500', 'text-rose-700')}
                    ${generateProgressRow('Belum Login', dataObj.sekolah_belum_login, dataObj.sekolah_keseluruhan, 'bg-amber-500', 'text-amber-700')}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = htmlStructure;
}

/**
 * Utiliti Penjana Progress Bar
 */
function generateProgressRow(label, count, total, barColorClass, textColorClass) {
    const f = (num) => new Intl.NumberFormat('ms-MY').format(num || 0);
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
    
    return `
        <div>
            <div class="flex justify-between items-end mb-1">
                <span class="text-[10px] font-bold ${textColorClass} uppercase tracking-wider">${label}</span>
                <span class="text-xs font-bold text-slate-700">${f(count)} <span class="text-[10px] text-slate-400 font-normal">(${percentage}%)</span></span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div class="${barColorClass} h-2 rounded-full transition-all duration-1000 ease-out" style="width: ${percentage}%"></div>
            </div>
        </div>
    `;
}

/**
 * Pengurusan Paparan Spesifik Sekolah
 */
function renderSchoolView(schoolData) {
    document.getElementById('autocompleteDropdown').classList.add('hidden');
    document.getElementById('searchInput').value = schoolData.nama_sekolah;

    activeSchoolCode = schoolData.kod_sekolah;
    document.getElementById('sm_schoolName').innerText = schoolData.nama_sekolah;

    document.getElementById('sv_namaSekolah').innerText = schoolData.nama_sekolah;
    document.getElementById('sv_kodSekolah').innerText = schoolData.kod_sekolah;
    document.getElementById('sv_jenis').innerText = schoolData.jenis_sekolah || "LAIN-LAIN";
    document.getElementById('sv_kodOu').innerText = "OU: " + (schoolData.kod_ou || "TIADA");
    document.getElementById('sv_daerah').innerText = schoolData.daerah || "TIADA MAKLUMAT DAERAH";

    // Set semula kontena jadual senarai pengguna (Reset State)
    const listContainer = document.getElementById('schoolUserListContainer');
    if (listContainer) {
        listContainer.innerHTML = '';
        listContainer.classList.add('hidden');
    }

    const exportBtn = document.getElementById('sv_exportBtn');
    if (exportBtn) {
        exportBtn.onclick = () => handleExportSchoolData(schoolData.kod_sekolah, schoolData.nama_sekolah);
    }

    buildMetricsUI(schoolData, 'schoolMetricsContainer');

    document.getElementById('dashboardOverallView').classList.add('hidden');
    document.getElementById('dashboardSchoolView').classList.remove('hidden');
}

function resetToOverallView() {
    document.getElementById('searchInput').value = '';
    
    // Set semula kontena jadual
    const listContainer = document.getElementById('schoolUserListContainer');
    if (listContainer) {
        listContainer.innerHTML = '';
        listContainer.classList.add('hidden');
    }

    document.getElementById('dashboardSchoolView').classList.add('hidden');
    document.getElementById('dashboardOverallView').classList.remove('hidden');
    activeSchoolCode = null;
}

/**
 * FUNGSI BAHARU: Papar Senarai Pengguna Khusus (Berdasarkan Klik Kad Metrik)
 */
async function fetchAndRenderSchoolSpecificList(kodSekolah, typeFilter, labelTitle) {
    const listContainer = document.getElementById('schoolUserListContainer');
    if (!listContainer) return;

    // Paparkan animasi Loading terlebih dahulu
    listContainer.classList.remove('hidden');
    listContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 bg-white rounded-xl shadow-sm border border-slate-200">
            <div class="spinner border-blue-600 border-t-transparent mb-4 w-8 h-8 border-[3px]"></div>
            <p class="text-sm font-bold text-slate-600">Menarik senarai ${labelTitle} dari Supabase...</p>
        </div>
    `;
    listContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        // Guna API sedia ada untuk tarik senarai penuh sekolah ini
        const response = await API.exportSchoolUsers(kodSekolah);

        if (!response.success || !response.results) {
            listContainer.innerHTML = `
                <div class="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center font-bold text-sm">
                    Ralat mengambil data: ${response.message || 'Harap maklum, pelayan gagal membalas.'}
                </div>`;
            return;
        }

        // Penapisan Pihak Klien (Client-side Filtering) untuk memelihara SoC
        const filtered = response.results.filter(u => {
            if (!u.status) return false;
            const stat = u.status.toUpperCase();
            
            if (typeFilter === 'AKTIF') return stat === 'AKTIF';
            if (typeFilter === 'BELUM LOGIN') return stat === 'BELUM LOGIN';
            
            // Sekiranya Tidak Aktif (Menangkap sebarang status selain Aktif & Belum Login spt Digantung dll)
            if (typeFilter === 'TIDAK AKTIF') return stat !== 'AKTIF' && stat !== 'BELUM LOGIN';
            
            return false;
        });

        // Simpan dalam memori untuk eksport CSV khusus ini
        window.currentFilteredSpecificList = filtered;

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="p-6 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 text-center font-semibold text-sm">
                    Tiada rekod pengguna dijumpai untuk kategori: ${labelTitle}
                </div>`;
            return;
        }

        // Bina Baris HTML Jadual
        let rowsHtml = '';
        filtered.forEach((u, i) => {
            rowsHtml += `
                <tr class="hover:bg-blue-50/50 transition-colors border-b border-slate-100 last:border-0 group">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">${i + 1}</td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-bold text-slate-800 uppercase group-hover:text-blue-600 transition-colors">${u.nama || 'TIADA NAMA'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600">${u.emel || 'TIADA EMEL'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-1 rounded uppercase tracking-wider border border-slate-200">${u.kategori || 'TIADA'}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                        <span class="text-xs font-bold ${typeFilter === 'AKTIF' ? 'text-emerald-600' : typeFilter === 'BELUM LOGIN' ? 'text-amber-600' : 'text-rose-600'}">${u.status || 'TIADA'}</span>
                    </td>
                </tr>
            `;
        });

        // Cantumkan Kontena Utama Jadual
        const containerHtml = `
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
                <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-bold text-slate-800 tracking-tight">Senarai Pengguna</h3>
                            <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">${labelTitle}</span>
                        </div>
                        <p class="text-xs font-semibold text-slate-500 mt-0.5">Memaparkan ${filtered.length} rekod spesifik bagi kategori yang dipilih.</p>
                    </div>
                    <div class="flex gap-2 items-center self-end sm:self-auto">
                        <button onclick="exportSpecificUserListCSV('${labelTitle}', '${kodSekolah}')" class="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded uppercase shadow-sm hover:bg-slate-700 transition-colors">
                            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Eksport CSV
                        </button>
                    </div>
                </div>
                <div class="max-h-[400px] overflow-y-auto relative">
                    <table class="w-full text-left border-collapse min-w-[700px]">
                        <thead class="bg-slate-100 sticky top-0 z-10 shadow-sm backdrop-blur-sm bg-opacity-95">
                            <tr>
                                <th class="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Bil</th>
                                <th class="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Nama Penuh Pengguna</th>
                                <th class="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">ID Emel DELIMa</th>
                                <th class="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Kategori</th>
                                <th class="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Status Database</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 bg-white">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        listContainer.innerHTML = containerHtml;

    } catch (error) {
        console.error("Ralat memuat senarai pengguna khusus:", error);
        listContainer.innerHTML = `
            <div class="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center font-bold text-sm">
                Ralat sistem berlaku. Sila cuba sebentar lagi.
            </div>`;
    }
}

/**
 * FUNGSI BAHARU: Eksport CSV Khusus (Sub-senarai)
 */
function exportSpecificUserListCSV(labelTitle, kodSekolah) {
    const data = window.currentFilteredSpecificList;
    if (!data || data.length === 0) return alert("Tiada data untuk dieksport.");

    let csvContent = '\uFEFF'; 
    csvContent += `Bil,Nama Penuh,Emel,Kategori,Status\n`;

    data.forEach((user, index) => {
        const cleanName = `"${(user.nama || 'TIADA NAMA').replace(/"/g, '""')}"`;
        const cleanEmail = `"${(user.emel || 'TIADA EMEL').replace(/"/g, '""')}"`;
        const row = [index + 1, cleanName, cleanEmail, user.kategori || 'TIADA', user.status || 'TIADA'];
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const safeTitle = labelTitle.replace(/[^a-z0-9]/gi, '_').toUpperCase();

    link.setAttribute("href", url);
    link.setAttribute("download", `Senarai_${safeTitle}_${kodSekolah}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


/**
 * Pengurusan Penapis & Jadual Papan Pendahulu (KEKAL TANPA PERUBAHAN)
 */
function applyLeaderboardFilter(type) {
    if (!window.globalData || !window.globalData.schools) return;
    currentFilterType = type;
    
    const schoolsToRender = window.currentFilteredSchools || window.globalData.schools;
    
    buildLeaderboardTable(schoolsToRender, type);
    document.getElementById('leaderboardContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildLeaderboardTable(schools, filterType) {
    const container = document.getElementById('leaderboardContainer');
    let filteredSchools = [];

    schools.forEach(s => {
        let total = 0, metricCount = 0;
        
        if (filterType === 'murid') {
            total = s.murid_keseluruhan || 0;
            metricCount = (s.murid_aktif || 0) + (s.murid_tidak_aktif || 0);
        } else if (filterType === 'guru') {
            total = s.guru_keseluruhan || 0;
            metricCount = (s.guru_aktif || 0) + (s.guru_tidak_aktif || 0);
        } else if (filterType === 'sekolah') {
            total = s.sekolah_keseluruhan || 0;
            metricCount = (s.sekolah_aktif || 0) + (s.sekolah_tidak_aktif || 0);
        } else if (filterType === 'aktif') {
            total = s.jumlah_akaun || 0;
            metricCount = s.jumlah_aktif || 0;
        } else if (filterType === 'tidak_aktif') {
            total = s.jumlah_akaun || 0;
            metricCount = s.jumlah_tidak_aktif || 0;
        } else if (filterType === 'belum_login') {
            total = s.jumlah_akaun || 0;
            metricCount = s.jumlah_belum_login || 0;
        } else {
            total = s.jumlah_akaun || 0;
            metricCount = (s.jumlah_aktif || 0) + (s.jumlah_tidak_aktif || 0);
        }

        if (total > 0) {
            const percentage = (metricCount / total) * 100;
            filteredSchools.push({ ...s, mappedTotal: total, metricCount, percentage });
        }
    });

    currentLeaderboardData = filteredSchools.sort((a, b) => b.percentage - a.percentage); 

    const filterNames = {
        'keseluruhan': 'Keseluruhan Akaun', 'murid': 'Murid Sahaja', 'guru': 'Guru Sahaja',
        'sekolah': 'Sekolah Sahaja', 'aktif': 'Aktif Log Masuk', 'tidak_aktif': 'Tidak Aktif (>90 Hari)',
        'belum_login': 'Belum Pernah Login'
    };
    const columnNames = {
        'keseluruhan': 'Pernah Login', 'murid': 'Pernah Login', 'guru': 'Pernah Login',
        'sekolah': 'Pernah Login', 'aktif': 'Aktif Login', 'tidak_aktif': 'Tidak Aktif', 'belum_login': 'Belum Login'
    };

    let tableRows = '';
    if (currentLeaderboardData.length === 0) {
        tableRows = `<tr><td colspan="5" class="px-6 py-8 text-center text-sm text-slate-500 font-medium">Tiada data sekolah dijumpai untuk carian/penapis ini.</td></tr>`;
    } else {
        currentLeaderboardData.forEach((s, index) => {
            const isTop3 = index < 3;
            const rankClass = isTop3 ? 'font-extrabold text-blue-600' : 'font-medium text-slate-500';
            
            tableRows += `
                <tr class="hover:bg-blue-50/50 transition-colors cursor-pointer group" onclick="simulateSchoolSearch('${s.nama_sekolah.replace(/'/g, "\\'")}')">
                    <td class="px-6 py-4 whitespace-nowrap text-sm ${rankClass}">${index + 1}</td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">${s.nama_sekolah}</div>
                        <div class="text-[10px] font-semibold text-slate-500 mt-0.5">
                            <span class="text-purple-600 font-bold uppercase tracking-wider">${s.daerah || 'TIADA DAERAH'}</span> &bull; 
                            <span class="uppercase">${s.kod_sekolah}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600">${new Intl.NumberFormat('ms-MY').format(s.mappedTotal)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600">${new Intl.NumberFormat('ms-MY').format(s.metricCount)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                        <span class="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded shadow-sm border ${s.percentage >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : s.percentage >= 50 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-700'}">
                            ${s.percentage.toFixed(1)}%
                        </span>
                    </td>
                </tr>
            `;
        });
    }

    container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
            <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div class="flex items-center gap-2">
                        <h3 class="text-lg font-bold text-slate-800 tracking-tight">Prestasi Log Masuk</h3>
                        <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">${filterNames[filterType]}</span>
                    </div>
                </div>
                <div class="flex gap-2 items-center self-end sm:self-auto">
                    <span class="inline-flex bg-white text-slate-600 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded uppercase shadow-sm">
                        ${currentLeaderboardData.length} Data
                    </span>
                    <button onclick="exportTableToCSV()" class="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded uppercase shadow-sm hover:bg-slate-700 transition-colors">
                        <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Eksport CSV
                    </button>
                </div>
            </div>
            <div class="max-h-[400px] overflow-y-auto relative">
                <table class="w-full text-left border-collapse min-w-[600px]">
                    <thead class="bg-slate-100 sticky top-0 z-10 shadow-sm backdrop-blur-sm bg-opacity-95">
                        <tr>
                            <th class="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Ked.</th>
                            <th class="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Entiti Sekolah</th>
                            <th class="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Jumlah ID Terlibat</th>
                            <th class="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">${columnNames[filterType]}</th>
                            <th class="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Peratusan</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white">
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function exportTableToCSV() {
    if (!currentLeaderboardData || currentLeaderboardData.length === 0) return alert("Tiada data untuk dieksport.");
    
    const filterNamesMap = { 'keseluruhan': 'Keseluruhan', 'murid': 'Murid', 'guru': 'Guru', 'sekolah': 'Sekolah', 'aktif': 'Aktif_Log_Masuk', 'tidak_aktif': 'Tidak_Aktif', 'belum_login': 'Belum_Login' };
    const columnNames = { 'keseluruhan': 'Pernah Login', 'murid': 'Pernah Login', 'guru': 'Pernah Login', 'sekolah': 'Pernah Login', 'aktif': 'Aktif Login', 'tidak_aktif': 'Tidak Aktif', 'belum_login': 'Belum Login' };
    
    let csvContent = `Kedudukan,Daerah,Nama Sekolah,Kod Sekolah,Jenis Sekolah,Jumlah ID,${columnNames[currentFilterType]},Peratusan (%)\n`;
    
    currentLeaderboardData.forEach((s, index) => {
        const cleanName = `"${s.nama_sekolah.replace(/"/g, '""')}"`;
        const cleanDaerah = `"${s.daerah || ''}"`;
        const row = [index + 1, cleanDaerah, cleanName, s.kod_sekolah, s.jenis_sekolah, s.mappedTotal, s.metricCount, s.percentage.toFixed(2)];
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Prestasi_DELIMa_${filterNamesMap[currentFilterType]}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function simulateSchoolSearch(schoolName) {
    const input = document.getElementById('searchInput');
    input.value = schoolName;
    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    setTimeout(() => {
        const firstOption = document.querySelector('#autocompleteDropdown > div');
        if(firstOption) firstOption.click();
    }, 50);
}

/**
 * Pengurusan Ekstrak & Muat Turun Data CSV Keseluruhan Sekolah (KEKAL)
 */
async function handleExportSchoolData(kodSekolah, namaSekolah) {
    if (!kodSekolah) return;

    const btn = document.getElementById('sv_exportBtn');
    const textEl = document.getElementById('sv_exportText');
    
    // Simpan state asal
    const originalText = textEl.innerText;
    const originalIcon = '<svg id="sv_exportIcon" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>';
    const spinnerIcon = '<svg id="sv_exportIcon" class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';

    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
    textEl.innerText = 'Sedang Mengekstrak...';
    
    const iconEl = document.getElementById('sv_exportIcon');
    if (iconEl) iconEl.outerHTML = spinnerIcon;

    try {
        const response = await API.exportSchoolUsers(kodSekolah);

        if (!response.success || !response.results || response.results.length === 0) {
            alert('Tiada rekod pengguna dijumpai untuk dieksport.');
            return;
        }

        let csvContent = '\uFEFF'; 
        csvContent += `Bil,Nama Penuh,Emel,Kategori,Status\n`;

        response.results.forEach((user, index) => {
            const cleanName = `"${(user.nama || 'TIADA NAMA').replace(/"/g, '""')}"`;
            const cleanEmail = `"${(user.emel || 'TIADA EMEL').replace(/"/g, '""')}"`;
            const row = [
                index + 1,
                cleanName,
                cleanEmail,
                user.kategori || 'TIADA',
                user.status || 'TIADA'
            ];
            csvContent += row.join(",") + "\n";
        });

        const dateObj = new Date();
        const dateStr = dateObj.toISOString().split('T')[0];
        const timeStr = dateObj.toTimeString().split(' ')[0].replace(/:/g, '');
        const safeNamaSekolah = namaSekolah.replace(/[^a-z0-9]/gi, '_').toUpperCase();

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `DELIMa_${kodSekolah}_${safeNamaSekolah}_${dateStr}_${timeStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Ralat mengeksport data CSV:', error);
        alert('Gagal memuat turun data. Sila cuba sebentar lagi atau lapor kepada pentadbir.');
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        textEl.innerText = originalText;
        
        const currentIcon = document.getElementById('sv_exportIcon');
        if (currentIcon) currentIcon.outerHTML = originalIcon;
    }
}