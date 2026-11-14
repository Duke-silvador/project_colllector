/* Tủ Đồ AI — thử đồ AI. Chạy ngay trên trình duyệt điện thoại, gọi thẳng máy chủ thử đồ.
   Backend chọn trong tab Tôi: FASHN VTON 1.5 (HF Space, mặc định) · Leffa (HF Space) · FASHN API (cần key, chưa kiểm chứng). */
const GRADIO = "https://cdn.jsdelivr.net/npm/@gradio/client@2.8.0/+esm";
const clients = {};

async function toBlob(x) {
  if (x instanceof Blob) return x;
  const r = await fetch(x);
  if (!r.ok) throw new Error("Không tải được ảnh " + x);
  return await r.blob();
}
function blobToDataURL(b) {
  return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
}
async function gradio(space, token) {
  const key = space + "|" + (token ? "t" : "");
  if (!clients[key]) {
    const { Client } = await import(GRADIO);
    clients[key] = Client.connect(space, token ? { hf_token: token } : {});
  }
  return clients[key];
}
function readErr(e) {
  const m = (e && (e.message || e.title || (e.original_msg) || JSON.stringify(e))) || String(e);
  if (/quota|exceeded|ZeroGPU|GPU/i.test(m)) return "Hết lượt GPU miễn phí của Hugging Face hôm nay. Thêm HF token ở tab Tôi hoặc thử lại sau. (" + m.slice(0, 120) + ")";
  return m.slice(0, 200);
}

async function viaFashnSpace(person, garment, part, cfg) {
  const c = await gradio("fashn-ai/fashn-vton-1.5", cfg.hfToken);
  const cat = part === "bottom" ? "bottoms" : "tops";
  const r = await c.predict("/try_on", {
    person_image: person, garment_image: garment, category: cat,
    garment_photo_type: cfg.garmentType || "model", num_timesteps: 30, guidance_scale: 1.5, seed: 42, segmentation_free: true
  });
  return r.data[0].url;
}
async function viaLeffa(person, garment, part, cfg) {
  const c = await gradio("franciszzj/Leffa", cfg.hfToken);
  const r = await c.predict("/leffa_predict_vt", {
    src_image_path: person, ref_image_path: garment, ref_acceleration: "False", step: 30, scale: 2.5, seed: 42,
    vt_model_type: part === "bottom" ? "dress_code" : "viton_hd", vt_garment_type: part === "bottom" ? "lower_body" : "upper_body", vt_repaint: "False"
  });
  return r.data[0].url;
}
async function viaFashnApi(person, garment, part, cfg) {
  if (!cfg.fashnKey) throw new Error("Chưa nhập FASHN API key ở tab Tôi.");
  const h = { "Content-Type": "application/json", Authorization: "Bearer " + cfg.fashnKey };
  const body = { model_name: "tryon-v1.6", inputs: { model_image: await blobToDataURL(person), garment_image: await blobToDataURL(garment), category: part === "bottom" ? "bottoms" : "tops" } };
  const r = await fetch("https://api.fashn.ai/v1/run", { method: "POST", headers: h, body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.id) throw new Error("FASHN API: " + JSON.stringify(j).slice(0, 160));
  for (let i = 0; i < 60; i++) {
    await new Promise((s) => setTimeout(s, 2000));
    const s = await (await fetch("https://api.fashn.ai/v1/status/" + j.id, { headers: h })).json();
    if (s.status === "completed") return s.output[0];
    if (s.status === "failed") throw new Error("FASHN API lỗi: " + JSON.stringify(s.error).slice(0, 160));
  }
  throw new Error("FASHN API quá thời gian");
}
const BACKENDS = { "hf-fashn": viaFashnSpace, "hf-leffa": viaLeffa, "fashn-api": viaFashnApi };

/* Mặc lần lượt từng món lên ảnh người: áo → quần → áo khoác. onStep(i, n, label) để hiện tiến độ. */
async function runOutfit(personRef, garments, cfg, onStep) {
  const fn = BACKENDS[cfg.backend] || viaFashnSpace;
  let cur = await toBlob(personRef);
  const t0 = performance.now();
  for (let i = 0; i < garments.length; i++) {
    const g = garments[i];
    onStep && onStep(i, garments.length, g.label);
    try {
      const out = await fn(cur, await toBlob(g.src), g.part, cfg);
      cur = await toBlob(out);
    } catch (e) { throw new Error(readErr(e)); }
  }
  return { blob: cur, seconds: Math.round((performance.now() - t0) / 1000) };
}

window.TryOn = { runOutfit, backends: Object.keys(BACKENDS) };
window.dispatchEvent(new Event("tryon-ready"));
