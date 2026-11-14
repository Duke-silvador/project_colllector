/* Tủ Đồ AI — lưu ảnh trên chính điện thoại (IndexedDB). Không gửi đi đâu trừ khi bấm "Thử lên người". */
window.Store = (function () {
  const DB = "tudoai_blobs", OS = "blobs";
  const urls = {};
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(OS);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(OS, mode);
      const s = t.objectStore(OS);
      const out = fn(s);
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  }
  async function put(key, blob) {
    await tx("readwrite", (s) => s.put(blob, key));
    if (urls[key]) URL.revokeObjectURL(urls[key]);
    urls[key] = URL.createObjectURL(blob);
    return "idb:" + key;
  }
  async function get(key) {
    const d = await db();
    return new Promise((res) => {
      const r = d.transaction(OS).objectStore(OS).get(key);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => res(null);
    });
  }
  async function del(key) {
    await tx("readwrite", (s) => s.delete(key));
    if (urls[key]) { URL.revokeObjectURL(urls[key]); delete urls[key]; }
  }
  async function clear() {
    await tx("readwrite", (s) => s.clear());
    Object.keys(urls).forEach((k) => { URL.revokeObjectURL(urls[k]); delete urls[k]; });
  }
  async function preload() {
    const d = await db();
    return new Promise((res) => {
      const t = d.transaction(OS).objectStore(OS).openCursor();
      t.onsuccess = () => {
        const c = t.result;
        if (!c) return res();
        if (!urls[c.key]) urls[c.key] = URL.createObjectURL(c.value);
        c.continue();
      };
      t.onerror = () => res();
    });
  }
  function src(ref) {
    if (!ref) return "";
    if (ref.startsWith("idb:")) return urls[ref.slice(4)] || "";
    return ref;
  }
  function has(key) { return !!urls[key]; }
  return { put, get, del, clear, preload, src, has };
})();

/* Thu nhỏ ảnh chụp trước khi lưu/gửi (đỡ nặng, giữ riêng tư hơn). */
window.shrinkImage = function (file, maxSide, quality) {
  maxSide = maxSide || 1024; quality = quality || 0.88;
  return new Promise((res, rej) => {
    const img = new Image();
    const u = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob((b) => b ? res(b) : rej(new Error("toBlob")), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("Không đọc được ảnh")); };
    img.src = u;
  });
};
