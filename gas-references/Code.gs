/**
 * SENI BINA SISTEM: DASHBOARD HIBRID (SUPABASE BACKEND)
 * VERSI: 4.3.0 (MULTI-ADMIN CRON + ANTI-TIMEOUT + DEDUPLICATION + TRUE MIRROR SYNC)
 * FUNGSI UTAMA: 
 * 1. Skrip membaca Google Sheets dan menolak (UPSERT sahaja) data ke Supabase.
 * 2. Tahan Lasak: Menyokong pelbagai pengguna Admin (Multi-Tenant).
 * 3. Anti-Timeout: Automasi menyambung semula tugasan menggunakan PropertiesService jika masa lebih 4.5 minit.
 * 4. Deduplikasi: Membuang rekod bertindih sebelum UPSERT bagi mengelakkan ralat PostgreSQL 21000.
 * 5. Visualisasi Log: Memaparkan nombor baris mutlak dari Google Sheets untuk pemantauan tepat.
 * 6. Pengurusan Trigger (Fix): Pengasingan logik trigger harian dan trigger resume.
 * 7. True Mirror Sync: Memadam secara automatik rekod yatim (orphaned records) di Supabase yang tiada lagi di Sheets.
 */

// ==============================================================================
// KONFIGURASI MUTLAK SISTEM
// ==============================================================================
const CONFIG = {
  SHEET_ID: "19_10re_-6do1MBQPmsHJ5GflhLRpzxhQbBpV8eFq5HI",
  SUPABASE_URL: "https://app.tech4ag.my",
  // ── SURGICAL EDIT START: guna service role key dari Script Properties ──
  SUPABASE_SERVICE_ROLE_KEY_PROPERTY: "SUPABASE_SERVICE_ROLE_KEY",
  // ── SURGICAL EDIT END ──
  // ── SURGICAL EDIT START: kawalan bandwidth dan retry Supabase ──
  CHUNK_SIZE: 1000,
  API_SLEEP_MS: 500,
  API_MAX_RETRIES: 3,
  API_RETRY_BASE_SLEEP_MS: 5000,
  QUOTA_RESUME_DELAY_MS: 15 * 60 * 1000,
  // ── SURGICAL EDIT END ──
  MAX_EXECUTION_TIME_MS: 4.5 * 60 * 1000, // 4.5 minit (Had GAS ialah 6 minit)
  MAIN_FUNC_NAME: "Automasi_Jam_5_Pagi", // Trigger harian utama
  RESUME_FUNC_NAME: "Proses_Sambungan"    // Trigger sekunder khas untuk anti-timeout
};

// ==============================================================================
// PENGURUSAN KEADAAN (STATE MANAGEMENT)
// ==============================================================================
const STATE_KEY = 'AUTOMATION_SYNC_STATE';

function getState() {
  const props = PropertiesService.getScriptProperties();
  const stateStr = props.getProperty(STATE_KEY);
  if (stateStr) {
    return JSON.parse(stateStr);
  }
  return {
    module: "SEKOLAH", // Bermula dengan modul sekolah
    index: 1, // Bermula di baris 1 (mengabaikan header)
    sync_timestamp: new Date().toISOString() // Menjana cap masa universal baharu untuk kitaran pertama
  };
}

function saveState(module, index, sync_timestamp) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(STATE_KEY, JSON.stringify({ 
    module: module, 
    index: index, 
    sync_timestamp: sync_timestamp 
  }));
}

function clearState() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(STATE_KEY);
}

// ==============================================================================
// ENTRY POINTS (PENGASINGAN FUNGSI HANDLER TRIGGER)
// ==============================================================================

/**
 * FUNGSI UTAMA: Mesti disetkan secara manual untuk berjalan pada jam 5 pagi.
 * Ia tidak akan disentuh atau dipadam oleh sistem anti-timeout.
 */
function Automasi_Jam_5_Pagi() {
  Logger.log("▶️ PANGGILAN TRIGGER UTAMA HARIAN DIMULAKAN...");
  Enjin_Sinkronisasi_Utama();
}

/**
 * FUNGSI SEKUNDER: Dicipta secara automatik oleh kod untuk menyambung tugas.
 * Ia akan dipadamkan secara automatik selepas dijalankan.
 */
function Proses_Sambungan() {
  Logger.log("▶️ PANGGILAN TRIGGER SAMBUNGAN DIMULAKAN...");
  Enjin_Sinkronisasi_Utama();
}

// ==============================================================================
// ENJIN TERAS (CORE ENGINE & CRON WORKER)
// ==============================================================================
function Enjin_Sinkronisasi_Utama() {
  const startTime = Date.now();
  const state = getState();
  
  // Jika ini adalah kitaran baharu sepenuhnya, pastikan kita mempunyai cap masa yang segar
  if (state.module === "SEKOLAH" && state.index === 1) {
    state.sync_timestamp = new Date().toISOString();
    saveState(state.module, state.index, state.sync_timestamp);
  }
  
  Logger.log(`Memulakan/Menyambung Proses Sinkronisasi Pukal... (Modul: ${state.module}, Indeks: ${state.index}, Timestamp: ${state.sync_timestamp})`);
  
  // Padam trigger sekunder sahaja supaya tidak berulang-ulang
  deleteTemporaryTriggers();
  
  try {
    if (state.module === "SEKOLAH") {
      const sekolahCompleted = syncDataSekolah(state.index, startTime, state.sync_timestamp);
      if (!sekolahCompleted) return; // Timeout dicapai, state telah disimpan
      
      // Jika selesai, kemaskini state ke modul seterusnya
      state.module = "ADMIN";
      state.index = 1;
      saveState(state.module, state.index, state.sync_timestamp);
    }

    if (state.module === "ADMIN") {
      const adminCompleted = syncSalinanAdmin(state.index, startTime, state.sync_timestamp);
      if (!adminCompleted) return; // Timeout dicapai, state telah disimpan
    }

    // ==========================================================================
    // FASA PEMBERSIHAN (GARBAGE COLLECTION) UNTUK TRUE MIRROR SYNC
    // ==========================================================================
    Logger.log("🧹 Memulakan pembersihan data lapuk (Orphaned Records) di Supabase...");
    cleanupStaleRecords("delima_data_sekolah", state.sync_timestamp);
    cleanupStaleRecords("delima_salinan_admin", state.sync_timestamp);

    Logger.log("✅ Sinkronisasi Keseluruhan & Pembersihan Berjaya Ditamatkan.");
    clearState(); // Bersihkan state setelah semua selesai
    
  } catch (error) {
    // ── SURGICAL EDIT START: kekalkan state apabila quota/bandwidth sementara berlaku ──
    Logger.log("❌ RALAT KRITIKAL: " + error.message);

    if (isTransientSupabaseOrQuotaError(error)) {
      Logger.log("⚠️ Ralat sementara/quota dikesan. State dikekalkan dan trigger sambungan lewat akan dicipta.");
      createResumeTrigger(CONFIG.QUOTA_RESUME_DELAY_MS);
      return;
    }

    clearState(); // Reset state supaya tidak tersangkut pada ralat yang sama esok hari
    // ── SURGICAL EDIT END ──
  }
}

// ==============================================================================
// MODUL 1: SINKRONISASI DATA SEKOLAH
// ==============================================================================
function syncDataSekolah(startIndex, startTime, syncTimestamp) {
  Logger.log(`-> Mengekstrak 'DATA SEKOLAH' bermula indeks ${startIndex}...`);
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName("DATA SEKOLAH");
  if (!sheet) sheet = ss.getSheets()[0];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1 || startIndex >= data.length) {
    Logger.log("Tiada data baharu dijumpai dalam sheet DATA SEKOLAH.");
    return true; // Menandakan siap
  }

  let payload = [];
  // Kiraan absolute row: indeks array bermula 0 (baris 1), jadi startIndex (cth: 1) ialah baris ke-2
  let absoluteStartRow = startIndex + 1; 

  for (let i = startIndex; i < data.length; i++) {
    // Pengecekan Timeout
    if (Date.now() - startTime > CONFIG.MAX_EXECUTION_TIME_MS) {
      Logger.log(`⚠️ Menghampiri had masa! Menyimpan state pada indeks sekolah: ${i}`);
      if (payload.length > 0) {
        Logger.log(`⏳ Memuat naik sebelum timeout DATA SEKOLAH (Baris ${absoluteStartRow} hingga ${i})...`);
        pushToSupabaseInChunks("delima_data_sekolah", payload, "kod_sekolah");
      }
      saveState("SEKOLAH", i, syncTimestamp);
      createResumeTrigger();
      return false; // Menandakan belum siap
    }

    let row = data[i];
    
    if (!row[1] || !row[2]) continue;

    payload.push({
      kod_sekolah: String(row[1]).trim(),
      nama_sekolah: String(row[2]).trim(),
      jenis_sekolah: String(row[3]).trim(),
      kod_ou: String(row[4]).trim(),
      
      jumlah_akaun: parseInt(row[5]) || 0,
      jumlah_aktif: parseInt(row[6]) || 0,
      jumlah_tidak_aktif: parseInt(row[7]) || 0,
      jumlah_belum_login: parseInt(row[8]) || 0,
      
      murid_keseluruhan: parseInt(row[9]) || 0,
      murid_aktif: parseInt(row[10]) || 0,
      murid_tidak_aktif: parseInt(row[11]) || 0,
      murid_belum_login: parseInt(row[12]) || 0,
      
      guru_keseluruhan: parseInt(row[13]) || 0,
      guru_aktif: parseInt(row[14]) || 0,
      guru_tidak_aktif: parseInt(row[15]) || 0,
      guru_belum_login: parseInt(row[16]) || 0,
      
      sekolah_keseluruhan: parseInt(row[17]) || 0,
      sekolah_aktif: parseInt(row[18]) || 0,
      sekolah_tidak_aktif: parseInt(row[19]) || 0,
      sekolah_belum_login: parseInt(row[20]) || 0,
      
      pautan_rekod: row[21] ? String(row[21]).trim() : "",
      last_synced: syncTimestamp // Menggunakan Cap Masa Universal
    });

    // Tolak data secara kelompok jika mencapai CONFIG.CHUNK_SIZE
    if (payload.length >= CONFIG.CHUNK_SIZE) {
      let absoluteEndRow = i + 1; // 'i' adalah indeks array semasa, jadi baris sebenar ialah i + 1
      Logger.log(`🚀 Memuat naik kelompok DATA SEKOLAH (Baris ${absoluteStartRow} hingga ${absoluteEndRow})...`);
      pushToSupabaseInChunks("delima_data_sekolah", payload, "kod_sekolah");
      payload = []; // Kosongkan payload
      absoluteStartRow = i + 2; // Baris untuk kelompok seterusnya
      saveState("SEKOLAH", i + 1, syncTimestamp); // Simpan state keselamatan
    }
  }

  // Tolak baki data
  if (payload.length > 0) {
    let absoluteEndRow = data.length; 
    Logger.log(`🚀 Memuat naik baki DATA SEKOLAH (Baris ${absoluteStartRow} hingga ${absoluteEndRow})...`);
    pushToSupabaseInChunks("delima_data_sekolah", payload, "kod_sekolah");
  }

  Logger.log("✅ Modul Data Sekolah Selesai.");
  return true;
}

// ==============================================================================
// MODUL 2: SINKRONISASI SALINAN ADMIN (ENJIN CARIAN)
// ==============================================================================
function syncSalinanAdmin(startIndex, startTime, syncTimestamp) {
  Logger.log(`-> Mengekstrak 'SALINAN ADMIN' bermula indeks ${startIndex}...`);
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const masterSheet = ss.getSheetByName("SALINAN ADMIN");
  
  if (!masterSheet) {
    throw new Error("Sheet 'SALINAN ADMIN' tidak dijumpai.");
  }

  const data = masterSheet.getDataRange().getValues();
  if (data.length <= 1 || startIndex >= data.length) {
    Logger.log("Tiada data baharu dijumpai dalam sheet SALINAN ADMIN.");
    return true; // Menandakan siap
  }

  let payload = [];
  let absoluteStartRow = startIndex + 1;

  for (let i = startIndex; i < data.length; i++) {
    // Pengecekan Timeout
    if (Date.now() - startTime > CONFIG.MAX_EXECUTION_TIME_MS) {
      Logger.log(`⚠️ Menghampiri had masa! Menyimpan state pada indeks admin: ${i}`);
      if (payload.length > 0) {
        Logger.log(`⏳ Memuat naik sebelum timeout SALINAN ADMIN (Baris ${absoluteStartRow} hingga ${i})...`);
        pushToSupabaseInChunks("delima_salinan_admin", payload, "emel");
      }
      saveState("ADMIN", i, syncTimestamp);
      createResumeTrigger();
      return false; // Menandakan belum siap
    }

    let row = data[i];
    
    if (!row[0] || !row[3]) continue;

    payload.push({
      kod_sekolah: String(row[0]).trim(),
      nama_sekolah: String(row[1]).trim(),
      nama_penuh: String(row[2]).trim(),
      emel: String(row[3]).trim(),
      ou: String(row[4]).trim(),
      kategori: String(row[5]).trim(),
      status: String(row[6]).trim(),
      last_synced: syncTimestamp // Menggunakan Cap Masa Universal
    });

    // Tolak data secara kelompok jika mencapai CONFIG.CHUNK_SIZE
    if (payload.length >= CONFIG.CHUNK_SIZE) {
      let absoluteEndRow = i + 1;
      Logger.log(`🚀 Memuat naik kelompok SALINAN ADMIN (Baris ${absoluteStartRow} hingga ${absoluteEndRow})...`);
      pushToSupabaseInChunks("delima_salinan_admin", payload, "emel");
      payload = []; // Kosongkan payload
      absoluteStartRow = i + 2; 
      saveState("ADMIN", i + 1, syncTimestamp); // Simpan state keselamatan
    }
  }

  // Tolak baki data
  if (payload.length > 0) {
    let absoluteEndRow = data.length;
    Logger.log(`🚀 Memuat naik baki SALINAN ADMIN (Baris ${absoluteStartRow} hingga ${absoluteEndRow})...`);
    pushToSupabaseInChunks("delima_salinan_admin", payload, "emel");
  }

  Logger.log("✅ Modul Salinan Admin Selesai.");
  return true;
}

// ==============================================================================
// MODUL 3: ENJIN API PUSAT (HELPER FUNCTIONS)
// ==============================================================================

// ── SURGICAL EDIT START: baca service role key dari Script Properties ──
/**
 * Membaca SERVICE_ROLE_KEY daripada Google Apps Script Script Properties.
 * Nama property wajib: SUPABASE_SERVICE_ROLE_KEY
 */
function getSupabaseServiceRoleKey() {
  const key = PropertiesService.getScriptProperties().getProperty(CONFIG.SUPABASE_SERVICE_ROLE_KEY_PROPERTY);

  if (!key || !String(key).trim()) {
    throw new Error(`Script Property '${CONFIG.SUPABASE_SERVICE_ROLE_KEY_PROPERTY}' tidak dijumpai atau kosong.`);
  }

  return String(key).trim();
}
// ── SURGICAL EDIT END ──

// ── SURGICAL EDIT START: klasifikasi ralat sementara dan fetch retry/backoff ──
/**
 * Mengesan ralat sementara berkaitan quota, bandwidth, rate limit atau gangguan rangkaian.
 */
function isTransientSupabaseOrQuotaError(error) {
  const message = String(error && error.message ? error.message : error).toLowerCase();

  return message.indexOf("bandwidth quota exceeded") !== -1 ||
    message.indexOf("quota exceeded") !== -1 ||
    message.indexOf("try reducing the rate of data transfer") !== -1 ||
    message.indexOf("too many requests") !== -1 ||
    message.indexOf("rate limit") !== -1 ||
    message.indexOf("timeout") !== -1 ||
    message.indexOf("timed out") !== -1 ||
    message.indexOf("service invoked too many times") !== -1 ||
    message.indexOf("exception: address unavailable") !== -1 ||
    message.indexOf("connection") !== -1;
}

/**
 * Menjalankan UrlFetchApp.fetch dengan retry/backoff untuk ralat sementara.
 */
function fetchWithRetry(url, options, contextLabel) {
  let lastError = null;

  for (let attempt = 1; attempt <= CONFIG.API_MAX_RETRIES; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      if (responseCode >= 500 || responseCode === 408 || responseCode === 425 || responseCode === 429) {
        lastError = new Error(`${contextLabel}. Status: ${responseCode}, Respons: ${responseText}`);

        if (attempt < CONFIG.API_MAX_RETRIES) {
          const sleepMs = CONFIG.API_RETRY_BASE_SLEEP_MS * attempt;
          Logger.log(`⚠️ Percubaan ${attempt}/${CONFIG.API_MAX_RETRIES} gagal sementara untuk ${contextLabel}. Menunggu ${sleepMs}ms sebelum cuba semula.`);
          Utilities.sleep(sleepMs);
          continue;
        }

        throw lastError;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (!isTransientSupabaseOrQuotaError(error) || attempt >= CONFIG.API_MAX_RETRIES) {
        throw error;
      }

      const sleepMs = CONFIG.API_RETRY_BASE_SLEEP_MS * attempt;
      Logger.log(`⚠️ Percubaan ${attempt}/${CONFIG.API_MAX_RETRIES} gagal untuk ${contextLabel}: ${error.message}. Menunggu ${sleepMs}ms sebelum cuba semula.`);
      Utilities.sleep(sleepMs);
    }
  }

  throw lastError;
}
// ── SURGICAL EDIT END ──

/**
 * Menapis data duplikat dalam tatasusunan (payload) bagi satu kitaran kelompok
 * untuk mengelakkan ralat PostgreSQL 21000 (ON CONFLICT).
 */
function deduplicatePayload(payload, conflictColumn) {
  if (!conflictColumn) return payload;
  
  const map = new Map();
  for (const item of payload) {
    // Item yang datang kemudian (baris lebih bawah) akan 'overwrite' item sebelumnya dalam Map
    map.set(item[conflictColumn], item);
  }
  return Array.from(map.values());
}

/**
 * Menghantar data ke Supabase secara berkelompok (Chunking) 
 */
function pushToSupabaseInChunks(tableName, rawPayload, conflictColumn) {
  if (!rawPayload || rawPayload.length === 0) return;

  // Lakukan proses deduplikasi sebelum dipecahkan kepada chunks kecil
  const fullPayload = deduplicatePayload(rawPayload, conflictColumn);
  
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/${tableName}`;
  
  for (let i = 0; i < fullPayload.length; i += CONFIG.CHUNK_SIZE) {
    let chunk = fullPayload.slice(i, i + CONFIG.CHUNK_SIZE);
    
    // ── SURGICAL EDIT START: guna service role key untuk operasi UPSERT ──
    const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

    let headers = {
      "apikey": supabaseServiceRoleKey,
      "Authorization": `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json"
    };
    // ── SURGICAL EDIT END ──

    let urlWithConflict = url;

    if (conflictColumn) {
      headers["Prefer"] = `resolution=merge-duplicates`;
      urlWithConflict = `${url}?on_conflict=${conflictColumn}`;
    } else {
      headers["Prefer"] = `return=minimal`; 
    }

    let options = {
      method: "post",
      headers: headers,
      payload: JSON.stringify(chunk),
      muteHttpExceptions: true
    };

    // ── SURGICAL EDIT START: retry/backoff untuk upload Supabase ──
    let response = fetchWithRetry(urlWithConflict, options, `Gagal memuat naik kelompok jadual ${tableName}`);
    // ── SURGICAL EDIT END ──
    
    if (response.getResponseCode() >= 400) {
      throw new Error(`Gagal memuat naik kelompok. Status: ${response.getResponseCode()}, Respons: ${response.getContentText()}`);
    }
    
    // ── SURGICAL EDIT START: jeda lebih panjang untuk mengurangkan tekanan bandwidth ──
    Utilities.sleep(CONFIG.API_SLEEP_MS);
    // ── SURGICAL EDIT END ──
  }
}

/**
 * Pembersihan Rekod Lapuk: Menghantar arahan DELETE ke Supabase untuk semua baris
 * di mana 'last_synced' adalah lebih lama (<) daripada 'syncTimestamp' kitaran semasa.
 */
function cleanupStaleRecords(tableName, syncTimestamp) {
  // Query Supabase: padam rekod yang 'last_synced' kurang dari (lt) syncTimestamp
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/${tableName}?last_synced=lt.${syncTimestamp}`;
  
  // ── SURGICAL EDIT START: guna service role key untuk operasi DELETE ──
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  let options = {
    method: "delete",
    headers: {
      "apikey": supabaseServiceRoleKey,
      "Authorization": `Bearer ${supabaseServiceRoleKey}`
    },
    muteHttpExceptions: true
  };
  // ── SURGICAL EDIT END ──

  // ── SURGICAL EDIT START: retry/backoff untuk cleanup Supabase ──
  let response = fetchWithRetry(url, options, `Gagal memadam rekod lapuk untuk jadual ${tableName}`);
  // ── SURGICAL EDIT END ──
  
  if (response.getResponseCode() >= 400) {
    Logger.log(`⚠️ Gagal memadam rekod lapuk untuk jadual ${tableName}. Status: ${response.getResponseCode()}, Respons: ${response.getContentText()}`);
  } else {
    Logger.log(`🗑️ Jadual ${tableName}: Rekod lapuk berjaya dibersihkan.`);
  }
}

// ==============================================================================
// MODUL 4: PENGURUSAN TRIGGER (ANTI-TIMEOUT) [DIKEMASKINI]
// ==============================================================================

/**
 * Mencipta trigger secara dinamik untuk menyambung skrip dalam masa 1 minit.
 * SASARAN: Proses_Sambungan (Trigger Sekunder)
 */
function createResumeTrigger(delayMs) {
  // ── SURGICAL EDIT START: sokong delay sambungan untuk ralat quota/bandwidth ──
  const resumeDelayMs = delayMs || (60 * 1000);
  // ── SURGICAL EDIT END ──
  ScriptApp.newTrigger(CONFIG.RESUME_FUNC_NAME)
    .timeBased()
    // ── SURGICAL EDIT START: guna delay dinamik ──
    .after(resumeDelayMs) // Berjalan selepas tempoh delay yang ditetapkan
    // ── SURGICAL EDIT END ──
    .create();
  Logger.log("⏳ Trigger auto-sambung telah dicipta khusus untuk fungsi: " + CONFIG.RESUME_FUNC_NAME);
}

/**
 * Membersihkan trigger sementara selepas skrip berjaya disambung.
 * SASARAN: Hanya memadam trigger yang bernama "Proses_Sambungan"
 */
function deleteTemporaryTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === CONFIG.RESUME_FUNC_NAME) {
      ScriptApp.deleteTrigger(trigger);
      Logger.log("🧹 Trigger sementara [" + CONFIG.RESUME_FUNC_NAME + "] telah dibersihkan.");
    }
  }
}