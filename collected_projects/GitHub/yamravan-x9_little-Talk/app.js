const STORAGE_KEY = "little-talk-demo-v1";

const starterChats = [
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    colors: ["#d9b8a8", "#a47876"],
    online: true,
    status: "online now",
    favorite: true,
    unread: 2,
    time: "now",
    messages: [
      { from: "them", text: "Hey you! How did your little weekend escape go? 🌿", time: "10:18" },
      { from: "me", text: "It was exactly the reset I needed. No plans, good coffee, and a book I actually finished.", time: "10:21", read: true },
      { from: "them", text: "That sounds so lovely. I need to steal that idea.", time: "10:24" },
      { from: "them", text: "Sending you a few photos from the garden too 🌸", time: "10:25" },
    ],
  },
  {
    id: "leo",
    name: "Leo Martinez",
    initials: "LM",
    colors: ["#9ab5ad", "#66857d"],
    online: true,
    status: "online now",
    favorite: true,
    unread: 0,
    time: "9:42",
    messages: [
      { from: "them", text: "Found a new little spot for our coffee catch-up ☕", time: "9:32" },
      { from: "me", text: "Very important: do they have the good pastries too?", time: "9:36", read: true },
      { from: "them", text: "The cinnamon roll is kind of life-changing.", time: "9:42" },
    ],
  },
  {
    id: "aisha",
    name: "Aisha Patel",
    initials: "AP",
    colors: ["#d3ae72", "#ad794d"],
    online: false,
    status: "last seen recently",
    favorite: false,
    unread: 0,
    time: "Yesterday",
    messages: [
      { from: "them", text: "Made your recipe for dinner and everyone asked for seconds!", time: "18:14" },
      { from: "me", text: "That makes me so happy! Next time I'll send you my secret dessert recipe, too.", time: "18:22", read: true },
    ],
  },
  {
    id: "sam",
    name: "Sam Rivers",
    initials: "SR",
    colors: ["#a9a1ca", "#736794"],
    online: true,
    status: "online now",
    favorite: false,
    unread: 1,
    time: "Yesterday",
    messages: [
      { from: "me", text: "A tiny reminder that you're doing better than you think 💛", time: "16:07", read: true },
      { from: "them", text: "I really needed to hear that. Thank you for being in my corner.", time: "16:11" },
    ],
  },
  {
    id: "nina",
    name: "Nina Park",
    initials: "NP",
    colors: ["#c894ad", "#9d6381"],
    online: false,
    status: "last seen 12 minutes ago",
    favorite: false,
    unread: 0,
    time: "Mon",
    messages: [
      { from: "them", text: "Book club is officially back on this Friday! Same time?", time: "13:25" },
      { from: "me", text: "Wouldn't miss it. I'll bring something nice to snack on.", time: "13:31", read: true },
    ],
  },
  {
    id: "oliver",
    name: "Oliver James",
    initials: "OJ",
    colors: ["#83a0be", "#55748e"],
    online: false,
    status: "last seen yesterday",
    favorite: false,
    unread: 0,
    time: "Sun",
    messages: [
      { from: "them", text: "Playlist sent! Track five is the one I was telling you about.", time: "11:04" },
      { from: "me", text: "Oh wow, this is going straight onto repeat 🎧", time: "11:12", read: true },
    ],
  },
];

const starterStatuses = [
  { id: "status-maya", author: "Maya Chen", initials: "MC", colors: ["#d9b8a8", "#a47876"], text: "A slow morning and a very good cup of tea 🌿", createdAt: Date.now() - 35 * 60 * 1000 },
  { id: "status-leo", author: "Leo Martinez", initials: "LM", colors: ["#9ab5ad", "#66857d"], text: "Found my new favorite little coffee spot ☕", createdAt: Date.now() - 2 * 60 * 60 * 1000 },
  { id: "status-aisha", author: "Aisha Patel", initials: "AP", colors: ["#d3ae72", "#ad794d"], text: "Made something delicious today. Recipe coming soon!", createdAt: Date.now() - 5 * 60 * 60 * 1000 },
];

const $ = (selector) => document.querySelector(selector);
const appShell = $(".app-shell");
const listEl = $("#conversation-list");
const messagesEl = $("#messages");
const inputEl = $("#message-input");
const attachmentInput = $("#image-input");
const attachmentPreview = $("#attachment-preview");
const toastEl = $("#toast");

let state = loadState();
let activeFilter = "all";
let activeId = state.chats.length ? state.chats[0].id : null;
let selectionMode = false;
const selectedChatIds = new Set();
let pendingImage = null;
let pendingAudio = null;
let activeMessageId = null;
let recorderState = null;
let recorderTimeout;
let toastTimer;
let typingTimer;

function defaultState() {
  return {
    chats: cloneStarterChats(),
    statuses: JSON.parse(JSON.stringify(starterStatuses)),
    calls: [],
    profile: { name: "You", about: "At your own pace ✨", darkMode: false },
  };
}

function normalizeState(parsed) {
  if (!parsed || !Array.isArray(parsed.chats)) throw new Error("Saved conversations are invalid.");
  if (parsed.chats.length > 200) throw new Error("This backup contains too many conversations.");
  parsed.chats.forEach((chat, chatIndex) => {
    if (!chat || typeof chat.name !== "string" || !Array.isArray(chat.messages) || chat.messages.length > 10000) {
      throw new Error("A conversation in this backup is invalid.");
    }
    chat.id = typeof chat.id === "string" ? chat.id.slice(0, 100) : `chat-${chatIndex}`;
    chat.name = chat.name.trim().slice(0, 40) || "Unnamed chat";
    chat.initials = typeof chat.initials === "string" ? chat.initials.slice(0, 4) : initialsFor(chat.name);
    chat.colors = normalizeColors(chat.colors, ["#b5a8c8", "#8776a3"]);
    chat.status = typeof chat.status === "string" ? chat.status.slice(0, 100) : "available";
    chat.time = typeof chat.time === "string" ? chat.time.slice(0, 40) : "";
    chat.messages.forEach((message, index) => {
      if (!message || typeof message !== "object") throw new Error("A message in this backup is invalid.");
      if (!message.id) message.id = `${chat.id}-message-${index}`;
      message.id = String(message.id).slice(0, 120);
      message.from = message.from === "me" ? "me" : "them";
      message.text = typeof message.text === "string" ? message.text.slice(0, 4000) : "";
      message.time = typeof message.time === "string" ? message.time.slice(0, 40) : "";
      message.image = safeMediaUrl(message.image, "image") ? message.image : null;
      message.audio = safeMediaUrl(message.audio, "audio") ? message.audio : null;
      message.reactions = Array.isArray(message.reactions) ? message.reactions.filter((reaction) => typeof reaction === "string").slice(0, 8) : [];
      if (message.reply && typeof message.reply === "object") {
        message.reply = {
          author: typeof message.reply.author === "string" ? message.reply.author.slice(0, 60) : "",
          text: typeof message.reply.text === "string" ? message.reply.text.slice(0, 240) : "",
        };
      } else {
        message.reply = null;
      }
    });
    chat.members = Array.isArray(chat.members) ? chat.members.filter((member) => typeof member === "string").slice(0, 20).map((member) => member.slice(0, 40)) : [];
    if (typeof chat.pinned !== "boolean") chat.pinned = false;
    if (typeof chat.archived !== "boolean") chat.archived = false;
    if (typeof chat.muted !== "boolean") chat.muted = false;
    if (typeof chat.favorite !== "boolean") chat.favorite = false;
    if (typeof chat.unread !== "number") chat.unread = 0;
  });
  parsed.statuses = Array.isArray(parsed.statuses)
    ? parsed.statuses.filter((status) => status && typeof status.text === "string" && Number.isFinite(status.createdAt)).slice(-500).map((status, index) => ({
      id: typeof status.id === "string" ? status.id.slice(0, 100) : `status-${index}`,
      author: typeof status.author === "string" ? status.author.slice(0, 40) : "Someone",
      initials: typeof status.initials === "string" ? status.initials.slice(0, 4) : "LT",
      colors: normalizeColors(status.colors, ["#a99ac8", "#766696"]),
      text: status.text.slice(0, 280),
      createdAt: status.createdAt,
      mine: Boolean(status.mine),
    }))
    : JSON.parse(JSON.stringify(starterStatuses));
  parsed.calls = Array.isArray(parsed.calls) ? parsed.calls.filter((call) => call && typeof call.name === "string" && Number.isFinite(call.createdAt)).slice(-1000) : [];
  parsed.profile = Object.assign({ name: "You", about: "At your own pace ✨", darkMode: false }, parsed.profile || {});
  parsed.profile.name = typeof parsed.profile.name === "string" ? parsed.profile.name.trim().slice(0, 40) || "You" : "You";
  parsed.profile.about = typeof parsed.profile.about === "string" ? parsed.profile.about.slice(0, 80) : "";
  parsed.profile.darkMode = Boolean(parsed.profile.darkMode);
  return parsed;
}

function normalizeColors(colors, fallback) {
  if (!Array.isArray(colors) || colors.length < 2) return fallback;
  return colors.slice(0, 2).map((color, index) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback[index]);
}

const initiallySelectedChat = activeChat();
if (initiallySelectedChat && initiallySelectedChat.unread > 0) {
  initiallySelectedChat.unread = 0;
  saveState();
}

function cloneStarterChats() {
  return JSON.parse(JSON.stringify(starterChats)).map((chat) => {
    chat.messages.forEach((message, index) => {
      message.id = `${chat.id}-message-${index}`;
      message.reactions = [];
    });
    return chat;
  });
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState();
    return normalizeState(JSON.parse(saved));
  } catch (error) {
    console.error("Could not load Little Talk conversations:", error);
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save Little Talk conversations:", error);
    showToast("Couldn't save changes on this device.");
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function activeChat() {
  return state.chats.find((chat) => chat.id === activeId) || null;
}

function lastMessage(chat) {
  return chat.messages[chat.messages.length - 1] || null;
}

function messagePreview(message) {
  if (!message) return "Start a conversation";
  return message.image && !message.text ? "📷 Photo" : message.audio && !message.text ? "🎵 Voice message" : message.text;
}

function visibleChats() {
  const query = $("#chat-search").value.trim().toLowerCase();
  return state.chats.filter((chat) => {
    const messageMatches = chat.messages.some((message) => String(message.text || "").toLowerCase().includes(query));
    const matchesQuery = `${chat.name} ${messagePreview(lastMessage(chat))}`.toLowerCase().includes(query) || messageMatches;
    const matchesFilter = activeFilter === "archived"
      ? chat.archived
      : !chat.archived && (activeFilter === "all"
        || (activeFilter === "unread" && chat.unread > 0)
        || (activeFilter === "favorites" && chat.favorite)
        || (activeFilter === "starred" && chat.messages.some((message) => message.starred)));
    return matchesQuery && matchesFilter;
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

function renderList() {
  const visible = visibleChats();
  $("#inbox-count").textContent = String(state.chats.length);
  const unreadTotal = state.chats.reduce((total, chat) => total + (chat.unread > 0 ? 1 : 0), 0);
  $("#unread-count").textContent = unreadTotal ? `· ${unreadTotal}` : "";
  const archivedTotal = state.chats.filter((chat) => chat.archived).length;
  $("#archived-count").textContent = archivedTotal ? `· ${archivedTotal}` : "";
  const starredTotal = state.chats.filter((chat) => chat.messages.some((message) => message.starred)).length;
  $("#starred-count").textContent = starredTotal ? `· ${starredTotal}` : "";
  $("#inbox-count").textContent = String(state.chats.filter((chat) => !chat.archived).length);
  listEl.innerHTML = visible.length
    ? visible.map((chat) => {
      const last = lastMessage(chat);
      const isUnread = chat.unread > 0;
      const isSelected = selectedChatIds.has(chat.id);
      const preview = escapeHTML(messagePreview(last));
      return `
        <button class="conversation-item${chat.id === activeId && !selectionMode ? " selected" : ""}${isSelected ? " bulk-selected" : ""}" data-chat-id="${escapeHTML(chat.id)}" aria-label="${selectionMode ? `${isSelected ? "Deselect" : "Select"} ${escapeHTML(chat.name)} for bulk message` : `Open chat with ${escapeHTML(chat.name)}`}" aria-pressed="${isSelected}">
          ${selectionMode ? `<span class="selection-indicator" aria-hidden="true">${isSelected ? "✓" : ""}</span>` : ""}
          ${avatarHTML(chat, "list-avatar")}
          <span class="conversation-copy">
            <span class="conversation-first"><strong>${escapeHTML(chat.name)}</strong><time>${escapeHTML(chat.time)}</time></span>
            <span class="conversation-last"><span>${last && last.from === "me" ? `<span class="read-receipt">${last.read ? "✓✓" : "✓"} </span>` : ""}${preview}</span>${isUnread ? `<span class="unread-badge">${chat.unread}</span>` : ""}
            </span>
          </span>
          ${chat.favorite ? '<span class="favorite-mark" aria-label="Favorite">✦</span>' : ""}
          ${chat.pinned ? '<span class="pin-mark" aria-label="Pinned">⌖</span>' : ""}
          ${chat.muted ? '<span class="muted-mark" aria-label="Muted">◌</span>' : ""}
        </button>`;
    }).join("")
    : '<div class="conversation-empty">No conversations found.<br />Try another name or filter.</div>';
  renderBulkToolbar();
}

function renderBulkToolbar() {
  $("#bulk-toolbar").hidden = !selectionMode;
  $("#toggle-select-mode").setAttribute("aria-pressed", String(selectionMode));
  $("#toggle-select-mode").textContent = selectionMode ? "Done" : "Select";
  $("#bulk-count").textContent = String(selectedChatIds.size);
  $("#open-bulk-compose").disabled = selectedChatIds.size === 0;
}

function avatarHTML(chat, extraClass = "") {
  const [start, end] = chat.colors || ["#b5a8c8", "#8776a3"];
  return `<span class="avatar ${extraClass}" style="background:linear-gradient(145deg, ${start}, ${end})" aria-hidden="true"><span>${escapeHTML(chat.initials)}</span>${chat.online ? '<i class="presence-dot"></i>' : ""}</span>`;
}

function renderActiveChat() {
  const chat = activeChat();
  const empty = !chat;
  $("#empty-state").hidden = !empty;
  $("#active-chat").hidden = empty;
  if (empty) {
    renderList();
    return;
  }

  $("#header-avatar").outerHTML = avatarHTML(chat, "header-avatar").replace("<span class=\"avatar", '<span id="header-avatar" class="avatar');
  $("#header-name").textContent = chat.name;
  $("#header-status").textContent = chat.status;
  $("#header-status").classList.toggle("online", chat.online);
  $("#today-label").textContent = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  $("#pinned-banner").hidden = !chat.pinned;
  $("#pinned-banner").textContent = chat.pinned ? `⌖ Pinned conversation · ${chat.name}` : "";
  const messageQuery = $("#message-search-input").value.trim().toLowerCase();
  const visibleMessages = messageQuery
    ? chat.messages.filter((message) => String(message.text || "").toLowerCase().includes(messageQuery))
    : chat.messages;
  $("#message-search-count").textContent = messageQuery ? `${visibleMessages.length} found` : "";
  messagesEl.innerHTML = visibleMessages.length
    ? visibleMessages.map((message) => renderMessage(chat, message)).join("")
    : messageQuery ? '<div class="conversation-empty">No messages match that search.</div>' : "";
  messagesEl.scrollTop = messagesEl.scrollHeight;
  renderChatMenu();
  renderList();
}

function renderMessage(chat, message) {
  const sent = message.from === "me";
  const time = escapeHTML(message.time);
  const author = sent ? "You" : (message.author || chat.name.split(" ")[0]);
  const image = safeMediaUrl(message.image, "image") ? `<img class="message-image" src="${escapeHTML(message.image)}" alt="Image attachment" />` : "";
  const audio = safeMediaUrl(message.audio, "audio") ? `<audio class="message-audio" controls src="${escapeHTML(message.audio)}">Audio attachment</audio>` : "";
  const text = message.text ? `<span>${escapeHTML(message.text)}</span>` : "";
  const reply = message.reply ? `<span class="reply-quote">${escapeHTML(message.reply.author)}: ${escapeHTML(message.reply.text)}</span>` : "";
  const messageReactions = Array.isArray(message.reactions) ? message.reactions : [];
  const reactions = messageReactions.length
    ? `<div class="message-reactions">${messageReactions.map((reaction) => `<span class="message-reaction">${escapeHTML(reaction)}</span>`).join("")}</div>`
    : "";
  return `
    <article class="message-group${sent ? " sent" : ""}" data-message-id="${escapeHTML(message.id)}">
      <div class="message-actions">
        <button type="button" data-open-message="${escapeHTML(message.id)}" aria-label="Message options" title="Message options">···</button>
      </div>
      ${sent ? "" : `<div class="message-author">${avatarHTML(chat, "tiny-avatar")}<span>${escapeHTML(author)}</span></div>`}
      <div class="message-bubble">${reply}${text}${image}${audio}${message.edited ? '<span class="message-edited">edited</span>' : ""}</div>
      ${reactions}
      <div class="message-meta"><time>${time}</time>${message.starred ? '<span title="Starred">☆</span>' : ""}${sent ? `<span class="receipt" aria-label="${message.read ? "Read" : "Sent"}">${message.read ? "✓✓" : "✓"}</span>` : ""}</div>
    </article>`;
}

function safeMediaUrl(value, kind) {
  if (typeof value !== "string") return false;
  return kind === "image"
    ? /^data:image\/(?:png|jpeg|gif|webp|avif);base64,/i.test(value)
    : /^data:audio\/(?:mpeg|mp4|ogg|wav|webm|aac|x-m4a)(?:;[^;,]+)*;base64,/i.test(value);
}

function updateLastMessage(chat, message) {
  const now = new Date();
  chat.time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (!message.id) message.id = `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (!Array.isArray(message.reactions)) message.reactions = [];
  chat.messages.push(message);
}

function renderChatMenu() {
  const chat = activeChat();
  if (!chat) return;
  $("#chat-action-pin").textContent = chat.pinned ? "Unpin conversation" : "Pin conversation";
  $("#chat-action-favorite").textContent = chat.favorite ? "Remove favorite" : "Add to favorites";
  $("#chat-action-mute").textContent = chat.muted ? "Unmute conversation" : "Mute conversation";
  $("#chat-action-archive").textContent = chat.archived ? "Restore from archive" : "Archive conversation";
}

function setAppView(view) {
  appShell.dataset.view = view;
  $("#chat-section").hidden = view !== "chats";
  $("#updates-view").hidden = view !== "updates";
  $("#calls-view").hidden = view !== "calls";
  $("#updates-panel").hidden = view !== "updates";
  $("#calls-panel").hidden = view !== "calls";
  document.querySelectorAll(".section-nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  if (view !== "chats") appShell.classList.remove("chat-open");
  if (view === "updates") {
    renderStatuses();
    (window.innerWidth <= 760 ? $("#new-status") : $("#panel-new-status")).focus({ preventScroll: true });
  }
  if (view === "calls") renderCalls();
}

function renderStatuses() {
  const statuses = state.statuses.filter((status) => Date.now() - status.createdAt < 24 * 60 * 60 * 1000)
    .sort((a, b) => b.createdAt - a.createdAt);
  $("#status-list").innerHTML = statuses.length
    ? statuses.map((status) => {
      const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(status.createdAt));
      return `<button class="status-card${status.mine ? " mine" : ""}" type="button" data-status-id="${escapeHTML(status.id)}">
        ${avatarHTML({ initials: status.initials, colors: status.colors, online: false }, "status-ring")}
        <span class="status-card-copy"><strong>${escapeHTML(status.mine ? "You" : status.author)}</strong><span>${escapeHTML(status.text)}</span></span><time>${escapeHTML(time)}</time>
      </button>`;
    }).join("")
    : '<div class="conversation-empty">No updates yet. Share a small moment from your day.</div>';
  $("#updates-feed").innerHTML = statuses.length
    ? statuses.map((status) => {
      const time = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.createdAt));
      return `<article class="update-card${status.mine ? " mine" : ""}"><header>${avatarHTML({ initials: status.initials, colors: status.colors, online: false }, "tiny-avatar")}<strong>${escapeHTML(status.mine ? "You" : status.author)}</strong><time>${escapeHTML(time)}</time></header><p>${escapeHTML(status.text)}</p></article>`;
    }).join("")
    : '<div class="conversation-empty">No updates yet. Share a small moment from your day.</div>';
}

function renderCalls() {
  const calls = state.calls.slice().sort((a, b) => b.createdAt - a.createdAt);
  const markup = calls.length
    ? calls.map((call) => {
      const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(call.createdAt));
      return `<article class="call-feed-card"><span class="call-kind">${call.kind === "video" ? "▣" : "☎"}</span><span class="call-copy"><strong>${escapeHTML(call.name)}</strong><span>${call.direction === "outgoing" ? "Outgoing" : "Incoming"} ${call.kind} call · demo record only</span></span><time>${escapeHTML(date)}</time></article>`;
    }).join("")
    : '<div class="conversation-empty">No call activity yet. Start a demo call from a conversation.</div>';
  $("#call-list").innerHTML = calls.length ? calls.map((call) => {
    const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(call.createdAt));
    return `<article class="call-item"><span class="call-kind">${call.kind === "video" ? "▣" : "☎"}</span><span class="call-copy"><strong>${escapeHTML(call.name)}</strong><span>${call.kind} call · ${escapeHTML(date)}</span></span></article>`;
  }).join("") : '<div class="conversation-empty">Your demo call history will show up here.</div>';
  $("#calls-feed").innerHTML = markup;
}

function recordDemoCall(kind) {
  const chat = activeChat();
  if (!chat) return;
  state.calls.push({ id: `call-${Date.now()}`, chatId: chat.id, name: chat.name, kind, direction: "outgoing", createdAt: Date.now() });
  saveState();
  renderCalls();
  showToast(`${kind === "video" ? "Video" : "Voice"} call saved as a local demo record.`);
}

function createStatus(text) {
  const message = text.trim();
  if (!message || message.length > 280) {
    showToast("Write an update up to 280 characters.");
    return;
  }
  state.statuses.push({ id: `status-${Date.now()}`, author: state.profile.name, initials: initialsFor(state.profile.name), colors: ["#a99ac8", "#766696"], text: message, createdAt: Date.now(), mine: true });
  saveState();
  $("#status-dialog").close();
  setAppView("updates");
  showToast("Your update is saved on this device.");
}

function initialsFor(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "Y";
}

function selectChat(chatId) {
  const chat = state.chats.find((item) => item.id === chatId);
  if (!chat) return;
  if (recorderState && recorderState.chatId !== chatId) recorderState.recorder.stop();
  activeId = chatId;
  chat.unread = 0;
  pendingImage = null;
  pendingAudio = null;
  clearAttachmentPreview();
  delete inputEl.dataset.editingMessage;
  delete inputEl.dataset.replyTo;
  inputEl.value = "";
  inputEl.style.height = "auto";
  renderReplyDraft();
  $("#message-search-input").value = "";
  $("#message-search-bar").hidden = true;
  setAppView("chats");
  saveState();
  renderActiveChat();
  appShell.classList.add("chat-open");
  inputEl.focus();
}

function setSelectionMode(enabled) {
  selectionMode = enabled;
  selectedChatIds.clear();
  if (enabled) appShell.classList.remove("chat-open");
  renderList();
}

function openBulkDialog() {
  const recipients = state.chats.filter((chat) => selectedChatIds.has(chat.id));
  if (recipients.length === 0) {
    showToast("Select at least one conversation first.");
    return;
  }
  $("#bulk-recipient-count").textContent = `${recipients.length} ${recipients.length === 1 ? "recipient" : "recipients"}`;
  $("#bulk-recipient-names").textContent = recipients.map((chat) => chat.name).join(", ");
  $("#bulk-message").value = "";
  $("#bulk-dialog").showModal();
  $("#bulk-message").focus();
}

function sendBulkMessage(event) {
  event.preventDefault();
  const text = $("#bulk-message").value.trim();
  const recipients = state.chats.filter((chat) => selectedChatIds.has(chat.id));
  if (!text || recipients.length === 0) {
    showToast(recipients.length ? "Write a message before saving." : "Select at least one conversation first.");
    return;
  }
  const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  recipients.forEach((chat) => {
    updateLastMessage(chat, { from: "me", text, time, read: false });
  });
  saveState();
  $("#bulk-dialog").close();
  setSelectionMode(false);
  renderActiveChat();
  showToast(`Message saved in ${recipients.length} selected ${recipients.length === 1 ? "chat" : "chats"} on this device.`);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("visible"), 2300);
}

function sendMessage(event) {
  event.preventDefault();
  const text = inputEl.value.trim();
  const chat = activeChat();
  if (!chat) return;
  const editingId = inputEl.dataset.editingMessage;
  if (editingId) {
    const message = chat.messages.find((item) => item.id === editingId);
    if (!message || !text) {
      showToast("An edited message can't be empty.");
      return;
    }
    message.text = text;
    message.edited = true;
    delete inputEl.dataset.editingMessage;
    inputEl.value = "";
    inputEl.style.height = "auto";
    saveState();
    renderActiveChat();
    showToast("Message updated in this demo.");
    return;
  }
  if (!text && !pendingImage && !pendingAudio) return;

  const replyTo = inputEl.dataset.replyTo;
  const replyMessage = replyTo ? chat.messages.find((message) => message.id === replyTo) : null;
  updateLastMessage(chat, {
    from: "me",
    text,
    image: pendingImage,
    audio: pendingAudio,
    reply: replyMessage ? { author: replyMessage.from === "me" ? "You" : chat.name, text: replyMessage.text || (replyMessage.image ? "Photo" : "Voice message") } : null,
    time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    read: false,
  });
  chat.unread = 0;
  pendingImage = null;
  pendingAudio = null;
  delete inputEl.dataset.replyTo;
  inputEl.value = "";
  inputEl.style.height = "auto";
  clearAttachmentPreview();
  renderReplyDraft();
  saveState();
  renderActiveChat();
  simulateReply(chat);
}

function simulateReply(chat) {
  clearTimeout(typingTimer);
  const indicator = $("#typing-indicator");
  if (!chat.online || Math.random() > 0.6) {
    indicator.hidden = true;
    return;
  }
  indicator.hidden = false;
  typingTimer = setTimeout(() => {
    if (activeId !== chat.id) {
      indicator.hidden = true;
      return;
    }
    const replies = ["That made me smile 😊", "Tell me more!", "I'm glad you shared that with me 💛", "Aww, that's lovely.", "Right back at you ✨"];
    const lastSent = chat.messages.slice().reverse().find((message) => message.from === "me");
    if (lastSent) lastSent.read = true;
    updateLastMessage(chat, {
      from: "them",
      author: chat.isGroup && chat.members.length ? chat.members[Math.floor(Math.random() * chat.members.length)] : undefined,
      text: replies[Math.floor(Math.random() * replies.length)],
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    });
    indicator.hidden = true;
    saveState();
    renderActiveChat();
  }, 1600 + Math.random() * 1000);
}

function clearAttachmentPreview() {
  attachmentPreview.replaceChildren();
  attachmentPreview.hidden = true;
  attachmentInput.value = "";
}

function addAttachment(file) {
  if (!file) return;
  const supportedImage = /^image\/(?:png|jpeg|gif|webp|avif)$/i.test(file.type);
  const supportedAudio = /^audio\/(?:mpeg|mp4|ogg|wav|webm|aac|x-m4a)$/i.test(file.type);
  if (!supportedImage && !supportedAudio) {
    showToast("Choose a photo or audio file.");
    return;
  }
  if (file.size > 1024 * 1024) {
    showToast("Choose a file smaller than 1 MB to fit local storage.");
    return;
  }
  const targetChatId = activeId;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    if (activeId !== targetChatId) {
      showToast("Attachment discarded because you changed conversations.");
      return;
    }
    if (file.type.startsWith("image/")) {
      pendingImage = reader.result;
      pendingAudio = null;
      attachmentPreview.innerHTML = `<img src="${escapeHTML(pendingImage)}" alt="Photo ready to send" /><button type="button" aria-label="Remove attachment">×</button>`;
    } else {
      pendingAudio = reader.result;
      pendingImage = null;
      attachmentPreview.innerHTML = `<audio controls src="${escapeHTML(pendingAudio)}"></audio><button type="button" aria-label="Remove attachment">×</button>`;
    }
    attachmentPreview.hidden = false;
    attachmentPreview.querySelector("button").addEventListener("click", clearAttachmentPreview);
  });
  reader.addEventListener("error", () => showToast("Couldn't read that file. Try another one."));
  reader.readAsDataURL(file);
}

function toggleVoiceRecording() {
  if (recorderState) {
    recorderState.recorder.stop();
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
    showToast("Voice recording needs a browser with microphone support on HTTPS or localhost.");
    return;
  }
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    let recorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      console.error("Could not initialize voice recording:", error);
      showToast("This browser couldn't start audio recording.");
      return;
    }
    const chunks = [];
    const recordingChatId = activeId;
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      clearTimeout(recorderTimeout);
      stream.getTracks().forEach((track) => track.stop());
      recorderState = null;
      $("#record-audio").classList.remove("recording");
      $("#record-audio").setAttribute("aria-label", "Record a voice note");
      if (activeId !== recordingChatId) {
        showToast("Voice note discarded because you changed conversations.");
        return;
      }
      const recording = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (recording.size > 1024 * 1024) {
        showToast("Voice note is over 1 MB. Try recording something shorter.");
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        pendingAudio = reader.result;
        pendingImage = null;
        attachmentPreview.innerHTML = `<audio controls src="${escapeHTML(pendingAudio)}"></audio><button type="button" aria-label="Remove attachment">×</button>`;
        attachmentPreview.hidden = false;
        attachmentPreview.querySelector("button").addEventListener("click", clearAttachmentPreview);
        showToast("Voice note ready. Press send to add it to this chat.");
      });
      reader.addEventListener("error", () => showToast("Couldn't prepare that voice note."));
      reader.readAsDataURL(recording);
    }, { once: true });
    recorder.addEventListener("error", () => showToast("The browser couldn't record audio."));
    recorderState = { recorder, chatId: recordingChatId };
    recorder.start();
    $("#record-audio").classList.add("recording");
    $("#record-audio").setAttribute("aria-label", "Stop recording");
    showToast("Recording… tap the red dot to stop.");
    recorderTimeout = setTimeout(() => {
      if (recorderState) recorderState.recorder.stop();
    }, 60000);
  }).catch((error) => {
    console.error("Could not start voice recording:", error);
    showToast("Microphone access was not available. Check browser permissions.");
  });
}

function createConversation() {
  const dialog = $("#new-chat-dialog");
  $("#new-chat-name").value = "";
  dialog.showModal();
  $("#new-chat-name").focus();
}

function startConversation(name) {
  const cleanedName = name.trim().replace(/\s+/g, " ");
  if (!cleanedName || cleanedName.length > 40) {
    showToast("Add a name with no more than 40 characters.");
    return;
  }
  const existing = state.chats.find((chat) => chat.name.toLowerCase() === cleanedName.toLowerCase());
  if (existing) {
    $("#new-chat-dialog").close();
    selectChat(existing.id);
    return;
  }
  const colors = [["#d6b4a1", "#9b7182"], ["#91b5a6", "#688b81"], ["#c3a9d8", "#8474ac"], ["#d5bb87", "#a98053"]];
  const initials = cleanedName.split(" ").slice(0, 2).map((part) => part[0].toUpperCase()).join("");
  const chat = {
    id: `chat-${Date.now()}`,
    name: cleanedName,
    initials,
    colors: colors[state.chats.length % colors.length],
    online: false,
    status: "say hello to begin",
    favorite: false,
    pinned: false,
    archived: false,
    muted: false,
    unread: 0,
    time: "new",
    messages: [],
  };
  state.chats.unshift(chat);
  saveState();
  $("#new-chat-dialog").close();
  activeFilter = "all";
  $("#chat-search").value = "";
  setAppView("chats");
  document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.filter === "all"));
  selectChat(chat.id);
}

function createGroup(name, membersText) {
  const cleanedName = name.trim().replace(/\s+/g, " ");
  const members = [...new Set(membersText.split(",").map((member) => member.trim().replace(/\s+/g, " ")).filter(Boolean))];
  if (!cleanedName || cleanedName.length > 40 || members.length < 2) {
    showToast("Add a group name and at least two people, separated by commas.");
    return;
  }
  if (members.some((member) => member.length > 40)) {
    showToast("Keep each person's name under 40 characters.");
    return;
  }
  const colors = [["#9b8cbf", "#72618e"], ["#8bac9f", "#597e70"], ["#c59d9c", "#9d6d79"], ["#c2a266", "#997844"]];
  const chat = {
    id: `group-${Date.now()}`,
    name: cleanedName,
    initials: initialsFor(cleanedName),
    colors: colors[state.chats.length % colors.length],
    online: false,
    status: `${members.length} members · local group`,
    members,
    isGroup: true,
    favorite: false,
    pinned: false,
    archived: false,
    muted: false,
    unread: 0,
    time: "new",
    messages: [],
  };
  state.chats.unshift(chat);
  saveState();
  $("#group-dialog").close();
  $("#group-form").reset();
  activeFilter = "all";
  $("#chat-search").value = "";
  setAppView("chats");
  document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.filter === "all"));
  selectChat(chat.id);
  showToast("Group created in this local demo.");
}

function renderReplyDraft() {
  const replyId = inputEl.dataset.replyTo;
  const chat = activeChat();
  const message = chat && chat.messages.find((item) => item.id === replyId);
  $("#reply-draft").hidden = !message;
  if (message) $("#reply-draft-text").textContent = `Replying to ${message.from === "me" ? "yourself" : chat.name}: ${message.text || (message.image ? "Photo" : "Voice message")}`;
  if (!message) delete inputEl.dataset.replyTo;
}

function openMessageActions(messageId) {
  const chat = activeChat();
  const message = chat && chat.messages.find((item) => item.id === messageId);
  if (!message) return;
  activeMessageId = messageId;
  $("#message-action-preview").textContent = message.text || (message.image ? "Photo attachment" : "Voice message");
  document.querySelector('[data-message-action="edit"]').hidden = message.from !== "me" || !message.text;
  $("#message-action-dialog").showModal();
}

function handleMessageAction(action) {
  const chat = activeChat();
  const message = chat && chat.messages.find((item) => item.id === activeMessageId);
  if (!chat || !message) return;
  $("#message-action-dialog").close();
  if (action === "reply") {
    inputEl.dataset.replyTo = message.id;
    renderReplyDraft();
    inputEl.focus();
    return;
  }
  if (action === "react") {
    if (message.reactions.includes("💛")) message.reactions = message.reactions.filter((reaction) => reaction !== "💛");
    else message.reactions.push("💛");
  } else if (action === "star") {
    message.starred = !message.starred;
  } else if (action === "edit" && message.from === "me" && message.text) {
    inputEl.value = message.text;
    inputEl.dataset.editingMessage = message.id;
    inputEl.focus();
    showToast("Edit your message, then press send to save.");
    return;
  } else if (action === "delete") {
    chat.messages = chat.messages.filter((item) => item.id !== message.id);
  }
  saveState();
  renderActiveChat();
}

function handleChatAction(action) {
  const chat = activeChat();
  if (!chat) return;
  $("#chat-menu").hidden = true;
  if (action === "pin") chat.pinned = !chat.pinned;
  else if (action === "favorite") chat.favorite = !chat.favorite;
  else if (action === "mute") chat.muted = !chat.muted;
  else if (action === "unread") chat.unread = chat.unread ? 0 : 1;
  else if (action === "archive") {
    chat.archived = !chat.archived;
    if (activeFilter === "archived") activeFilter = "all";
    document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.filter === activeFilter));
  } else if (action === "clear") {
    if (!window.confirm(`Clear all messages in "${chat.name}" on this device?`)) return;
    chat.messages = [];
  } else if (action === "delete") {
    if (!window.confirm(`Delete "${chat.name}" and its local messages? This can't be undone.`)) return;
    state.chats = state.chats.filter((item) => item.id !== chat.id);
    activeId = state.chats.length ? state.chats[0].id : null;
    activeFilter = "all";
    document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.filter === "all"));
  }
  saveState();
  renderActiveChat();
  showToast("Conversation settings updated.");
}

function openProfileSettings() {
  $("#profile-name").value = state.profile.name;
  $("#profile-about").value = state.profile.about;
  $("#dark-mode").checked = state.profile.darkMode;
  $("#profile-dialog").showModal();
}

function saveProfile(event) {
  event.preventDefault();
  const name = $("#profile-name").value.trim();
  const about = $("#profile-about").value.trim();
  if (!name || name.length > 40 || about.length > 80) {
    showToast("Check your name and about text.");
    return;
  }
  state.profile = { name, about, darkMode: $("#dark-mode").checked };
  saveState();
  applyProfile();
  $("#profile-dialog").close();
}

function applyProfile() {
  $(".profile-copy strong").textContent = state.profile.name;
  $(".profile-copy span").textContent = state.profile.about;
  $(".avatar-me span").textContent = initialsFor(state.profile.name).slice(0, 1);
  appShell.classList.toggle("dark-mode", state.profile.darkMode);
  document.body.classList.toggle("dark-mode", state.profile.darkMode);
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `little-talk-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Backup downloaded.");
}

function importBackup(file) {
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    showToast("Choose a backup smaller than 3 MB.");
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = normalizeState(JSON.parse(reader.result));
      if (imported.chats.length > 200 || imported.chats.some((chat) => chat.messages.length > 10000)) {
        throw new Error("This backup contains too much data.");
      }
      state = imported;
      activeId = state.chats.length ? state.chats[0].id : null;
      saveState();
      applyProfile();
      setAppView("chats");
      renderActiveChat();
      renderStatuses();
      $("#profile-dialog").close();
      showToast("Backup imported on this device.");
    } catch (error) {
      console.error("Could not import Little Talk backup:", error);
      showToast("That backup file is invalid or damaged.");
    }
  });
  reader.addEventListener("error", () => showToast("Couldn't read that backup file."));
  reader.readAsText(file);
}

listEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-id]");
  if (!button) return;
  if (selectionMode) {
    const chatId = button.dataset.chatId;
    if (selectedChatIds.has(chatId)) selectedChatIds.delete(chatId);
    else selectedChatIds.add(chatId);
    renderList();
  } else {
    selectChat(button.dataset.chatId);
  }
});

document.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeFilter = tab.dataset.filter;
    document.querySelectorAll(".filter-tab").forEach((item) => item.classList.toggle("active", item === tab));
    setAppView("chats");
    renderList();
  });
});

document.querySelectorAll(".section-nav-button").forEach((button) => {
  button.addEventListener("click", () => setAppView(button.dataset.view));
});

$("#chat-search").addEventListener("input", renderList);
$("#clear-search").addEventListener("click", () => {
  $("#chat-search").value = "";
  $("#chat-search").focus();
  renderList();
});
$("#new-chat").addEventListener("click", createConversation);
$("#empty-new-chat").addEventListener("click", createConversation);
$("#new-group").addEventListener("click", () => {
  $("#group-form").reset();
  $("#group-dialog").showModal();
  $("#group-name").focus();
});
$("#group-form").addEventListener("submit", (event) => {
  event.preventDefault();
  createGroup($("#group-name").value, $("#group-members").value);
});
$("#cancel-group").addEventListener("click", () => $("#group-dialog").close());
$("#close-group-dialog").addEventListener("click", () => $("#group-dialog").close());
$("#new-status").addEventListener("click", () => {
  $("#status-form").reset();
  $("#status-dialog").showModal();
  $("#status-message").focus();
});
$("#panel-new-status").addEventListener("click", () => $("#new-status").click());
$("#status-form").addEventListener("submit", (event) => {
  event.preventDefault();
  createStatus($("#status-message").value);
});
$("#cancel-status").addEventListener("click", () => $("#status-dialog").close());
$("#close-status-dialog").addEventListener("click", () => $("#status-dialog").close());
$("#status-list").addEventListener("click", (event) => {
  const card = event.target.closest("[data-status-id]");
  const status = card && state.statuses.find((item) => item.id === card.dataset.statusId);
  if (status) showToast(`${status.mine ? "You" : status.author}: ${status.text}`);
});
$("#toggle-select-mode").addEventListener("click", () => setSelectionMode(!selectionMode));
$("#cancel-bulk").addEventListener("click", () => setSelectionMode(false));
$("#select-visible").addEventListener("click", () => {
  visibleChats().forEach((chat) => selectedChatIds.add(chat.id));
  renderList();
});
$("#open-bulk-compose").addEventListener("click", openBulkDialog);
$("#bulk-form").addEventListener("submit", sendBulkMessage);
$("#cancel-bulk-compose").addEventListener("click", () => $("#bulk-dialog").close());
$("#close-bulk-dialog").addEventListener("click", () => $("#bulk-dialog").close());
$("#new-chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  startConversation($("#new-chat-name").value);
});
$("#cancel-new-chat").addEventListener("click", () => $("#new-chat-dialog").close());
$("#close-new-chat").addEventListener("click", () => $("#new-chat-dialog").close());
$("#back-to-list").addEventListener("click", () => appShell.classList.remove("chat-open"));
$("#message-form").addEventListener("submit", sendMessage);
$("#record-audio").addEventListener("click", toggleVoiceRecording);
$("#message-input").addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, 108)}px`;
});
$("#message-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    $("#message-form").requestSubmit();
  }
});
$("#cancel-reply").addEventListener("click", () => {
  delete inputEl.dataset.replyTo;
  renderReplyDraft();
});
$("#attach-button").addEventListener("click", () => attachmentInput.click());
attachmentInput.addEventListener("change", (event) => addAttachment(event.target.files[0]));
$("#emoji-button").addEventListener("click", () => {
  inputEl.value += " 😊";
  inputEl.focus();
});
$("#reset-demo").addEventListener("click", () => {
  state = defaultState();
  activeId = state.chats.length ? state.chats[0].id : null;
  if (state.chats[0]) state.chats[0].unread = 0;
  activeFilter = "all";
  selectionMode = false;
  selectedChatIds.clear();
  setAppView("chats");
  $("#chat-search").value = "";
  saveState();
  applyProfile();
  renderActiveChat();
  renderStatuses();
  renderCalls();
  showToast("Your demo chats are back.");
});
$(".header-action[aria-label='Search this conversation']").addEventListener("click", () => {
  $("#chat-menu").hidden = true;
  $("#message-search-bar").hidden = !$("#message-search-bar").hidden;
  if (!$("#message-search-bar").hidden) $("#message-search-input").focus();
  else {
    $("#message-search-input").value = "";
    renderActiveChat();
  }
});
$("#message-search-input").addEventListener("input", renderActiveChat);
$("#close-message-search").addEventListener("click", () => {
  $("#message-search-input").value = "";
  $("#message-search-bar").hidden = true;
  renderActiveChat();
});
$(".header-action[aria-label='More conversation options']").addEventListener("click", () => {
  const chat = activeChat();
  if (!chat) return;
  $("#chat-menu").hidden = !$("#chat-menu").hidden;
});
$("#chat-menu").addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-action]");
  if (button) handleChatAction(button.dataset.chatAction);
});
$("#voice-call").addEventListener("click", () => recordDemoCall("voice"));
$("#video-call").addEventListener("click", () => recordDemoCall("video"));
messagesEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-message]");
  if (button) openMessageActions(button.dataset.openMessage);
});
$("#message-action-form").addEventListener("click", (event) => {
  const button = event.target.closest("[data-message-action]");
  if (button) handleMessageAction(button.dataset.messageAction);
});
$("#close-message-action").addEventListener("click", () => $("#message-action-dialog").close());
$(".profile-menu").addEventListener("click", openProfileSettings);
$("#profile-form").addEventListener("submit", saveProfile);
$("#cancel-profile").addEventListener("click", () => {
  applyProfile();
  $("#profile-dialog").close();
});
$("#close-profile-dialog").addEventListener("click", () => {
  applyProfile();
  $("#profile-dialog").close();
});
$("#dark-mode").addEventListener("change", () => {
  appShell.classList.toggle("dark-mode", $("#dark-mode").checked);
  document.body.classList.toggle("dark-mode", $("#dark-mode").checked);
});
$("#export-data").addEventListener("click", exportBackup);
$("#import-data").addEventListener("change", (event) => {
  importBackup(event.target.files[0]);
  event.target.value = "";
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#chat-search").focus();
  }
  if (event.key === "Escape" && window.innerWidth <= 760) appShell.classList.remove("chat-open");
  if (event.key === "Escape") $("#chat-menu").hidden = true;
});

applyProfile();
renderActiveChat();
renderStatuses();
renderCalls();
