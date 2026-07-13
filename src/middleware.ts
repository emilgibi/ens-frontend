import { verifyJWT } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const publicRoutesRaw = ['/login'];

const isPublic = (pathname: string): boolean => {
    return publicRoutesRaw.some(
        (pub) => pathname === pub || pathname.startsWith(`${pub}/`)
    );
};

export default async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;

    const res = NextResponse.next();
    res.headers.set('x-mw', 'hit');

    console.log('--- [MW] START ---');
    console.log('[MW] path (no basePath):', path);

    const accessToken = req.cookies.get('access_token')?.value;
    console.log('[MW] accessToken set?  :', Boolean(accessToken));

    let session: any = null;
    try {
        if (accessToken) {
            session = await verifyJWT(accessToken);
        }
        console.log('[MW] session truthy?   :', Boolean(session));
    } catch (e: any) {
        console.error('[MW] verifyJWT threw   :', e?.message || e);
        session = null;
    }

    const publicRoute = isPublic(path);
    const protectedRoute = !publicRoute;

    console.log('[MW] publicRoute?      :', publicRoute);
    console.log('[MW] protectedRoute?   :', protectedRoute);

    if (protectedRoute && !session) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('next', path);
        console.log('[MW] → redirect to     :', url.pathname);
        console.log('--- [MW] END (redirect to login) ---');
        return NextResponse.redirect(url);
    }

    if (publicRoute && session) {
        const url = req.nextUrl.clone();
        url.pathname = '/entity-universe';
        console.log('[MW] → redirect to     :', url.pathname);
        console.log('--- [MW] END (redirect to entity-universe) ---');
        return NextResponse.redirect(url);
    }

    console.log('[MW] → allow request (NextResponse.next)');
    console.log('--- [MW] END (next) ---');
    return res;
}

// ✅ KEY FIX: exclude /api/events from middleware entirely
// Middleware breaks SSE streaming — must never intercept this route
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api/events).*)'],
};