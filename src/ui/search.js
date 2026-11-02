/**
 * ==============================================================================
 * SYSTEM ARCHITECTURE: HYBRID DASHBOARD
 * FILE: search.js (User Search Engine & Modal UI Logic)
 * ==============================================================================
 */

/**
 * ==========================================
 * MODUL 1: CARIAN SPESIFIK SEKOLAH
 * ==========================================
 */

/**
 * Buka modal carian sekolah dengan animasi peralihan
 */
function openSearchModal() {
    const modal = document.getElementById('userSearchModal');
    const modalContent = document.getElementById('userSearchModalContent');
    const input = document.getElementById('sm_searchInput');
    if (!modal || !modalContent) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        if (input) input.focus();
    }, 10);
}

/**
 * Tutup modal carian sekolah dan set semula keadaan
 */
function closeSearchModal() {
    const modal = document.getElementById('userSearchModal');
    const modalContent = document.getElementById('userSearchModalContent');
    const input = document.getElementById('sm_searchInput');
    if (!modal || !modalContent) return;

    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');

    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if (input) input.value = '';
        toggleSearchState('initial');
    }, 300);
}

/**
 * Kawal keadaan visual antaramuka dalam modal carian sekolah
 */
function toggleSearchState(state, errorMsg = '') {
    const initialEl = document.getElementById('sm_initialState');
    const loadingEl = document.getElementById('sm_loadingState');
    const errorEl = document.getElementById('sm_errorState');
    const resultsList = document.getElementById('sm_resultsList');
    const btn = document.getElementById('sm_searchBtn');
    const input = document.getElementById('sm_searchInput');
    const footerStatus = document.getElementById('sm_footerStatus');
    const errorText = document.getElementById('sm_errorText');

    if (initialEl) {
        initialEl.classList.add('hidden');
        initialEl.classList.remove('flex');
    }
    if (loadingEl) {
        loadingEl.classList.add('hidden');
        loadingEl.classList.remove('flex');
    }
    if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.classList.remove('flex');
    }
    if (resultsList) {
        resultsList.classList.add('hidden');
    }

    if (state === 'initial') {
        if (initialEl) {
            initialEl.classList.add('flex');
            initialEl.classList.remove('hidden');
        }
        if (footerStatus) footerStatus.textContent = 'Pencarian REST API Supabase aktif.';
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Cari';
        }
        if (input) input.disabled = false;
    } else if (state === 'loading') {
        if (loadingEl) {
            loadingEl.classList.add('flex');
            loadingEl.classList.remove('hidden');
        }
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner h-4 w-4 border-2 border-white border-t-transparent mx-auto"></div>';
        }
        if (input) input.disabled = true;
    } else if (state === 'error') {
        if (errorEl) {
            errorEl.classList.add('flex');
            errorEl.classList.remove('hidden');
        }
        if (errorText) errorText.textContent = errorMsg;
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Cari';
        }
        if (input) input.disabled = false;
    } else if (state === 'results') {
        if (resultsList) resultsList.classList.remove('hidden');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Cari';
        }
        if (input) input.disabled = false;
    }
}

/**
 * Laksanakan carian pengguna spesifik sekolah melalui Supabase API
 */
async function executeUserSearch(e) {
    e.preventDefault();

    if (typeof activeSchoolCode === 'undefined' || !activeSchoolCode) {
        toggleSearchState('error', 'Ralat Konteks: Sila pilih sekolah dari carian utama terlebih dahulu.');
        return;
    }

    const input = document.getElementById('sm_searchInput');
    const query = input ? input.value.trim() : '';

    if (query.length < 3) {
        toggleSearchState('error', 'Sila masukkan sekurang-kurangnya 3 aksara.');
        return;
    }

    toggleSearchState('loading');

    const response = await API.searchUsers(activeSchoolCode, query);

    if (!response.success) {
        toggleSearchState('error', response.message || 'Ralat memproses carian daripada pelayan Supabase.');
        return;
    }

    renderSearchResults(response.results);

    const footerStatus = document.getElementById('sm_footerStatus');
    if (footerStatus) {
        footerStatus.textContent = `Enjin menjumpai ${response.count} rekod padanan yang disahkan.`;
    }
}

/**
 * Paparkan hasil carian sekolah ke dalam DOM (Bebas XSS dengan DocumentFragment)
 */
function renderSearchResults(results) {
    const listContainer = document.getElementById('sm_resultsList');
    if (!listContainer) return;

    listContainer.textContent = '';

    if (!results || results.length === 0) {
        toggleSearchState('error', 'Tiada rekod pengguna dijumpai yang sepadan dengan kata kunci ini.');
        return;
    }

    const fragment = document.createDocumentFragment();

    results.forEach(user => {
        let statusColorClass = 'bg-rose-100 text-rose-800 border-rose-200';
        if (user.status === 'AKTIF') {
            statusColorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        } else if (user.status === 'BELUM LOGIN') {
            statusColorClass = 'bg-amber-100 text-amber-800 border-amber-200';
        } else if (user.status === 'DIGANTUNG') {
            statusColorClass = 'bg-slate-200 text-slate-800 border-slate-300';
        }

        const li = document.createElement('li');
        li.className = 'px-6 py-4 hover:bg-blue-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3';

        // Kontena Kiri (Maklumat Pengguna)
        const leftCol = document.createElement('div');
        leftCol.className = 'flex-grow min-w-0';

        // Lencana Kategori
        const catWrapper = document.createElement('div');
        catWrapper.className = 'flex items-center gap-2 mb-1';
        const catBadge = document.createElement('span');
        catBadge.className = 'bg-blue-100 text-blue-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider';
        catBadge.textContent = user.kategori || 'TIADA KATEGORI';
        catWrapper.appendChild(catBadge);
        leftCol.appendChild(catWrapper);

        // Baris Nama Penuh + Butang Salin
        const nameRow = document.createElement('div');
        nameRow.className = 'flex items-center gap-2';

        const nameEl = document.createElement('h4');
        nameEl.className = 'text-sm font-bold text-slate-900 uppercase truncate';
        nameEl.title = user.nama || 'TIADA NAMA';
        nameEl.textContent = user.nama || 'TIADA NAMA';
        nameRow.appendChild(nameEl);

        if (user.nama) {
            const copyNameBtn = document.createElement('button');
            copyNameBtn.type = 'button';
            copyNameBtn.className = 'text-slate-400 hover:text-blue-600 transition-colors focus:outline-none';
            copyNameBtn.title = 'Salin Nama';
            copyNameBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>';
            copyNameBtn.addEventListener('click', () => copyDataToClipboard(user.nama, copyNameBtn));
            nameRow.appendChild(copyNameBtn);
        }
        leftCol.appendChild(nameRow);

        // Baris Emel DELIMa + Butang Salin
        const emailRow = document.createElement('div');
        emailRow.className = 'flex items-center gap-2 mt-0.5';

        const emailEl = document.createElement('p');
        emailEl.className = 'text-xs font-semibold text-slate-500 truncate';
        emailEl.title = user.emel || 'TIADA EMEL';
        emailEl.textContent = user.emel || 'TIADA EMEL';
        emailRow.appendChild(emailEl);

        if (user.emel) {
            const copyEmailBtn = document.createElement('button');
            copyEmailBtn.type = 'button';
            copyEmailBtn.className = 'text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none';
            copyEmailBtn.title = 'Salin Emel/ID';
            copyEmailBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>';
            copyEmailBtn.addEventListener('click', () => copyDataToClipboard(user.emel, copyEmailBtn));
            emailRow.appendChild(copyEmailBtn);
        }
        leftCol.appendChild(emailRow);
        li.appendChild(leftCol);

        // Kontena Kanan (Lencana Status)
        const rightCol = document.createElement('div');
        rightCol.className = 'flex-shrink-0 ml-0 sm:ml-4 mt-2 sm:mt-0';

        const statusBadge = document.createElement('span');
        statusBadge.className = `inline-flex items-center justify-center px-3 py-1 text-[10px] font-extrabold rounded-full border uppercase tracking-wide ${statusColorClass}`;
        statusBadge.textContent = user.status || 'TIADA';
        rightCol.appendChild(statusBadge);

        li.appendChild(rightCol);
        fragment.appendChild(li);
    });

    listContainer.appendChild(fragment);
    toggleSearchState('results');
}

/**
 * ==========================================
 * MODUL 2: CARIAN GLOBAL NEGERI
 * ==========================================
 */

/**
 * Buka modal carian global (seluruh negeri)
 */
function openGlobalSearchModal() {
    const modal = document.getElementById('globalSearchModal');
    const modalContent = document.getElementById('globalSearchModalContent');
    const input = document.getElementById('gs_searchInput');
    if (!modal || !modalContent) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        if (input) input.focus();
    }, 10);
}

/**
 * Tutup modal carian global
 */
function closeGlobalSearchModal() {
    const modal = document.getElementById('globalSearchModal');
    const modalContent = document.getElementById('globalSearchModalContent');
    const input = document.getElementById('gs_searchInput');
    if (!modal || !modalContent) return;

    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');

    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if (input) input.value = '';
        toggleGlobalSearchState('initial');
    }, 300);
}

/**
 * Kawal keadaan visual antaramuka dalam modal carian global
 */
function toggleGlobalSearchState(state, errorMsg = '') {
    const initialEl = document.getElementById('gs_initialState');
    const loadingEl = document.getElementById('gs_loadingState');
    const errorEl = document.getElementById('gs_errorState');
    const resultsList = document.getElementById('gs_resultsList');
    const btn = document.getElementById('gs_searchBtn');
    const input = document.getElementById('gs_searchInput');
    const footerStatus = document.getElementById('gs_footerStatus');
    const errorText = document.getElementById('gs_errorText');

    if (initialEl) {
        initialEl.classList.add('hidden');
        initialEl.classList.remove('flex');
    }
    if (loadingEl) {
        loadingEl.classList.add('hidden');
        loadingEl.classList.remove('flex');
    }
    if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.classList.remove('flex');
    }
    if (resultsList) {
        resultsList.classList.add('hidden');
    }

    if (state === 'initial') {
        if (initialEl) {
            initialEl.classList.add('flex');
            initialEl.classList.remove('hidden');
        }
        if (footerStatus) footerStatus.textContent = 'Enjin Carian Global sedia digunakan.';
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Cari';
        }
        if (input) input.disabled = false;
    } else if (state === 'loading') {
        if (loadingEl) {
            loadingEl.classList.add('flex');
            loadingEl.classList.remove('hidden');
        }
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner h-4 w-4 border-2 border-white border-t-transparent mx-auto"></div>';
        }
        if (input) input.disabled = true;
    } else if (state === 'error') {
        if (errorEl) {
            errorEl.classList.add('flex');
            errorEl.classList.remove('hidden');
        }
        if (errorText) errorText.textContent = errorMsg;
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Cari';
        }
        if (input) input.disabled = false;
    } else if (state === 'results') {
        if (resultsList) resultsList.classList.remove('hidden');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Cari';
        }
        if (input) input.disabled = false;
    }
}

/**
 * Laksanakan carian pengguna merentas seluruh negeri
 */
async function executeGlobalSearch(e) {
    e.preventDefault();

    const input = document.getElementById('gs_searchInput');
    const query = input ? input.value.trim() : '';

    if (query.length < 5) {
        toggleGlobalSearchState('error', 'Sila masukkan sekurang-kurangnya 5 aksara untuk mengelakkan pengekstrakan data pukal.');
        return;
    }

    toggleGlobalSearchState('loading');

    const response = await API.searchUsersGlobal(query);

    if (!response.success) {
        toggleGlobalSearchState('error', response.message || 'Ralat memproses carian daripada pelayan Supabase.');
        return;
    }

    renderGlobalSearchResults(response.results);

    const footerStatus = document.getElementById('gs_footerStatus');
    if (footerStatus) {
        footerStatus.textContent = `Enjin memaparkan ${response.count} rekod teratas (Maksimum 15).`;
    }
}

/**
 * Paparkan hasil carian global ke dalam DOM (Bebas XSS dengan DocumentFragment)
 */
function renderGlobalSearchResults(results) {
    const listContainer = document.getElementById('gs_resultsList');
    if (!listContainer) return;

    listContainer.textContent = '';

    if (!results || results.length === 0) {
        toggleGlobalSearchState('error', 'Tiada rekod dijumpai di seluruh negeri yang sepadan dengan kata kunci ini.');
        return;
    }

    const fragment = document.createDocumentFragment();

    results.forEach(user => {
        let statusColorClass = 'bg-rose-100 text-rose-800 border-rose-200';
        if (user.status === 'AKTIF') {
            statusColorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        } else if (user.status === 'BELUM LOGIN') {
            statusColorClass = 'bg-amber-100 text-amber-800 border-amber-200';
        } else if (user.status === 'DIGANTUNG') {
            statusColorClass = 'bg-slate-200 text-slate-800 border-slate-300';
        }

        const isAnomaly = user.emel && user.emel.toLowerCase().startsWith('m-') && user.kategori && user.kategori.toUpperCase() === 'GURU';

        let namaSekolah = 'SEKOLAH TIDAK DIKETAHUI';
        let foundSchool = null;
        if (user.kod_sekolah && window.globalData && window.globalData.schools) {
            foundSchool = window.globalData.schools.find(s => s.kod_sekolah === user.kod_sekolah);
            if (foundSchool) {
                namaSekolah = foundSchool.nama_sekolah;
            }
        }

        const li = document.createElement('li');
        li.className = 'px-6 py-4 hover:bg-indigo-50/50 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3';

        // Bahagian Kiri
        const leftCol = document.createElement('div');
        leftCol.className = 'flex-grow min-w-0';

        // Lencana Kategori & Anomali Tagging
        const metaRow = document.createElement('div');
        metaRow.className = 'flex items-center flex-wrap gap-2 mb-1';

        const catBadge = document.createElement('span');
        catBadge.className = 'bg-blue-100 text-blue-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider';
        catBadge.textContent = user.kategori || 'TIADA KATEGORI';
        metaRow.appendChild(catBadge);

        if (isAnomaly) {
            const anomalyBadge = document.createElement('span');
            anomalyBadge.className = 'bg-red-100 text-red-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-red-200 flex items-center gap-1 shadow-sm';
            anomalyBadge.title = 'Potensi Ralat Tagging Pusat (Sila lapor ke JPN)';
            anomalyBadge.innerHTML = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>RALAT TAG (MURID->GURU)';
            metaRow.appendChild(anomalyBadge);
        }
        leftCol.appendChild(metaRow);

        // Baris Nama Penuh + Butang Salin
        const nameRow = document.createElement('div');
        nameRow.className = 'flex items-center gap-2';

        const nameEl = document.createElement('h4');
        nameEl.className = 'text-sm font-bold text-slate-900 uppercase truncate';
        nameEl.title = user.nama || 'TIADA NAMA';
        nameEl.textContent = user.nama || 'TIADA NAMA';
        nameRow.appendChild(nameEl);

        if (user.nama) {
            const copyNameBtn = document.createElement('button');
            copyNameBtn.type = 'button';
            copyNameBtn.className = 'text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none';
            copyNameBtn.title = 'Salin Nama';
            copyNameBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>';
            copyNameBtn.addEventListener('click', () => copyDataToClipboard(user.nama, copyNameBtn));
            nameRow.appendChild(copyNameBtn);
        }
        leftCol.appendChild(nameRow);

        // Baris Emel DELIMa + Butang Salin
        const emailRow = document.createElement('div');
        emailRow.className = 'flex items-center gap-2 mt-0.5';

        const emailEl = document.createElement('p');
        emailEl.className = 'text-xs font-semibold text-slate-500 truncate';
        emailEl.title = user.emel || 'TIADA EMEL';
        emailEl.textContent = user.emel || 'TIADA EMEL';
        emailRow.appendChild(emailEl);

        if (user.emel) {
            const copyEmailBtn = document.createElement('button');
            copyEmailBtn.type = 'button';
            copyEmailBtn.className = 'text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none';
            copyEmailBtn.title = 'Salin Emel/ID';
            copyEmailBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>';
            copyEmailBtn.addEventListener('click', () => copyDataToClipboard(user.emel, copyEmailBtn));
            emailRow.appendChild(copyEmailBtn);
        }
        leftCol.appendChild(emailRow);

        // Lencana / Kotak Maklumat Sekolah
        if (foundSchool) {
            const schoolBox = document.createElement('div');
            schoolBox.className = 'mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded flex items-center gap-2';

            const schoolCodeBadge = document.createElement('span');
            schoolCodeBadge.className = 'bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider';
            schoolCodeBadge.textContent = user.kod_sekolah || '';
            schoolBox.appendChild(schoolCodeBadge);

            const schoolNameText = document.createElement('span');
            schoolNameText.className = 'text-[10px] font-bold text-indigo-900 uppercase truncate';
            schoolNameText.title = namaSekolah;
            schoolNameText.textContent = namaSekolah;
            schoolBox.appendChild(schoolNameText);

            leftCol.appendChild(schoolBox);
        } else {
            const schoolCodeFallback = document.createElement('div');
            schoolCodeFallback.className = 'mt-1 text-xs font-semibold text-slate-500';
            schoolCodeFallback.textContent = user.kod_sekolah || 'TIADA KOD SEKOLAH';
            leftCol.appendChild(schoolCodeFallback);
        }

        li.appendChild(leftCol);

        // Bahagian Kanan (Status Pengguna)
        const rightCol = document.createElement('div');
        rightCol.className = 'flex-shrink-0 mt-2 sm:mt-0 text-right';

        const statusBadge = document.createElement('span');
        statusBadge.className = `inline-flex items-center justify-center px-3 py-1 text-[10px] font-extrabold rounded-full border uppercase tracking-wide ${statusColorClass}`;
        statusBadge.textContent = user.status || 'TIADA';
        rightCol.appendChild(statusBadge);

        li.appendChild(rightCol);
        fragment.appendChild(li);
    });

    listContainer.appendChild(fragment);
    toggleGlobalSearchState('results');
}

/**
 * ==========================================
 * UTILITI GUNASAMA & EVENT LISTENERS
 * ==========================================
 */

window.copyDataToClipboard = function(text, btnElement) {
    if (!text) return;

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
        if (successful && btnElement) {
            const originalIcon = btnElement.innerHTML;
            btnElement.innerHTML = '<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            setTimeout(() => { btnElement.innerHTML = originalIcon; }, 2000);
        }
    } catch (err) {
        console.error('Penyalinan data gagal:', err);
    }

    document.body.removeChild(textArea);
};

document.addEventListener('DOMContentLoaded', () => {
    // Event Listener Modal Spesifik Sekolah
    document.getElementById('btnBukaCarianId')?.addEventListener('click', openSearchModal);
    document.getElementById('btnTutupModal')?.addEventListener('click', closeSearchModal);
    document.getElementById('searchUserForm')?.addEventListener('submit', executeUserSearch);

    // Event Listener Modal Global (Negeri)
    document.getElementById('btnBukaCarianGlobal')?.addEventListener('click', openGlobalSearchModal);
    document.getElementById('btnTutupModalGlobal')?.addEventListener('click', closeGlobalSearchModal);
    document.getElementById('searchGlobalUserForm')?.addEventListener('submit', executeGlobalSearch);
});

// Pendedahan Fungsi ke Skop Global
window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
window.toggleSearchState = toggleSearchState;
window.executeUserSearch = executeUserSearch;
window.openGlobalSearchModal = openGlobalSearchModal;
window.closeGlobalSearchModal = closeGlobalSearchModal;
window.toggleGlobalSearchState = toggleGlobalSearchState;
window.executeGlobalSearch = executeGlobalSearch;