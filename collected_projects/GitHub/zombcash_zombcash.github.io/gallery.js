(() => {
  const grid = document.getElementById("gallery-grid");
  const count = document.getElementById("gallery-count");
  const updated = document.getElementById("gallery-updated");
  if (!grid) return;

  const galleryLocale = {
    en:{images:"IMAGES",updated:"UPDATED",offline:"ARCHIVE OFFLINE",none:"NO IMAGES YET",noneMsg:"The Telegram archive has not synced any images yet.",error:"COULD NOT LOAD IMAGES",errorMsg:"The gallery data request failed or timed out. Refresh the page, or open the Telegram channel directly.",source:"SOURCE ↗",open:"OPEN @ZOMBCASH ↗"},
    ru:{images:"ИЗОБРАЖЕНИЙ",updated:"ОБНОВЛЕНО",offline:"АРХИВ НЕДОСТУПЕН",none:"ПОКА НЕТ ИЗОБРАЖЕНИЙ",noneMsg:"Архив Telegram ещё не синхронизировал изображения.",error:"НЕ УДАЛОСЬ ЗАГРУЗИТЬ ИЗОБРАЖЕНИЯ",errorMsg:"Не удалось загрузить данные галереи или истекло время ожидания. Обнови страницу или открой Telegram-канал.",source:"ИСТОЧНИК ↗",open:"ОТКРЫТЬ @ZOMBCASH ↗"},
    de:{images:"BILDER",updated:"AKTUALISIERT",offline:"ARCHIV OFFLINE",none:"NOCH KEINE BILDER",noneMsg:"Das Telegram-Archiv hat noch keine Bilder synchronisiert.",error:"BILDER KONNTEN NICHT GELADEN WERDEN",errorMsg:"Die Galerie-Datenanfrage ist fehlgeschlagen oder abgelaufen. Aktualisiere die Seite oder öffne direkt den Telegram-Kanal.",source:"QUELLE ↗",open:"@ZOMBCASH ÖFFNEN ↗"},
    fr:{images:"IMAGES",updated:"MIS À JOUR",offline:"ARCHIVES HORS LIGNE",none:"PAS ENCORE D’IMAGES",noneMsg:"L’archive Telegram n’a pas encore synchronisé d’images.",error:"IMPOSSIBLE DE CHARGER LES IMAGES",errorMsg:"La demande de données de la galerie a échoué ou expiré. Actualisez la page ou ouvrez directement le canal Telegram.",source:"SOURCE ↗",open:"OUVRIR @ZOMBCASH ↗"},
    it:{images:"IMMAGINI",updated:"AGGIORNATO",offline:"ARCHIVIO OFFLINE",none:"ANCORA NESSUNA IMMAGINE",noneMsg:"L’archivio Telegram non ha ancora sincronizzato immagini.",error:"IMPOSSIBILE CARICARE LE IMMAGINI",errorMsg:"La richiesta dei dati della galleria non è riuscita o è scaduta. Aggiorna la pagina o apri direttamente il canale Telegram.",source:"FONTE ↗",open:"APRI @ZOMBCASH ↗"},
    ja:{images:"枚",updated:"更新",offline:"アーカイブ停止中",none:"画像はまだありません",noneMsg:"Telegramアーカイブにはまだ画像が同期されていません。",error:"画像を読み込めませんでした",errorMsg:"ギャラリーデータの取得に失敗したか、タイムアウトしました。ページを更新するか、Telegramチャンネルを直接開いてください。",source:"出典 ↗",open:"@ZOMBCASHを開く ↗"},
    "zh-CN":{images:"张图片",updated:"更新于",offline:"档案离线",none:"暂无图片",noneMsg:"Telegram 档案库尚未同步任何图片。",error:"无法加载图片",errorMsg:"图库数据请求失败或超时。请刷新页面，或直接打开 Telegram 频道。",source:"来源 ↗",open:"打开 @ZOMBCASH ↗"},
    tr:{images:"GÖRSEL",updated:"GÜNCELLENDİ",offline:"ARŞİV ÇEVRİMDIŞI",none:"HENÜZ GÖRSEL YOK",noneMsg:"Telegram arşivi henüz hiçbir görseli senkronize etmedi.",error:"GÖRSELLER YÜKLENEMEDİ",errorMsg:"Galeri veri isteği başarısız oldu veya zaman aşımına uğradı. Sayfayı yenile ya da Telegram kanalını doğrudan aç.",source:"KAYNAK ↗",open:"@ZOMBCASH'İ AÇ ↗"},
    hi:{images:"इमेज",updated:"अपडेट",offline:"आर्काइव ऑफ़लाइन",none:"अभी कोई इमेज नहीं",noneMsg:"Telegram आर्काइव ने अभी तक कोई इमेज सिंक नहीं की है।",error:"इमेज लोड नहीं हो सकीं",errorMsg:"गैलरी डेटा अनुरोध विफल हुआ या समय समाप्त हो गया। पेज रीफ़्रेश करें या Telegram चैनल सीधे खोलें।",source:"स्रोत ↗",open:"@ZOMBCASH खोलें ↗"}
  };
  const galleryCaptionLabels = {
    en:{"NIGHTMARE DROP":"NIGHTMARE DROP","ZOMBIE MEME OF THE HOUR":"ZOMBIE MEME OF THE HOUR","ZOMBIE MEME":"ZOMBIE MEME","UNDEAD AFTER DARK":"UNDEAD AFTER DARK"},
    ru:{"NIGHTMARE DROP":"НОЧНОЙ КОШМАР","ZOMBIE MEME OF THE HOUR":"ЗОМБИ-МЕМ ЧАСА","ZOMBIE MEME":"ЗОМБИ-МЕМ","UNDEAD AFTER DARK":"НЕЖИТЬ ПОСЛЕ ЗАКАТА"},
    de:{"NIGHTMARE DROP":"ALBTRAUM-DROP","ZOMBIE MEME OF THE HOUR":"ZOMBIE-MEME DER STUNDE","ZOMBIE MEME":"ZOMBIE-MEME","UNDEAD AFTER DARK":"UNTOTE NACH EINBRUCH DER DUNKELHEIT"},
    fr:{"NIGHTMARE DROP":"DROP CAUCHEMAR","ZOMBIE MEME OF THE HOUR":"LE MÈME ZOMBIE DU MOMENT","ZOMBIE MEME":"MÈME ZOMBIE","UNDEAD AFTER DARK":"MORTS-VIVANTS APRÈS LA NUIT"},
    it:{"NIGHTMARE DROP":"DROP DA INCUBO","ZOMBIE MEME OF THE HOUR":"IL MEME ZOMBIE DEL MOMENTO","ZOMBIE MEME":"MEME ZOMBIE","UNDEAD AFTER DARK":"NON MORTI DOPO IL TRAMONTO"},
    ja:{"NIGHTMARE DROP":"悪夢のドロップ","ZOMBIE MEME OF THE HOUR":"今時のゾンビミーム","ZOMBIE MEME":"ゾンビミーム","UNDEAD AFTER DARK":"夜更けのアンデッド"},
    "zh-CN":{"NIGHTMARE DROP":"噩梦掉落","ZOMBIE MEME OF THE HOUR":"本小时僵尸梗图","ZOMBIE MEME":"僵尸梗图","UNDEAD AFTER DARK":"午夜不死者"},
    tr:{"NIGHTMARE DROP":"KÂBUS PAYLAŞIMI","ZOMBIE MEME OF THE HOUR":"SAATİN ZOMBİ MEMİ","ZOMBIE MEME":"ZOMBİ MEMİ","UNDEAD AFTER DARK":"GECE SONRASI YAŞAYAN ÖLÜLER"},
    hi:{"NIGHTMARE DROP":"दुःस्वप्न ड्रॉप","ZOMBIE MEME OF THE HOUR":"इस घंटे का ज़ॉम्बी मीम","ZOMBIE MEME":"ज़ॉम्बी मीम","UNDEAD AFTER DARK":"रात के बाद अनडेड"}
  };
  let galleryLang=document.documentElement.lang||"en";
  const gtx=k=>(galleryLocale[galleryLang]||galleryLocale.en)[k]||galleryLocale.en[k]||k;
  const localizeGalleryMeta=(items,updatedAt)=>{if(count&&items!==null)count.textContent=items.length+" "+gtx("images");if(updated)updated.textContent=updatedAt?gtx("updated")+" "+new Date(updatedAt).toLocaleString(galleryLang,{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"";};
  document.addEventListener("zombcash:languagechange",e=>{galleryLang=e.detail?.language||document.documentElement.lang||"en";grid.querySelectorAll(".gallery-caption p").forEach(p=>{p.textContent=cleanCaption(p.dataset.originalCaption||p.textContent);});grid.querySelectorAll(".gallery-caption a").forEach(a=>a.textContent=gtx("source"));if(count&&/IMAGES|ИЗОБРАЖЕНИЙ|BILDER|IMAGES|IMMAGINI|枚|张图片|GÖRSEL|इमेज/.test(count.textContent)){const n=parseInt(count.textContent,10);if(Number.isFinite(n))count.textContent=n+" "+gtx("images");}if(updated&&updated.textContent){const raw=updated.textContent.replace(/^(UPDATED|ОБНОВЛЕНО|AKTUALISIERT|MIS À JOUR|AGGIORNATO|更新|更新于|GÜNCELLENDİ|अपडेट)\\s*/,"");updated.textContent=gtx("updated")+" "+raw;}});
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[ch];
  });
  const cleanCaption = value => {
    let caption = String(value ?? "")
      .replace(/\s+/g, " ")
      .split(/━━━━━━━━|🧟\s*\$ZOMBCASH|MARKET DIED\.|📋\s*CA:|🌐\s*Website:|𝕏\s*X Community|💬\s*Telegram/i)[0]
      .trim();
    const labels = galleryCaptionLabels[galleryLang] || galleryCaptionLabels.en;
    Object.keys(galleryCaptionLabels.en).sort((a, b) => b.length - a.length).forEach(key => {
      caption = caption.replace(new RegExp(key, "ig"), labels[key] || key);
    });
    return caption;
  };

  const state = (title, message) => {
    grid.innerHTML = '<div class="gallery-state"><h3>' + escapeHtml(title) +
      '</h3><p>' + escapeHtml(message) +
      '</p><a class="gallery-empty-link" href="https://t.me/ZOMBCASH" target="_blank" rel="noreferrer">'+escapeHtml(gtx("open"))+'</a></div>';
  };

  const lightbox = document.createElement("div");
  lightbox.className = "gallery-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Expanded gallery image");
  lightbox.innerHTML = '<button class="gallery-lightbox-close" type="button" aria-label="Close image">×</button>' +
    '<button class="gallery-lightbox-prev" type="button" aria-label="Previous image">‹</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>' +
    '<button class="gallery-lightbox-next" type="button" aria-label="Next image">›</button>';
  document.body.appendChild(lightbox);

  const fullImage = lightbox.querySelector("img");
  const fullCaption = lightbox.querySelector("figcaption");
  const closeButton = lightbox.querySelector(".gallery-lightbox-close");
  let cards = [];
  let activeIndex = 0;

  const showImage = index => {
    if (!cards.length) return;
    activeIndex = (index + cards.length) % cards.length;
    const image = cards[activeIndex].querySelector("img");
    fullImage.src = image.currentSrc || image.src;
    fullImage.alt = image.alt || "";
    fullCaption.textContent = cards[activeIndex].querySelector(".gallery-caption p")?.textContent || "";
    lightbox.classList.add("is-open");
    document.body.classList.add("gallery-lightbox-open");
    closeButton.focus();
  };
  const closeImage = () => {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("gallery-lightbox-open");
    fullImage.removeAttribute("src");
  };
  closeButton.addEventListener("click", closeImage);
  lightbox.querySelector(".gallery-lightbox-prev").addEventListener("click", () => showImage(activeIndex - 1));
  lightbox.querySelector(".gallery-lightbox-next").addEventListener("click", () => showImage(activeIndex + 1));
  lightbox.addEventListener("click", event => { if (event.target === lightbox) closeImage(); });
  document.addEventListener("keydown", event => {
    if (!lightbox.classList.contains("is-open")) return;
    if (event.key === "Escape") closeImage();
    if (event.key === "ArrowLeft") showImage(activeIndex - 1);
    if (event.key === "ArrowRight") showImage(activeIndex + 1);
  });

  // Use a short timeout so a stalled data request never leaves the spinner forever.
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Gallery data request timed out")), 12000));
  Promise.race([
    fetch("gallery-data.json?v=gallery-data-v1-20261016", { cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error("Gallery data request failed: " + response.status);
      return response.json();
    }),
    timeout
  ]).then(data => {
    const allowedGalleryCaption = caption =>
      /\bNIGHTMARE\s+DROP\b/i.test(String(caption ?? "")) ||
      /\bZOMBIE\s+MEME(?:\s+OF\s+THE\s+HOUR)?\b/i.test(String(caption ?? "")) ||
      /\bUNDEAD\s+AFTER\s+DARK\b/i.test(String(caption ?? ""));
    const items = Array.isArray(data.items)
      ? data.items.filter(item => item.image && item.caption && allowedGalleryCaption(item.caption))
      : [];
    localizeGalleryMeta(items, data.updated_at);
    if (!items.length) {
      state(gtx("none"), gtx("noneMsg"));
      return;
    }
    grid.innerHTML = items.map(item => {
      const caption = cleanCaption(item.caption);
      const image = escapeHtml(item.image);
      const post = item.post_url ? escapeHtml(item.post_url) : "https://t.me/ZOMBCASH";
      return '<article class="gallery-card" tabindex="0" role="button" aria-label="Open image: ' + escapeHtml(caption) + '">' +
        '<img src="' + image + '" alt="' + escapeHtml(caption) + '" loading="lazy" decoding="async">' +
        '<div class="gallery-caption"><p data-original-caption="' + escapeHtml(item.caption) + '">' + escapeHtml(caption) + '</p>' +
        '<a href="' + post + '" target="_blank" rel="noreferrer">'+escapeHtml(gtx("source"))+'</a></div></article>';
    }).join("");
    cards = Array.from(grid.querySelectorAll(".gallery-card"));
    cards.forEach((card, index) => {
      const image = card.querySelector("img");
      image?.addEventListener("error", () => {
        if (image.dataset.fallbackApplied) return;
        image.dataset.fallbackApplied = "true";
        image.src = "/zombcash-hand-logo.svg";
        image.alt = "Gallery image temporarily unavailable";
      }, { once: true });
      card.addEventListener("click", event => { if (!event.target.closest("a")) showImage(index); });
      card.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && event.target === card) {
          event.preventDefault();
          showImage(index);
        }
      });
    });
  }).catch(error => {
    if (count) count.textContent = gtx("offline");
    if (updated) updated.textContent = "";
    state(gtx("error"), gtx("errorMsg"));
  });
})();