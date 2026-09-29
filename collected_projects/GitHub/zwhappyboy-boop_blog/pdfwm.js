/**
 * PDF 水印识别与移除模块（纯前端，pdf-lib + pdf.js）
 * ------------------------------------------------------------
 * 原理：
 *   1. 用 pdf.js 渲染每页 → Canvas → 收集"水印候选区域"：
 *      - 对每页做半透明灰阶统计，找出大面积、跨页重复、低对比度的区域（典型水印特征）
 *   2. 用 pdf-lib 解析 PDF 结构：
 *      - 注释（Annotation）型水印 → 直接删除注释对象
 *      - 内容流（Content Stream）型水印 → 定位水印文本/图形操作符并移除
 *   3. 兜底方案（扫描融合水印 / 无法结构移除时）：
 *      - 用白色矩形按检测到的区域覆盖（pdflatex 类水印、平铺水印最有效）
 *
 * 检测策略（三层）：
 *   A. 注释层：遍历 PDFDocument 的 Annots，删除 Watermark/Stamp/FreeText 类型
 *   B. 内容流：解析 content stream 中的文本操作符，找出跨页高频重复的短文本
 *   C. 覆盖兜底：pdf.js 渲染页面后用图像分析定位半透明水印区域，白色矩形覆盖
 */
(function () {
  "use strict";

  const PDFWM = {};

  /* ============ 工具函数 ============ */

  async function loadPdfLib() {
    if (window.PDFLib) return window.PDFLib;
    throw new Error("pdf-lib failed to load");
  }

  async function loadPdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    throw new Error("pdf.js failed to load");
  }

  /* ============ A. 注释型水印移除 ============ */

  async function removeAnnotationWatermarks(pdfDoc, stats) {
    let removed = 0;
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      try {
        const annots = page.node.Annots();
        if (!annots) continue;
        const keep = [];
        for (let i = 0; i < annots.size(); i++) {
          const ref = annots.get(i);
          let obj = ref;
          try { obj = ref.dict ? ref.dict : (ref.acquire ? ref.acquire() : ref); } catch (e) { obj = ref; }
          const subtype = obj && obj.get ? obj.get("Subtype") : null;
          const st = subtype && subtype.name ? subtype.name : "";
          // Stamp / Watermark / FreeText 注释通常是水印
          if (st === "Stamp" || st === "Watermark") { removed++; continue; }
          keep.push(ref);
        }
        if (removed > 0) {
          page.node.set(PDFName.of("Annots"), pdfDoc.context.obj(keep));
        }
      } catch (e) { /* 单页失败不影响整体 */ }
    }
    stats.annotationRemoved = removed;
    return removed;
  }

  /* ============ B. 内容流重复文本检测 ============ */

  /**
   * 从每页 content stream 提取 Tj / TJ 文本
   * 返回 Map<text, Set<pageIndex>>：用于统计跨页重复的文本
   */
  async function extractContentTexts(pdfDoc) {
    const pages = pdfDoc.getPages();
    const map = new Map(); // text -> Set of page index
    for (let p = 0; p < pages.length; p++) {
      try {
        const contents = pages[p].node.Contents();
        if (!contents) continue;
        let stream;
        try { stream = contents.getStream ? contents.getStream() : null; } catch (e) { stream = null; }
        if (!stream) {
          // 可能是内容数组
          try {
            const arr = contents.array ? contents.array() : null;
            if (arr) {
              for (let k = 0; k < arr.size; k++) {
                const s = arr.get(k);
                const st = s.getStream ? s.getStream() : null;
                if (st) collectTextFromStream(st, p, map);
              }
            }
          } catch (e) { }
          continue;
        }
        collectTextFromStream(stream, p, map);
      } catch (e) { /* 单页失败跳过 */ }
    }
    return map;
  }

  function collectTextFromStream(stream, pageIndex, map) {
    try {
      let text = "";
      try { text = stream.decodeText ? stream.decodeText() : ""; } catch (e) { text = ""; }
      if (!text) return;
      // 提取 Tj：(... ) Tj 与 TJ 数组中的字符串
      const re = /\((?:\\.|[^\\()])*\)/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        const raw = m[0].slice(1, -1);
        const decoded = raw
          .replace(/\\([nrtbf()\\])/g, (a, c) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" }[c] || c));
        if (!decoded.trim()) continue;
        if (!map.has(decoded)) map.set(decoded, new Set());
        map.get(decoded).add(pageIndex);
      }
    } catch (e) { /* 解码失败跳过 */ }
  }

  /**
   * 找出疑似水印文本：
   *   - 出现在 >= 60% 页面
   *   - 长度 < 60 字符
   *   - 不是数字/页码（纯数字、罗马数字）
   */
  function findWatermarkCandidates(textMap, pageCount) {
    const cands = [];
    const threshold = Math.max(2, Math.ceil(pageCount * 0.6));
    for (const [text, pagesSet] of textMap) {
      if (pagesSet.size < threshold) continue;
      if (text.length > 60) continue;
      if (/^[\d\s.\-—–]+$/i.test(text)) continue; // 页码
      if (/^[ivxlcdm\s]+$/i.test(text) && text.length < 8) continue; // 罗马页码
      cands.push({ text, pages: pagesSet.size, sample: text });
    }
    return cands;
  }

  /* ============ C. 视觉检测（pdf.js 渲染分析半透明水印） ============ */

  /**
   * 渲染页面为 canvas，分析灰阶变化：
   *   - 水印通常大面积均匀、低饱和度、覆盖文字
   *   - 扫描对称位置（对角）跨页相同的"淡色块"
   * 返回区域列表 [{x,y,w,h,pageW,pageH}]
   */
  async function detectVisualWatermark(file, maxPages, onProgress) {
    const pdfjsLib = await loadPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const total = Math.min(pdf.numPages, maxPages);
    const regionVotes = new Map(); // key -> votes

    for (let p = 1; p <= total; p++) {
      if (onProgress) onProgress(p, total);
      try {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 0.4 }); // 低分辨率足够检测
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(vp.width);
        canvas.height = Math.ceil(vp.height);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data: px, width: W, height: H } = img;

        // 分块统计亮度与色彩方差：水印块 = 亮度中等+方差极低+块与块间色彩接近
        const BX = 24, BY = 24; // 分块网格
        const bw = Math.ceil(W / BX), bh = Math.ceil(H / BY);
        const blocks = [];
        for (let by = 0; by < BY; by++) {
          for (let bx = 0; bx < BX; bx++) {
            const x0 = Math.floor(bx * W / BX), x1 = Math.floor((bx + 1) * W / BX);
            const y0 = Math.floor(by * H / BY), y1 = Math.floor((by + 1) * H / BY);
            let sum = 0, sumSq = 0, n = 0, r = 0, g = 0, b = 0;
            for (let y = y0; y < y1; y++) {
              for (let x = x0; x < x1; x++) {
                const i = (y * W + x) * 4;
                const v = (px[i] + px[i + 1] + px[i + 2]) / 3;
                sum += v; sumSq += v * v; n++;
                r += px[i]; g += px[i + 1]; b += px[i + 2];
              }
            }
            if (!n) continue;
            const mean = sum / n;
            const variance = sumSq / n - mean * mean;
            blocks.push({ bx, by, x: x0, y: y0, w: x1 - x0, h: y1 - y0, mean, variance, r: r / n, g: g / n, b: b / n });
          }
        }

        // 跨页投票：均匀淡色块（非纯白非纯黑、方差低）在相同网格位置反复出现 → 水印
        for (const blk of blocks) {
          const isWhite = blk.mean > 248;
          const isFlat = blk.variance < 18; // 极低方差
          const isColored = Math.abs(blk.r - blk.g) > 8 || Math.abs(blk.g - blk.b) > 8 || Math.abs(blk.r - blk.b) > 8;
          if (isWhite || !isFlat) continue;
          // 中等亮度（半透明水印叠在白底上：170~245）或彩色淡块
          const candidate = (blk.mean >= 170 && blk.mean < 248) || (isColored && blk.variance < 30);
          if (!candidate) continue;
          const key = bx_bkey(blk, bw, bh);
          regionVotes.set(key, (regionVotes.get(key) || 0) + 1);
        }
      } catch (e) { /* 渲染失败跳过该页 */ }
    }

    // 得票 >= 70% 页面 且是"大片区域"的块 → 合并为水印区域
    const regions = [];
    const threshold = Math.max(1, Math.floor(total * 0.7));
    for (const [key, votes] of regionVotes) {
      if (votes < threshold) continue;
      const [bx, by] = key.split(":").map(Number);
      const x = (bx / BX), y = (by / BY); // 相对坐标 0~1
      regions.push({ rx: x, ry: y, rw: 1 / BX, rh: 1 / BY });
    }
    // 膨胀合并相邻块
    return mergeRegions(regions);
  }

  function bx_bkey(blk, bw, bh) { return blk.bx + ":" + blk.by; }

  function mergeRegions(regions) {
    if (!regions.length) return [];
    // 简单合并：网格相邻的块合并成外接矩形（相对坐标）
    const used = new Array(regions.length).fill(false);
    const merged = [];
    for (let i = 0; i < regions.length; i++) {
      if (used[i]) continue;
      let { rx, ry, rw, rh } = regions[i];
      used[i] = true;
      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < regions.length; j++) {
          if (used[j]) continue;
          const r = regions[j];
          // 相邻判定：任一边相接或重叠
          const overlapX = rx < r.rx + r.rw + 0.01 && r.rx < rx + rw + 0.01;
          const overlapY = ry < r.ry + r.rh + 0.01 && r.ry < ry + rh + 0.01;
          if (overlapX && overlapY) {
            const nx = Math.min(rx, r.rx), ny = Math.min(ry, r.ry);
            const ne = Math.max(rx + rw, r.rx + r.rw), nb = Math.max(ry + rh, r.ry + r.rh);
            rx = nx; ry = ny; rw = ne - nx; rh = nb - ny;
            used[j] = true; changed = true;
          }
        }
      }
      merged.push({ rx, ry, rw, rh });
    }
    return merged;
  }

  /* ============ 白色矩形覆盖（兜底，扫描融合水印也有效） ============ */

  async function coverRegions(pdfDoc, regions, stats) {
    if (!regions.length) { stats.covered = 0; return 0; }
    const { rgb, degrees } = await loadPdfLib();
    let covered = 0;
    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();
      for (const r of regions) {
        const x = r.rx * width, y = r.ry * height;
        const w = r.rw * width, h = r.rh * height;
        if (w < 2 || h < 2) continue;
        try {
          page.drawRectangle({ x, y: height - y - h, width: w, height: h, color: rgb(1, 1, 1) });
          covered++;
        } catch (e) { /* 单块失败跳过 */ }
      }
    }
    stats.covered = covered;
    return covered;
  }

  /* ============ 主流程 ============ */

  /**
   * PDFWM.remove(file, options) → { blob, stats }
   * options:
   *   mode: "smart"（默认，注释+内容流+视觉检测三管齐下）| "annotation" | "cover"
   *   coverWhole: false（默认）| true — 平铺水印覆盖整页
   *   maxDetectPages: 8 — 视觉检测抽样的页数上限
   *   onProgress: (stage, cur, total) => {}
   */
  PDFWM.remove = async function (file, options = {}) {
    const PDFLib = await loadPdfLib();
    const mode = options.mode || "smart";
    const stats = { annotationRemoved: 0, textCandidates: [], covered: 0, mode };
    const report = (s, c, t) => options.onProgress && options.onProgress(s, c, t);

    // 加载 PDF
    report("load", 0, 1);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });

    // A. 注释型水印
    report("annotation", 0, 1);
    await removeAnnotationWatermarks(pdfDoc, stats);

    // B. 内容流水印文本检测（提示用户，供日志）
    if (mode === "smart" || mode === "annotation") {
      report("content", 0, 1);
      try {
        const textMap = await extractContentTexts(pdfDoc);
        stats.textCandidates = findWatermarkCandidates(textMap, pdfDoc.getPageCount());
      } catch (e) { /* 失败不影响主流程 */ }
    }

    // C. 视觉检测 + 白矩形覆盖
    let regions = [];
    if (mode === "cover") {
      // 全页覆盖模式（平铺水印）
      regions = [{ rx: 0, ry: 0, rw: 1, rh: 1 }];
    } else if (mode === "smart") {
      report("detect", 0, options.maxDetectPages || 8);
      try {
        regions = await detectVisualWatermark(file, options.maxDetectPages || 8,
          (cur, total) => report("detect", cur, total));
      } catch (e) { regions = []; }
    }
    if (regions.length) {
      report("cover", 0, regions.length);
      await coverRegions(pdfDoc, regions, stats);
    }

    // 保存
    report("save", 0, 1);
    const out = await pdfDoc.save({ useObjectStreams: false });
    const blob = new Blob([out], { type: "application/pdf" });
    return { blob, stats };
  };

  // 仅检测不处理（预览用）
  PDFWM.detect = async function (file, options = {}) {
    return await detectVisualWatermark(file, options.maxDetectPages || 8, options.onProgress);
  };

  window.PDFWM = PDFWM;
})();
