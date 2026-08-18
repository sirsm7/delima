/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: tailwind-config.js (Konfigurasi Berpusat Tailwind CSS)
 * ==============================================================================
 * 
 * FAIL INI MESTI DIMUATKAN SEBELUM SKRIP CDN TAILWIND DALAM index.html
 */

tailwind.config = {
    theme: {
        extend: {
            // Pemusatan tetapan fon muka (Typography)
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            
            // Ruang penambahan palet warna tersuai pada masa hadapan
            colors: {
                brand: {
                    blue: '#2563eb',    // Setara dengan blue-600 (Warna primer)
                    indigo: '#4f46e5',  // Setara dengan indigo-600 (Warna sekunder)
                    slate: '#1e293b'    // Setara dengan slate-800 (Teks utama)
                }
            },
            
            // Boleh tambah animasi tersuai (custom animations) jika perlu
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
            },
            
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            }
        }
    }
};