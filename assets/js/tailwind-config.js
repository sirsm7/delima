/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: tailwind-config.js (Konfigurasi Berpusat Tailwind CSS)
 * ==============================================================================
 */

tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    blue: '#2563eb',
                    indigo: '#4f46e5',
                    slate: '#1e293b'
                }
            },
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