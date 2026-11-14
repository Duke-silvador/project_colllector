/* Tách nền ngay trên điện thoại (không gửi ảnh đi). Tải mô hình ~40MB lần đầu từ CDN của IMG.LY. */
window.removeBg = async function (blob) {
  const m = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm");
  const out = await m.removeBackground(blob, { output: { format: "image/png" } });
  return out;
};
