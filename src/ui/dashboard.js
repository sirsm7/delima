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
window.currentFilterType = currentFilterType;

/**
 * Utiliti Pembantu Pemformatan Nombor dan Peratusan
 */
const formatNumber = (num) => new Intl.NumberFormat('ms-MY').format(num || 0);
const calculatePercentage = (part, total) => total > 0 ? ((part / total) * 100).toFixed(1) : "0.0";

/**
 * Membina Antaramuka Kad Metrik Secara Dinamik (Bebas XSS)
 */
function buildMetricsUI(dataObj, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !dataObj) return;

    container.textContent = '';
    const isOverallView = containerId === 'overallMetricsContainer';
    const fragment = document.createDocumentFragment();

    // 1. BARIS KAD METRIK UTAMA (4 KAD)
    const topGrid = document.createElement('div');
    topGrid.className = 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-8';

    // Kad 1: Total Akaun
    const cardTotal = createSummaryMetricCard({
        title: 'Total Akaun',
        value: formatNumber(dataObj.jumlah_akaun),
        borderClass: 'border-l-4 border-l-blue-600 bg-white border-slate-200',
        titleColor: 'text-slate-500',
        valueColor: 'text-slate-800',
        tooltip: isOverallView ? 'Klik untuk papar Semua Data' : 'Jumlah Keseluruhan',
        interactive: isOverallView,
        onClick: isOverallView ? () => applyLeaderboardFilter('keseluruhan') : null
    });

    // Kad 2: Aktif Log Masuk
    const pctAktif = calculatePercentage(dataObj.jumlah_aktif, dataObj.jumlah_akaun);
    const cardAktif = createSummaryMetricCard({
        title: 'Aktif Log Masuk',
        value: formatNumber(dataObj.jumlah_aktif),
        percentage: `${pctAktif}%`,
        badgeClass: 'bg-emerald-200 text-emerald-800',
        borderClass: 'bg-emerald-50 border-emerald-100',
        titleColor: 'text-emerald-700',
        valueColor: 'text-emerald-900',
        tooltip: isOverallView ? 'Klik untuk tapis Papan Pendahulu' : 'Klik untuk papar senarai nama ID',
        interactive: true,
        onClick: isOverallView 
            ? () => applyLeaderboardFilter('aktif') 
            : () => fetchAndRenderSchoolSpecificList(dataObj.kod_sekolah, 'AKTIF', 'Aktif Log Masuk')
    });

    // Kad 3: Tidak Aktif (>90 Hari)
    const pctTidakAktif = calculatePercentage(dataObj.jumlah_tidak_aktif, dataObj.jumlah_akaun);
    const cardTidakAktif = createSummaryMetricCard({
        title: 'Tidak Aktif (>90 Hari)',
        value: formatNumber(dataObj.jumlah_tidak_aktif),
        percentage: `${pctTidakAktif}%`,
        badgeClass: 'bg-rose-200 text-rose-800',
        borderClass: 'bg-rose-50 border-rose-100',
        titleColor: 'text-rose-700',
        valueColor: 'text-rose-900',
        tooltip: isOverallView ? 'Klik untuk tapis Papan Pendahulu' : 'Klik untuk papar senarai nama ID',
        interactive: true,
        onClick: isOverallView 
            ? () => applyLeaderboardFilter('tidak_aktif') 
            : () => fetchAndRenderSchoolSpecificList(dataObj.kod_sekolah, 'TIDAK AKTIF', 'Tidak Aktif (>90 Hari)')
    });

    // Kad 4: Belum Pernah Login
    const pctBelumLogin = calculatePercentage(dataObj.jumlah_belum_login, dataObj.jumlah_akaun);
    const cardBelumLogin = createSummaryMetricCard({
        title: 'Belum Pernah Login',
        value: formatNumber(dataObj.jumlah_belum_login),
        percentage: `${pctBelumLogin}%`,
        badgeClass: 'bg-amber-200 text-amber-800',
        borderClass: 'bg-amber-50 border-amber-100',
        titleColor: 'text-amber-700',
        valueColor: 'text-amber-900',
        tooltip: isOverallView ? 'Klik untuk tapis Papan Pendahulu' : 'Klik untuk papar senarai nama ID',
        interactive: true,
        onClick: isOverallView 
            ? () => applyLeaderboardFilter('belum_login') 
            : () => fetchAndRenderSchoolSpecificList(dataObj.kod_sekolah, 'BELUM LOGIN', 'Belum Pernah Login')
    });

    topGrid.appendChild(cardTotal);
    topGrid.appendChild(cardAktif);
    topGrid.appendChild(cardTidakAktif);
    topGrid.appendChild(cardBelumLogin);
    fragment.appendChild(topGrid);

    // 2. BARIS KAD KATEGORI METRIK (MURID, GURU, SEKOLAH)
    const bottomGrid = document.createElement('div');
    bottomGrid.className = 'grid grid-cols-1 lg:grid-cols-3 gap-6';

    const cardMurid = createCategoryMetricCard({
        title: 'Akaun Murid',
        total: dataObj.murid_keseluruhan,
        items: [
            { label: 'Aktif', count: dataObj.murid_aktif, barColor: 'bg-emerald-500', textColor: 'text-emerald-700' },
            { label: 'Tidak Aktif', count: dataObj.murid_tidak_aktif, barColor: 'bg-rose-500', textColor: 'text-rose-700' },
            { label: 'Belum Login', count: dataObj.murid_belum_login, barColor: 'bg-amber-500', textColor: 'text-amber-700' }
        ],
        interactive: isOverallView,
        tooltip: isOverallView ? 'Klik untuk tapis Papan Pendahulu' : '',
        onClick: isOverallView ? () => applyLeaderboardFilter('murid') : null
    });

    const cardGuru = createCategoryMetricCard({
        title: 'Akaun Guru',
        total: dataObj.guru_keseluruhan,
        items: [
            { label: 'Aktif', count: dataObj.guru_aktif, barColor: 'bg-emerald-500', textColor: 'text-emerald-700' },
            { label: 'Tidak Aktif', count: dataObj.guru_tidak_aktif, barColor: 'bg-rose-500', textColor: 'text-rose-700' },
            { label: 'Belum Login', count: dataObj.guru_belum_login, barColor: 'bg-amber-500', textColor: 'text-amber-700' }
        ],
        interactive: isOverallView,
        tooltip: isOverallView ? 'Klik untuk tapis Papan Pendahulu' : '',
        onClick: isOverallView ? () => applyLeaderboardFilter('guru') : null
    });

    const cardSekolah = createCategoryMetricCard({
        title: 'Akaun Sekolah',
        total: dataObj.sekolah_keseluruhan,
        items: [
            { label: 'Aktif', count: dataObj.sekolah_aktif, barColor: 'bg-emerald-500', textColor: 'text-emerald-700' },
            { label: 'Tidak Aktif', count: dataObj.sekolah_tidak_aktif, barColor: 'bg-rose-500', textColor: 'text-rose-700' },
            { label: 'Belum Login', count: dataObj.sekolah_belum_login, barColor: 'bg-amber-500', textColor: 'text-amber-700' }
        ],
        interactive: isOverallView,
        tooltip: isOverallView ? 'Klik untuk tapis Papan Pendahulu' : '',
        onClick: isOverallView ? () => applyLeaderboardFilter('sekolah') : null
    });

    bottomGrid.appendChild(cardMurid);
    bottomGrid.appendChild(cardGuru);
    bottomGrid.appendChild(cardSekolah);
    fragment.appendChild(bottomGrid);

    container.appendChild(fragment);
}

/**
 * Pembina Elemen Kad Metrik Ringkasan Utama
 */
function createSummaryMetricCard(options) {
    const card = document.createElement('div');
    let classNames = `rounded-xl shadow-sm border p-5 overflow-hidden flex flex-col ${options.borderClass}`;
    
    if (options.interactive) {
        classNames += ' cursor-pointer hover:ring-2 hover:ring-blue-400 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1';
        if (options.onClick) {
            card.addEventListener('click', options.onClick);
        }
    }
    card.className = classNames;
    if (options.tooltip) card.title = options.tooltip;

    const headerRow = document.createElement('div');
    headerRow.className = 'flex justify-between items-start mb-1';

    const titleEl = document.createElement('p');
    titleEl.className = `text-[10px] font-bold uppercase tracking-wider ${options.titleColor}`;
    titleEl.textContent = options.title;
    headerRow.appendChild(titleEl);

    if (options.percentage) {
        const badgeEl = document.createElement('span');
        badgeEl.className = `text-[10px] font-bold px-1.5 py-0.5 rounded ${options.badgeClass}`;
        badgeEl.textContent = options.percentage;
        headerRow.appendChild(badgeEl);
    }
    card.appendChild(headerRow);

    const valEl = document.createElement('h3');
    valEl.className = `text-2xl sm:text-3xl font-extrabold ${options.valueColor}`;
    valEl.textContent = options.value;
    card.appendChild(valEl);

    return card;
}

/**
 * Pembina Elemen Kad Kategori Metrik dengan Bar Kemajuan
 */
function createCategoryMetricCard(options) {
    const card = document.createElement('div');
    let classNames = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col';

    if (options.interactive) {
        classNames += ' cursor-pointer hover:ring-2 hover:ring-blue-400 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1';
        if (options.onClick) {
            card.addEventListener('click', options.onClick);
        }
    }
    card.className = classNames;
    if (options.tooltip) card.title = options.tooltip;

    const header = document.createElement('div');
    header.className = 'bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center';

    const titleEl = document.createElement('h4');
    titleEl.className = 'font-bold text-slate-800 uppercase tracking-wide text-sm';
    titleEl.textContent = options.title;
    header.appendChild(titleEl);

    const totalBadge = document.createElement('span');
    totalBadge.className = 'bg-white border border-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded shadow-sm';
    totalBadge.textContent = formatNumber(options.total);
    header.appendChild(totalBadge);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'p-5 flex-grow space-y-4';

    options.items.forEach(item => {
        const row = createProgressRowNode(item.label, item.count, options.total, item.barColor, item.textColor);
        body.appendChild(row);
    });

    card.appendChild(body);
    return card;
}

/**
 * Utiliti Penjana Bar Kemajuan (DOM Node Bebas XSS)
 */
function createProgressRowNode(label, count, total, barColorClass, textColorClass) {
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

    const wrapper = document.createElement('div');

    const metaRow = document.createElement('div');
    metaRow.className = 'flex justify-between items-end mb-1';

    const labelEl = document.createElement('span');
    labelEl.className = `text-[10px] font-bold ${textColorClass} uppercase tracking-wider`;
    labelEl.textContent = label;
    metaRow.appendChild(labelEl);

    const countContainer = document.createElement('span');
    countContainer.className = 'text-xs font-bold text-slate-700';
    countContainer.textContent = `${formatNumber(count)} `;

    const pctSpan = document.createElement('span');
    pctSpan.className = 'text-[10px] text-slate-400 font-normal';
    pctSpan.textContent = `(${percentage}%)`;
    countContainer.appendChild(pctSpan);

    metaRow.appendChild(countContainer);
    wrapper.appendChild(metaRow);

    const track = document.createElement('div');
    track.className = 'w-full bg-slate-100 rounded-full h-2 overflow-hidden';

    const bar = document.createElement('div');
    bar.className = `${barColorClass} h-2 rounded-full transition-all duration-1000 ease-out`;
    bar.style.width = `${percentage}%`;

    track.appendChild(bar);
    wrapper.appendChild(track);

    return wrapper;
}

/**
 * Pengurusan Paparan Spesifik Sekolah
 */
function renderSchoolView(schoolData) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = schoolData.nama_sekolah || '';

    activeSchoolCode = schoolData.kod_sekolah;

    const smSchoolName = document.getElementById('sm_schoolName');
    if (smSchoolName) smSchoolName.textContent = schoolData.nama_sekolah || '';

    const svNama = document.getElementById('sv_namaSekolah');
    if (svNama) svNama.textContent = schoolData.nama_sekolah || 'Nama Sekolah';

    const svKod = document.getElementById('sv_kodSekolah');
    if (svKod) svKod.textContent = schoolData.kod_sekolah || 'KOD';

    const svJenis = document.getElementById('sv_jenis');
    if (svJenis) svJenis.textContent = schoolData.jenis_sekolah || 'LAIN-LAIN';

    const svKodOu = document.getElementById('sv_kodOu');
    if (svKodOu) svKodOu.textContent = 'OU: ' + (schoolData.kod_ou || 'TIADA');

    const svDaerah = document.getElementById('sv_daerah');
    if (svDaerah) svDaerah.textContent = schoolData.daerah || 'TIADA MAKLUMAT DAERAH';

    // Set semula kontena jadual senarai pengguna (Reset State)
    const listContainer = document.getElementById('schoolUserListContainer');
    if (listContainer) {
        listContainer.textContent = '';
        listContainer.classList.add('hidden');
    }

    const exportBtn = document.getElementById('sv_exportBtn');
    if (exportBtn) {
        exportBtn.onclick = () => handleExportSchoolData(schoolData.kod_sekolah, schoolData.nama_sekolah);
    }

    buildMetricsUI(schoolData, 'schoolMetricsContainer');

    const overallView = document.getElementById('dashboardOverallView');
    const schoolView = document.getElementById('dashboardSchoolView');
    if (overallView) overallView.classList.add('hidden');
    if (schoolView) schoolView.classList.remove('hidden');
}

function resetToOverallView() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    const listContainer = document.getElementById('schoolUserListContainer');
    if (listContainer) {
        listContainer.textContent = '';
        listContainer.classList.add('hidden');
    }

    const schoolView = document.getElementById('dashboardSchoolView');
    const overallView = document.getElementById('dashboardOverallView');
    if (schoolView) schoolView.classList.add('hidden');
    if (overallView) overallView.classList.remove('hidden');

    activeSchoolCode = null;
}

/**
 * Papar Senarai Pengguna Khusus (Berdasarkan Klik Kad Metrik) - Bebas XSS
 */
async function fetchAndRenderSchoolSpecificList(kodSekolah, typeFilter, labelTitle) {
    const listContainer = document.getElementById('schoolUserListContainer');
    if (!listContainer) return;

    listContainer.classList.remove('hidden');
    listContainer.textContent = '';

    // Paparkan status memuat data
    const loadingCard = document.createElement('div');
    loadingCard.className = 'flex flex-col items-center justify-center py-10 bg-white rounded-xl shadow-sm border border-slate-200';
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner border-blue-600 border-t-transparent mb-4 w-8 h-8 border-[3px]';
    loadingCard.appendChild(spinner);

    const loadingText = document.createElement('p');
    loadingText.className = 'text-sm font-bold text-slate-600';
    loadingText.textContent = `Menarik senarai ${labelTitle} dari pangkalan data...`;
    loadingCard.appendChild(loadingText);

    listContainer.appendChild(loadingCard);
    listContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const response = await API.exportSchoolUsers(kodSekolah);

        if (!response.success || !response.results) {
            listContainer.textContent = '';
            const errBox = document.createElement('div');
            errBox.className = 'p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center font-bold text-sm';
            errBox.textContent = `Ralat mengambil data: ${response.message || 'Pelayan gagal membalas.'}`;
            listContainer.appendChild(errBox);
            return;
        }

        const filtered = response.results.filter(u => {
            if (!u.status) return false;
            const stat = u.status.toUpperCase();
            if (typeFilter === 'AKTIF') return stat === 'AKTIF';
            if (typeFilter === 'BELUM LOGIN') return stat === 'BELUM LOGIN';
            if (typeFilter === 'TIDAK AKTIF') return stat !== 'AKTIF' && stat !== 'BELUM LOGIN';
            return false;
        });

        window.currentFilteredSpecificList = filtered;
        listContainer.textContent = '';

        if (filtered.length === 0) {
            const emptyBox = document.createElement('div');
            emptyBox.className = 'p-6 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 text-center font-semibold text-sm';
            emptyBox.textContent = `Tiada rekod pengguna dijumpai untuk kategori: ${labelTitle}`;
            listContainer.appendChild(emptyBox);
            return;
        }

        // Bina kontena utama jadual senarai pengguna
        const wrapper = document.createElement('div');
        wrapper.className = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300';

        const topBar = document.createElement('div');
        topBar.className = 'bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4';

        const titleDiv = document.createElement('div');
        const badgeRow = document.createElement('div');
        badgeRow.className = 'flex items-center gap-2';

        const heading = document.createElement('h3');
        heading.className = 'text-lg font-bold text-slate-800 tracking-tight';
        heading.textContent = 'Senarai Pengguna';
        badgeRow.appendChild(heading);

        const badgeCat = document.createElement('span');
        badgeCat.className = 'bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider';
        badgeCat.textContent = labelTitle;
        badgeRow.appendChild(badgeCat);
        titleDiv.appendChild(badgeRow);

        const subTitle = document.createElement('p');
        subTitle.className = 'text-xs font-semibold text-slate-500 mt-0.5';
        subTitle.textContent = `Memaparkan ${filtered.length} rekod spesifik bagi kategori yang dipilih.`;
        titleDiv.appendChild(subTitle);
        topBar.appendChild(titleDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex gap-2 items-center self-end sm:self-auto';

        const exportBtn = document.createElement('button');
        exportBtn.className = 'inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded uppercase shadow-sm hover:bg-slate-700 transition-colors';
        exportBtn.textContent = 'Eksport CSV';
        exportBtn.addEventListener('click', () => exportSpecificUserListCSV(labelTitle, kodSekolah));
        actionsDiv.appendChild(exportBtn);
        topBar.appendChild(actionsDiv);
        wrapper.appendChild(topBar);

        // Bina jadual senarai pengguna dengan DocumentFragment
        const tableContainer = document.createElement('div');
        tableContainer.className = 'max-h-[400px] overflow-y-auto relative';

        const table = document.createElement('table');
        table.className = 'w-full text-left border-collapse min-w-[700px]';

        const thead = document.createElement('thead');
        thead.className = 'bg-slate-100 sticky top-0 z-10 shadow-sm backdrop-blur-sm bg-opacity-95';
        const headerTr = document.createElement('tr');

        const headers = ['Bil', 'Nama Penuh Pengguna', 'ID Emel DELIMa', 'Kategori', 'Status Database'];
        headers.forEach((hText, idx) => {
            const th = document.createElement('th');
            th.className = `px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 ${idx === 4 ? 'text-right' : ''}`;
            th.textContent = hText;
            headerTr.appendChild(th);
        });
        thead.appendChild(headerTr);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        tbody.className = 'divide-y divide-slate-100 bg-white';
        const rowsFragment = document.createDocumentFragment();

        filtered.forEach((u, i) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-blue-50/50 transition-colors border-b border-slate-100 last:border-0 group';

            // Bil
            const tdIndex = document.createElement('td');
            tdIndex.className = 'px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500';
            tdIndex.textContent = i + 1;
            tr.appendChild(tdIndex);

            // Nama Penuh
            const tdNama = document.createElement('td');
            tdNama.className = 'px-6 py-4';
            const nameEl = document.createElement('div');
            nameEl.className = 'text-sm font-bold text-slate-800 uppercase group-hover:text-blue-600 transition-colors';
            nameEl.textContent = u.nama || 'TIADA NAMA';
            tdNama.appendChild(nameEl);
            tr.appendChild(tdNama);

            // Emel DELIMa + Butang Salin
            const tdEmel = document.createElement('td');
            tdEmel.className = 'px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600';
            const emelRow = document.createElement('div');
            emelRow.className = 'flex items-center gap-2';

            const emelSpan = document.createElement('span');
            emelSpan.textContent = u.emel || 'TIADA EMEL';
            emelRow.appendChild(emelSpan);

            if (u.emel) {
                const copyBtn = document.createElement('button');
                copyBtn.type = 'button';
                copyBtn.className = 'text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none';
                copyBtn.title = 'Salin Emel/ID';
                copyBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>';
                copyBtn.addEventListener('click', () => copyDataToClipboard(u.emel, copyBtn));
                emelRow.appendChild(copyBtn);
            }
            tdEmel.appendChild(emelRow);
            tr.appendChild(tdEmel);

            // Kategori
            const tdKategori = document.createElement('td');
            tdKategori.className = 'px-6 py-4 whitespace-nowrap';
            const catBadge = document.createElement('span');
            catBadge.className = 'bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-1 rounded uppercase tracking-wider border border-slate-200';
            catBadge.textContent = u.kategori || 'TIADA';
            tdKategori.appendChild(catBadge);
            tr.appendChild(tdKategori);

            // Status Database
            const tdStatus = document.createElement('td');
            tdStatus.className = 'px-6 py-4 whitespace-nowrap text-right';
            const statSpan = document.createElement('span');
            statSpan.className = `text-xs font-bold ${typeFilter === 'AKTIF' ? 'text-emerald-600' : typeFilter === 'BELUM LOGIN' ? 'text-amber-600' : 'text-rose-600'}`;
            statSpan.textContent = u.status || 'TIADA';
            tdStatus.appendChild(statSpan);
            tr.appendChild(tdStatus);

            rowsFragment.appendChild(tr);
        });

        tbody.appendChild(rowsFragment);
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        wrapper.appendChild(tableContainer);
        listContainer.appendChild(wrapper);

    } catch (error) {
        console.error("Ralat memuat senarai pengguna khusus:", error);
        listContainer.textContent = '';
        const errCard = document.createElement('div');
        errCard.className = 'p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center font-bold text-sm';
        errCard.textContent = 'Ralat sistem berlaku. Sila cuba sebentar lagi.';
        listContainer.appendChild(errCard);
    }
}

/**
 * Eksport CSV Khusus (Sub-senarai Ditapis)
 */
function exportSpecificUserListCSV(labelTitle, kodSekolah) {
    const data = window.currentFilteredSpecificList;
    if (!data || data.length === 0) return alert("Tiada data untuk dieksport.");

    let csvContent = '\uFEFF';
    csvContent += "Nama Penuh,ID DELIMa,Kategori,Status\n";

    data.forEach((user) => {
        const cleanName = `"${(user.nama || 'TIADA NAMA').replace(/"/g, '""')}"`;
        const cleanEmail = `"${(user.emel || 'TIADA EMEL').replace(/"/g, '""')}"`;
        const row = [cleanName, cleanEmail, user.kategori || 'TIADA', user.status || 'TIADA'];
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
 * Pengurusan Penapis & Jadual Papan Pendahulu
 */
function applyLeaderboardFilter(type) {
    if (!window.globalData || !window.globalData.schools) return;
    currentFilterType = type;
    window.currentFilterType = type;

    const schoolsToRender = window.currentFilteredSchools || window.globalData.schools;
    buildLeaderboardTable(schoolsToRender, type);

    const container = document.getElementById('leaderboardContainer');
    if (container) {
        container.classList.remove('hidden');
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Membina Jadual Papan Pendahulu Bebas XSS
 */
function buildLeaderboardTable(schools, filterType) {
    const container = document.getElementById('leaderboardContainer');
    if (!container) return;

    container.textContent = '';
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

        if (total > 0 && metricCount > 0) {
            const percentage = (metricCount / total) * 100;
            filteredSchools.push({ ...s, mappedTotal: total, metricCount, percentage });
        }
    });

    currentLeaderboardData = filteredSchools.sort((a, b) => b.percentage - a.percentage);

    const filterNames = {
        'keseluruhan': 'Keseluruhan Akaun',
        'murid': 'Murid Sahaja',
        'guru': 'Guru Sahaja',
        'sekolah': 'Sekolah Sahaja',
        'aktif': 'Aktif Log Masuk',
        'tidak_aktif': 'Tidak Aktif (>90 Hari)',
        'belum_login': 'Belum Pernah Login'
    };

    const columnNames = {
        'keseluruhan': 'Pernah Login',
        'murid': 'Pernah Login',
        'guru': 'Pernah Login',
        'sekolah': 'Pernah Login',
        'aktif': 'Aktif Login',
        'tidak_aktif': 'Tidak Aktif',
        'belum_login': 'Belum Login'
    };

    const wrapper = document.createElement('div');
    wrapper.className = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300';

    // Header Toolbar
    const topBar = document.createElement('div');
    topBar.className = 'bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4';

    const titleGroup = document.createElement('div');
    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-center gap-2';

    const h3 = document.createElement('h3');
    h3.className = 'text-lg font-bold text-slate-800 tracking-tight';
    h3.textContent = 'Prestasi Log Masuk';
    titleRow.appendChild(h3);

    const catBadge = document.createElement('span');
    catBadge.className = 'bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider';
    catBadge.textContent = filterNames[filterType] || 'Keseluruhan';
    titleRow.appendChild(catBadge);
    titleGroup.appendChild(titleRow);
    topBar.appendChild(titleGroup);

    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'flex gap-2 items-center self-end sm:self-auto flex-wrap sm:flex-nowrap justify-end w-full sm:w-auto';

    const countBadge = document.createElement('span');
    countBadge.className = 'inline-flex bg-white text-slate-600 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded uppercase shadow-sm';
    countBadge.textContent = `${currentLeaderboardData.length} Data`;
    actionsGroup.appendChild(countBadge);

    // Butang Salin Telegram
    const btnTelegram = document.createElement('button');
    btnTelegram.id = 'btnCopyTelegram';
    btnTelegram.className = 'inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded uppercase shadow-sm hover:bg-blue-700 transition-colors focus:outline-none';
    btnTelegram.innerHTML = '<svg class="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>Salin Telegram';
    btnTelegram.addEventListener('click', exportTableToTelegram);
    actionsGroup.appendChild(btnTelegram);

    // Butang Eksport CSV
    const btnCsv = document.createElement('button');
    btnCsv.className = 'inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded uppercase shadow-sm hover:bg-slate-700 transition-colors focus:outline-none';
    btnCsv.innerHTML = '<svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>Eksport CSV';
    btnCsv.addEventListener('click', exportTableToCSV);
    actionsGroup.appendChild(btnCsv);

    topBar.appendChild(actionsGroup);
    wrapper.appendChild(topBar);

    // Bahagian Jadual
    const tableContainer = document.createElement('div');
    tableContainer.className = 'max-h-[400px] overflow-y-auto relative';

    const table = document.createElement('table');
    table.className = 'w-full text-left border-collapse min-w-[600px]';

    const thead = document.createElement('thead');
    thead.className = 'bg-slate-100 sticky top-0 z-10 shadow-sm backdrop-blur-sm bg-opacity-95';
    const headerTr = document.createElement('tr');

    const tableCols = ['Ked.', 'Entiti Sekolah', 'Jumlah ID Terlibat', columnNames[filterType] || 'Pernah Login', 'Peratusan'];
    tableCols.forEach((col, cIdx) => {
        const th = document.createElement('th');
        th.className = `px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 ${cIdx === 4 ? 'text-right' : ''}`;
        th.textContent = col;
        headerTr.appendChild(th);
    });
    thead.appendChild(headerTr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = 'divide-y divide-slate-100 bg-white';

    if (currentLeaderboardData.length === 0) {
        const trEmpty = document.createElement('tr');
        const tdEmpty = document.createElement('td');
        tdEmpty.colSpan = 5;
        tdEmpty.className = 'px-6 py-8 text-center text-sm text-slate-500 font-medium';
        tdEmpty.textContent = 'Tiada data sekolah dijumpai untuk carian/penapis ini.';
        trEmpty.appendChild(tdEmpty);
        tbody.appendChild(trEmpty);
    } else {
        const rowsFragment = document.createDocumentFragment();

        currentLeaderboardData.forEach((s, index) => {
            const isTop3 = index < 3;
            const rankClass = isTop3 ? 'font-extrabold text-blue-600' : 'font-medium text-slate-500';

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-blue-50/50 transition-colors cursor-pointer group';
            tr.addEventListener('click', () => simulateSchoolSearch(s.nama_sekolah));

            // Kedudukan
            const tdRank = document.createElement('td');
            tdRank.className = `px-6 py-4 whitespace-nowrap text-sm ${rankClass}`;
            tdRank.textContent = index + 1;
            tr.appendChild(tdRank);

            // Entiti Sekolah
            const tdSchool = document.createElement('td');
            tdSchool.className = 'px-6 py-4';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors';
            nameDiv.textContent = s.nama_sekolah || 'TIADA NAMA';
            tdSchool.appendChild(nameDiv);

            const subDiv = document.createElement('div');
            subDiv.className = 'text-[10px] font-semibold text-slate-500 mt-0.5';

            const daerahSpan = document.createElement('span');
            daerahSpan.className = 'text-purple-600 font-bold uppercase tracking-wider';
            daerahSpan.textContent = s.daerah || 'TIADA DAERAH';
            subDiv.appendChild(daerahSpan);

            subDiv.appendChild(document.createTextNode(' • '));

            const kodSpan = document.createElement('span');
            kodSpan.className = 'uppercase';
            kodSpan.textContent = s.kod_sekolah || '';
            subDiv.appendChild(kodSpan);

            tdSchool.appendChild(subDiv);
            tr.appendChild(tdSchool);

            // Jumlah ID Terlibat
            const tdTotal = document.createElement('td');
            tdTotal.className = 'px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600';
            tdTotal.textContent = formatNumber(s.mappedTotal);
            tr.appendChild(tdTotal);

            // Metrik
            const tdMetric = document.createElement('td');
            tdMetric.className = 'px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600';
            tdMetric.textContent = formatNumber(s.metricCount);
            tr.appendChild(tdMetric);

            // Peratusan
            const tdPct = document.createElement('td');
            tdPct.className = 'px-6 py-4 whitespace-nowrap text-right';

            const pctBadge = document.createElement('span');
            let colorBadgeClass = 'bg-rose-50 border-rose-200 text-rose-700';
            if (s.percentage >= 80) {
                colorBadgeClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
            } else if (s.percentage >= 50) {
                colorBadgeClass = 'bg-amber-50 border-amber-200 text-amber-700';
            }
            pctBadge.className = `inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded shadow-sm border ${colorBadgeClass}`;
            pctBadge.textContent = `${s.percentage.toFixed(1)}%`;
            tdPct.appendChild(pctBadge);
            tr.appendChild(tdPct);

            rowsFragment.appendChild(tr);
        });

        tbody.appendChild(rowsFragment);
    }

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);
}

/**
 * Format data Papan Pendahulu ke teks Telegram dan salin ke Clipboard
 */
function exportTableToTelegram() {
    if (!currentLeaderboardData || currentLeaderboardData.length === 0) {
        alert("Tiada data untuk disalin.");
        return;
    }

    const filterNamesMap = {
        'keseluruhan': 'Keseluruhan Akaun',
        'murid': 'Murid Sahaja',
        'guru': 'Guru Sahaja',
        'sekolah': 'Sekolah Sahaja',
        'aktif': 'Aktif Log Masuk',
        'tidak_aktif': 'Tidak Aktif (>90 Hari)',
        'belum_login': 'Belum Pernah Login'
    };

    const filterName = filterNamesMap[currentFilterType] || 'Keseluruhan';

    let deskripsiKategori = "";
    if (currentFilterType === 'aktif') {
        deskripsiKategori = "__Penerangan: AKTIF LOG MASUK adalah akaun DELIMa yang ada aktiviti log keluar dan masuk di GMAIL melalui Portal DELIMa 3.0, kurang 90 hari.__\n\n";
    } else if (currentFilterType === 'tidak_aktif') {
        deskripsiKategori = "__Penerangan: TIDAK AKTIF (>90 HARI) adalah akaun DELIMa yang tiada aktiviti log keluar dan masuk di GMAIL melalui Portal DELIMa 3.0, melebihi 90 hari.__\n\n";
    } else if (currentFilterType === 'belum_login') {
        deskripsiKategori = "__Penerangan: BELUM PERNAH LOGIN adalah akaun DELIMa yang BELUM login ke GMAIL melalui Portal DELIMa 3.0.__\n\n";
    }

    const daerahSelect = document.getElementById('filterDaerah');
    const selectedDaerah = daerahSelect ? daerahSelect.value : 'SEMUA';
    const peringkatText = selectedDaerah === 'SEMUA' ? 'NEGERI MELAKA' : `PPD ${selectedDaerah}`;

    let text = `📊 **PRESTASI ID DELIMA**\n`;
    text += `Kategori: **${filterName}**\n`;
    text += `Peringkat: **${peringkatText}**\n\n`;
    text += deskripsiKategori;

    currentLeaderboardData.forEach((s, index) => {
        let performanceEmoji = '🔴 ';
        if (s.percentage >= 80) {
            performanceEmoji = '🟢 ';
        } else if (s.percentage >= 50) {
            performanceEmoji = '🟡 ';
        }
        text += `${index + 1}. ${performanceEmoji}${s.nama_sekolah} - **${s.percentage.toFixed(1)}%**\n`;
    });

    text += `\n---\n`;

    if (selectedDaerah === 'SEMUA') {
        text += `__Disediakan oleh:__\n__SEKTOR SUMBER TEKNOLOGI PENDIDIKAN__\n__JABATAN PENDIDIKAN NEGERI MELAKA__`;
    } else {
        text += `__Disediakan oleh:__\n__UNIT SUMBER TEKNOLOGI PENDIDIKAN__\n__PEJABAT PENDIDIKAN DAERAH ${selectedDaerah}__`;
    }

    const btn = document.getElementById('btnCopyTelegram');
    const originalContent = btn ? btn.innerHTML : '';

    const handleSuccess = () => {
        if (btn) {
            btn.innerHTML = `<svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Disalin!`;
            btn.classList.replace('bg-blue-600', 'bg-emerald-600');
            btn.classList.replace('hover:bg-blue-700', 'hover:bg-emerald-700');

            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.classList.replace('bg-emerald-600', 'bg-blue-600');
                btn.classList.replace('hover:bg-emerald-700', 'hover:bg-blue-700');
            }, 2000);
        } else {
            alert("Berjaya disalin ke papan keratan!");
        }
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(handleSuccess)
            .catch(err => {
                console.error('Gagal menggunakan Clipboard API:', err);
                fallbackCopyTextToClipboard(text, handleSuccess);
            });
    } else {
        fallbackCopyTextToClipboard(text, handleSuccess);
    }
}

/**
 * Utiliti Penyalinan Papan Keratan Fallback
 */
function fallbackCopyTextToClipboard(text, successCallback) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful && typeof successCallback === 'function') {
            successCallback();
        } else if (!successful) {
            alert("Gagal menyalin teks. Fungsi tidak disokong pada pelayar ini.");
        }
    } catch (err) {
        console.error('Penyalinan data gagal:', err);
        alert("Ralat semasa menyalin. Sila cuba salin secara manual.");
    }

    document.body.removeChild(textArea);
}

/**
 * Eksport Data Jadual ke Format CSV
 */
function exportTableToCSV() {
    if (!currentLeaderboardData || currentLeaderboardData.length === 0) return alert("Tiada data untuk dieksport.");

    const filterNamesMap = {
        'keseluruhan': 'Keseluruhan',
        'murid': 'Murid',
        'guru': 'Guru',
        'sekolah': 'Sekolah',
        'aktif': 'Aktif_Log_Masuk',
        'tidak_aktif': 'Tidak_Aktif',
        'belum_login': 'Belum_Login'
    };

    const columnNames = {
        'keseluruhan': 'Pernah Login',
        'murid': 'Pernah Login',
        'guru': 'Pernah Login',
        'sekolah': 'Pernah Login',
        'aktif': 'Aktif Login',
        'tidak_aktif': 'Tidak Aktif',
        'belum_login': 'Belum Login'
    };

    let csvContent = `Kedudukan,Daerah,Nama Sekolah,Kod Sekolah,Jenis Sekolah,Jumlah ID,${columnNames[currentFilterType] || 'Pernah Login'},Peratusan (%)\n`;

    currentLeaderboardData.forEach((s, index) => {
        const cleanName = `"${(s.nama_sekolah || '').replace(/"/g, '""')}"`;
        const cleanDaerah = `"${(s.daerah || '').replace(/"/g, '""')}"`;
        const row = [
            index + 1,
            cleanDaerah,
            cleanName,
            s.kod_sekolah || '',
            s.jenis_sekolah || '',
            s.mappedTotal,
            s.metricCount,
            s.percentage.toFixed(2)
        ];
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];

    link.setAttribute("href", url);
    link.setAttribute("download", `Prestasi_DELIMa_${filterNamesMap[currentFilterType] || 'Keseluruhan'}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Simulasi Pilihan Carian Sekolah
 */
function simulateSchoolSearch(schoolName) {
    const input = document.getElementById('searchInput');
    if (!input) return;

    input.value = schoolName;
    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

    setTimeout(() => {
        const firstOption = document.querySelector('#autocompleteDropdown > div');
        if (firstOption) firstOption.click();
    }, 50);
}

/**
 * Eksport Penuh Rekod Pengguna Sekolah ke Fail CSV
 */
async function handleExportSchoolData(kodSekolah, namaSekolah) {
    if (!kodSekolah) return;

    const btn = document.getElementById('sv_exportBtn');
    const textEl = document.getElementById('sv_exportText');

    const originalText = textEl ? textEl.innerText : 'Eksport Data';
    const originalIcon = '<svg id="sv_exportIcon" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>';
    const spinnerIcon = '<svg id="sv_exportIcon" class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';

    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-75', 'cursor-not-allowed');
    }
    if (textEl) textEl.innerText = 'Sedang Mengekstrak...';

    const iconEl = document.getElementById('sv_exportIcon');
    if (iconEl) iconEl.outerHTML = spinnerIcon;

    try {
        const response = await API.exportSchoolUsers(kodSekolah);

        if (!response.success || !response.results || response.results.length === 0) {
            alert('Tiada rekod pengguna dijumpai untuk dieksport.');
            return;
        }

        let csvContent = '\uFEFF';
        csvContent += "Nama Penuh,ID DELIMa,Kategori,Status\n";

        response.results.forEach((user) => {
            const cleanName = `"${(user.nama || 'TIADA NAMA').replace(/"/g, '""')}"`;
            const cleanEmail = `"${(user.emel || 'TIADA EMEL').replace(/"/g, '""')}"`;
            const row = [cleanName, cleanEmail, user.kategori || 'TIADA', user.status || 'TIADA'];
            csvContent += row.join(",") + "\n";
        });

        const dateObj = new Date();
        const dateStr = dateObj.toISOString().split('T')[0];
        const timeStr = dateObj.toTimeString().split(' ')[0].replace(/:/g, '');
        const safeNamaSekolah = (namaSekolah || 'SEKOLAH').replace(/[^a-z0-9]/gi, '_').toUpperCase();

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
        alert('Gagal memuat turun data. Sila cuba sebentar lagi.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
        }
        if (textEl) textEl.innerText = originalText;

        const currentIcon = document.getElementById('sv_exportIcon');
        if (currentIcon) currentIcon.outerHTML = originalIcon;
    }
}

/**
 * PENGENDALIAN ACARA MASA NYATA (REALTIME & BACKGROUND SYNC)
 */
window.addEventListener('delima:school-updated', (event) => {
    const detail = event.detail;
    if (!detail) return;

    // Jika pengguna sedang melihat sekolah spesifik yang baru dikemas kini
    if (activeSchoolCode && detail.school && activeSchoolCode === detail.school.kod_sekolah) {
        renderSchoolView(detail.school);
    }

    // Jika pengguna berada pada paparan keseluruhan
    const overallView = document.getElementById('dashboardOverallView');
    if (overallView && !overallView.classList.contains('hidden') && detail.overall) {
        buildMetricsUI(detail.overall, 'overallMetricsContainer');

        if (window.currentFilteredSchools) {
            buildLeaderboardTable(window.currentFilteredSchools, currentFilterType);
        }
    }
});

window.addEventListener('delima:dashboard-revalidated', (event) => {
    const freshData = event.detail;
    if (!freshData || !freshData.success) return;

    window.globalData = freshData;
    const lastUpdatedEl = document.getElementById('lastUpdatedText');
    if (lastUpdatedEl && freshData.timestamp) {
        lastUpdatedEl.textContent = "Data Terkini: " + new Date(freshData.timestamp).toLocaleString('ms-MY');
    }
});

// Pendedahan Fungsi ke Skop Global
window.buildMetricsUI = buildMetricsUI;
window.renderSchoolView = renderSchoolView;
window.resetToOverallView = resetToOverallView;
window.fetchAndRenderSchoolSpecificList = fetchAndRenderSchoolSpecificList;
window.exportSpecificUserListCSV = exportSpecificUserListCSV;
window.applyLeaderboardFilter = applyLeaderboardFilter;
window.buildLeaderboardTable = buildLeaderboardTable;
window.exportTableToTelegram = exportTableToTelegram;
window.exportTableToCSV = exportTableToCSV;
window.simulateSchoolSearch = simulateSchoolSearch;
window.handleExportSchoolData = handleExportSchoolData;