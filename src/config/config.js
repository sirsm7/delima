/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: config.js (Konfigurasi Persekitaran & Kunci API)
 * ==============================================================================
 * ARAHAN: 
 * Sila gantikan pemegang tempat (placeholder) di bawah dengan maklumat 
 * dari papan pemuka Supabase anda (Project Settings -> API).
 */

const APP_CONFIG = {
    // 1. URL Projek Supabase (Cth: https://xyz.supabase.co)
    SUPABASE_URL: "https://app.tech4ag.my",

    // 2. Kunci Awam (anon / public key) Supabase
    // PERHATIAN: Gunakan kunci 'anon', BUKAN kunci 'service_role' untuk fail ini
    // kerana fail ini akan terdedah pada sebelah klien (Frontend).
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzczNjQ1LCJleHAiOjIwNzg3MzM2NDV9.vZOedqJzUn01PjwfaQp7VvRzSm4aRMr21QblPDK8AoY",

    // 3. Nama Papan Pemuka (Untuk rujukan paparan)
    // TELAH DIKEMASKINI KE PERINGKAT NEGERI
    DASHBOARD_TITLE: "Dashboard ID DELIMa Jabatan Pendidikan Negeri"
};

// Mengelakkan manipulasi konfigurasi oleh skrip pihak ketiga (Pilihan Keselamatan)
Object.freeze(APP_CONFIG);