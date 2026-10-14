// Passport lock: a saved profile opens only after Face ID / Touch ID / fingerprint (a passkey
// on this device, via WebAuthn) or, for people who opt out, the answer to "Who's your favorite
// player?". The device checks the face or finger itself; the app never sees biometric data.
// This guards the profile on this device. Account data on the server is protected by sign-in.

const LOCK_KEY = "ljsportmind_lock";
const MAX_TRIES = 5;
const WAIT_SECONDS = 30;

const I18N_LOCK = {
  en: {
    lkSetupTitle: "Lock your Passport",
    lkSetupText: "Your profile opens only for you.",
    lkBioSetup: "Use Face ID or fingerprint",
    lkPlayerSetup: "Use my favorite player instead",
    lkNoBio: "This device can't use Face ID or fingerprint here, so set your favorite player.",
    lkPlayerQ: "Who's your favorite player?",
    lkPlayerSave: "Save and open",
    lkUnlockTitle: "Welcome back",
    lkBioUnlock: "Unlock with Face ID or fingerprint",
    lkPlayerUnlock: "Open my Passport",
    lkWelcome: "Welcome to LJSPORTMIND",
    lkWelcomeName: "Good to see you, {name}.",
    lkWrong: "That's not it. Try again.",
    lkWait: "Too many tries. Wait {n} seconds.",
    lkBioFailed: "Couldn't confirm it's you. Try again.",
    lkEmpty: "Type a player's name.",
    lkReset: "Can't get in? Reset this device",
    lkResetConfirm: "This removes the profile from this device. If you're signed in, it comes back when you sign in again. Continue?"
  },
  es: {
    lkSetupTitle: "Bloquea tu Pasaporte",
    lkSetupText: "Tu perfil solo se abre para ti.",
    lkBioSetup: "Usar Face ID o huella",
    lkPlayerSetup: "Usar mi jugador favorito",
    lkNoBio: "Este dispositivo no puede usar Face ID ni huella aquí, así que elige tu jugador favorito.",
    lkPlayerQ: "¿Quién es tu jugador favorito?",
    lkPlayerSave: "Guardar y abrir",
    lkUnlockTitle: "Bienvenido de nuevo",
    lkBioUnlock: "Desbloquear con Face ID o huella",
    lkPlayerUnlock: "Abrir mi Pasaporte",
    lkWelcome: "Bienvenido a LJSPORTMIND",
    lkWelcomeName: "Qué bueno verte, {name}.",
    lkWrong: "No es ese. Inténtalo de nuevo.",
    lkWait: "Demasiados intentos. Espera {n} segundos.",
    lkBioFailed: "No se pudo confirmar que eres tú. Inténtalo de nuevo.",
    lkEmpty: "Escribe el nombre de un jugador.",
    lkReset: "¿No puedes entrar? Restablecer este dispositivo",
    lkResetConfirm: "Esto borra el perfil de este dispositivo. Si tienes sesión iniciada, volverá al iniciar sesión otra vez. ¿Continuar?"
  },
  zh: {
    lkSetupTitle: "锁定你的体育护照",
    lkSetupText: "你的档案只为你打开。",
    lkBioSetup: "使用面容 ID 或指纹",
    lkPlayerSetup: "改用我最喜欢的球员",
    lkNoBio: "此设备在这里无法使用面容 ID 或指纹，请设置你最喜欢的球员。",
    lkPlayerQ: "你最喜欢的球员是谁？",
    lkPlayerSave: "保存并打开",
    lkUnlockTitle: "欢迎回来",
    lkBioUnlock: "用面容 ID 或指纹解锁",
    lkPlayerUnlock: "打开我的护照",
    lkWelcome: "欢迎来到 LJSPORTMIND",
    lkWelcomeName: "很高兴见到你，{name}。",
    lkWrong: "不对，请再试一次。",
    lkWait: "尝试次数过多，请等待 {n} 秒。",
    lkBioFailed: "无法确认是你本人，请再试一次。",
    lkEmpty: "请输入球员名字。",
    lkReset: "进不去？重置此设备",
    lkResetConfirm: "这会从此设备删除档案。如果你已登录，再次登录后档案会恢复。继续吗？"
  },
  ar: {
    lkSetupTitle: "اقفل جوازك",
    lkSetupText: "ملفك يُفتح لك وحدك.",
    lkBioSetup: "استخدم Face ID أو البصمة",
    lkPlayerSetup: "استخدم لاعبي المفضل بدلًا من ذلك",
    lkNoBio: "لا يستطيع هذا الجهاز استخدام Face ID أو البصمة هنا، لذا اختر لاعبك المفضل.",
    lkPlayerQ: "من لاعبك المفضل؟",
    lkPlayerSave: "احفظ وافتح",
    lkUnlockTitle: "أهلًا بعودتك",
    lkBioUnlock: "افتح باستخدام Face ID أو البصمة",
    lkPlayerUnlock: "افتح جوازي",
    lkWelcome: "مرحبًا بك في LJSPORTMIND",
    lkWelcomeName: "سعيد برؤيتك يا {name}.",
    lkWrong: "ليست الإجابة الصحيحة. حاول مرة أخرى.",
    lkWait: "محاولات كثيرة. انتظر {n} ثانية.",
    lkBioFailed: "تعذّر التأكد من أنك أنت. حاول مرة أخرى.",
    lkEmpty: "اكتب اسم لاعب.",
    lkReset: "لا تستطيع الدخول؟ أعد ضبط هذا الجهاز",
    lkResetConfirm: "سيؤدي هذا إلى حذف الملف من هذا الجهاز. إذا كنت مسجّل الدخول، سيعود عند تسجيل الدخول مجددًا. هل تريد المتابعة؟"
  }
};
Object.keys(I18N_LOCK).forEach((lang) => Object.assign(I18N[lang], I18N_LOCK[lang]));

// ---- Storage and crypto helpers ----

function getLock() {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || "null");
  } catch {
    return null;
  }
}

function setLock(lock) {
  try {
    if (lock) localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
    else localStorage.removeItem(LOCK_KEY);
  } catch {
    // storage unavailable; the lock simply won't persist
  }
}

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (str) => Uint8Array.from(atob(str.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

// "Lionel Messi", "lionel  messi" and "Lionel Messí" all count as the same answer.
function normalizeAnswer(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

async function hashAnswer(answer, salt) {
  const data = new TextEncoder().encode(salt + "|" + normalizeAnswer(answer));
  return toB64(await crypto.subtle.digest("SHA-256", data));
}

async function biometricsAvailable() {
  try {
    return !!(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()));
  } catch {
    return false;
  }
}

async function createBiometricLock(name) {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: "LJSportMind" },
      user: { id: randomBytes(16), name: name || "LJSportMind", displayName: name || "LJSportMind" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      timeout: 60000
    }
  });
  return { type: "bio", credentialId: toB64(cred.rawId) };
}

// The device only returns an assertion after its own face or fingerprint check; flag bit 0x04
// in authenticatorData confirms the user was verified, not just present.
async function verifyBiometric(lock) {
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: "public-key", id: fromB64(lock.credentialId), transports: ["internal"] }],
      userVerification: "required",
      timeout: 60000
    }
  });
  const flags = new Uint8Array(assertion.response.authenticatorData)[32];
  return !!(flags & 0x04);
}

// ---- Lock screen ----

const lockScreen = document.getElementById("lockScreen");
const lockTitle = document.getElementById("lockTitle");
const lockText = document.getElementById("lockText");
const lockMsg = document.getElementById("lockMsg");
const lockSetup = document.getElementById("lockSetup");
const lockPlayerForm = document.getElementById("lockPlayerForm");
const lockPlayer = document.getElementById("lockPlayer");
const lockPlayerBtn = document.getElementById("lockPlayerBtn");
const lockBioBtn = document.getElementById("lockBioBtn");
const lockBioSetupBtn = document.getElementById("lockBioSetupBtn");
const lockResetBtn = document.getElementById("lockResetBtn");
let lockState = { mode: "", msg: "", bio: false };
let failed = 0;
let waitUntil = 0;
let welcomeTimer = 0;

function renderLock() {
  const { mode, msg, bio } = lockState;
  lockScreen.hidden = !mode;
  document.body.classList.toggle("is-locked", !!mode);
  if (!mode) return;
  const titles = { setup: "lkSetupTitle", setupPlayer: "lkSetupTitle", unlockBio: "lkUnlockTitle", unlockPlayer: "lkUnlockTitle", welcome: "lkWelcome" };
  lockTitle.textContent = t(titles[mode]);
  const data = loadPassport();
  lockText.textContent =
    mode === "welcome" ? (data && data.name ? tf("lkWelcomeName", { name: data.name }) : "") :
    mode === "setupPlayer" && !bio ? t("lkNoBio") :
    mode.startsWith("setup") ? t("lkSetupText") : "";
  lockScreen.classList.toggle("lock-welcome", mode === "welcome");
  lockSetup.hidden = mode !== "setup";
  lockBioSetupBtn.textContent = t("lkBioSetup");
  document.getElementById("lockPlayerSetupBtn").textContent = t("lkPlayerSetup");
  lockPlayerForm.hidden = mode !== "setupPlayer" && mode !== "unlockPlayer";
  document.getElementById("lockPlayerLabel").textContent = t("lkPlayerQ");
  lockPlayerBtn.textContent = t(mode === "setupPlayer" ? "lkPlayerSave" : "lkPlayerUnlock");
  lockBioBtn.hidden = mode !== "unlockBio";
  lockBioBtn.textContent = t("lkBioUnlock");
  lockResetBtn.hidden = !mode.startsWith("unlock");
  lockResetBtn.textContent = t("lkReset");
  lockMsg.textContent = msg ? (typeof msg === "string" ? t(msg) : tf(msg.key, msg.vars)) : "";
  lockMsg.hidden = !msg;
}

function showLock(mode, msg = "") {
  lockState = { ...lockState, mode, msg };
  renderLock();
  if (mode === "setupPlayer" || mode === "unlockPlayer") setTimeout(() => lockPlayer.focus(), 0);
}

function welcome() {
  lockPlayer.value = "";
  failed = 0;
  showLock("welcome");
  clearTimeout(welcomeTimer);
  welcomeTimer = setTimeout(() => showLock(""), 1600);
}

// Decide what to show: no profile = nothing to lock; profile without a lock = set one up.
async function checkLock() {
  if (!loadPassport()) {
    showLock("");
    return;
  }
  lockState.bio = await biometricsAvailable();
  const lock = getLock();
  if (!lock) showLock(lockState.bio ? "setup" : "setupPlayer");
  else showLock(lock.type === "bio" ? "unlockBio" : "unlockPlayer");
}

lockBioSetupBtn.addEventListener("click", async () => {
  try {
    const data = loadPassport();
    setLock(await createBiometricLock(data && data.name));
    welcome();
  } catch {
    showLock("setup", "lkBioFailed");
  }
});

document.getElementById("lockPlayerSetupBtn").addEventListener("click", () => showLock("setupPlayer"));

lockBioBtn.addEventListener("click", async () => {
  try {
    if (await verifyBiometric(getLock())) return welcome();
  } catch {
    // cancelled or not recognised
  }
  showLock("unlockBio", "lkBioFailed");
});

lockPlayerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const answer = lockPlayer.value;
  if (!normalizeAnswer(answer)) return showLock(lockState.mode, "lkEmpty");

  if (lockState.mode === "setupPlayer") {
    const salt = toB64(randomBytes(16));
    setLock({ type: "player", salt, hash: await hashAnswer(answer, salt) });
    return welcome();
  }

  const now = Date.now();
  if (now < waitUntil) return showLock("unlockPlayer", { key: "lkWait", vars: { n: Math.ceil((waitUntil - now) / 1000) } });
  const lock = getLock();
  if ((await hashAnswer(answer, lock.salt)) === lock.hash) return welcome();
  failed += 1;
  lockPlayer.value = "";
  if (failed >= MAX_TRIES) {
    failed = 0;
    waitUntil = now + WAIT_SECONDS * 1000;
    return showLock("unlockPlayer", { key: "lkWait", vars: { n: WAIT_SECONDS } });
  }
  showLock("unlockPlayer", "lkWrong");
});

lockResetBtn.addEventListener("click", () => {
  if (!window.confirm(t("lkResetConfirm"))) return;
  clearPassport();
  refreshProfileViews();
});

// Keep the lock in step with the profile: saving a first profile asks for a lock, clearing the
// profile (sign-out, delete, reset) removes it, and a profile loaded from the account needs one.
const clearPassportWithoutLock = clearPassport;
clearPassport = function () {
  clearPassportWithoutLock();
  setLock(null);
};

const refreshWithoutLock = refreshProfileViews;
refreshProfileViews = function () {
  refreshWithoutLock();
  if (!getLock() || !loadPassport()) checkLock();
};

passportForm.addEventListener("submit", () => {
  if (!getLock()) checkLock();
});

document.getElementById("langSelect").addEventListener("change", renderLock);

checkLock();
