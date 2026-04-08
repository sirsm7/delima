/**
 * ==============================================================================
 * SYSTEM ARCHITECTURE: HYBRID DASHBOARD
 * FILE: search.js (User Search Engine & Modal UI Logic)
 * ==============================================================================
 */

/**
 * ==========================================
 * MODUL 1: CARIAN SPESIFIK SEKOLAH (SEDIA ADA)
 * ==========================================
 */

/**
 * Open the search modal with smooth transition
 */
function openSearchModal() {
    const modal = document.getElementById('userSearchModal');
    const modalContent = document.getElementById('userSearchModalContent');
    const input = document.getElementById('sm_searchInput');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Smooth transition animation
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        input.focus();
    }, 10);
}

/**
 * Close the search modal and reset state
 */
function closeSearchModal() {
    const modal = document.getElementById('userSearchModal');
    const modalContent = document.getElementById('userSearchModalContent');
    
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.getElementById('sm_searchInput').value = '';
        toggleSearchState('initial');
    }, 300);
}

/**
 * Manage UI states inside the search modal
 */
function toggleSearchState(state, errorMsg = '') {
    // Hide all layers initially
    document.getElementById('sm_initialState').classList.add('hidden');
    document.getElementById('sm_loadingState').classList.add('hidden');
    document.getElementById('sm_errorState').classList.add('hidden');
    document.getElementById('sm_resultsList').classList.add('hidden');
    
    document.getElementById('sm_initialState').classList.remove('flex');
    document.getElementById('sm_loadingState').classList.remove('flex');
    document.getElementById('sm_errorState').classList.remove('flex');
    
    const btn = document.getElementById('sm_searchBtn');
    const input = document.getElementById('sm_searchInput');

    if (state === 'initial') {
        document.getElementById('sm_initialState').classList.add('flex');
        document.getElementById('sm_initialState').classList.remove('hidden');
        document.getElementById('sm_footerStatus').innerText = 'Pencarian REST API Supabase aktif.';
        btn.disabled = false;
        input.disabled = false;
        btn.innerText = 'Cari';
    } else if (state === 'loading') {
        document.getElementById('sm_loadingState').classList.add('flex');
        document.getElementById('sm_loadingState').classList.remove('hidden');
        btn.disabled = true;
        input.disabled = true;
        btn.innerHTML = '<div class="spinner h-4 w-4 border-2 border-white border-t-transparent mx-auto"></div>';
    } else if (state === 'error') {
        document.getElementById('sm_errorState').classList.add('flex');
        document.getElementById('sm_errorState').classList.remove('hidden');
        document.getElementById('sm_errorText').innerText = errorMsg;
        btn.disabled = false;
        input.disabled = false;
        btn.innerText = 'Cari';
    } else if (state === 'results') {
        document.getElementById('sm_resultsList').classList.remove('hidden');
        btn.disabled = false;
        input.disabled = false;
        btn.innerText = 'Cari';
    }
}

/**
 * Execute asynchronous search via Supabase API
 */
async function executeUserSearch(e) {
    e.preventDefault();
    
    if (typeof activeSchoolCode === 'undefined' || !activeSchoolCode) {
        toggleSearchState('error', 'Ralat Konteks: Sila pilih sekolah dari carian utama terlebih dahulu.');
        return;
    }
    
    const query = document.getElementById('sm_searchInput').value.trim();
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
    document.getElementById('sm_footerStatus').innerText = `Enjin menjumpai ${response.count} rekod padanan yang disahkan.`;
}

/**
 * Render the fetched data into the DOM list
 */
function renderSearchResults(results) {
    const listContainer = document.getElementById('sm_resultsList');
    listContainer.innerHTML = '';

    if (!results || results.length === 0) {
        toggleSearchState('error', 'Tiada rekod pengguna dijumpai yang sepadan dengan kata kunci ini.');
        return;
    }

    results.forEach(user => {
        let statusColorClass = '';
        if (user.status === 'AKTIF') {
            statusColorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        } else if (user.status === 'BELUM LOGIN') {
            statusColorClass = 'bg-amber-100 text-amber-800 border-amber-200';
        } else if (user.status === 'DIGANTUNG') {
            statusColorClass = 'bg-slate-200 text-slate-800 border-slate-300';
        } else {
            statusColorClass = 'bg-rose-100 text-rose-800 border-rose-200'; 
        }

        const safeNama = user.nama ? user.nama.replace(/'/g, "\\'") : 'TIADA NAMA';
        const safeEmel = user.emel ? user.emel.replace(/'/g, "\\'") : 'TIADA EMEL';

        const li = document.createElement('li');
        li.className = 'px-6 py-4 hover:bg-blue-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3';
        
        li.innerHTML = `
            <div class="flex-grow min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="bg-blue-100 text-blue-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">${user.kategori}</span>
                </div>
                
                <div class="flex items-center gap-2">
                    <h4 class="text-sm font-bold text-slate-900 uppercase truncate" title="${user.nama}">${user.nama}</h4>
                    <button type="button" onclick="copyDataToClipboard('${safeNama}', this)" class="text-slate-400 hover:text-blue-600 transition-colors focus:outline-none" title="Salin Nama">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                </div>
                
                <div class="flex items-center gap-2 mt-0.5">
                    <p class="text-xs font-semibold text-slate-500 truncate" title="${user.emel}">${user.emel}</p>
                    <button type="button" onclick="copyDataToClipboard('${safeEmel}', this)" class="text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none" title="Salin Emel/ID">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                </div>
            </div>
            
            <div class="flex-shrink-0 ml-0 sm:ml-4 mt-2 sm:mt-0">
                <span class="inline-flex items-center justify-center px-3 py-1 text-[10px] font-extrabold rounded-full border uppercase tracking-wide ${statusColorClass}">
                    ${user.status}
                </span>
            </div>
        `;
        listContainer.appendChild(li);
    });

    toggleSearchState('results');
}

/**
 * ==========================================
 * MODUL 2: CARIAN GLOBAL NEGERI (BAHARU)
 * ==========================================
 */

function openGlobalSearchModal() {
    const modal = document.getElementById('globalSearchModal');
    const modalContent = document.getElementById('globalSearchModalContent');
    const input = document.getElementById('gs_searchInput');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        input.focus();
    }, 10);
}

function closeGlobalSearchModal() {
    const modal = document.getElementById('globalSearchModal');
    const modalContent = document.getElementById('globalSearchModalContent');
    
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.getElementById('gs_searchInput').value = '';
        toggleGlobalSearchState('initial');
    }, 300);
}

function toggleGlobalSearchState(state, errorMsg = '') {
    document.getElementById('gs_initialState').classList.add('hidden');
    document.getElementById('gs_loadingState').classList.add('hidden');
    document.getElementById('gs_errorState').classList.add('hidden');
    document.getElementById('gs_resultsList').classList.add('hidden');
    
    document.getElementById('gs_initialState').classList.remove('flex');
    document.getElementById('gs_loadingState').classList.remove('flex');
    document.getElementById('gs_errorState').classList.remove('flex');
    
    const btn = document.getElementById('gs_searchBtn');
    const input = document.getElementById('gs_searchInput');

    if (state === 'initial') {
        document.getElementById('gs_initialState').classList.add('flex');
        document.getElementById('gs_initialState').classList.remove('hidden');
        document.getElementById('gs_footerStatus').innerText = 'Enjin Carian Global sedia digunakan.';
        btn.disabled = false;
        input.disabled = false;
        btn.innerText = 'Cari';
    } else if (state === 'loading') {
        document.getElementById('gs_loadingState').classList.add('flex');
        document.getElementById('gs_loadingState').classList.remove('hidden');
        btn.disabled = true;
        input.disabled = true;
        btn.innerHTML = '<div class="spinner h-4 w-4 border-2 border-white border-t-transparent mx-auto"></div>';
    } else if (state === 'error') {
        document.getElementById('gs_errorState').classList.add('flex');
        document.getElementById('gs_errorState').classList.remove('hidden');
        document.getElementById('gs_errorText').innerText = errorMsg;
        btn.disabled = false;
        input.disabled = false;
        btn.innerText = 'Cari';
    } else if (state === 'results') {
        document.getElementById('gs_resultsList').classList.remove('hidden');
        btn.disabled = false;
        input.disabled = false;
        btn.innerText = 'Cari';
    }
}

async function executeGlobalSearch(e) {
    e.preventDefault();
    
    const query = document.getElementById('gs_searchInput').value.trim();
    
    // Keselamatan Data: Penguatkuasaan had minimum 5 aksara
    if (query.length < 5) {
        toggleGlobalSearchState('error', 'Sila masukkan sekurang-kurangnya 5 aksara untuk mengelakkan pengekstrakan data pukal.');
        return;
    }

    toggleGlobalSearchState('loading');

    // Memanggil API Global
    const response = await API.searchUsersGlobal(query);

    if (!response.success) {
        toggleGlobalSearchState('error', response.message || 'Ralat memproses carian daripada pelayan Supabase.');
        return;
    }

    renderGlobalSearchResults(response.results);
    document.getElementById('gs_footerStatus').innerText = `Enjin memaparkan ${response.count} rekod teratas (Maksimum 15).`;
}

function renderGlobalSearchResults(results) {
    const listContainer = document.getElementById('gs_resultsList');
    listContainer.innerHTML = '';

    if (!results || results.length === 0) {
        toggleGlobalSearchState('error', 'Tiada rekod dijumpai di seluruh negeri yang sepadan dengan kata kunci ini.');
        return;
    }

    results.forEach(user => {
        // Penentuan Warna Status
        let statusColorClass = '';
        if (user.status === 'AKTIF') {
            statusColorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        } else if (user.status === 'BELUM LOGIN') {
            statusColorClass = 'bg-amber-100 text-amber-800 border-amber-200';
        } else if (user.status === 'DIGANTUNG') {
            statusColorClass = 'bg-slate-200 text-slate-800 border-slate-300';
        } else {
            statusColorClass = 'bg-rose-100 text-rose-800 border-rose-200'; 
        }

        // Pengesanan Anomali Tagging (ID Murid 'm-' tetapi ditag sebagai Guru)
        const isAnomaly = user.emel && user.emel.toLowerCase().startsWith('m-') && user.kategori && user.kategori.toUpperCase() === 'GURU';
        const anomalyBadgeHtml = isAnomaly 
            ? `<span class="bg-red-100 text-red-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-red-200 flex items-center gap-1 shadow-sm" title="Potensi Ralat Tagging Pusat (Sila lapor ke JPN)">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                RALAT TAG (MURID->GURU)
               </span>` 
            : '';

        // Pemetaan Nama Sekolah melalui Kod Sekolah
        let namaSekolah = 'SEKOLAH TIDAK DIKETAHUI';
        let badgeSekolah = `<span class="text-xs font-semibold text-slate-500">${user.kod_sekolah || 'TIADA KOD'}</span>`;
        
        if (user.kod_sekolah && window.globalData && window.globalData.schools) {
            const foundSchool = window.globalData.schools.find(s => s.kod_sekolah === user.kod_sekolah);
            if (foundSchool) {
                namaSekolah = foundSchool.nama_sekolah;
                badgeSekolah = `
                    <div class="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded flex items-center gap-2">
                        <span class="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">${user.kod_sekolah}</span>
                        <span class="text-[10px] font-bold text-indigo-900 uppercase truncate" title="${namaSekolah}">${namaSekolah}</span>
                    </div>
                `;
            }
        }

        const safeNama = user.nama ? user.nama.replace(/'/g, "\\'") : 'TIADA NAMA';
        const safeEmel = user.emel ? user.emel.replace(/'/g, "\\'") : 'TIADA EMEL';

        const li = document.createElement('li');
        li.className = 'px-6 py-4 hover:bg-indigo-50/50 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3';
        
        li.innerHTML = `
            <div class="flex-grow min-w-0">
                <div class="flex items-center flex-wrap gap-2 mb-1">
                    <span class="bg-blue-100 text-blue-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">${user.kategori}</span>
                    ${anomalyBadgeHtml}
                </div>
                
                <div class="flex items-center gap-2">
                    <h4 class="text-sm font-bold text-slate-900 uppercase truncate" title="${user.nama}">${user.nama}</h4>
                    <button type="button" onclick="copyDataToClipboard('${safeNama}', this)" class="text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none" title="Salin Nama">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                </div>
                
                <div class="flex items-center gap-2 mt-0.5">
                    <p class="text-xs font-semibold text-slate-500 truncate" title="${user.emel}">${user.emel}</p>
                    <button type="button" onclick="copyDataToClipboard('${safeEmel}', this)" class="text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none" title="Salin Emel/ID">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                </div>
                
                ${badgeSekolah}
            </div>
            
            <div class="flex-shrink-0 mt-2 sm:mt-0 text-right">
                <span class="inline-flex items-center justify-center px-3 py-1 text-[10px] font-extrabold rounded-full border uppercase tracking-wide ${statusColorClass}">
                    ${user.status}
                </span>
            </div>
        `;
        listContainer.appendChild(li);
    });

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
        
        if (successful) {
            const originalIcon = btnElement.innerHTML;
            btnElement.innerHTML = `<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
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