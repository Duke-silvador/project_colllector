/* app.js — Offline Task Manager */
(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    tasks: [],          // all tasks
    filters: { search: '', priority: 'all', tag: 'all' },
    lastDeleted: null,  // for undo
  };

  const STATUSES = ['todo', 'inprogress', 'done'];
  const PRIORITIES = ['low', 'medium', 'high'];

  // ---------- DOM refs ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const el = {
    board: $('#board'),
    lists: {},
    counts: {},
    modal: $('#task-modal'),
    modalTitle: $('#modal-title'),
    form: $('#task-form'),
    fId: $('#task-id'),
    fTitle: $('#task-title'),
    fDesc: $('#task-description'),
    fPriority: $('#task-priority'),
    fStatus: $('#task-status'),
    fTags: $('#task-tags'),
    fDue: $('#task-due'),
    deleteBtn: $('#delete-task-btn'),
    cancelBtn: $('#cancel-btn'),
    closeBtn: $('#modal-close'),
    addBtn: $('#add-task-btn'),
    searchInput: $('#search-input'),
    filterPriority: $('#filter-priority'),
    filterTag: $('#filter-tag'),
    clearFilters: $('#clear-filters'),
    toast: $('#toast'),
    connStatus: $('#connection-status'),
    exportBtn: $('#export-btn'),
    importInput: $('#import-input'),
    template: $('#task-template'),
  };

  STATUSES.forEach((s) => {
    el.lists[s] = document.querySelector(`.task-list[data-status="${s}"]`);
    el.counts[s] = document.querySelector(`.column[data-status="${s}"] [data-count]`);
  });

  // ---------- Utilities ----------
  const uid = () =>
    't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.toast.classList.remove('show'), 2200);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function isOverdue(iso) {
    if (!iso) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(iso + 'T00:00:00') < today;
  }

  function parseTags(raw) {
    return raw
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .filter((t, i, arr) => arr.indexOf(t) === i);
  }

  function allTags() {
    const set = new Set();
    state.tasks.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }

  function matchesFilters(task) {
    const f = state.filters;
    if (f.priority !== 'all' && task.priority !== f.priority) return false;
    if (f.tag !== 'all' && !(task.tags || []).includes(f.tag)) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = [task.title, task.description, ...(task.tags || [])]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  // ---------- Rendering ----------
  function render() {
    // Reset columns
    STATUSES.forEach((s) => {
      el.lists[s].innerHTML = '';
      el.counts[s].textContent = '0';
    });

    // Update tag filter options (preserve selection)
    const tags = allTags();
    const currentTag = state.filters.tag;
    el.filterTag.innerHTML = '<option value="all">All Tags</option>';
    tags.forEach((tag) => {
      const opt = document.createElement('option');
      opt.value = tag;
      opt.textContent = tag;
      el.filterTag.appendChild(opt);
    });
    el.filterTag.value = tags.includes(currentTag) ? currentTag : 'all';
    if (!tags.includes(currentTag)) state.filters.tag = 'all';

    // Render tasks
    const counts = { todo: 0, inprogress: 0, done: 0 };
    state.tasks.forEach((task) => {
      if (!STATUSES.includes(task.status)) task.status = 'todo';
      counts[task.status]++;
      if (!matchesFilters(task)) return;
      el.lists[task.status].appendChild(createTaskCard(task));
    });

    STATUSES.forEach((s) => (el.counts[s].textContent = String(counts[s])));

    // Empty state
    const totalVisible = Object.values(counts).reduce((a, b) => a + b, 0);
    if (totalVisible === 0) {
      STATUSES.forEach((s) => {
        if (!el.lists[s].children.length) {
          const div = document.createElement('div');
          div.className = 'no-tasks';
          div.textContent = state.tasks.length === 0 ? 'No tasks yet' : 'No matches';
          el.lists[s].appendChild(div);
        }
      });
    }
  }

  function createTaskCard(task) {
    const node = el.template.content.firstElementChild.cloneNode(true);
    node.dataset.id = task.id;
    node.dataset.priority = task.priority;
    node.dataset.status = task.status;

    const titleEl = node.querySelector('.task-title');
    titleEl.textContent = task.title;

    const descEl = node.querySelector('.task-desc');
    descEl.textContent = task.description || '';

    const badge = node.querySelector('.priority-badge');
    badge.textContent = task.priority;

    const tagsEl = node.querySelector('.task-tags');
    (task.tags || []).forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = '#' + tag;
      tagsEl.appendChild(span);
    });

    const dueEl = node.querySelector('.task-due');
    if (task.due) {
      dueEl.textContent = '📅 ' + formatDate(task.due);
      if (isOverdue(task.due) && task.status !== 'done') {
        dueEl.classList.add('overdue');
        dueEl.textContent += ' (overdue)';
      }
    }

    return node;
  }

  // ---------- Persistence ----------
  async function persist(task) {
    try {
      await DB.put(task);
    } catch (err) {
      console.error('Persist failed:', err);
      toast('⚠️ Save failed — retrying in memory');
    }
  }

  async function removeFromDB(id) {
    try {
      await DB.delete(id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  async function loadAll() {
    try {
      state.tasks = await DB.getAll();
      // Normalize
      state.tasks = state.tasks.map((t) => ({
        id: t.id || uid(),
        title: String(t.title || 'Untitled'),
        description: String(t.description || ''),
        priority: PRIORITIES.includes(t.priority) ? t.priority : 'medium',
        status: STATUSES.includes(t.status) ? t.status : 'todo',
        tags: Array.isArray(t.tags) ? t.tags.map((x) => String(x).toLowerCase()) : [],
        due: t.due || '',
        createdAt: t.createdAt || Date.now(),
        updatedAt: t.updatedAt || Date.now(),
        order: typeof t.order === 'number' ? t.order : Date.now(),
      }));
      state.tasks.sort((a, b) => a.order - b.order);
    } catch (err) {
      console.error('Load failed:', err);
      toast('⚠️ Could not load saved tasks');
      state.tasks = [];
    }
  }

  // ---------- Modal ----------
  function openModal(task = null) {
    if (task) {
      el.modalTitle.textContent = 'Edit Task';
      el.fId.value = task.id;
      el.fTitle.value = task.title;
      el.fDesc.value = task.description || '';
      el.fPriority.value = task.priority;
      el.fStatus.value = task.status;
      el.fTags.value = (task.tags || []).join(', ');
      el.fDue.value = task.due || '';
      el.deleteBtn.hidden = false;
    } else {
      el.modalTitle.textContent = 'New Task';
      el.form.reset();
      el.fId.value = '';
      el.fPriority.value = 'medium';
      el.fStatus.value = 'todo';
      el.deleteBtn.hidden = true;
    }
    el.modal.classList.add('open');
    el.modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => el.fTitle.focus(), 50);
  }

  function closeModal() {
    el.modal.classList.remove('open');
    el.modal.setAttribute('aria-hidden', 'true');
    el.form.reset();
  }

  // ---------- CRUD ----------
  async function saveTask(e) {
    e.preventDefault();
    const id = el.fId.value;
    const title = el.fTitle.value.trim();
    if (!title) {
      el.fTitle.focus();
      return;
    }

    const data = {
      title,
      description: el.fDesc.value.trim(),
      priority: el.fPriority.value,
      status: el.fStatus.value,
      tags: parseTags(el.fTags.value),
      due: el.fDue.value || '',
      updatedAt: Date.now(),
    };

    if (id) {
      const existing = state.tasks.find((t) => t.id === id);
      if (existing) {
        Object.assign(existing, data);
        await persist(existing);
        toast('✅ Task updated');
      }
    } else {
      const task = {
        id: uid(),
        ...data,
        createdAt: Date.now(),
        order: Date.now(),
      };
      state.tasks.push(task);
      await persist(task);
      toast('✅ Task created');
    }

    state.tasks.sort((a, b) => a.order - b.order);
    render();
    closeModal();
  }

  async function deleteTask(id) {
    const idx = state.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const [removed] = state.tasks.splice(idx, 1);
    state.lastDeleted = removed;
    await removeFromDB(id);
    render();
    toast('🗑️ Deleted — Ctrl+Z to undo');
  }

  async function undoDelete() {
    if (!state.lastDeleted) {
      toast('Nothing to undo');
      return;
    }
    const task = state.lastDeleted;
    state.lastDeleted = null;
    state.tasks.push(task);
    state.tasks.sort((a, b) => a.order - b.order);
    await persist(task);
    render();
    toast('↩️ Restored');
  }

  // ---------- Drag & Drop ----------
  let dragId = null;

  function setupDragAndDrop() {
    // Delegated dragstart on board
    el.board.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.task-card');
      if (!card) return;
      dragId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', dragId);
      } catch (_) { /* ignore */ }
    });

    el.board.addEventListener('dragend', (e) => {
      const card = e.target.closest('.task-card');
      if (card) card.classList.remove('dragging');
      $$('.column').forEach((c) => c.classList.remove('drag-over'));
      dragId = null;
    });

    // Columns accept drops
    STATUSES.forEach((status) => {
      const list = el.lists[status];
      const column = list.closest('.column');

      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        column.classList.add('drag-over');
      });

      list.addEventListener('dragleave', (e) => {
        if (!column.contains(e.relatedTarget)) {
          column.classList.remove('drag-over');
        }
      });

      list.addEventListener('drop', async (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');
        const id = dragId || e.dataTransfer.getData('text/plain');
        if (!id) return;
        const task = state.tasks.find((t) => t.id === id);
        if (!task || task.status === status) return;
        task.status = status;
        task.updatedAt = Date.now();
        await persist(task);
        render();
        toast('Moved to ' + statusLabel(status));
      });
    });
  }

  function statusLabel(s) {
    return { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }[s] || s;
  }

  // ---------- Export / Import ----------
  async function exportTasks() {
    const data = JSON.stringify(state.tasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('📤 Exported');
  }

  async function importTasks(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Invalid format: expected an array');
      const valid = parsed.filter((t) => t && typeof t.title === 'string').map((t) => ({
        id: t.id || uid(),
        title: String(t.title),
        description: String(t.description || ''),
        priority: PRIORITIES.includes(t.priority) ? t.priority : 'medium',
        status: STATUSES.includes(t.status) ? t.status : 'todo',
        tags: Array.isArray(t.tags) ? t.tags.map((x) => String(x).toLowerCase()) : [],
        due: typeof t.due === 'string' ? t.due : '',
        createdAt: t.createdAt || Date.now(),
        updatedAt: t.updatedAt || Date.now(),
        order: typeof t.order === 'number' ? t.order : Date.now(),
      }));
      if (!valid.length) throw new Error('No valid tasks found');

      // Merge (skip duplicate ids)
      const existingIds = new Set(state.tasks.map((t) => t.id));
      const toAdd = valid.filter((t) => !existingIds.has(t.id));
      state.tasks.push(...toAdd);
      state.tasks.sort((a, b) => a.order - b.order);
      await DB.bulkPut(toAdd);
      render();
      toast(`📥 Imported ${toAdd.length} task(s)`);
    } catch (err) {
      console.error(err);
      toast('❌ Import failed: ' + err.message);
    }
  }

  // ---------- Online/offline indicator ----------
  function updateConnectionStatus() {
    const online = navigator.onLine;
    el.connStatus.textContent = online ? 'Online' : 'Offline';
    el.connStatus.className = 'status ' + (online ? 'status-online' : 'status-offline');
  }

  // ---------- Event wiring ----------
  function wireEvents() {
    // Add / Modal
    el.addBtn.addEventListener('click', () => openModal());
    el.closeBtn.addEventListener('click', closeModal);
    el.cancelBtn.addEventListener('click', closeModal);
    el.modal.addEventListener('click', (e) => {
      if (e.target === el.modal) closeModal();
    });
    el.form.addEventListener('submit', saveTask);

    el.deleteBtn.addEventListener('click', () => {
      const id = el.fId.value;
      if (!id) return;
      if (confirm('Delete this task?')) {
        deleteTask(id);
        closeModal();
      }
    });

    // Card click / keyboard activation
    el.board.addEventListener('click', (e) => {
      const card = e.target.closest('.task-card');
      if (!card) return;
      const task = state.tasks.find((t) => t.id === card.dataset.id);
      if (task) openModal(task);
    });

    el.board.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.task-card');
      if (!card) return;
      e.preventDefault();
      const task = state.tasks.find((t) => t.id === card.dataset.id);
      if (task) openModal(task);
    });

    // Filters
    el.searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value.trim();
      render();
    });
    el.filterPriority.addEventListener('change', (e) => {
      state.filters.priority = e.target.value;
      render();
    });
    el.filterTag.addEventListener('change', (e) => {
      state.filters.tag = e.target.value;
      render();
    });
    el.clearFilters.addEventListener('click', () => {
      state.filters = { search: '', priority: 'all', tag: 'all' };
      el.searchInput.value = '';
      el.filterPriority.value = 'all';
      el.filterTag.value = 'all';
      render();
    });

    // Export / Import
    el.exportBtn.addEventListener('click', exportTasks);
    el.importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) await importTasks(file);
      e.target.value = '';
    });

    // Online/offline
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ignore when typing inside inputs/textarea/select (except Esc)
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (e.key === 'Escape') {
        if (el.modal.classList.contains('open')) {
          closeModal();
        } else if (typing) {
          e.target.blur();
        }
        return;
      }

      if (typing) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openModal();
      } else if (e.key === '/') {
        e.preventDefault();
        el.searchInput.focus();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undoDelete();
      }
    });

    // Warn before unload if unsaved modal is open
    window.addEventListener('beforeunload', (e) => {
      if (el.modal.classList.contains('open') && el.fTitle.value.trim()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ---------- Init ----------
  async function init() {
    updateConnectionStatus();
    setupDragAndDrop();
    wireEvents();

    await loadAll();
    render();

    if (state.tasks.length === 0) {
      // First run: seed sample tasks
      const seed = [
        {
          id: uid(),
          title: 'Welcome to your Task Manager',
          description: 'Drag me between columns. Click to edit. Press N for a new task.',
          priority: 'medium',
          status: 'todo',
          tags: ['getting-started'],
          due: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          order: Date.now(),
        },
        {
          id: uid(),
          title: 'Try keyboard shortcuts',
          description: 'Press / to search, N for new task, Esc to close, Ctrl+Z to undo delete.',
          priority: 'low',
          status: 'inprogress',
          tags: ['tips'],
          due: '',
          createdAt: Date.now() + 1,
          updatedAt: Date.now() + 1,
          order: Date.now() + 1,
        },
        {
          id: uid(),
          title: 'Everything is stored offline',
          description: 'Your tasks persist in IndexedDB — no internet required.',
          priority: 'high',
          status: 'done',
          tags: ['offline', 'indexeddb'],
          due: '',
          createdAt: Date.now() + 2,
          updatedAt: Date.now() + 2,
          order: Date.now() + 2,
        },
      ];
      state.tasks = seed;
      await DB.bulkPut(seed);
      render();
    }
  }

  // Safety: ensure init runs after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();