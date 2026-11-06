// Web Worker for the bench's Cache button: renders one voice's 16 normal +
// 16 accented hits through the circuit model at the given knob settings
// (dsp/cache-build.js), off the main thread, reporting progress.
//   in:  { id, values }
//   out: { t: 'progress', id, done, total } ... then
//        { t: 'done', id, info, pcm: ArrayBuffer } or { t: 'error', id, message }
import { buildCache } from './dsp/cache-build.js';

self.onmessage = ({ data: { id, values } }) => {
  try {
    let last = 0;
    const { info, pcm } = buildCache(id, values, (done, total) => {
      const now = Date.now();
      if (now - last > 150 || done === total) { last = now; self.postMessage({ t: 'progress', id, done, total }); }
    });
    self.postMessage({ t: 'done', id, info, pcm: pcm.buffer }, [pcm.buffer]);
  } catch (err) {
    self.postMessage({ t: 'error', id, message: String(err?.message ?? err) });
  }
};
