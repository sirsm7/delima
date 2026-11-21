export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, Range, x-client-info, Accept-Profile, Content-Profile',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseAnonKey = env.SUPABASE_ANON_KEY;

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
        const targetPath = incomingUrl.pathname.replace(/^\/api/, '');
        const cleanBaseUrl = supabaseUrl.replace(/\/+$/, '');
        const targetUrl = new URL(`${cleanBaseUrl}${targetPath}${incomingUrl.search}`);

        if (targetUrl.searchParams.has('apikey') || targetPath.includes('/realtime/v1/websocket')) {
            targetUrl.searchParams.set('apikey', supabaseAnonKey);
        }

        const isWebSocket = request.headers.get('Upgrade')?.toLowerCase() === 'websocket';
        const forwardHeaders = new Headers(request.headers);

        forwardHeaders.set('apikey', supabaseAnonKey);
        forwardHeaders.set('Authorization', `Bearer ${supabaseAnonKey}`);
        forwardHeaders.delete('host');

        const init = {
            method: request.method,
            headers: forwardHeaders,
            redirect: 'follow'
        };

        if (!isWebSocket && request.method !== 'GET' && request.method !== 'HEAD') {
            init.body = request.body;
        }

        const upstreamResponse = await fetch(targetUrl.toString(), init);

        if (isWebSocket || upstreamResponse.status === 101) {
            return upstreamResponse;
        }

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