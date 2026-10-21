// An extension-owned request must always settle, even when the provider never does.
export const REQUEST_TIMEOUT_MS = 180000;
export function createModelRequests({ changed = () => {}, released = () => {} } = {}) {
    let current = null;
    const api = {
        current: () => current,
        cancel(reason = new Error('KI-Anfrage abgebrochen.')) { current?.abort.abort(reason); },
        async run(fn, { timeoutMs = REQUEST_TIMEOUT_MS, key = '' } = {}) {
            if (current) throw new Error('Eine KI-Anfrage läuft bereits.');
            const abort = new AbortController(), request = { abort, signal: abort.signal, key, started: false };
            current = request;
            let timer, rejectAbort;
            const aborted = new Promise((_, reject) => { rejectAbort = () => reject(abort.signal.reason); abort.signal.addEventListener('abort', rejectAbort, { once: true }); });
            timer = setTimeout(() => abort.abort(new Error('KI-Anfrage nach 3 Minuten ohne Abschluss abgebrochen. Erneut anfordern oder manuell handeln.')), timeoutMs);
            try { changed(); return await Promise.race([Promise.resolve().then(() => fn(request)), aborted]); }
            finally {
                clearTimeout(timer); abort.signal.removeEventListener('abort', rejectAbort);
                if (current === request) current = null;
                try { released(request); } finally { changed(); }
            }
        },
    };
    return api;
}
