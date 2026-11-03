/**
 * Reklama matnini o'zgartirish moduli
 * - Kompaniya nomini almashtiradi
 * - Telefon raqamini almashtiradi
 * - Hashtaglarni yangilaydi
 */

const COMPANY_NAME = process.env.COMPANY_NAME || 'Bukhara Prime';
const PHONE_NUMBER = process.env.PHONE_NUMBER || '+998905123444';

// Telefon raqam pattern (O'zbekiston formatlari) - bitta keng pattern
const PHONE_PATTERNS = [
  /(\+998|998)[-.\s]?\(?\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{2}[-.\s]?\d{2}/g,
  /\(\+998\)\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}/g,
  /\d{2}[-\s]\d{3}[-\s]\d{2}[-\s]\d{2}/g,
];

// Kompaniya nomlari (keng tarqalgan)
const COMPANY_NAME_PATTERNS = [
  // Real estate kompaniyalar
  /квартир[аы]?\s+от\s+[\w\s]+/gi,
  /агентство\s+[\w\s"«»]+/gi,
  /риелтор\s+[\w\s]+/gi,
  /агент\s+[\w\s]+/gi,
];

// Tez-tez uchraydigan kompaniya nomlari ro'yxati (sizning raqiblaringiz)
const KNOWN_COMPANIES = [
  'Bukhara Estate',
  'Buxoro Uy',
  'Buxoro Kvartira',
  'БухараДом',
  'Bukhara Home',
  'Bukhara Realty',
  'Бухара Недвижимость',
  'УзДом',
  'UzDom',
  'Квартиры Бухара',
  'Недвижимость Бухара',
  'Elite Home',
  'Premium Real Estate',
  'Tashkent Realty',
  'O\'zbekiston Uy',
];

/**
 * Telefon raqamlarni almashtirish
 */
function replacePhones(text) {
  let modified = text;
  PHONE_PATTERNS.forEach(pattern => {
    modified = modified.replace(pattern, PHONE_NUMBER);
  });
  return modified;
}

/**
 * Kompaniya nomlarini almashtirish
 */
function replaceCompanyNames(text) {
  let modified = text;

  // Ma'lum kompaniya nomlarini almashtirish
  KNOWN_COMPANIES.forEach(company => {
    const regex = new RegExp(company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    modified = modified.replace(regex, COMPANY_NAME);
  });

  return modified;
}

/**
 * Hashtaglarni yangilash
 */
function updateHashtags(text) {
  let modified = text;

  // Eski hashtaglarni olib tashlash (boshqa kompaniyalar)
  modified = modified.replace(/#[a-zA-Z0-9_а-яА-ЯёЁ]+/g, (tag) => {
    const lower = tag.toLowerCase();
    // O'zimizning hashtaglar - saqlash
    if (lower.includes('bukhara') || lower.includes('buxoro') || lower.includes('prime')) {
      return tag;
    }
    // Umumiy ko'chmas mulk hashtaglari - saqlash
    if (
      lower.includes('квартир') ||
      lower.includes('uylar') ||
      lower.includes('sale') ||
      lower.includes('sotish') ||
      lower.includes('ijara') ||
      lower.includes('аренда') ||
      lower.includes('продажа') ||
      lower.includes('недвижимость')
    ) {
      return tag;
    }
    // Boshqa kompaniya hashtaglarini olib tashlash
    return '';
  });

  // Bizning hashtaglarimizni qo'shish (agar yo'q bo'lsa)
  const ourTags = ['#BukharaPrime', '#Buxoro', '#УйБор', '#КвартираБухара'];
  const hasOurTag = ourTags.some(tag =>
    modified.toLowerCase().includes(tag.toLowerCase().replace('#', ''))
  );

  if (!hasOurTag) {
    modified = modified.trimEnd() + '\n\n' + ourTags.slice(0, 2).join(' ');
  }

  return modified;
}

/**
 * Kontakt ma'lumotlarini qo'shish/almashtirish
 */
function addContactInfo(text) {
  let modified = text;

  // "Bog'lanish", "Связаться", "Contact" so'zlaridan keyin raqamni qo'shish
  const contactKeywords = [
    /📞[^\n]*/g,
    /☎️[^\n]*/g,
    /📱[^\n]*/g,
    /Тел[.:]?\s*[^\n]*/gi,
    /Tel[.:]?\s*[^\n]*/gi,
    /Телефон[.:]?\s*[^\n]*/gi,
    /Aloqa[.:]?\s*[^\n]*/gi,
    /Bog['']lanish[.:]?\s*[^\n]*/gi,
    /Связаться[.:]?\s*[^\n]*/gi,
  ];

  let phoneReplaced = false;
  contactKeywords.forEach(pattern => {
    if (pattern.test(modified)) {
      phoneReplaced = true;
    }
  });

  // Agar telefon raqam topilsa, almashtirish
  modified = replacePhones(modified);

  // Agar hech qanday kontakt yo'q bo'lsa, qo'shish
  if (!phoneReplaced && !PHONE_PATTERNS.some(p => p.test(text))) {
    modified = modified.trimEnd() + `\n\n📞 ${PHONE_NUMBER}`;
  }

  return modified;
}

/**
 * Pastki qism (footer) ni qo'shish yoki almashtirish
 */
function updateFooter(text) {
  let modified = text;

  // Eski footer pattern
  const footerPatterns = [
    /_{3,}[\s\S]*$/,
    /—{3,}[\s\S]*$/,
    /\*{3,}[\s\S]*$/,
  ];

  footerPatterns.forEach(pattern => {
    modified = modified.replace(pattern, '');
  });

  // Yangi footer qo'shish
  const footer = `\n\n━━━━━━━━━━━━━━━\n🏢 ${COMPANY_NAME}\n📞 ${PHONE_NUMBER}`;

  // Agar footer allaqachon yo'q bo'lsa
  if (!modified.includes(COMPANY_NAME)) {
    modified = modified.trimEnd() + footer;
  }

  return modified;
}

/**
 * Asosiy funksiya - matnni to'liq o'zgartirish
 */
function modifyAdText(originalText) {
  if (!originalText || typeof originalText !== 'string') return '';

  let modified = originalText;

  // 1. Kompaniya nomlarini almashtirish
  modified = replaceCompanyNames(modified);

  // 2. Telefon raqamlarni almashtirish
  modified = replacePhones(modified);

  // 3. Kontakt ma'lumotlarini yangilash
  modified = addContactInfo(modified);

  // 4. Hashtaglarni yangilash
  modified = updateHashtags(modified);

  // 5. Footer qo'shish/yangilash
  modified = updateFooter(modified);

  // Ortiqcha bo'sh qatorlarni tozalash
  modified = modified.replace(/\n{4,}/g, '\n\n\n');
  modified = modified.trim();

  return modified;
}

/**
 * Matn reklama ekanligini tekshirish
 */
function isRealEstateAd(text) {
  if (!text) return false;

  const keywords = [
    // O'zbek
    'sotiladi', 'ijaraga', 'kvartira', 'xona', 'uy', 'sotib', 'ijara',
    'sotish', 'xonadon', 'yer', 'maydon', 'ofis', 'bino',
    // Rus
    'продаётся', 'сдаётся', 'квартира', 'комната', 'дом', 'аренда',
    'продажа', 'недвижимость', 'этаж', 'площадь', 'офис', 'здание',
    // Umumiy
    'm²', 'м²', 'кв.м', 'sqm', 'млн', 'mln', 'ming', 'тыс',
    'этаж', 'qavatli', 'qavat', 'yangi', 'новый',
  ];

  const lowerText = text.toLowerCase();
  const matchCount = keywords.filter(kw => lowerText.includes(kw)).length;

  return matchCount >= 2;
}

module.exports = {
  modifyAdText,
  isRealEstateAd,
  replacePhones,
  replaceCompanyNames,
};
