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

/**
 * Membina Antaramuka Kad Metrik Secara Dinamik
 */
function buildMetricsUI(dataObj, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = ''; 

    const isOverallView = containerId === 'overallMetricsContainer';
    const baseCardClass = "bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col";
    const interactiveClass = isOverallView ? " cursor-pointer hover:ring-2 hover:ring-blue-400 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1" : "";
    
    // Pencetus (Triggers)
    const clickKeseluruhan = isOverallView ? `onclick="applyLeaderboardFilter('keseluruhan')"` : "";
    const clickAktif = isOverallView ? `onclick="applyLeaderboardFilter('aktif')"` : "";
    const clickTidakAktif = isOverallView ? `onclick="applyLeaderboardFilter('tidak_aktif')"` : "";
    const clickBelumLogin = isOverallView ? `onclick="applyLeaderboardFilter('belum_login')"` : "";
    const clickMurid = isOverallView ? `onclick="applyLeaderboardFilter('murid')"` : "";
    const clickGuru = isOverallView ? `onclick="applyLeaderboardFilter('guru')"` : "";
    const clickSekolah = isOverallView ? `onclick="applyLeaderboardFilter('sekolah')"` : "";

    const f = (num) => new Intl.NumberFormat('ms-MY').format(num || 0);
    const calcPct = (part, total) => total > 0 ? ((part / total) * 100).toFixed(1) : "0.0";

    const htmlStructure = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div ${clickKeseluruhan} class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-l-4 border-l-blue-600 ${interactiveClass}" title="Klik untuk papar Semua Data">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Akaun</p>
                <h3 class="text-3xl font-extrabold text-slate-800">${f(dataObj.jumlah_akaun)}</h3>
            </div>
            <div ${clickAktif} class="bg-emerald-50 rounded-xl shadow-sm border border-emerald-100 p-5 ${interactiveClass}" title="Klik untuk tapis Papan Pendahulu">
                <div class="flex justify-between items-start">
                    <p class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Aktif Log Masuk</p>
                    <span class="bg-emerald-200 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">${calcPct(dataObj.jumlah_aktif, dataObj.jumlah_akaun)}%</span>
                </div>
                <h3 class="text-2xl font-extrabold text-emerald-900">${f(dataObj.jumlah_aktif)}</h3>
            </div>
            <div ${clickTidakAktif} class="bg-rose-50 rounded-xl shadow-sm border border-rose-100 p-5 ${interactiveClass}" title="Klik untuk tapis Papan Pendahulu">
                <div class="flex justify-between items-start">
                    <p class="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">Tidak Aktif (>90 Hari)</p>
                    <span class="bg-rose-200 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded">${calcPct(dataObj.jumlah_tidak_aktif, dataObj.jumlah_akaun)}%</span>
                </div>
                <h3 class="text-2xl font-extrabold text-rose-900">${f(dataObj.jumlah_tidak_aktif)}</h3>
            </div>
            <div ${clickBelumLogin} class="bg-amber-50 rounded-xl shadow-sm border border-amber-100 p-5 ${interactiveClass}" title="Klik untuk tapis Papan Pendahulu">
                <div class="flex justify-between items-start">
                    <p class="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Belum Pernah Login</p>
                    <span class="bg-amber-200 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">${calcPct(dataObj.jumlah_belum_login, dataObj.jumlah_akaun)}%</span>
                </div>
                <h3 class="text-2xl font-extrabold text-amber-900">${f(dataObj.jumlah_belum_login)}</h3>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- KAD MURID -->
            <div ${clickMurid} class="${baseCardClass}${interactiveClass}" title="Klik untuk tapis Papan Pendahulu">
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
            <div ${clickGuru} class="${baseCardClass}${interactiveClass}" title="Klik untuk tapis Papan Pendahulu">
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
            <div ${clickSekolah} class="${baseCardClass}${interactiveClass}" title="Klik untuk tapis Papan Pendahulu">
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

    const pautanBtn = document.getElementById('sv_pautan');
    if (schoolData.pautan_rekod && schoolData.pautan_rekod.startsWith('http')) {
        pautanBtn.href = schoolData.pautan_rekod;
        pautanBtn.classList.remove('hidden');
    } else {
        pautanBtn.classList.add('hidden');
    }

    buildMetricsUI(schoolData, 'schoolMetricsContainer');

    document.getElementById('dashboardOverallView').classList.add('hidden');
    document.getElementById('dashboardSchoolView').classList.remove('hidden');
}

function resetToOverallView() {
    document.getElementById('searchInput').value = '';
    document.getElementById('dashboardSchoolView').classList.add('hidden');
    document.getElementById('dashboardOverallView').classList.remove('hidden');
    activeSchoolCode = null;
}

/**
 * Pengurusan Penapis & Jadual Papan Pendahulu
 */
function applyLeaderboardFilter(type) {
    if (!window.globalData || !window.globalData.schools) return;
    currentFilterType = type;
    buildLeaderboardTable(window.globalData.schools, type);
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
        tableRows = `<tr><td colspan="5" class="px-6 py-8 text-center text-sm text-slate-500 font-medium">Tiada data sekolah dijumpai.</td></tr>`;
    } else {
        currentLeaderboardData.forEach((s, index) => {
            const isTop3 = index < 3;
            const rankClass = isTop3 ? 'font-extrabold text-blue-600' : 'font-medium text-slate-500';
            
            tableRows += `
                <tr class="hover:bg-blue-50/50 transition-colors cursor-pointer group" onclick="simulateSchoolSearch('${s.nama_sekolah.replace(/'/g, "\\'")}')">
                    <td class="px-6 py-4 whitespace-nowrap text-sm ${rankClass}">${index + 1}</td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">${s.nama_sekolah}</div>
                        <div class="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">${s.kod_sekolah}</div>
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
    
    let csvContent = `Kedudukan,Nama Sekolah,Kod Sekolah,Jenis Sekolah,Jumlah ID,${columnNames[currentFilterType]},Peratusan (%)\n`;
    
    currentLeaderboardData.forEach((s, index) => {
        const cleanName = `"${s.nama_sekolah.replace(/"/g, '""')}"`;
        const row = [index + 1, cleanName, s.kod_sekolah, s.jenis_sekolah, s.mappedTotal, s.metricCount, s.percentage.toFixed(2)];
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

// Utiliti untuk trigger klik dari jadual
function simulateSchoolSearch(schoolName) {
    const input = document.getElementById('searchInput');
    input.value = schoolName;
    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    setTimeout(() => {
        const firstOption = document.querySelector('#autocompleteDropdown > div');
        if(firstOption) firstOption.click();
    }, 50);
}