require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const db = require('./database');
const { modifyAdText, isRealEstateAd } = require('./modifier');

const BOT_TOKEN = process.env.BOT_TOKEN;
const MY_CHANNEL = process.env.MY_CHANNEL;
const ADMIN_ID = process.env.ADMIN_ID;
const AUTO_POST_INTERVAL = parseInt(process.env.AUTO_POST_INTERVAL || '60') * 60 * 1000;
const SOURCE_CHANNELS = (process.env.SOURCE_CHANNELS || '').split(',').map(c => c.trim()).filter(Boolean);

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN .env faylida yo\'q!');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Bot ishga tushdi...');
console.log(`📡 Manba kanallar: ${SOURCE_CHANNELS.join(', ') || 'Hech qaysi (admindan qo\'shiladi)'}`);
console.log(`📢 Maqsad kanal: ${MY_CHANNEL}`);

// ─────────────────────────────────────────────
// FOYDALANUVCHI HOLATI (STATE)
// ─────────────────────────────────────────────

const userState = {}; // { userId: { step, data } }

function setState(userId, step, data = {}) {
  userState[userId] = { step, data };
}

function getState(userId) {
  return userState[userId] || { step: null, data: {} };
}

function clearState(userId) {
  delete userState[userId];
}

// ─────────────────────────────────────────────
// YORDAMCHI FUNKSIYALAR
// ─────────────────────────────────────────────

function isAdmin(userId) {
  return String(userId) === String(ADMIN_ID);
}

async function sendToAdmin(text, options = {}) {
  if (!ADMIN_ID) return;
  try {
    await bot.sendMessage(ADMIN_ID, text, { parse_mode: 'HTML', ...options });
  } catch (e) {
    console.error('Admin ga xabar yuborishda xato:', e.message);
  }
}

function preview(text, len = 200) {
  return text.length > len ? text.slice(0, len) + '...' : text;
}

// ─────────────────────────────────────────────
// FOYDALANUVCHI RO'YXATDAN O'TISH
// ─────────────────────────────────────────────

// database.js ga qo'shilishi kerak bo'lgan funksiyalar:
// db.saveUser({ userId, phone, fullName })
// db.getUserByPhone(phone)
// db.getAllUsers()
// db.getApartments(filters) — { district, minPrice, maxPrice }
// db.getApartmentById(id)

async function showMainMenu(chatId, isUserAdmin = false) {
  const keyboard = isUserAdmin ? getAdminMainMenu() : getUserMainMenu();
  await bot.sendMessage(chatId,
    isUserAdmin
      ? `👋 Xush kelibsiz, Admin!\n\n📋 Quyidagi amallardan birini tanlang:`
      : `🏠 <b>Bukhara Prime – Ko'chmas mulk</b>\n\n👇 Quyidagi bo'limlardan birini tanlang:`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}

function getUserMainMenu() {
  return {
    keyboard: [
      [{ text: '🏠 Uylarni ko\'rish' }, { text: '🔍 Manzil orqali qidirish' }],
      [{ text: '🆔 ID orqali topish' }, { text: '📞 Bog\'lanish' }],
      [{ text: 'ℹ️ Biz haqimizda' }]
    ],
    resize_keyboard: true
  };
}

function getAdminMainMenu() {
  return {
    keyboard: [
      [{ text: '📊 Statistika' }, { text: '🗄️ Bazani ko\'rish' }],
      [{ text: '⏳ Kutayotganlar' }, { text: '📤 Barchasini yuborish' }],
      [{ text: '➕ Kanal qo\'shish' }, { text: '📡 Kanallar ro\'yxati' }],
      [{ text: '👥 Foydalanuvchilar' }, { text: '🆔 Kvartira ID orqali' }],
      [{ text: '🏠 Uylarni ko\'rish' }, { text: '🔍 Manzil orqali qidirish' }]
    ],
    resize_keyboard: true
  };
}

// ─────────────────────────────────────────────
// REKLAMA KANALGA YUBORISH
// ─────────────────────────────────────────────

async function postAdToChannel(ad) {
  try {
    if (!MY_CHANNEL) {
      console.warn('⚠️ MY_CHANNEL sozlanmagan!');
      return false;
    }

    if (ad.media_type === 'photo' && ad.media_file_id) {
      await bot.sendPhoto(MY_CHANNEL, ad.media_file_id, {
        caption: ad.modified_text,
        parse_mode: 'HTML'
      });
    } else if (ad.media_type === 'video' && ad.media_file_id) {
      await bot.sendVideo(MY_CHANNEL, ad.media_file_id, {
        caption: ad.modified_text,
        parse_mode: 'HTML'
      });
    } else {
      await bot.sendMessage(MY_CHANNEL, ad.modified_text, { parse_mode: 'HTML' });
    }

    await db.markAdAsPosted(ad.id);
    console.log(`✅ Reklama #${ad.id} kanalga yuborildi`);
    return true;
  } catch (err) {
    console.error(`❌ Reklama #${ad.id} yuborishda xato:`, err.message);
    return false;
  }
}

// ─────────────────────────────────────────────
// KANAL XABARINI QAYTA ISHLASH
// ─────────────────────────────────────────────

async function processChannelMessage(msg, channelUsername) {
  try {
    let originalText = '';
    let mediaType = 'text';
    let mediaFileId = null;

    if (msg.text) {
      originalText = msg.text;
      mediaType = 'text';
    } else if (msg.caption) {
      originalText = msg.caption;
      if (msg.photo) {
        mediaType = 'photo';
        mediaFileId = msg.photo[msg.photo.length - 1].file_id;
      } else if (msg.video) {
        mediaType = 'video';
        mediaFileId = msg.video.file_id;
      }
    }

    if (!originalText || !isRealEstateAd(originalText)) return;

    const exists = await db.adExists(channelUsername, msg.message_id);
    if (exists) {
      console.log(`⏭️ Duplicate: ${channelUsername} #${msg.message_id}`);
      return;
    }

    const modifiedText = modifyAdText(originalText);

    const adId = await db.saveAd({
      sourceChannel: channelUsername,
      sourceMessageId: msg.message_id,
      originalText,
      modifiedText,
      mediaType,
      mediaFileId
    });

    console.log(`📥 Yangi reklama saqlandi #${adId} (${channelUsername})`);

    await sendToAdmin(
      `📥 <b>Yangi reklama topildi!</b>\n` +
      `📡 Manba: <code>${channelUsername}</code>\n` +
      `🆔 ID: #${adId}\n\n` +
      `<b>O'zgartirilgan matn:</b>\n${preview(modifiedText)}\n\n` +
      `Kanalga yuborish uchun: /post_${adId}`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Hozir yuborish', callback_data: `post_${adId}` },
            { text: '❌ O\'chirish', callback_data: `delete_${adId}` }
          ]]
        }
      }
    );
  } catch (err) {
    console.error('processChannelMessage xatosi:', err.message);
  }
}

// ─────────────────────────────────────────────
// KANAL XABARLARINI TINGLASH
// ─────────────────────────────────────────────

bot.on('channel_post', async (msg) => {
  if (!msg.chat) return;
  const chatUsername = '@' + (msg.chat.username || '');
  const chatId = String(msg.chat.id);

  const isSourceChannel = SOURCE_CHANNELS.some(ch =>
    ch === chatUsername || ch === chatId
  );

  if (isSourceChannel) {
    console.log(`📨 Yangi xabar: ${chatUsername}`);
    await processChannelMessage(msg, chatUsername || chatId);
  }
});

// ─────────────────────────────────────────────
// ASOSIY MESSAGE HANDLER
// ─────────────────────────────────────────────

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text || '';

  if (!userId) return;

  // Forward qilingan xabar (admin uchun)
  if (isAdmin(userId) && msg.forward_from_chat && msg.forward_from_chat.type === 'channel') {
    const channelUsername = '@' + (msg.forward_from_chat.username || msg.forward_from_chat.id);
    await processChannelMessage(msg, channelUsername);
    return;
  }

  const state = getState(userId);

  // ── RO'YXATDAN O'TISH HOLATLARI ──

  if (state.step === 'awaiting_phone') {
    // Telefon raqami qabul qilish
    let phone = '';
    if (msg.contact) {
      phone = msg.contact.phone_number;
    } else if (text.match(/^\+?[\d\s\-]{9,15}$/)) {
      phone = text.replace(/\s|-/g, '');
    } else {
      return bot.sendMessage(chatId,
        '❌ Noto\'g\'ri format. Iltimos, telefon raqamingizni yuboring:',
        {
          reply_markup: {
            keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );
    }

    setState(userId, 'awaiting_name', { phone });
    return bot.sendMessage(chatId,
      `✅ Raqam qabul qilindi: <b>${phone}</b>\n\n` +
      `👤 Endi <b>Ism Familiyangizni</b> kiriting:\n<i>Masalan: Alisher Karimov</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true }
      }
    );
  }

  if (state.step === 'awaiting_name') {
    const fullName = text.trim();
    if (fullName.length < 3) {
      return bot.sendMessage(chatId, '❌ Ism familiya kamida 3 ta harf bo\'lishi kerak. Qayta kiriting:');
    }

    const { phone } = state.data;

    // Foydalanuvchini bazaga saqlash
    try {
      await db.saveUser({ userId, phone, fullName });
    } catch (e) {
      console.error('saveUser xatosi:', e.message);
    }

    clearState(userId);

    // Adminga xabar
    await sendToAdmin(
      `🆕 <b>Yangi foydalanuvchi ro'yxatdan o'tdi!</b>\n\n` +
      `👤 Ism: <b>${fullName}</b>\n` +
      `📱 Raqam: <code>${phone}</code>\n` +
      `🆔 Telegram ID: <code>${userId}</code>`
    );

    await bot.sendMessage(chatId,
      `🎉 <b>Ro'yxatdan o'tdingiz!</b>\n\n` +
      `👤 Ism: <b>${fullName}</b>\n` +
      `📱 Raqam: <b>${phone}</b>\n\n` +
      `Endi barcha imkoniyatlardan foydalana olasiz! 🏠`,
      { parse_mode: 'HTML' }
    );

    return showMainMenu(chatId, isAdmin(userId));
  }

  // ── MANZIL QIDIRISH HOLATI ──

  if (state.step === 'awaiting_address') {
    const address = text.trim();
    clearState(userId);

    await bot.sendMessage(chatId, `🔍 <b>"${address}"</b> bo'yicha qidirish...`, { parse_mode: 'HTML' });

    try {
      const apartments = await db.getApartmentsByAddress(address);

      if (!apartments || apartments.length === 0) {
        return bot.sendMessage(chatId,
          `😔 <b>"${address}"</b> bo'yicha uy-joy topilmadi.\n\n` +
          `💡 Boshqa manzil bilan urinib ko'ring.`,
          { parse_mode: 'HTML', reply_markup: getUserMainMenu() }
        );
      }

      await bot.sendMessage(chatId,
        `✅ <b>${apartments.length} ta natija topildi:</b>`,
        { parse_mode: 'HTML' }
      );

      for (const apt of apartments.slice(0, 5)) {
        await sendApartmentCard(chatId, apt, isAdmin(userId));
      }
    } catch (e) {
      await bot.sendMessage(chatId, '❌ Qidirishda xato: ' + e.message);
    }

    return;
  }

  // ── ID ORQALI QIDIRISH ──

  if (state.step === 'awaiting_apt_id') {
    const aptId = parseInt(text.trim());
    clearState(userId);

    if (isNaN(aptId)) {
      return bot.sendMessage(chatId, '❌ Noto\'g\'ri ID. Faqat raqam kiriting.');
    }

    try {
      const apt = await db.getApartmentById(aptId);
      if (!apt) {
        return bot.sendMessage(chatId,
          `❌ <b>#${aptId}</b> raqamli kvartira topilmadi.`,
          { parse_mode: 'HTML', reply_markup: isAdmin(userId) ? getAdminMainMenu() : getUserMainMenu() }
        );
      }
      await sendApartmentCard(chatId, apt, isAdmin(userId));
    } catch (e) {
      await bot.sendMessage(chatId, '❌ Xato: ' + e.message);
    }

    return;
  }

  // ── KANAL QO'SHISH (ADMIN) ──

  if (state.step === 'awaiting_channel' && isAdmin(userId)) {
    const channelUsername = text.trim();
    clearState(userId);

    try {
      await db.addSourceChannel(channelUsername, channelUsername);
      if (!SOURCE_CHANNELS.includes(channelUsername)) {
        SOURCE_CHANNELS.push(channelUsername);
      }
      await bot.sendMessage(chatId,
        `✅ <b>${channelUsername}</b> qo'shildi!\n\n` +
        `💡 .env fayliga ham qo'shishni unutmang: <code>SOURCE_CHANNELS</code>`,
        { parse_mode: 'HTML', reply_markup: getAdminMainMenu() }
      );
    } catch (err) {
      bot.sendMessage(chatId, '❌ Xato: ' + err.message);
    }
    return;
  }

  // ─────────────────────────────────────────────
  // TUGMA HANDLERLARI
  // ─────────────────────────────────────────────

  // /start
  if (text === '/start') {
    // Ro'yxatdan o'tganmi tekshirish
    let user = null;
    try { user = await db.getUserById(userId); } catch (e) { }

    if (!user && !isAdmin(userId)) {
      setState(userId, 'awaiting_phone');
      return bot.sendMessage(chatId,
        `👋 Xush kelibsiz!\n\n` +
        `🏠 <b>Bukhara Prime</b> – Ko'chmas mulk platformasi\n\n` +
        `📱 Davom etish uchun <b>telefon raqamingizni</b> yuboring:`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );
    }

    return showMainMenu(chatId, isAdmin(userId));
  }

  // ── FOYDALANUVCHI MENYUSI ──

  if (text === '🏠 Uylarni ko\'rish') {
    try {
      const apartments = await db.getApartments({});
      if (!apartments || apartments.length === 0) {
        return bot.sendMessage(chatId,
          '😔 Hozircha mavjud uy-joylar yo\'q.',
          { reply_markup: isAdmin(userId) ? getAdminMainMenu() : getUserMainMenu() }
        );
      }
      await bot.sendMessage(chatId, `🏠 <b>${apartments.length} ta uy-joy mavjud:</b>`, { parse_mode: 'HTML' });
      for (const apt of apartments.slice(0, 5)) {
        await sendApartmentCard(chatId, apt, isAdmin(userId));
      }
    } catch (e) {
      await bot.sendMessage(chatId, '❌ Xato: ' + e.message);
    }
    return;
  }

  if (text === '🔍 Manzil orqali qidirish') {
    setState(userId, 'awaiting_address');
    return bot.sendMessage(chatId,
      `🔍 <b>Manzil orqali qidirish</b>\n\n` +
      `📍 Qidirmoqchi bo'lgan manzilni kiriting:\n<i>Masalan: Kogon, Shahrisabz ko'chasi</i>`,
      { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
    );
  }

  if (text === '🆔 ID orqali topish') {
    setState(userId, 'awaiting_apt_id');
    return bot.sendMessage(chatId,
      `🆔 <b>Kvartira ID orqali qidirish</b>\n\n` +
      `🔢 Kvartira raqamini kiriting:\n<i>Masalan: 42</i>`,
      { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
    );
  }

  if (text === '📞 Bog\'lanish') {
    return bot.sendMessage(chatId,
      `📞 <b>Biz bilan bog'lanish</b>\n\n` +
      `📱 Telefon: <a href="tel:+998901234567">+998 90 123 45 67</a>\n` +
      `📱 Telefon: <a href="tel:+998901234568">+998 90 123 45 68</a>\n` +
      `📍 Manzil: Buxoro sh., Mustaqillik ko'chasi 12\n` +
      `🕐 Ish vaqti: 9:00 – 18:00`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '📞 Qo\'ng\'iroq qilish', url: 'tel:+998901234567' },
            { text: '💬 Telegram', url: 'https://t.me/bukhara_prime' }
          ]],
          ...getUserMainMenu()
        }
      }
    );
  }

  if (text === 'ℹ️ Biz haqimizda') {
    return bot.sendMessage(chatId,
      `🏢 <b>Bukhara Prime</b>\n\n` +
      `Biz Buxoro viloyatidagi eng ishonchli ko'chmas mulk agentligimiz.\n\n` +
      `✅ 500+ muvaffaqiyatli bitim\n` +
      `✅ 10+ yillik tajriba\n` +
      `✅ Professional jamoa\n` +
      `✅ Huquqiy yordam`,
      { parse_mode: 'HTML', reply_markup: getUserMainMenu() }
    );
  }

  // ── ADMIN MENYUSI ──

  if (!isAdmin(userId)) return; // Quyidagi buyruqlar faqat admin uchun

  if (text === '📊 Statistika' || text === '/stats') {
    try {
      const stats = await db.getStats();
      let userCount = 0;
      try { userCount = await db.getUserCount(); } catch (e) { }
      await bot.sendMessage(chatId,
        `📊 <b>Statistika:</b>\n\n` +
        `📥 Jami reklamalar: <b>${stats.total_ads}</b>\n` +
        `✅ Yuborilgan: <b>${stats.posted_ads}</b>\n` +
        `⏳ Kutayotgan: <b>${stats.pending_ads}</b>\n` +
        `📡 Kanallar: <b>${stats.unique_channels}</b>\n` +
        `👥 Foydalanuvchilar: <b>${userCount}</b>`,
        { parse_mode: 'HTML', reply_markup: getAdminMainMenu() }
      );
    } catch (err) {
      bot.sendMessage(chatId, '❌ Xato: ' + err.message);
    }
    return;
  }

  if (text === '🗄️ Bazani ko\'rish' || text === '/crm') {
    try {
      const ads = await db.getAllAds(10);
      if (ads.length === 0) {
        return bot.sendMessage(chatId, '📭 Bazada reklama yo\'q.', { reply_markup: getAdminMainMenu() });
      }
      let txt = `🗄️ <b>CRM Bazasi (so'nggi 10 ta):</b>\n\n`;
      ads.forEach(ad => {
        const status = ad.posted_to_channel ? '✅' : '⏳';
        txt += `${status} #${ad.id} | ${ad.source_channel} | ${ad.created_at.slice(0, 10)}\n`;
      });
      await bot.sendMessage(chatId, txt, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '📋 Batafsil ko\'rish', callback_data: 'crm_detail' }
          ]],
          ...getAdminMainMenu()
        }
      });
    } catch (err) {
      bot.sendMessage(chatId, '❌ Xato: ' + err.message);
    }
    return;
  }

  if (text === '⏳ Kutayotganlar' || text === '/pending') {
    try {
      const ads = await db.getPendingAds(5);
      if (ads.length === 0) {
        return bot.sendMessage(chatId, '✅ Kutayotgan reklamalar yo\'q.', { reply_markup: getAdminMainMenu() });
      }
      for (const ad of ads) {
        await bot.sendMessage(chatId,
          `🆔 <b>#${ad.id}</b> | 📡 ${ad.source_channel}\n` +
          `📅 ${ad.created_at}\n\n${preview(ad.modified_text)}`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: '✅ Yuborish', callback_data: `post_${ad.id}` },
                { text: '❌ O\'chirish', callback_data: `delete_${ad.id}` }
              ]]
            }
          }
        );
      }
    } catch (err) {
      bot.sendMessage(chatId, '❌ Xato: ' + err.message);
    }
    return;
  }

  if (text === '📤 Barchasini yuborish' || text === '/post_all') {
    try {
      const ads = await db.getPendingAds(20);
      if (ads.length === 0) {
        return bot.sendMessage(chatId, '✅ Yuborish uchun reklama yo\'q.', { reply_markup: getAdminMainMenu() });
      }
      await bot.sendMessage(chatId, `⏳ ${ads.length} ta reklama yuborilmoqda...`);
      let success = 0;
      for (const ad of ads) {
        const ok = await postAdToChannel(ad);
        if (ok) success++;
        await new Promise(r => setTimeout(r, 2000));
      }
      await bot.sendMessage(chatId,
        `✅ <b>${success}/${ads.length}</b> ta reklama yuborildi!`,
        { parse_mode: 'HTML', reply_markup: getAdminMainMenu() }
      );
    } catch (err) {
      bot.sendMessage(chatId, '❌ Xato: ' + err.message);
    }
    return;
  }

  if (text === '➕ Kanal qo\'shish') {
    setState(userId, 'awaiting_channel');
    return bot.sendMessage(chatId,
      `➕ <b>Yangi kanal qo'shish</b>\n\n` +
      `📡 Kanal username-ini kiriting:\n<i>Masalan: @bukhara_uy_joy</i>`,
      { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
    );
  }

  if (text === '📡 Kanallar ro\'yxati' || text === '/channels') {
    if (SOURCE_CHANNELS.length === 0) {
      return bot.sendMessage(chatId,
        '📡 Hech qanday kanal yo\'q.\n➕ Kanal qo\'shish tugmasini bosing.',
        { reply_markup: getAdminMainMenu() }
      );
    }
    const list = SOURCE_CHANNELS.map((ch, i) => `${i + 1}. <code>${ch}</code>`).join('\n');
    await bot.sendMessage(chatId,
      `📡 <b>Manba kanallar (${SOURCE_CHANNELS.length} ta):</b>\n\n${list}`,
      { parse_mode: 'HTML', reply_markup: getAdminMainMenu() }
    );
    return;
  }

  if (text === '👥 Foydalanuvchilar') {
    try {
      const users = await db.getAllUsers();
      if (!users || users.length === 0) {
        return bot.sendMessage(chatId, '👥 Ro\'yxatdan o\'tgan foydalanuvchilar yo\'q.', { reply_markup: getAdminMainMenu() });
      }
      let txt = `👥 <b>Foydalanuvchilar (${users.length} ta):</b>\n\n`;
      users.slice(0, 20).forEach((u, i) => {
        txt += `${i + 1}. 👤 ${u.full_name} | 📱 <code>${u.phone}</code>\n`;
      });
      if (users.length > 20) txt += `\n... va yana ${users.length - 20} ta`;
      await bot.sendMessage(chatId, txt, { parse_mode: 'HTML', reply_markup: getAdminMainMenu() });
    } catch (err) {
      bot.sendMessage(chatId, '❌ Xato: ' + err.message);
    }
    return;
  }

  if (text === '🆔 Kvartira ID orqali') {
    setState(userId, 'awaiting_apt_id');
    return bot.sendMessage(chatId,
      `🆔 <b>Kvartira ID orqali qidirish</b>\n\n🔢 ID raqamini kiriting:`,
      { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
    );
  }

  // Eski /start, /add_channel, /post_N buyruqlari
  if (text === '/start') return showMainMenu(chatId, true);

  const addChMatch = text.match(/^\/add_channel (.+)/);
  if (addChMatch) {
    const ch = addChMatch[1].trim();
    try {
      await db.addSourceChannel(ch, ch);
      if (!SOURCE_CHANNELS.includes(ch)) SOURCE_CHANNELS.push(ch);
      bot.sendMessage(chatId, `✅ ${ch} qo'shildi!`, { reply_markup: getAdminMainMenu() });
    } catch (err) { bot.sendMessage(chatId, '❌ Xato: ' + err.message); }
    return;
  }

  const postMatch = text.match(/^\/post_(\d+)/);
  if (postMatch) {
    const adId = parseInt(postMatch[1]);
    try {
      const ads = await db.getPendingAds(100);
      const ad = ads.find(a => a.id === adId);
      if (!ad) return bot.sendMessage(chatId, `❌ #${adId} topilmadi yoki yuborilgan.`);
      const ok = await postAdToChannel(ad);
      bot.sendMessage(chatId, ok ? `✅ #${adId} kanalga yuborildi!` : `❌ #${adId} yuborishda xato!`);
    } catch (err) { bot.sendMessage(chatId, '❌ Xato: ' + err.message); }
    return;
  }
});

// ─────────────────────────────────────────────
// KVARTIRA KARTOCHKASI YUBORISH
// ─────────────────────────────────────────────

async function sendApartmentCard(chatId, apt, adminView = false) {
  const price = apt.price ? `💰 ${Number(apt.price).toLocaleString()} so'm` : '💰 Narx kelishiladi';
  const rooms = apt.rooms ? `🛏 ${apt.rooms} xonali` : '';
  const area = apt.area ? `📐 ${apt.area} m²` : '';
  const floor = apt.floor ? `🏢 ${apt.floor}-qavat` : '';
  const address = apt.address || 'Manzil ko\'rsatilmagan';

  const text =
    `🏠 <b>${apt.title || 'Kvartira #' + apt.id}</b>\n` +
    `🆔 ID: <code>${apt.id}</code>\n\n` +
    `📍 ${address}\n` +
    `${rooms}  ${area}  ${floor}\n` +
    `${price}\n\n` +
    `📝 ${apt.description ? preview(apt.description, 150) : 'Tavsif yo\'q'}`;

  const inlineKeyboard = [[
    { text: '📞 Qo\'ng\'iroq qilish', url: `tel:${process.env.CONTACT_PHONE || '+998901234567'}` },
    { text: '💬 Murojaat', url: `https://t.me/${process.env.CONTACT_USERNAME || 'bukhara_prime'}` }
  ]];

  if (adminView) {
    inlineKeyboard.push([
      { text: '✏️ Tahrirlash', callback_data: `edit_apt_${apt.id}` },
      { text: '🗑️ O\'chirish', callback_data: `del_apt_${apt.id}` }
    ]);
  }

  try {
    if (apt.photo_id) {
      await bot.sendPhoto(chatId, apt.photo_id, {
        caption: text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    }
  } catch (e) {
    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  }
}

// ─────────────────────────────────────────────
// CALLBACK QUERY (INLINE TUGMALAR)
// ─────────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const data = query.data;
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const msgId = query.message.message_id;

  // Admin tekshiruvi (reklama amaliyotlari uchun)
  if ((data.startsWith('post_') || data.startsWith('delete_') || data === 'crm_detail') && !isAdmin(userId)) {
    return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q' });
  }

  if (data.startsWith('post_')) {
    const adId = parseInt(data.replace('post_', ''));
    try {
      const pendingAds = await db.getPendingAds(100);
      const ad = pendingAds.find(a => a.id === adId);
      if (!ad) {
        await bot.answerCallbackQuery(query.id, { text: '⚠️ Reklama topilmadi yoki yuborilgan' });
        return;
      }
      const ok = await postAdToChannel(ad);
      if (ok) {
        await bot.answerCallbackQuery(query.id, { text: '✅ Kanalga yuborildi!' });
        await bot.editMessageText(
          query.message.text + '\n\n✅ <b>Kanalga yuborildi!</b>',
          { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
        );
      } else {
        await bot.answerCallbackQuery(query.id, { text: '❌ Yuborishda xato!' });
      }
    } catch (err) {
      await bot.answerCallbackQuery(query.id, { text: '❌ Xato: ' + err.message });
    }

  } else if (data.startsWith('delete_')) {
    const adId = parseInt(data.replace('delete_', ''));
    await bot.answerCallbackQuery(query.id, { text: `🗑️ #${adId} o'chirildi` });
    await bot.editMessageText(
      `🗑️ Reklama #${adId} o'chirildi.`,
      { chat_id: chatId, message_id: msgId }
    );

  } else if (data === 'crm_detail') {
    await bot.answerCallbackQuery(query.id, { text: 'Yuklanmoqda...' });
    try {
      const ads = await db.getAllAds(5);
      for (const ad of ads) {
        await bot.sendMessage(chatId,
          `🆔 <b>#${ad.id}</b>\n📡 ${ad.source_channel}\n📅 ${ad.created_at}\n\n${preview(ad.modified_text)}`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: '✅ Yuborish', callback_data: `post_${ad.id}` },
                { text: '❌ O\'chirish', callback_data: `delete_${ad.id}` }
              ]]
            }
          }
        );
      }
    } catch (e) {
      bot.sendMessage(chatId, '❌ Xato: ' + e.message);
    }

  } else if (data.startsWith('del_apt_')) {
    if (!isAdmin(userId)) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q' });
    const aptId = parseInt(data.replace('del_apt_', ''));
    try {
      await db.deleteApartment(aptId);
      await bot.answerCallbackQuery(query.id, { text: `🗑️ Kvartira #${aptId} o'chirildi` });
      await bot.editMessageText(
        `🗑️ Kvartira #${aptId} bazadan o'chirildi.`,
        { chat_id: chatId, message_id: msgId }
      );
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: '❌ Xato: ' + e.message });
    }

  } else if (data.startsWith('edit_apt_')) {
    if (!isAdmin(userId)) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q' });
    await bot.answerCallbackQuery(query.id, { text: 'ℹ️ Tahrirlash funksiyasi' });
    await bot.sendMessage(chatId,
      `✏️ Kvartira #${data.replace('edit_apt_', '')} ni tahrirlash uchun /edit_apt_${data.replace('edit_apt_', '')} buyrug'ini yuboring.`
    );
  }
});

// ─────────────────────────────────────────────
// AVTOMATIK POST (SCHEDULER)
// ─────────────────────────────────────────────

function startScheduler() {
  if (AUTO_POST_INTERVAL > 0) {
    console.log(`⏱️ Avtomatik post: har ${AUTO_POST_INTERVAL / 60000} daqiqada`);
    setInterval(async () => {
      try {
        const ads = await db.getPendingAds(3);
        if (ads.length === 0) return;
        console.log(`⏰ Scheduler: ${ads.length} ta reklama avtomatik yuborilmoqda...`);
        for (const ad of ads) {
          await postAdToChannel(ad);
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (err) {
        console.error('Scheduler xatosi:', err.message);
      }
    }, AUTO_POST_INTERVAL);
  }
}

// ─────────────────────────────────────────────
// ISHGA TUSHIRISH
// ─────────────────────────────────────────────

async function main() {
  try {
    await db.initDB();
    console.log('✅ Baza tayyor');
    startScheduler();
    const me = await bot.getMe();
    console.log(`🤖 Bot: @${me.username} (${me.first_name})`);
    await sendToAdmin(
      `🟢 <b>Bot ishga tushdi!</b>\n` +
      `🤖 @${me.username}\n` +
      `📡 Kanallar: ${SOURCE_CHANNELS.length} ta\n` +
      `📢 Maqsad: ${MY_CHANNEL}\n\n` +
      `Menyu uchun /start`
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Bot tayyor! Kuzatyapti...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err) {
    console.error('❌ Ishga tushirishda xato:', err);
    process.exit(1);
  }
}

bot.on('polling_error', (err) => console.error('Polling xatosi:', err.message));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('SIGINT', () => {
  console.log('\n👋 Bot to\'xtatildi');
  bot.stopPolling();
  process.exit(0);
});

main();