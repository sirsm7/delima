/**
 * ==============================================================================
 * SENI BINA SISTEM: DASHBOARD HIBRID
 * FAIL: functions/api/[[route]].js (Proksi Terbalik Pelayan Pinggir Cloudflare Pages)
 * ==============================================================================
 */

export async function onRequest(context) {
    const { request, env } = context;

    // Tangani permintaan pra-penerbangan CORS (OPTIONS)
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, Range, x-client-info',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseAnonKey = env.SUPABASE_ANON_KEY;

    // Sahkan pembolehubah persekitaran pelayan pinggir
    if (!supabaseUrl || !supabaseAnonKey) {
        return new Response(JSON.stringify({
            success: false,
            error: "Konfigurasi Pelayan Tidak Lengkap: Sila tetapkan SUPABASE_URL dan SUPABASE_ANON_KEY dalam pembolehubah persekitaran Cloudflare Pages."
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    }

    try {
        const incomingUrl = new URL(request.url);

        // Ekstrak laluan di belakang /api
        const targetPath = incomingUrl.pathname.replace(/^\/api/, '');
        const cleanBaseUrl = supabaseUrl.replace(/\/+$/, '');
        const targetUrl = new URL(`${cleanBaseUrl}${targetPath}${incomingUrl.search}`);

        // Gantikan apikey proksi dengan apikey anon Supabase sebenar dalam query params
        if (targetUrl.searchParams.has('apikey') || targetPath.includes('/realtime/v1/websocket')) {
            targetUrl.searchParams.set('apikey', supabaseAnonKey);
        }

        // Semak sama ada ini adalah sambungan WebSocket (Jabat tangan Realtime)
        const isWebSocket = request.headers.get('Upgrade')?.toLowerCase() === 'websocket';

        // Salin dan ubah suai pengepala permintaan ke Supabase
        const forwardHeaders = new Headers(request.headers);

        // Suntik kunci kelayakan secara selamat di peringkat pelayan pinggir (Edge)
        forwardHeaders.set('apikey', supabaseAnonKey);
        forwardHeaders.set('Authorization', `Bearer ${supabaseAnonKey}`);

        // Padam pengepala host untuk memastikan resolusi DNS Supabase sah
        forwardHeaders.delete('host');

        const init = {
            method: request.method,
            headers: forwardHeaders,
            redirect: 'follow'
        };

        // Lampirkan badan permintaan jika bukan kaedah GET/HEAD dan bukan WebSocket
        if (!isWebSocket && request.method !== 'GET' && request.method !== 'HEAD') {
            init.body = request.body;
        }

        // Hantar permintaan proksi ke pelayan Supabase sebenar
        const upstreamResponse = await fetch(targetUrl.toString(), init);

        // Sekiranya sambungan adalah WebSocket (Status 101), pulangkan respons asal secara terus (Pass-through)
        if (isWebSocket || upstreamResponse.status === 101) {
            return upstreamResponse;
        }

        // Bina semula respons REST bagi mengekalkan data serta integriti pengepala CORS
        const responseHeaders = new Headers(upstreamResponse.headers);
        responseHeaders.set('Access-Control-Allow-Origin', incomingUrl.origin || '*');
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');

        return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers: responseHeaders
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: "Ralat Komunikasi Proksi Pelayan Pinggir",
            message: error.message
        }), {
            status: 502,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    }
}
