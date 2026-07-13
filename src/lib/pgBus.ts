// This file must never be re-evaluated — it holds the single shared subscriber list
// Import it everywhere you need to pub/sub PG notifications

const g = global as any;

if (!g.__PG_BUS_SUBS__) {
    g.__PG_BUS_SUBS__ = [];
}

export function addSubscriber(fn: (data: any) => void): () => void {
    g.__PG_BUS_SUBS__.push(fn);
    console.log(`[PG Bus] subscriber added — total: ${g.__PG_BUS_SUBS__.length}`);
    return () => {
        const i = g.__PG_BUS_SUBS__.indexOf(fn);
        if (i > -1) {
            g.__PG_BUS_SUBS__.splice(i, 1);
            console.log(`[PG Bus] subscriber removed — total: ${g.__PG_BUS_SUBS__.length}`);
        }
    };
}

export function dispatch(data: any) {
    const subs: ((d: any) => void)[] = g.__PG_BUS_SUBS__;
    console.log(`[PG Bus] dispatching to ${subs.length} subscriber(s)`);
    for (const fn of subs) fn(data);
}