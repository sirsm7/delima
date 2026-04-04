/**
 * ==============================================================================
 * SYSTEM ARCHITECTURE: HYBRID DASHBOARD
 * FILE: search.js (User Search Engine & Modal UI Logic)
 * ==============================================================================
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
        document.getElementById('sm_footerStatus').innerText = 'Supabase REST API search active.';
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
    
    // PEMBAIKAN PEPIJAT KRITIKAL: 
    // Akses terus kepada memori 'activeSchoolCode' tanpa awalan 'window.' 
    // Ini kerana ia diisytiharkan sebagai 'let' dalam dashboard.js
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

    // Memanggil Enjin API Supabase (dari api.js)
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

        const li = document.createElement('li');
        li.className = 'px-6 py-4 hover:bg-blue-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3';
        
        li.innerHTML = `
            <div class="flex-grow min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="bg-blue-100 text-blue-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">${user.kategori}</span>
                </div>
                <h4 class="text-sm font-bold text-slate-900 uppercase truncate" title="${user.nama}">${user.nama}</h4>
                <p class="text-xs font-semibold text-slate-500 truncate" title="${user.emel}">${user.emel}</p>
            </div>
            <div class="flex-shrink-0">
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
 * Attach Event Listeners on DOM Load
 */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnBukaCarianId')?.addEventListener('click', openSearchModal);
    document.getElementById('btnTutupModal')?.addEventListener('click', closeSearchModal);
    document.getElementById('searchUserForm')?.addEventListener('submit', executeUserSearch);
});