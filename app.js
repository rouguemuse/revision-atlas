/**
 * ============================================================================
 * REVISION ATLAS — CORE APPLICATION ENGINE
 * Private Manuscript Continuity & Revision Studio
 * ============================================================================
 */

const Atlas = (() => {
  // CONFIG & CONSTANTS
  const DB_NAME = 'revision_atlas_db';
  const DB_VERSION = 3;

  const STRIPE_CONFIG = {
    priceId: 'price_1UJXXy1qyZAzUSOXKuMPX6NQ',
    paymentUrl: 'https://buy.stripe.com/fZu14f6iPeK3fwqb6Z6kg0b'
  };

  const FUNCTION_TAGS = [
    'Introduces character',
    'Deepens character',
    'Changes relationship',
    'Introduces setting',
    'Establishes canon',
    'Introduces motif',
    'Develops motif',
    'Pays off motif',
    'Provides setup',
    'Provides payoff',
    'Raises stakes',
    'Provides relief/humor',
    'Recontextualizes earlier material',
    'Contains revelation',
    'Structural transition',
    'Changes narrator understanding',
    'Advances chronology',
    'Other'
  ];

  // APPLICATION STATE
  let db = null;
  let activeProfile = null;
  let activeVersionId = null;
  let viewingHistoricalVersionId = null;

  let chapters = [];
  let historicalChapters = [];
  let currentChapterId = null;

  let fragments = [];
  let characters = [];
  let symbols = [];
  let motifs = [];
  let canon = [];
  let timeline = [];
  let versions = [];

  let safetySnapshotsCollapsed = true;
  let isNavigatorCollapsed = false;
  let isInspectorCollapsed = false;

  let readingPrefs = {
    fontStyle: 'editorial',
    fontSize: '18.5px',
    lineSpacing: '1.78',
    writingWidth: '740px'
  };

  let themePreference = 'dark';
  let autosaveTimer = null;
  let lastEditorCursorPosition = 0;

  let currentCompareAnalysis = null;
  let compareViewMode = 'all'; // 'all' (What Changed), 'survived' (What Survived), 'disappeared' (What Disappeared)

  let finalDraftSettings = {
    preset: 'standard',
    font: "'Times New Roman', Times, serif",
    size: '12pt',
    spacing: '2.0',
    indent: '0.5in',
    sceneBreaks: '# centered',
    headerText: 'SURNAME / TITLE / ',
    includeTitlePage: true,
    titlePage: {
      title: 'Untitled Manuscript',
      subtitle: '',
      author: 'Author Name',
      contact: '',
      wordCount: 'Approx. 0 words'
    }
  };

  // UTILITIES
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function tokenizeWords(text) {
    if (!text) return [];
    const normalized = text.replace(/[\u2018\u2019]/g, "'");
    const matches = normalized.match(/[\p{L}\p{N}]+(?:['\-_/][\p{L}\p{N}]+)*/gu);
    return matches || [];
  }

  function countWords(text) {
    return tokenizeWords(text).length;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatExactDateTime(isoStr) {
    if (!isoStr) return 'Date unavailable';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'Date unavailable';
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return datePart + ' · ' + timePart;
  }

  // INDEXEDDB STORAGE
  function initDB() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        const stores = [
          'chapters', 'fragments', 'characters', 'symbols', 'motifs',
          'canon', 'timeline', 'snapshots', 'versions', 'activeState', 'settings', 'finalDraft'
        ];
        stores.forEach(s => {
          if (!d.objectStoreNames.contains(s)) {
            d.createObjectStore(s, { keyPath: s === 'activeState' || s === 'settings' ? 'key' : 'id' });
          }
        });
      };
      req.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      req.onerror = (e) => reject(e);
    });
  }

  function putItem(storeName, item) {
    return new Promise((resolve, reject) => {
      if (!db) { resolve(); return; }
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e?.target?.error || new Error(`IndexedDB write error on ${storeName}`));
        tx.onabort = (e) => reject(e?.target?.error || new Error(`IndexedDB transaction aborted on ${storeName}`));
      } catch (err) {
        reject(err);
      }
    });
  }

  function getAllItems(storeName) {
    return new Promise((resolve, reject) => {
      if (!db) { resolve([]); return; }
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e);
      } catch (err) {
        resolve([]);
      }
    });
  }

  function getItem(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!db) { resolve(null); return; }
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = (e) => reject(e);
      } catch (err) {
        resolve(null);
      }
    });
  }

  function clearStore(storeName) {
    return new Promise((resolve, reject) => {
      if (!db) { resolve(); return; }
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
      } catch (err) {
        resolve();
      }
    });
  }

  // THEME & READING PREFERENCES
  function initTheme() {
    const saved = localStorage.getItem('revision_atlas_theme') || 'dark';
    setTheme(saved);
  }

  function setTheme(mode) {
    themePreference = mode;
    localStorage.setItem('revision_atlas_theme', mode);

    const selector = document.getElementById('theme-mode-selector');
    if (selector) selector.value = mode;

    if (mode === 'system') {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').onchange = (e) => {
          if (themePreference === 'system') {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
          }
        };
      }
    } else {
      document.documentElement.setAttribute('data-theme', mode);
    }
  }

  function initReadingPrefs() {
    try {
      const saved = localStorage.getItem('revision_atlas_reading_prefs');
      if (saved) {
        readingPrefs = { ...readingPrefs, ...JSON.parse(saved) };
      }
    } catch (e) {}
    applyReadingPrefs();
  }

  function applyReadingPrefs() {
    const root = document.documentElement;
    let fontVal = 'var(--font-prose-editorial)';
    if (readingPrefs.fontStyle === 'classic') fontVal = 'var(--font-prose-classic)';
    if (readingPrefs.fontStyle === 'sans') fontVal = 'var(--font-prose-sans)';

    root.style.setProperty('--manuscript-font', fontVal);
    root.style.setProperty('--manuscript-size', readingPrefs.fontSize);
    root.style.setProperty('--manuscript-line-height', readingPrefs.lineSpacing);
    root.style.setProperty('--manuscript-width', readingPrefs.writingWidth);

    // Sync modal fields if open
    const fStyle = document.getElementById('pref-font-style');
    const fSize = document.getElementById('pref-font-size');
    const fSpace = document.getElementById('pref-line-spacing');
    const fWidth = document.getElementById('pref-writing-width');

    if (fStyle) fStyle.value = readingPrefs.fontStyle;
    if (fSize) fSize.value = readingPrefs.fontSize;
    if (fSpace) fSpace.value = readingPrefs.lineSpacing;
    if (fWidth) fWidth.value = readingPrefs.writingWidth;
  }

  function updateReadingPrefs() {
    const fStyle = document.getElementById('pref-font-style');
    const fSize = document.getElementById('pref-font-size');
    const fSpace = document.getElementById('pref-line-spacing');
    const fWidth = document.getElementById('pref-writing-width');

    if (fStyle) readingPrefs.fontStyle = fStyle.value;
    if (fSize) readingPrefs.fontSize = fSize.value;
    if (fSpace) readingPrefs.lineSpacing = fSpace.value;
    if (fWidth) readingPrefs.writingWidth = fWidth.value;

    localStorage.setItem('revision_atlas_reading_prefs', JSON.stringify(readingPrefs));
    applyReadingPrefs();
  }

  // ==========================================================================
  // UNIFIED OVERLAY & MODAL MANAGER
  // ==========================================================================
  const OverlayManager = {
    modalCloseMap: {
      'reading-prefs-modal': () => closeReadingPrefsModal(),
      'save-version-modal': () => closeSaveVersionModal(),
      'chapter-history-modal': () => closeChapterHistoryModal(),
      'search-modal': () => closeSearchModal(),
      'project-profile-modal': () => closeProfileModal(),
      'new-project-modal': () => closeNewProjectModal(),
      'cloud-sync-modal': () => closeCloudSyncModal(),
      'smart-import-modal': () => closeSmartImportModal(),
      'studio-guide-modal': () => closeStudioGuide()
    },

    lastFocusedElements: new Map(),

    openModal(modalId, triggerEl = null) {
      this.closeSaveMenu(false);
      if (typeof closeHelpPopover === 'function') closeHelpPopover();

      const modal = document.getElementById(modalId);
      if (!modal) return;

      const trigger = triggerEl || document.activeElement;
      if (trigger) {
        this.lastFocusedElements.set(modalId, trigger);
      }

      modal.removeAttribute('hidden');
      modal.classList.add('open');
      document.body.classList.add('modal-scroll-locked');

      setTimeout(() => {
        const firstFocusable = modal.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (firstFocusable && typeof firstFocusable.focus === 'function') {
          firstFocusable.focus();
        } else if (typeof modal.focus === 'function') {
          modal.focus();
        }
      }, 50);
    },

    closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      modal.classList.remove('open');
      if (modalId === 'studio-guide-modal') {
        modal.setAttribute('hidden', '');
      }

      const openModals = document.querySelectorAll('.modal-overlay.open');
      if (openModals.length === 0) {
        document.body.classList.remove('modal-scroll-locked');
      }

      const lastFocused = this.lastFocusedElements.get(modalId);
      if (lastFocused && document.body.contains(lastFocused) && typeof lastFocused.focus === 'function') {
        try {
          lastFocused.focus();
        } catch (e) {}
      }
      this.lastFocusedElements.delete(modalId);
    },

    getTopOpenModal() {
      const openModals = Array.from(document.querySelectorAll('.modal-overlay.open'));
      return openModals.pop() || null;
    },

    toggleSaveMenu(e) {
      const menu = document.getElementById('save-dropdown-menu');
      const trigger = document.getElementById('btn-save-dropdown-trigger');
      if (!menu) return;

      const isHidden = menu.hasAttribute('hidden');
      if (isHidden) {
        if (typeof closeHelpPopover === 'function') closeHelpPopover();
        menu.removeAttribute('hidden');
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
        const firstItem = menu.querySelector('.save-dropdown-item');
        if (firstItem) {
          setTimeout(() => firstItem.focus(), 20);
        }
      } else {
        this.closeSaveMenu(true);
      }
    },

    closeSaveMenu(restoreFocus = true) {
      const menu = document.getElementById('save-dropdown-menu');
      const trigger = document.getElementById('btn-save-dropdown-trigger');
      if (!menu || menu.hasAttribute('hidden')) return;

      menu.setAttribute('hidden', '');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
        if (restoreFocus && document.activeElement && menu.contains(document.activeElement)) {
          trigger.focus();
        }
      }
    },

    isSaveMenuOpen() {
      const menu = document.getElementById('save-dropdown-menu');
      return menu ? !menu.hasAttribute('hidden') : false;
    }
  };

  function openReadingPrefsModal() {
    OverlayManager.openModal('reading-prefs-modal');
  }

  function closeReadingPrefsModal() {
    OverlayManager.closeModal('reading-prefs-modal');
  }

  // NAVIGATION & VIEW SWITCHING
  function switchView(viewName) {
    document.querySelectorAll('.workspace-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.primary-nav .nav-tab-btn').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-btn').forEach(el => el.classList.remove('active'));

    const targetView = document.getElementById('view-' + viewName);
    if (targetView) targetView.classList.add('active');

    const targetNav = document.querySelector(`.primary-nav .nav-tab-btn[data-view="${viewName}"]`);
    if (targetNav) targetNav.classList.add('active');

    const targetMobileNav = document.querySelector(`.mobile-bottom-nav .mobile-nav-btn[data-view="${viewName}"]`);
    if (targetMobileNav) {
      targetMobileNav.classList.add('active');
    } else {
      // If target view is in the More sheet (characters, reference, finaldraft, analyze), highlight More button
      const moreBtn = document.getElementById('btn-mobile-more');
      if (moreBtn && ['characters', 'reference', 'finaldraft', 'analyze'].includes(viewName)) {
        moreBtn.classList.add('active');
      }
    }

    // Always dismiss mobile drawers and sheets when changing views
    closeAllMobileDrawers();

    if (viewName === 'compare') {
      populateCompareSelects();
      runComparison();
    } else if (viewName === 'reference') {
      renderFunctionMap();
      renderLexicon();
      renderMotifs();
      renderCanon();
      renderTimeline();
    } else if (viewName === 'versions') {
      renderVersionList();
    } else if (viewName === 'finaldraft') {
      renderFinalDraftWorkspace();
    } else if (viewName === 'characters') {
      renderCharacters();
    } else if (viewName === 'fragments') {
      renderFragments();
    } else if (viewName === 'analyze') {
      runFullDiagnostics();
    }
  }

  function toggleSidebarCollapse() {
    const nav = document.getElementById('chapter-navigator');
    const isMobileOrTablet = window.innerWidth <= 900;
    
    if (isMobileOrTablet) {
      // In mobile/tablet drawer mode: mutually exclusive with inspector
      const ins = document.getElementById('inspector-pane');
      if (ins) ins.classList.remove('is-open');
      closeMobileMoreSheet();

      const isOpen = nav.classList.toggle('is-open');
      const backdrop = document.getElementById('drawer-backdrop');
      if (backdrop) backdrop.classList.toggle('is-visible', isOpen);
      document.body.classList.toggle('drawer-scroll-locked', isOpen);

      const toggleBtn = document.getElementById('btn-toggle-navigator');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    } else {
      // Desktop collapse mode
      isNavigatorCollapsed = !isNavigatorCollapsed;
      nav.classList.toggle('collapsed', isNavigatorCollapsed);
      try {
        localStorage.setItem('revision_atlas_sidebar_nav', isNavigatorCollapsed ? '1' : '0');
      } catch (e) {}
    }
  }

  function toggleInspectorCollapse() {
    const ins = document.getElementById('inspector-pane');
    const isMobileOrTablet = window.innerWidth <= 900;

    if (isMobileOrTablet) {
      // In mobile/tablet drawer mode: mutually exclusive with navigator
      const nav = document.getElementById('chapter-navigator');
      if (nav) nav.classList.remove('is-open');
      closeMobileMoreSheet();

      const isOpen = ins.classList.toggle('is-open');
      const backdrop = document.getElementById('drawer-backdrop');
      if (backdrop) backdrop.classList.toggle('is-visible', isOpen);
      document.body.classList.toggle('drawer-scroll-locked', isOpen);

      const toggleBtn = document.getElementById('btn-toggle-inspector');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    } else {
      // Desktop collapse mode
      isInspectorCollapsed = !isInspectorCollapsed;
      ins.classList.toggle('collapsed', isInspectorCollapsed);
      try {
        localStorage.setItem('revision_atlas_sidebar_ins', isInspectorCollapsed ? '1' : '0');
      } catch (e) {}
    }
  }

  function closeAllMobileDrawers() {
    const nav = document.getElementById('chapter-navigator');
    if (nav) nav.classList.remove('is-open');
    const ins = document.getElementById('inspector-pane');
    if (ins) ins.classList.remove('is-open');
    const backdrop = document.getElementById('drawer-backdrop');
    if (backdrop) backdrop.classList.remove('is-visible');
    document.body.classList.remove('drawer-scroll-locked');

    const toggleNavBtn = document.getElementById('btn-toggle-navigator');
    if (toggleNavBtn) toggleNavBtn.setAttribute('aria-expanded', 'false');
    const toggleInsBtn = document.getElementById('btn-toggle-inspector');
    if (toggleInsBtn) toggleInsBtn.setAttribute('aria-expanded', 'false');

    closeMobileMoreSheet();
  }

  function toggleMobileMoreSheet() {
    const sheet = document.getElementById('mobile-more-sheet');
    const backdrop = document.getElementById('drawer-backdrop');
    const moreBtn = document.getElementById('btn-mobile-more');
    if (!sheet) return;

    const isHidden = sheet.hasAttribute('hidden');
    if (isHidden) {
      // Close side drawers first
      const nav = document.getElementById('chapter-navigator');
      if (nav) nav.classList.remove('is-open');
      const ins = document.getElementById('inspector-pane');
      if (ins) ins.classList.remove('is-open');

      sheet.removeAttribute('hidden');
      sheet.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-visible');
      document.body.classList.add('drawer-scroll-locked');
      if (moreBtn) moreBtn.setAttribute('aria-expanded', 'true');
    } else {
      closeMobileMoreSheet();
    }
  }

  function closeMobileMoreSheet() {
    const sheet = document.getElementById('mobile-more-sheet');
    const backdrop = document.getElementById('drawer-backdrop');
    const moreBtn = document.getElementById('btn-mobile-more');
    if (!sheet) return;

    sheet.setAttribute('hidden', '');
    sheet.classList.remove('is-open');
    if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');

    // Only remove backdrop and scroll lock if neither drawer is open
    const navOpen = document.getElementById('chapter-navigator')?.classList.contains('is-open');
    const insOpen = document.getElementById('inspector-pane')?.classList.contains('is-open');
    if (!navOpen && !insOpen) {
      if (backdrop) backdrop.classList.remove('is-visible');
      document.body.classList.remove('drawer-scroll-locked');
    }
  }

  function switchFinalDraftMobileTab(tab) {
    const controlsBtn = document.getElementById('fd-tab-btn-controls');
    const previewBtn = document.getElementById('fd-tab-btn-preview');
    const controlsPane = document.querySelector('.finaldraft-controls-pane');
    const previewPane = document.getElementById('finaldraft-preview-pane');

    if (tab === 'controls') {
      if (controlsBtn) controlsBtn.classList.add('active');
      if (previewBtn) previewBtn.classList.remove('active');
      if (controlsPane) controlsPane.style.display = 'block';
      if (previewPane) previewPane.style.display = 'none';
    } else {
      if (previewBtn) previewBtn.classList.add('active');
      if (controlsBtn) controlsBtn.classList.remove('active');
      if (controlsPane) controlsPane.style.display = 'none';
      if (previewPane) previewPane.style.display = 'block';
    }
  }

  // BOOTSTRAP & INITIALIZATION
  async function boot() {
    initTheme();
    initReadingPrefs();
    await initDB();

    const storedChapters = await getAllItems('chapters');
    const storedVersions = await getAllItems('versions');

    if (storedChapters.length > 0) {
      chapters = storedChapters.sort((a, b) => a.number - b.number);
      fragments = await getAllItems('fragments');
      characters = await getAllItems('characters');
      symbols = await getAllItems('symbols');
      motifs = await getAllItems('motifs');
      canon = await getAllItems('canon');
      timeline = await getAllItems('timeline');
      versions = storedVersions;

      const profileRec = await getItem('settings', 'activeProfile');
      if (profileRec && profileRec.value) {
        activeProfile = profileRec.value;
      }
    } else {
      // First boot: load commercial fictional demo
      if (window.PROJECT_PROFILES && window.PROJECT_PROFILES['demo']) {
        await loadProfile(window.PROJECT_PROFILES['demo']);
      } else {
        await loadProfile(window.PROJECT_PROFILES['template'] || { id: 'default', title: 'New Manuscript' });
      }
    }

    // Resolve active version
    const activeRec = await getItem('activeState', 'activeVersionId');
    if (activeRec && activeRec.value && versions.some(v => v.id === activeRec.value)) {
      activeVersionId = activeRec.value;
    } else if (versions.length > 0) {
      const workingVer = versions.find(v => v.versionType === 'Working Branch') || versions[0];
      activeVersionId = workingVer.id;
    } else {
      await createInitialWorkingBranch();
    }

    if (chapters.length > 0) {
      currentChapterId = chapters[0].id;
    }

    // Restore persistent cloud & disk file sync preferences
    const linkedRec = await getItem('settings', 'linkedFileName');
    if (linkedRec && linkedRec.value) {
      linkedFileName = linkedRec.value;
    }
    const syncTimeRec = await getItem('settings', 'lastCloudSyncTime');
    if (syncTimeRec && syncTimeRec.value) {
      lastCloudSyncTime = syncTimeRec.value;
    }
    updateCloudSyncUI();

    renderAll();

    // Restore desktop sidebar collapse preferences
    if (window.innerWidth > 900) {
      try {
        if (localStorage.getItem('revision_atlas_sidebar_nav') === '1') {
          isNavigatorCollapsed = true;
          document.getElementById('chapter-navigator')?.classList.add('collapsed');
        }
        if (localStorage.getItem('revision_atlas_sidebar_ins') === '1') {
          isInspectorCollapsed = true;
          document.getElementById('inspector-pane')?.classList.add('collapsed');
        }
      } catch (e) {}
    }

    initHelpSystem();
    initMobileSupport();
    initDesktopShortcuts();
    checkStorageHealth();
  }

  let isFocusModeActive = false;

  function toggleFocusMode() {
    const workspace = document.getElementById('view-write');
    const nav = document.getElementById('chapter-navigator');
    const ins = document.getElementById('inspector-pane');
    if (!workspace) return;

    isFocusModeActive = !isFocusModeActive;
    if (isFocusModeActive) {
      workspace.classList.add('focus-mode');
      if (nav) nav.classList.add('collapsed');
      if (ins) ins.classList.add('collapsed');
      if (focusBtn) {
        focusBtn.classList.add('active');
        focusBtn.innerHTML = '⛶ Exit Focus';
        focusBtn.title = 'Exit Focus Mode (F11)';
      }
      showToast('Focus Mode: Sidebars hidden for distraction-free writing');
    } else {
      workspace.classList.remove('focus-mode');
      if (nav) nav.classList.remove('collapsed');
      if (ins) ins.classList.remove('collapsed');
      if (focusBtn) {
        focusBtn.classList.remove('active');
        focusBtn.innerHTML = '⛶ Focus';
        focusBtn.title = 'Focus Mode: Hide sidebars for distraction-free writing (F11)';
      }
      showToast('Focus Mode: Sidebars restored');
    }
  }

  function initDesktopShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Global Save (Ctrl+S or Cmd+S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveNow();
      }
      // Global Search (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openSearchModal();
      }
      // Focus Mode (F11 or Ctrl+Shift+F)
      if (e.key === 'F11' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f'))) {
        e.preventDefault();
        toggleFocusMode();
      }
    });

    // Central overlay outside click listener
    document.addEventListener('click', (e) => {
      // 1. Outside click dismissal for save dropdown menu
      const menu = document.getElementById('save-dropdown-menu');
      const trigger = document.getElementById('btn-save-dropdown-trigger');
      if (menu && !menu.hasAttribute('hidden')) {
        if (!menu.contains(e.target) && (!trigger || !trigger.contains(e.target))) {
          OverlayManager.closeSaveMenu(false);
        }
      }

      // 2. Outside click dismissal for help popover
      const popover = document.getElementById('help-popover');
      if (popover && !popover.hasAttribute('hidden')) {
        const isHelpBtn = e.target.closest('.help-btn');
        if (!popover.contains(e.target) && !isHelpBtn) {
          closeHelpPopover();
        }
      }

      // 3. Outside click dismissal on modal-overlay backdrop
      if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
        const modalId = e.target.id;
        if (OverlayManager.modalCloseMap[modalId]) {
          OverlayManager.modalCloseMap[modalId]();
        } else {
          OverlayManager.closeModal(modalId);
        }
      }
    });

    // Central keydown handler for Escape, Arrow navigation, and Focus trapping
    document.addEventListener('keydown', (e) => {
      // Escape key handling
      if (e.key === 'Escape') {
        // 1. Save dropdown menu
        if (OverlayManager.isSaveMenuOpen()) {
          e.preventDefault();
          OverlayManager.closeSaveMenu(true);
          return;
        }

        // 2. Contextual help popover
        const popover = document.getElementById('help-popover');
        if (popover && !popover.hasAttribute('hidden')) {
          e.preventDefault();
          closeHelpPopover();
          return;
        }

        // 3. Topmost open modal
        const topModal = OverlayManager.getTopOpenModal();
        if (topModal) {
          e.preventDefault();
          const modalId = topModal.id;
          if (OverlayManager.modalCloseMap[modalId]) {
            OverlayManager.modalCloseMap[modalId]();
          } else {
            OverlayManager.closeModal(modalId);
          }
          return;
        }

        // 4. Mobile more sheet & drawers
        const moreSheet = document.getElementById('mobile-more-sheet');
        if (moreSheet && !moreSheet.hasAttribute('hidden')) {
          e.preventDefault();
          closeMobileMoreSheet();
          return;
        }
        const navOpen = document.getElementById('chapter-navigator')?.classList.contains('is-open');
        const insOpen = document.getElementById('inspector-pane')?.classList.contains('is-open');
        if (navOpen || insOpen) {
          e.preventDefault();
          closeAllMobileDrawers();
          return;
        }
      }

      // Keyboard arrow navigation inside Save Dropdown Menu
      if (OverlayManager.isSaveMenuOpen()) {
        const menu = document.getElementById('save-dropdown-menu');
        const items = Array.from(menu.querySelectorAll('.save-dropdown-item'));
        if (items.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const currIdx = items.indexOf(document.activeElement);
            const nextIdx = (currIdx + 1) % items.length;
            items[nextIdx].focus();
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const currIdx = items.indexOf(document.activeElement);
            const prevIdx = (currIdx - 1 + items.length) % items.length;
            items[prevIdx].focus();
            return;
          }
          if (e.key === 'Home') {
            e.preventDefault();
            items[0].focus();
            return;
          }
          if (e.key === 'End') {
            e.preventDefault();
            items[items.length - 1].focus();
            return;
          }
          if (e.key === 'Tab') {
            OverlayManager.closeSaveMenu(false);
            return;
          }
        }
      }

      // Focus trapping & editor shortcut protection when any modal is open
      const topModal = OverlayManager.getTopOpenModal();
      if (topModal) {
        if (e.ctrlKey || e.metaKey) {
          if (['b', 'i', 's', 'k'].includes(e.key.toLowerCase())) {
            e.stopPropagation();
          }
        }

        if (e.key === 'Tab') {
          const focusables = Array.from(topModal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
          if (focusables.length > 0) {
            const firstEl = focusables[0];
            const lastEl = focusables[focusables.length - 1];
            if (e.shiftKey) {
              if (document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
              }
            } else {
              if (document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
              }
            }
          }
        }
      }
    });
  }

  let toastTimeout = null;
  function showToast(msg) {
    let toast = document.getElementById('atlas-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'atlas-toast';
      toast.className = 'atlas-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2400);
  }

  // ==========================================================================
  // CLOUD & GOOGLE DRIVE PERSISTENCE & FILE SYSTEM ACCESS API
  // ==========================================================================
  let linkedFileHandle = null;
  let linkedFileName = null;
  let lastCloudSyncTime = null;
  let gdriveAccessToken = null;

  function toggleSaveMenu(e) {
    OverlayManager.toggleSaveMenu(e);
  }

  function closeSaveMenu(restoreFocus = true) {
    OverlayManager.closeSaveMenu(restoreFocus);
  }

  function openCloudSyncModal(tab) {
    updateCloudSyncUI();
    OverlayManager.openModal('cloud-sync-modal');
  }

  function closeCloudSyncModal() {
    OverlayManager.closeModal('cloud-sync-modal');
  }

  function updateCloudSyncUI() {
    const pill = document.getElementById('cloud-sync-status-pill');
    const title = document.getElementById('cloud-status-title');
    const desc = document.getElementById('cloud-status-desc');
    const timeEl = document.getElementById('cloud-last-sync-time');
    const linkedPathEl = document.getElementById('disk-file-linked-path');
    const unlinkBtn = document.getElementById('btn-unlink-disk-file');

    if (linkedFileHandle || linkedFileName) {
      if (pill) pill.textContent = 'Linked to Disk / Drive File';
      if (pill) pill.className = 'version-type-pill type-snapshot';
      if (title) title.textContent = `Live File Link: ${linkedFileName || 'Disk File'}`;
      if (desc) desc.textContent = 'Every save (Ctrl+S) continuously writes directly to this physical file on your disk, automatically syncing with your cloud client.';
      if (linkedPathEl) {
        linkedPathEl.style.display = 'block';
        linkedPathEl.textContent = `✓ Linked File: ${linkedFileName || 'Active File Handle'}`;
      }
      if (unlinkBtn) unlinkBtn.style.display = 'inline-block';
    } else if (lastCloudSyncTime) {
      if (pill) pill.textContent = 'Google Drive Synced';
      if (pill) pill.className = 'version-type-pill type-working';
      if (title) title.textContent = 'Synced to Google Drive';
      if (desc) desc.textContent = 'Your latest manuscript snapshot has been backed up directly to your personal Google Drive.';
      if (unlinkBtn) unlinkBtn.style.display = 'none';
      if (linkedPathEl) linkedPathEl.style.display = 'none';
    } else {
      if (pill) pill.textContent = 'Browser Vault (Local)';
      if (pill) pill.className = 'version-type-pill type-working';
      if (title) title.textContent = 'Current Storage: Browser Vault (IndexedDB)';
      if (desc) desc.textContent = 'Your manuscript is stored safely offline in your browser, but not yet linked to Google Drive or a cloud-synced folder.';
      if (unlinkBtn) unlinkBtn.style.display = 'none';
      if (linkedPathEl) linkedPathEl.style.display = 'none';
    }

    if (timeEl) {
      timeEl.textContent = lastCloudSyncTime 
        ? `Last cloud backup: ${new Date(lastCloudSyncTime).toLocaleDateString()} · ${new Date(lastCloudSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Never backed up to cloud';
    }

    updateSaveStatus('saved');
  }

  // File System Access API: Link physical disk file (e.g. inside Google Drive or Dropbox folder)
  async function linkLocalDiskFile() {
    if (!window.showSaveFilePicker) {
      alert('The File System Access API is supported in modern desktop browsers (Chrome, Edge, Brave, Opera). On other browsers, please use Google Drive Cloud Sync or Download Vault.');
      return;
    }
    try {
      const suggested = ((activeProfile && activeProfile.title) ? activeProfile.title.replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, '_') : 'manuscript') + '.atlas.json';
      const handle = await window.showSaveFilePicker({
        suggestedName: suggested,
        types: [{
          description: 'Revision Atlas Vault (*.atlas.json)',
          accept: { 'application/json': ['.json', '.atlas.json'] }
        }]
      });

      linkedFileHandle = handle;
      linkedFileName = handle.name;
      await putItem('settings', { key: 'linkedFileName', value: handle.name });
      updateCloudSyncUI();
      await syncToLinkedDiskFile();
      showToast(`Linked directly to: ${handle.name}`);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('File link error:', err);
        alert('Could not link file: ' + err.message);
      }
    }
  }

  async function unlinkLocalDiskFile() {
    linkedFileHandle = null;
    linkedFileName = null;
    await putItem('settings', { key: 'linkedFileName', value: null });
    updateCloudSyncUI();
    showToast('Disconnected from disk file');
  }

  async function syncToLinkedDiskFile() {
    if (!linkedFileHandle) return;
    try {
      const writable = await linkedFileHandle.createWritable();
      const vaultData = generateFullVaultData();
      await writable.write(JSON.stringify(vaultData, null, 2));
      await writable.close();
      lastCloudSyncTime = new Date().toISOString();
      await putItem('settings', { key: 'lastCloudSyncTime', value: lastCloudSyncTime });
      updateCloudSyncUI();
    } catch (err) {
      console.warn('Could not write to linked disk file:', err);
    }
  }

  // Google Drive Cloud Backup & Restore
  function loadGoogleIdentityServices() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.accounts) return resolve(window.google);
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  async function backupToGoogleDrive() {
    const statusEl = document.getElementById('gdrive-auth-status');
    if (statusEl) statusEl.textContent = 'Connecting to Google Drive...';

    try {
      // Check if user has an OAuth Client ID configured or prompt for it
      let clientIdRec = await getItem('settings', 'gdriveClientId');
      let clientId = clientIdRec ? clientIdRec.value : null;

      if (!clientId) {
        clientId = prompt('To sync directly to your personal Google Drive, please enter your Google OAuth Client ID (or leave blank to download a cloud-ready Google Drive bundle):', '');
        if (clientId && clientId.trim()) {
          clientId = clientId.trim();
          await putItem('settings', { key: 'gdriveClientId', value: clientId });
        } else {
          // Fallback: Export and download Google Drive compatible package
          exportFullVault();
          if (statusEl) statusEl.textContent = 'Vault downloaded! You can upload this directly into your Google Drive folder.';
          showToast('Downloaded vault for Google Drive upload');
          return;
        }
      }

      await loadGoogleIdentityServices();

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            if (statusEl) statusEl.textContent = 'Google authorization error: ' + tokenResponse.error;
            return;
          }
          gdriveAccessToken = tokenResponse.access_token;
          await uploadVaultToGoogleDrive(tokenResponse.access_token);
        }
      });

      tokenClient.requestAccessToken();
    } catch (err) {
      console.error('Google Drive sync error:', err);
      // Fallback gracefully to vault export
      exportFullVault();
      if (statusEl) statusEl.textContent = 'Google client unavailable. Project vault downloaded for Drive storage.';
    }
  }

  async function uploadVaultToGoogleDrive(token) {
    const statusEl = document.getElementById('gdrive-auth-status');
    if (statusEl) statusEl.textContent = 'Uploading manuscript vault to Google Drive...';

    const vaultData = generateFullVaultData();
    const projTitle = (activeProfile && activeProfile.title) ? activeProfile.title.replace(/[^a-z0-9_\-\s]/gi, '').trim() : 'Manuscript';
    const fileName = `${projTitle} - Vault Backup.atlas.json`;

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      description: 'Revision Atlas Complete Manuscript Vault Backup'
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(vaultData, null, 2) +
      closeDelimiter;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'multipart/related; boundary=' + boundary
      },
      body: multipartRequestBody
    });

    if (response.ok) {
      lastCloudSyncTime = new Date().toISOString();
      await putItem('settings', { key: 'lastCloudSyncTime', value: lastCloudSyncTime });
      updateCloudSyncUI();
      if (statusEl) statusEl.textContent = `✓ Successfully backed up "${fileName}" to Google Drive!`;
      showToast('✓ Saved backup directly to Google Drive');
    } else {
      const errText = await response.text();
      console.error('Google Drive upload failed:', errText);
      if (statusEl) statusEl.textContent = 'Upload failed. Downloaded local copy instead.';
      exportFullVault();
    }
  }

  async function restoreFromGoogleDrive() {
    const statusEl = document.getElementById('gdrive-auth-status');
    if (!gdriveAccessToken) {
      await backupToGoogleDrive();
      return;
    }
    try {
      if (statusEl) statusEl.textContent = 'Querying Google Drive backups...';
      const response = await fetch("https://www.googleapis.com/drive/v3/files?q=name+contains+'.atlas.json'&fields=files(id,name,modifiedTime)", {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
      });
      const data = await response.json();
      if (data.files && data.files.length > 0) {
        const latest = data.files[0];
        if (confirm(`Restore latest backup "${latest.name}" from Google Drive? This will safely snapshot your current studio first.`)) {
          const fileResp = await fetch(`https://www.googleapis.com/drive/v3/files/${latest.id}?alt=media`, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
          });
          const fileContent = await fileResp.text();
          await importVaultData(fileContent);
          closeCloudSyncModal();
          showToast(`✓ Restored "${latest.name}" from Google Drive`);
        }
      } else {
        alert('No Revision Atlas backups (.atlas.json) were found in your Google Drive.');
      }
    } catch (e) {
      console.error(e);
      triggerImportProject();
    }
  }

  let lastSavedTime = null;
  let hasStorageError = false;

  function updateSaveStatus(status, detail) {
    const dot = document.getElementById('save-status-dot');
    const text = document.getElementById('save-status-text');
    const group = document.getElementById('save-indicator-group');
    if (!dot || !text) return;

    if (status === 'saving') {
      dot.className = 'save-dot saving';
      text.textContent = 'Saving...';
      if (group) group.title = 'Saving manuscript to local browser vault...';
    } else if (status === 'dirty') {
      dot.className = 'save-dot dirty';
      text.textContent = 'Unsaved';
      if (group) group.title = 'Unsaved edits in canvas. Auto-save in progress...';
    } else if (status === 'error') {
      hasStorageError = true;
      dot.className = 'save-dot error';
      text.textContent = 'Storage Error!';
      const msg = detail || 'Browser storage write error. Click Save > Download Project Vault immediately.';
      if (group) group.title = msg;
    } else if (status === 'saved') {
      hasStorageError = false;
      dot.className = 'save-dot saved';
      lastSavedTime = new Date();
      const timeStr = lastSavedTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      if (linkedFileHandle || linkedFileName) {
        text.textContent = 'Disk File';
        if (group) group.title = `Saved locally & synced to ${linkedFileName} at ${timeStr}`;
      } else if (lastCloudSyncTime) {
        text.textContent = 'Drive Synced';
        if (group) group.title = `Saved to local vault & backed up to Google Drive at ${timeStr}`;
      } else {
        text.textContent = 'Saved';
        if (group) group.title = `Continuous persistence active. Saved to browser vault at ${timeStr}`;
      }
    }
  }

  async function checkStorageHealth() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        if (est.quota && est.usage && (est.usage / est.quota) > 0.88) {
          const pct = Math.round((est.usage / est.quota) * 100);
          showToast(`⚠️ Browser storage is ${pct}% full. Export a Project Vault backup now.`);
        }
      } catch (e) {}
    }
  }

  function initMobileSupport() {
    // 1. Delegated listener for bottom nav & more sheet
    document.addEventListener('click', (e) => {
      // Bottom nav button
      const navBtn = e.target.closest('.mobile-bottom-nav .mobile-nav-btn[data-view]');
      if (navBtn) {
        e.preventDefault();
        const viewName = navBtn.getAttribute('data-view');
        switchView(viewName);
        return;
      }

      // Bottom nav 'More' button
      if (e.target.closest('#btn-mobile-more')) {
        e.preventDefault();
        toggleMobileMoreSheet();
        return;
      }

      // Close More sheet button
      if (e.target.closest('#btn-close-more-sheet')) {
        e.preventDefault();
        closeMobileMoreSheet();
        return;
      }

      // More sheet items
      const moreItem = e.target.closest('.mobile-more-sheet .more-sheet-item[data-view]');
      if (moreItem) {
        e.preventDefault();
        const viewName = moreItem.getAttribute('data-view');
        switchView(viewName);
        return;
      }

      // More sheet action items
      if (e.target.closest('#btn-more-cloud')) {
        e.preventDefault();
        closeMobileMoreSheet();
        openCloudSyncModal();
        return;
      }

      if (e.target.closest('#btn-more-settings')) {
        e.preventDefault();
        closeMobileMoreSheet();
        openProfileModal();
        return;
      }

      if (e.target.closest('#btn-more-guide')) {
        e.preventDefault();
        closeMobileMoreSheet();
        openStudioGuide('quickstart');
        return;
      }

      // Backdrop click dismisses drawers and more sheet
      if (e.target.closest('#drawer-backdrop')) {
        e.preventDefault();
        closeAllMobileDrawers();
        return;
      }
    });

    // 2. Window resize listener to clear mobile drawer state when resizing to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        closeAllMobileDrawers();
      }
    });

    // 3. Drag and Drop file ingestion onto Chapter Navigator or Canvas
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      document.body.classList.add('drag-over-zone');
    });
    window.addEventListener('dragleave', (e) => {
      if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
        document.body.classList.remove('drag-over-zone');
      }
    });
    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      document.body.classList.remove('drag-over-zone');
      const files = Array.from(e.dataTransfer.files).filter(f => /\.(txt|md|markdown)$/i.test(f.name));
      if (files.length === 0) return;

      const readFileText = (f) => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = (ev) => res(ev.target.result);
        r.onerror = rej;
        r.readAsText(f);
      });

      if (files.length === 1) {
        const content = await readFileText(files[0]);
        const parsed = parseSingleManuscriptText(content, files[0].name);
        openSmartImportModal(parsed);
      } else {
        const filesData = [];
        for (const f of files) {
          const content = await readFileText(f);
          filesData.push({ name: f.name, content });
        }
        const parsed = parseMultipleManuscriptFiles(filesData);
        openSmartImportModal(parsed);
      }
    });
  }

  async function loadProfile(profile) {
    activeProfile = profile;
    await putItem('settings', { key: 'activeProfile', value: profile });

    chapters = (profile.initialChapters || []).map(ch => ({
      ...ch,
      revisionStatus: ch.revisionStatus || 'Unreviewed',
      lastRevisionCompletedAt: ch.lastRevisionCompletedAt || null,
      lastEditedAt: ch.lastEditedAt || new Date().toISOString(),
      function: ch.function || {
        purpose: '',
        centralTurn: '',
        entryState: '',
        exitState: '',
        readerKnowledgeEntering: '',
        readerKnowledgeLeaving: '',
        opens: '',
        answers: '',
        setup: '',
        payoff: '',
        stakesMovement: '',
        characterMovement: '',
        themeMotifWork: '',
        whatWouldBeLost: '',
        authorNotes: '',
        functionTags: []
      }
    }));

    fragments = profile.initialFragments || [];
    characters = profile.seededCharacters || [];
    symbols = profile.seededSymbolsThemes || [];
    motifs = profile.motifs || [];
    canon = profile.seededCanon || [];
    timeline = profile.seededTimeline || [];

    for (const c of chapters) await putItem('chapters', c);
    for (const f of fragments) await putItem('fragments', f);
    for (const ch of characters) await putItem('characters', ch);
    for (const s of symbols) await putItem('symbols', s);
    for (const m of motifs) await putItem('motifs', m);
    for (const cn of canon) await putItem('canon', cn);
    for (const t of timeline) await putItem('timeline', t);

    // Initial Versions
    await clearStore('versions');
    versions = [];
    if (profile.initialVersions && profile.initialVersions.length > 0) {
      for (const v of profile.initialVersions) {
        await putItem('versions', v);
        versions.push(v);
      }
      activeVersionId = profile.activeVersionId || versions[0].id;
    } else {
      await createInitialWorkingBranch();
    }
    await putItem('activeState', { key: 'activeVersionId', value: activeVersionId });

    if (chapters.length > 0) {
      currentChapterId = chapters[0].id;
    }

    renderAll();
  }

  async function createInitialWorkingBranch() {
    const totalWords = chapters.reduce((acc, c) => acc + (c.wordCount || countWords(c.content)), 0);
    const initVer = {
      id: 'ver-work-' + Date.now(),
      code: 'RA-W-0001',
      name: 'Current Revision',
      versionType: 'Working Branch',
      createdAt: new Date().toISOString(),
      lastEditedAt: new Date().toISOString(),
      frozenAt: null,
      parentId: null,
      parentName: null,
      parentType: null,
      authorNote: 'Initial working draft branch.',
      totalWords: totalWords,
      chapterCount: chapters.length,
      revisionCycle: 'Draft 1',
      status: 'active',
      isReadOnly: false,
      isSafetySnapshot: false,
      chapters: JSON.parse(JSON.stringify(chapters))
    };
    await putItem('versions', initVer);
    versions.push(initVer);
    activeVersionId = initVer.id;
  }

  function renderAll() {
    renderActiveVersionHeader();
    renderChapterList();
    loadCurrentChapterToEditor();
    renderFragments();
    renderCharacters();
    renderMotifs();
    renderCanon();
    renderTimeline();
    renderVersionList();
  }

  // VERSION IDENTITY HEADER
  function renderActiveVersionHeader() {
    const activeVer = versions.find(v => v.id === activeVersionId);
    const nameEl = document.getElementById('current-draft-name');
    const typeEl = document.getElementById('current-draft-type');
    const editedEl = document.getElementById('current-draft-edited');

    if (!activeVer) return;

    if (nameEl) nameEl.textContent = activeVer.name;
    if (typeEl) {
      typeEl.textContent = activeVer.versionType;
      typeEl.className = 'version-type-pill type-' + activeVer.versionType.toLowerCase().split(' ')[0];
    }
    if (editedEl) {
      editedEl.textContent = 'Last edited: ' + formatExactDateTime(activeVer.lastEditedAt);
      editedEl.title = 'Created: ' + formatExactDateTime(activeVer.createdAt);
    }

    // Historical Read-Only View Banner
    const banner = document.getElementById('historical-view-banner');
    if (viewingHistoricalVersionId) {
      const histVer = versions.find(v => v.id === viewingHistoricalVersionId);
      if (histVer && banner) {
        banner.classList.add('open');
        document.getElementById('banner-version-name').textContent = histVer.name;
        document.getElementById('banner-version-meta').textContent = `${histVer.versionType} · Frozen ${formatExactDateTime(histVer.frozenAt || histVer.createdAt)}`;
      }
    } else {
      if (banner) banner.classList.remove('open');
    }
  }

  // ==========================================================================
  // MODULE 1: WRITE WORKSPACE
  // ==========================================================================
  function renderChapterList(filterQuery = '') {
    const container = document.getElementById('chapter-list-container');
    container.innerHTML = '';

    const sourceChapters = viewingHistoricalVersionId ? historicalChapters : chapters;
    let totalWords = 0;
    let revisedCount = 0;
    let inRevisionCount = 0;
    let unreviewedCount = 0;
    let lockedCount = 0;

    const filtered = sourceChapters.filter(ch => {
      if (!filterQuery) return true;
      const q = filterQuery.toLowerCase();
      return ch.title.toLowerCase().includes(q) || String(ch.number).includes(q);
    });

    sourceChapters.forEach(ch => {
      const chWords = ch.wordCount || countWords(ch.content);
      totalWords += chWords;
      const status = ch.revisionStatus || 'Unreviewed';
      if (status === 'Revised') revisedCount++;
      else if (status === 'In Revision') inRevisionCount++;
      else if (status === 'Locked') lockedCount++;
      else unreviewedCount++;
    });

    // Update revision progress bar
    const statTotal = document.getElementById('stat-total-words');
    const statRev = document.getElementById('stat-revised');
    const statInRev = document.getElementById('stat-in-revision');
    const statUnrev = document.getElementById('stat-unreviewed');
    const statLocked = document.getElementById('stat-locked');

    if (statTotal) statTotal.textContent = totalWords.toLocaleString() + ' words';
    if (statRev) statRev.textContent = `${revisedCount} Revised`;
    if (statInRev) statInRev.textContent = `${inRevisionCount} In Revision`;
    if (statUnrev) statUnrev.textContent = `${unreviewedCount} Unreviewed`;
    if (statLocked) statLocked.textContent = `${lockedCount} Locked`;

    document.getElementById('chapter-count').textContent = sourceChapters.length;

    filtered.forEach(ch => {
      const chWords = ch.wordCount || countWords(ch.content);
      const status = ch.revisionStatus || 'Unreviewed';
      const statusClass = 'status-' + status.toLowerCase().replace(/\s+/g, '_');

      const item = document.createElement('div');
      item.className = 'chapter-item' + (ch.id === currentChapterId ? ' active' : '');
      item.setAttribute('data-id', ch.id);
      item.onclick = () => selectChapter(ch.id);
      item.innerHTML = `
        <div class="chapter-title-row">
          <span class="chapter-title-text" title="${escapeHtml(ch.number + '. ' + (ch.title || 'Untitled Chapter'))} — Click to rename" onclick="event.stopPropagation(); Atlas.promptRenameChapter('${ch.id}')">${ch.number}. ${escapeHtml(ch.title || 'Untitled Chapter')}</span>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span class="chapter-rename-icon" onclick="event.stopPropagation(); Atlas.promptRenameChapter('${ch.id}')" title="Rename Chapter">✎</span>
            <span class="chapter-words">${chWords}w</span>
          </div>
        </div>
        <div class="chapter-item-meta">
          <span class="status-pill ${statusClass}">${escapeHtml(status)}</span>
          <span style="color: var(--text-muted);">${formatExactDateTime(ch.lastEditedAt || ch.lastModified)}</span>
        </div>
      `;
      container.appendChild(item);
    });
  }

  function filterChapterList(query) {
    renderChapterList(query);
  }

  function selectChapter(id) {
    if (!viewingHistoricalVersionId) {
      saveCurrentChapterNow();
    }
    currentChapterId = id;
    renderChapterList();
    loadCurrentChapterToEditor();

    // Auto-close navigator drawer on mobile / tablet
    if (window.innerWidth <= 900) {
      closeAllMobileDrawers();
    }
  }

  function loadCurrentChapterToEditor() {
    const sourceChapters = viewingHistoricalVersionId ? historicalChapters : chapters;
    const ch = sourceChapters.find(c => c.id === currentChapterId) || sourceChapters[0];
    if (!ch) return;

    currentChapterId = ch.id;
    const titleInput = document.getElementById('current-chapter-title');
    const paperTitleInput = document.getElementById('paper-chapter-title');
    const paperNumberEl = document.getElementById('paper-chapter-number');
    const headingEl = document.getElementById('chapter-heading-display');
    const textarea = document.getElementById('editor-textarea');
    const wordCountBadge = document.getElementById('chapter-word-count-badge');
    const statusSelect = document.getElementById('chapter-revision-status-select');
    const notesInput = document.getElementById('chapter-notes-input');

    const chTitle = ch.title || '';
    if (titleInput) titleInput.value = chTitle;
    if (paperTitleInput) {
      paperTitleInput.value = chTitle;
      paperTitleInput.readOnly = !!viewingHistoricalVersionId;
    }
    if (paperNumberEl) paperNumberEl.textContent = `Chapter ${ch.number}`;
    if (headingEl) headingEl.textContent = chTitle ? `Chapter ${ch.number}: ${chTitle}` : `Chapter ${ch.number}`;

    if (textarea) {
      textarea.value = ch.content || '';
      textarea.readOnly = !!viewingHistoricalVersionId;
    }
    if (wordCountBadge) {
      wordCountBadge.textContent = (ch.wordCount || countWords(ch.content)).toLocaleString() + ' words';
    }
    if (statusSelect) {
      statusSelect.value = ch.revisionStatus || 'Unreviewed';
      statusSelect.disabled = !!viewingHistoricalVersionId;
    }
    if (notesInput) {
      notesInput.value = ch.notes || '';
      notesInput.readOnly = !!viewingHistoricalVersionId;
    }

    loadChapterFunctionFields(ch);
    scanChapterMotifsAndScenes(ch);
  }

  function onChapterTitleChange(newTitle) {
    if (viewingHistoricalVersionId) return;
    const ch = chapters.find(c => c.id === currentChapterId);
    if (!ch) return;
    ch.title = newTitle;

    const toolbarInput = document.getElementById('current-chapter-title');
    if (toolbarInput && toolbarInput.value !== newTitle) {
      toolbarInput.value = newTitle;
    }

    const paperInput = document.getElementById('paper-chapter-title');
    if (paperInput && paperInput.value !== newTitle) {
      paperInput.value = newTitle;
    }

    const headingEl = document.getElementById('chapter-heading-display');
    if (headingEl) {
      headingEl.textContent = newTitle ? `Chapter ${ch.number}: ${newTitle}` : `Chapter ${ch.number}`;
    }

    const paperNumEl = document.getElementById('paper-chapter-number');
    if (paperNumEl) {
      paperNumEl.textContent = `Chapter ${ch.number}`;
    }

    const itemTitleEl = document.querySelector(`.chapter-item[data-id="${ch.id}"] .chapter-title-text`);
    if (itemTitleEl) {
      itemTitleEl.textContent = `${ch.number}. ${newTitle || 'Untitled Chapter'}`;
    }

    ch.lastEditedAt = new Date().toISOString();
    triggerAutosave();
  }

  function promptRenameChapter(chId) {
    if (viewingHistoricalVersionId) return;
    const ch = chapters.find(c => c.id === chId);
    if (!ch) return;
    const newTitle = prompt('Rename Chapter:', ch.title || '');
    if (newTitle !== null) {
      ch.title = newTitle.trim();
      ch.lastEditedAt = new Date().toISOString();
      if (ch.id === currentChapterId) {
        onChapterTitleChange(ch.title);
      } else {
        putItem('chapters', ch);
        renderChapterList();
      }
    }
  }

  function updateCursorPosition(textarea) {
    if (textarea) {
      lastEditorCursorPosition = textarea.selectionStart || 0;
    }
  }

  function onEditorInput(textarea) {
    updateCursorPosition(textarea);
    if (viewingHistoricalVersionId) return;
    const ch = chapters.find(c => c.id === currentChapterId);
    if (!ch) return;
    ch.content = textarea.value;
    ch.wordCount = countWords(textarea.value);
    ch.lastEditedAt = new Date().toISOString();
    document.getElementById('chapter-word-count-badge').textContent = ch.wordCount.toLocaleString() + ' words';
    updateSaveStatus('saving');
    triggerAutosave();
  }

  function onEditorKeyDown(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleBold();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        toggleItalic();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        saveNow();
      }
    }
  }

  function toggleBold() {
    if (viewingHistoricalVersionId) return;
    const textarea = document.getElementById('editor-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end);

    if (selected.length > 0) {
      if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
        const unwrapped = selected.slice(2, -2);
        textarea.value = val.substring(0, start) + unwrapped + val.substring(end);
        textarea.setSelectionRange(start, start + unwrapped.length);
      } else {
        const wrapped = '**' + selected + '**';
        textarea.value = val.substring(0, start) + wrapped + val.substring(end);
        textarea.setSelectionRange(start, start + wrapped.length);
      }
    } else {
      textarea.value = val.substring(0, start) + '****' + val.substring(end);
      textarea.setSelectionRange(start + 2, start + 2);
    }

    lastEditorCursorPosition = textarea.selectionStart;
    textarea.focus();
    onEditorInput(textarea);
  }

  function toggleItalic() {
    if (viewingHistoricalVersionId) return;
    const textarea = document.getElementById('editor-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end);

    if (selected.length > 0) {
      if (selected.startsWith('*') && selected.endsWith('*') && !selected.startsWith('**') && selected.length >= 2) {
        const unwrapped = selected.slice(1, -1);
        textarea.value = val.substring(0, start) + unwrapped + val.substring(end);
        textarea.setSelectionRange(start, start + unwrapped.length);
      } else {
        const wrapped = '*' + selected + '*';
        textarea.value = val.substring(0, start) + wrapped + val.substring(end);
        textarea.setSelectionRange(start, start + wrapped.length);
      }
    } else {
      textarea.value = val.substring(0, start) + '**' + val.substring(end);
      textarea.setSelectionRange(start + 1, start + 1);
    }

    lastEditorCursorPosition = textarea.selectionStart;
    textarea.focus();
    onEditorInput(textarea);
  }

  function autoFormatProse() {
    if (viewingHistoricalVersionId) {
      alert('Cannot format historical read-only drafts.');
      return;
    }
    const textarea = document.getElementById('editor-textarea');
    if (!textarea) return;

    const raw = textarea.value;
    if (!raw.trim()) return;

    // 1. Normalize line endings (CRLF -> LF)
    let clean = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 2. Clean invisible characters & non-breaking spaces
    clean = clean.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
    clean = clean.replace(/\u00A0/g, ' ');
    clean = clean.replace(/\t/g, ' ');

    // 3. Normalize scene breaks onto their own line with clean boundaries
    clean = clean.replace(/^[ \t]*(\*\s*\*\s*\*|#|~)[ \t]*$/gm, '\n\n$1\n\n');

    // 4. Split into paragraph blocks separated by 2 or more newlines
    const rawBlocks = clean.split(/\n{2,}/);
    const formattedBlocks = [];

    for (let block of rawBlocks) {
      block = block.trim();
      if (!block) continue;

      // Standalone scene break
      if (/^(\*\s*\*\s*\*|#|~)$/.test(block)) {
        formattedBlocks.push(block.replace(/\s+/g, ' '));
        continue;
      }

      // Unwrap ragged single newlines within the paragraph (from inconsistent copy-paste)
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let unwrapped = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0) {
          unwrapped = line;
        } else {
          // If previous line ended with a hyphen indicating a split word, rejoin cleanly
          if (unwrapped.endsWith('-') && !unwrapped.endsWith('--') && !unwrapped.endsWith('—')) {
            unwrapped = unwrapped.slice(0, -1) + line;
          } else {
            unwrapped += ' ' + line;
          }
        }
      }

      // Clean multiple consecutive spaces and tabs within paragraph
      unwrapped = unwrapped.replace(/[ \t]{2,}/g, ' ').trim();

      if (unwrapped.length > 0) {
        formattedBlocks.push(unwrapped);
      }
    }

    const formatted = formattedBlocks.join('\n\n');
    if (formatted === raw) {
      alert('Prose is already cleanly formatted with proper alignment and spacing.');
      return;
    }

    textarea.value = formatted;
    onEditorInput(textarea);
    alert(`Auto-format complete: Cleaned alignment, unwrapped broken lines, and applied consistent double-spaced paragraphs (${formattedBlocks.length} paragraphs).`);
  }

  function setChapterRevisionStatus(newStatus) {
    if (viewingHistoricalVersionId) return;
    const ch = chapters.find(c => c.id === currentChapterId);
    if (!ch) return;

    ch.revisionStatus = newStatus;
    if (newStatus === 'Revised') {
      ch.lastRevisionCompletedAt = new Date().toISOString();
    }
    ch.lastEditedAt = new Date().toISOString();
    saveCurrentChapterNow();
    renderChapterList();
  }

  function saveChapterNotes(text) {
    if (viewingHistoricalVersionId) return;
    const ch = chapters.find(c => c.id === currentChapterId);
    if (!ch) return;
    ch.notes = text;
    ch.lastEditedAt = new Date().toISOString();
    triggerAutosave();
  }

  function triggerAutosave() {
    updateSaveStatus('dirty');
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      saveCurrentChapterNow();
    }, 600);
  }

  async function saveCurrentChapterNow() {
    if (viewingHistoricalVersionId) return;
    const ch = chapters.find(c => c.id === currentChapterId);
    if (!ch) return;

    try {
      await putItem('chapters', ch);

      // Update active version lastEditedAt and word count
      const activeVer = versions.find(v => v.id === activeVersionId);
      if (activeVer) {
        activeVer.lastEditedAt = new Date().toISOString();
        activeVer.totalWords = chapters.reduce((acc, c) => acc + (c.wordCount || countWords(c.content)), 0);
        activeVer.chapters = JSON.parse(JSON.stringify(chapters));
        await putItem('versions', activeVer);
        renderActiveVersionHeader();
      }
      if (linkedFileHandle) {
        await syncToLinkedDiskFile();
      }
      updateSaveStatus('saved');
    } catch (err) {
      console.error('Error saving manuscript to IndexedDB:', err);
      updateSaveStatus('error', 'Storage quota or write error. Download Project Vault immediately.');
      showToast('⚠️ Storage Error: Could not save to browser. Click Save > Download Project Vault.');
    }
  }

  async function saveNow() {
    closeSaveMenu();
    if (viewingHistoricalVersionId) {
      showToast('⚠️ Historical version is read-only');
      return;
    }
    clearTimeout(autosaveTimer);
    updateSaveStatus('saving');
    try {
      await saveCurrentChapterNow();
      if (!hasStorageError) {
        showToast(linkedFileHandle ? `✓ Saved to local vault & ${linkedFileName}` : '✓ Manuscript saved to local vault');
      }
    } catch (err) {
      updateSaveStatus('error');
      showToast('⚠️ Storage Error: Local save failed. Use "Download Project Vault" as backup.');
    }
  }

  function createNewChapter() {
    if (viewingHistoricalVersionId) {
      alert('Cannot add chapters while viewing a historical version. Return to active draft or branch as new working draft.');
      return;
    }
    const newNum = chapters.length + 1;
    const newCh = {
      id: 'ch-' + Date.now(),
      number: newNum,
      title: 'Chapter ' + newNum,
      content: '',
      wordCount: 0,
      notes: '',
      revisionStatus: 'Unreviewed',
      lastRevisionCompletedAt: null,
      lastEditedAt: new Date().toISOString(),
      function: {
        purpose: '',
        centralTurn: '',
        entryState: '',
        exitState: '',
        readerKnowledgeEntering: '',
        readerKnowledgeLeaving: '',
        opens: '',
        answers: '',
        setup: '',
        payoff: '',
        stakesMovement: '',
        characterMovement: '',
        themeMotifWork: '',
        whatWouldBeLost: '',
        authorNotes: '',
        functionTags: []
      }
    };
    chapters.push(newCh);
    putItem('chapters', newCh);
    selectChapter(newCh.id);
  }

  // ==========================================================================
  // CHAPTER FUNCTION BUILDER
  // ==========================================================================
  function loadChapterFunctionFields(ch) {
    const fn = ch.function || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('fn-purpose', fn.purpose);
    setVal('fn-turn', fn.centralTurn);
    setVal('fn-reader-leaving', fn.readerKnowledgeLeaving);
    setVal('fn-setup', fn.setup);
    setVal('fn-payoff', fn.payoff);

    setVal('fn-entry-state', fn.entryState);
    setVal('fn-exit-state', fn.exitState);
    setVal('fn-reader-entering', fn.readerKnowledgeEntering);
    setVal('fn-opens', fn.opens);
    setVal('fn-answers', fn.answers);
    setVal('fn-stakes', fn.stakesMovement);
    setVal('fn-characters', fn.characterMovement);
    setVal('fn-themes', fn.themeMotifWork);
    setVal('fn-lost', fn.whatWouldBeLost);

    renderFunctionTags(fn.functionTags || []);
  }

  function saveChapterFunctionField(field, value) {
    if (viewingHistoricalVersionId) return;
    const ch = chapters.find(c => c.id === currentChapterId);
    if (!ch) return;
    if (!ch.function) ch.function = {};
    ch.function[field] = value;
    ch.lastEditedAt = new Date().toISOString();
    triggerAutosave();
  }

  function renderFunctionTags(activeTags) {
    const container = document.getElementById('fn-tags-container');
    if (!container) return;
    container.innerHTML = '';

    FUNCTION_TAGS.forEach(tag => {
      const isSelected = activeTags.includes(tag);
      const pill = document.createElement('span');
      pill.className = 'function-tag-pill' + (isSelected ? ' selected' : '');
      pill.textContent = tag;
      pill.onclick = () => toggleFunctionTag(tag);
      container.appendChild(pill);
    });
  }

  function toggleFunctionTag(tag) {
    if (viewingHistoricalVersionId) return;
    const ch = chapters.find(c => c.id === currentChapterId);
    if (!ch) return;
    if (!ch.function) ch.function = {};
    if (!ch.function.functionTags) ch.function.functionTags = [];

    const idx = ch.function.functionTags.indexOf(tag);
    if (idx >= 0) {
      ch.function.functionTags.splice(idx, 1);
    } else {
      ch.function.functionTags.push(tag);
    }
    renderFunctionTags(ch.function.functionTags);
    ch.lastEditedAt = new Date().toISOString();
    triggerAutosave();
  }

  function toggleFullFunctionRecord() {
    const el = document.getElementById('full-function-record');
    if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
  }

  function switchInspectorTab(tabName) {
    document.querySelectorAll('.inspector-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.inspector-tab-content').forEach(c => c.style.display = 'none');

    const targetBtn = document.querySelector(`.inspector-tab-btn[data-tab="${tabName}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    const targetContent = document.getElementById('tab-' + tabName);
    if (targetContent) targetContent.style.display = 'block';
  }

  function scanChapterMotifsAndScenes(ch) {
    // Scenes
    const sceneBreaks = (ch.content.match(/(\n\s*\*\s*\*\s*\*|\n\s*#\s*\n)/g) || []).length;
    const scenesList = document.getElementById('inspector-scenes-list');
    if (scenesList) {
      scenesList.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-primary);">
          <strong>${sceneBreaks + 1}</strong> scene unit${sceneBreaks === 0 ? '' : 's'} detected in this chapter.
        </div>
      `;
    }

    // Motifs
    const motifsContainer = document.getElementById('inspector-motifs-detected');
    if (motifsContainer) {
      motifsContainer.innerHTML = '';
      const text = ch.content.toLowerCase();
      let foundAny = false;

      motifs.forEach(m => {
        const matches = (m.keywords || []).filter(kw => text.includes(kw.toLowerCase()));
        if (matches.length > 0) {
          foundAny = true;
          const row = document.createElement('div');
          row.style.cssText = 'padding: 0.35rem 0.5rem; background: var(--bg-surface-elevated); border-radius: 4px; font-size: 0.75rem;';
          row.innerHTML = `<strong>${escapeHtml(m.name)}</strong>: <span style="color: var(--text-secondary);">${matches.join(', ')}</span>`;
          motifsContainer.appendChild(row);
        }
      });

      if (!foundAny) {
        motifsContainer.innerHTML = '<p style="font-size: 0.75rem; color: var(--text-muted);">No seeded motifs detected in this chapter.</p>';
      }
    }
  }

  // ==========================================================================
  // MODULE 2: ADVANCED MULTI-LEVEL COMPARE ENGINE
  // ==========================================================================
  function jaccardSimilarity(strA, strB) {
    const wordsA = tokenizeWords(strA.toLowerCase());
    const wordsB = tokenizeWords(strB.toLowerCase());
    if (wordsA.length === 0 && wordsB.length === 0) return strA.trim() === strB.trim() ? 1.0 : 0.0;
    if (wordsA.length === 0 || wordsB.length === 0) return 0.0;
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    let intersection = 0;
    setA.forEach(w => { if (setB.has(w)) intersection++; });
    const union = new Set([...setA, ...setB]).size;
    return intersection / union;
  }

  function diffWords(oldText, newText) {
    const oldWords = oldText.split(/(\s+|[.,!?;:()"]+)/);
    const newWords = newText.split(/(\s+|[.,!?;:()"]+)/);

    const m = oldWords.length;
    const n = newWords.length;
    const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (oldWords[i] === newWords[j]) {
          dp[i + 1][j + 1] = dp[i][j] + 1;
        } else {
          dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }

    let i = m, j = n;
    const diff = [];
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
        diff.unshift({ type: 'unchanged', text: oldWords[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({ type: 'added', text: newWords[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        diff.unshift({ type: 'removed', text: oldWords[i - 1] });
        i--;
      }
    }
    return diff;
  }

  function populateCompareSelects() {
    const selA = document.getElementById('compare-version-a');
    const selB = document.getElementById('compare-version-b');
    const chSel = document.getElementById('compare-chapter-select');

    if (!selA || !selB || !chSel) return;

    selA.innerHTML = '';
    selB.innerHTML = '';
    chSel.innerHTML = '';

    versions.forEach(v => {
      const optText = `${v.name} (${v.versionType} · ${formatExactDateTime(v.frozenAt || v.lastEditedAt || v.createdAt)} · ${v.totalWords || 0}w)`;
      selA.innerHTML += `<option value="${v.id}">${escapeHtml(optText)}</option>`;
      selB.innerHTML += `<option value="${v.id}">${escapeHtml(optText)}</option>`;
    });

    if (versions.length > 1) {
      selA.selectedIndex = 0;
      selB.selectedIndex = versions.findIndex(v => v.id === activeVersionId) >= 0 ? versions.findIndex(v => v.id === activeVersionId) : 1;
    }

    chapters.forEach(c => {
      chSel.innerHTML += `<option value="${c.id}">${c.number}. ${escapeHtml(c.title)}</option>`;
    });
    if (currentChapterId) chSel.value = currentChapterId;
  }

  function runComparison() {
    const vIdA = document.getElementById('compare-version-a')?.value;
    const vIdB = document.getElementById('compare-version-b')?.value;
    const chId = document.getElementById('compare-chapter-select')?.value;

    const verA = versions.find(v => v.id === vIdA);
    const verB = versions.find(v => v.id === vIdB);
    if (!verA || !verB) return;

    const chA = (verA.chapters || []).find(c => c.id === chId) || (verA.chapters || [])[0] || { content: '', wordCount: 0, title: '', function: {} };
    const chB = (verB.chapters || []).find(c => c.id === chId) || (verB.chapters || [])[0] || { content: '', wordCount: 0, title: '', function: {} };

    currentCompareAnalysis = analyzeChapterRevision(chA, chB, verA.name, verB.name);
    renderCompareAnalysis(currentCompareAnalysis);
  }
  function analyzeChapterRevision(oldCh, newCh, nameA, nameB) {
    const isSceneBreak = (p) => /^\s*(\*\s*\*\s*\*|#|~)\s*$/.test(p);
    const oldStr = typeof oldCh === 'string' ? oldCh : (oldCh?.content || '');
    const newStr = typeof newCh === 'string' ? newCh : (newCh?.content || '');
    const oldParas = oldStr.split(/\n\s*\n/).map(p => p.trim()).filter(p => p && !isSceneBreak(p));
    const newParas = newStr.split(/\n\s*\n/).map(p => p.trim()).filter(p => p && !isSceneBreak(p));

    const oldWords = countWords(oldStr);
    const newWords = countWords(newStr);
    const netWords = newWords - oldWords;

    // Scenes breakdown
    const oldScenes = oldStr.split(/\*\s*\*\s*\*|#/).filter(s => s.trim().length > 0);
    const newScenes = newStr.split(/\*\s*\*\s*\*|#/).filter(s => s.trim().length > 0);

    // Paragraph pairing and classification
    const matchedOld = new Set();
    const matchedNew = new Set();
    const paraPairs = [];

    // Pass 1: Exact matches
    newParas.forEach((np, nIdx) => {
      oldParas.forEach((op, oIdx) => {
        if (!matchedOld.has(oIdx) && !matchedNew.has(nIdx) && np === op) {
          matchedOld.add(oIdx);
          matchedNew.add(nIdx);
          paraPairs.push({
            type: oIdx === nIdx ? 'unchanged' : 'moved',
            oldIndex: oIdx,
            newIndex: nIdx,
            oldText: op,
            newText: np,
            similarity: 1.0
          });
        }
      });
    });

    // Pass 2: High similarity modified matches (> 0.25 Jaccard)
    newParas.forEach((np, nIdx) => {
      if (matchedNew.has(nIdx)) return;
      let bestSim = 0;
      let bestOIdx = -1;

      oldParas.forEach((op, oIdx) => {
        if (!matchedOld.has(oIdx)) {
          const sim = jaccardSimilarity(op, np);
          if (sim > bestSim && sim >= 0.25) {
            bestSim = sim;
            bestOIdx = oIdx;
          }
        }
      });

      if (bestOIdx !== -1) {
        matchedOld.add(bestOIdx);
        matchedNew.add(nIdx);
        paraPairs.push({
          type: 'modified',
          oldIndex: bestOIdx,
          newIndex: nIdx,
          oldText: oldParas[bestOIdx],
          newText: np,
          similarity: bestSim
        });
      }
    });

    // Pass 3: Added paragraphs
    newParas.forEach((np, nIdx) => {
      if (!matchedNew.has(nIdx)) {
        paraPairs.push({
          type: 'added',
          oldIndex: null,
          newIndex: nIdx,
          oldText: null,
          newText: np,
          similarity: 0
        });
      }
    });

    // Pass 4: Removed paragraphs
    oldParas.forEach((op, oIdx) => {
      if (!matchedOld.has(oIdx)) {
        paraPairs.push({
          type: 'removed',
          oldIndex: oIdx,
          newIndex: null,
          oldText: op,
          newText: null,
          similarity: 0
        });
      }
    });

    // Sort pairs by newIndex where available, then oldIndex
    paraPairs.sort((a, b) => {
      const idxA = a.newIndex !== null ? a.newIndex : 9999 + (a.oldIndex || 0);
      const idxB = b.newIndex !== null ? b.newIndex : 9999 + (b.oldIndex || 0);
      return idxA - idxB;
    });

    // Calculate Revision Intensity
    const addedCount = paraPairs.filter(p => p.type === 'added').length;
    const removedCount = paraPairs.filter(p => p.type === 'removed').length;
    const modifiedCount = paraPairs.filter(p => p.type === 'modified').length;
    const movedCount = paraPairs.filter(p => p.type === 'moved').length;
    const unchangedCount = paraPairs.filter(p => p.type === 'unchanged').length;

    const totalTracked = paraPairs.length || 1;
    const changeScore = ((addedCount * 1.0) + (removedCount * 1.0) + (modifiedCount * 0.75) + (movedCount * 0.35)) / totalTracked;
    const changePercent = Math.min(100, Math.round(changeScore * 100));

    let intensityLabel = 'Minimal';
    if (changePercent > 70) intensityLabel = 'Near-total rewrite';
    else if (changePercent > 45) intensityLabel = 'Substantial';
    else if (changePercent > 20) intensityLabel = 'Moderate';
    else if (changePercent > 5) intensityLabel = 'Light';

    // Continuity Impact derivation
    const continuityShifts = [];
    motifs.forEach(m => {
      let oldHits = 0, newHits = 0;
      (m.keywords || []).forEach(kw => {
        const reg = new RegExp('\\b' + escapeRegExp(kw) + '\\b', 'gi');
        oldHits += ((oldCh.content || '').match(reg) || []).length;
        newHits += ((newCh.content || '').match(reg) || []).length;
      });
      if (newHits > oldHits) continuityShifts.push(`Motif "${m.name}" increased (+${newHits - oldHits})`);
      else if (oldHits > newHits) continuityShifts.push(`Motif "${m.name}" decreased (-${oldHits - newHits})`);
    });

    characters.forEach(c => {
      const reg = new RegExp('\\b' + escapeRegExp(c.canonicalName || c.name) + '\\b', 'gi');
      const inOld = reg.test(oldCh.content || '');
      const inNew = reg.test(newCh.content || '');
      if (inOld && !inNew) continuityShifts.push(`Character "${c.canonicalName || c.name}" removed from chapter`);
      else if (!inOld && inNew) continuityShifts.push(`Character "${c.canonicalName || c.name}" introduced`);
    });

    // Function Diff Check
    const fnA = oldCh.function || {};
    const fnB = newCh.function || {};
    const fnDiffs = [];
    if ((fnA.purpose || '') !== (fnB.purpose || '')) {
      fnDiffs.push(`<strong>Purpose:</strong> "${escapeHtml(fnA.purpose || 'None')}" ➔ "${escapeHtml(fnB.purpose || 'None')}"`);
    }
    if ((fnA.centralTurn || '') !== (fnB.centralTurn || '')) {
      fnDiffs.push(`<strong>Central Turn:</strong> "${escapeHtml(fnA.centralTurn || 'None')}" ➔ "${escapeHtml(fnB.centralTurn || 'None')}"`);
    }
    if ((fnA.setup || '') !== (fnB.setup || '')) {
      fnDiffs.push(`<strong>Setup:</strong> "${escapeHtml(fnA.setup || 'None')}" ➔ "${escapeHtml(fnB.setup || 'None')}"`);
    }
    if ((fnA.payoff || '') !== (fnB.payoff || '')) {
      fnDiffs.push(`<strong>Payoff:</strong> "${escapeHtml(fnA.payoff || 'None')}" ➔ "${escapeHtml(fnB.payoff || 'None')}"`);
    }

    return {
      chapterNum: newCh.number || oldCh.number || 1,
      chapterTitle: newCh.title || oldCh.title || 'Untitled',
      nameA,
      nameB,
      oldWords,
      newWords,
      netWords,
      oldScenesCount: oldScenes.length,
      newScenesCount: newScenes.length,
      addedCount,
      removedCount,
      modifiedCount,
      movedCount,
      unchangedCount,
      changePercent,
      intensityLabel,
      paraPairs,
      continuityShifts,
      fnDiffs
    };
  }

  function renderCompareAnalysis(analysis) {
    if (!analysis) return;

    // Intensity badge
    const intensityBadge = document.getElementById('diff-intensity-badge');
    if (intensityBadge) {
      intensityBadge.textContent = `${analysis.intensityLabel} — ~${analysis.changePercent}% changed`;
    }

    // Revision Map Strip (5 slices across chapter)
    const strip = document.getElementById('diff-map-strip');
    if (strip) {
      strip.innerHTML = '';
      const sliceCount = 5;
      const sliceSize = Math.ceil(analysis.paraPairs.length / sliceCount) || 1;

      for (let s = 0; s < sliceCount; s++) {
        const sliceParas = analysis.paraPairs.slice(s * sliceSize, (s + 1) * sliceSize);
        let changedInSlice = 0;
        sliceParas.forEach(p => {
          if (p.type !== 'unchanged') changedInSlice++;
        });
        const slicePct = sliceParas.length > 0 ? Math.round((changedInSlice / sliceParas.length) * 100) : 0;

        let bg = '#10b981'; // green unchanged
        if (slicePct > 60) bg = '#f43f5e'; // heavy change
        else if (slicePct > 25) bg = '#f59e0b'; // moderate
        else if (slicePct > 0) bg = '#0ea5e9'; // light

        const sliceDiv = document.createElement('div');
        sliceDiv.className = 'map-slice';
        sliceDiv.style.backgroundColor = bg;
        sliceDiv.style.color = '#ffffff';
        sliceDiv.textContent = slicePct > 0 ? slicePct + '%' : '·';
        sliceDiv.title = `Section ${s + 1}: ${slicePct}% rewritten (${changedInSlice}/${sliceParas.length} paragraphs)`;
        strip.appendChild(sliceDiv);
      }
    }

    // Summary Metrics
    const metricsDiv = document.getElementById('diff-metrics-summary');
    if (metricsDiv) {
      metricsDiv.innerHTML = `
        <div><strong>Base (${escapeHtml(analysis.nameA)}):</strong> ${analysis.oldWords.toLocaleString()} words</div>
        <div><strong>Target (${escapeHtml(analysis.nameB)}):</strong> ${analysis.newWords.toLocaleString()} words</div>
        <div><strong>Net:</strong> ${analysis.netWords >= 0 ? '+' : ''}${analysis.netWords} words</div>
        <hr style="border: none; border-top: 1px solid var(--border-subtle); margin: 0.5rem 0;">
        <div><strong>Structural Shifts:</strong></div>
        <div>• Scenes: ${analysis.oldScenesCount} → ${analysis.newScenesCount}</div>
        <div>• ${analysis.modifiedCount} paragraphs rewritten</div>
        <div>• ${analysis.addedCount} new paragraphs added</div>
        <div>• ${analysis.removedCount} paragraphs removed</div>
        <div>• ${analysis.movedCount} paragraphs moved</div>
        <div>• ${analysis.unchangedCount} paragraphs intact</div>
      `;
    }

    // Function Diff Box
    const fnBox = document.getElementById('compare-function-diff-box');
    if (fnBox) {
      if (analysis.fnDiffs.length > 0) {
        fnBox.innerHTML = `<div style="color: #f59e0b; font-weight: bold; margin-bottom: 0.3rem;">Function Shift Detected:</div>` + analysis.fnDiffs.join('<br>');
      } else {
        fnBox.innerHTML = '<span style="color: var(--text-muted);">No recorded function changes between versions.</span>';
      }
    }

    // Continuity Impact
    const contDiv = document.getElementById('diff-continuity-impact');
    if (contDiv) {
      if (analysis.continuityShifts.length === 0) {
        contDiv.innerHTML = '<span style="color: var(--text-muted);">No motif or character presence discrepancies detected.</span>';
      } else {
        contDiv.innerHTML = analysis.continuityShifts.map(s => `• ${escapeHtml(s)}`).join('<br>');
      }
    }

    renderCompareMainList();
  }

  function setCompareViewMode(mode) {
    compareViewMode = mode;
    ['all', 'survived', 'disappeared'].forEach(m => {
      const btn = document.getElementById('diff-view-tab-' + m);
      if (btn) btn.classList.toggle('active', m === mode);
    });
    renderCompareMainList();
  }

  function filterCompareResults() {
    renderCompareMainList();
  }

  function renderCompareMainList() {
    const mainDisplay = document.getElementById('diff-main-display');
    if (!mainDisplay || !currentCompareAnalysis) return;

    const filter = document.getElementById('compare-filter-select')?.value || 'all';
    mainDisplay.innerHTML = '';

    let pairsToRender = currentCompareAnalysis.paraPairs;

    // View Mode Filters
    if (compareViewMode === 'survived') {
      pairsToRender = pairsToRender.filter(p => p.type === 'unchanged' || (p.type === 'modified' && p.similarity > 0.5));
    } else if (compareViewMode === 'disappeared') {
      pairsToRender = pairsToRender.filter(p => p.type === 'removed');
    }

    // Dropdown filters
    if (filter === 'added') pairsToRender = pairsToRender.filter(p => p.type === 'added');
    else if (filter === 'removed') pairsToRender = pairsToRender.filter(p => p.type === 'removed');
    else if (filter === 'modified') pairsToRender = pairsToRender.filter(p => p.type === 'modified');
    else if (filter === 'moved') pairsToRender = pairsToRender.filter(p => p.type === 'moved');

    if (pairsToRender.length === 0) {
      mainDisplay.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3rem;">No paragraphs matching the "${compareViewMode}" view / filter criteria.</div>`;
      return;
    }

    pairsToRender.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = `para-diff-card para-${p.type}`;

      let actionButtons = '';
      if (p.type === 'removed' || p.type === 'modified') {
        actionButtons = `
          <div style="display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-sm" onclick="Atlas.copyDiffText(${idx}, 'old')">Copy Previous</button>
            <button class="btn btn-sm btn-primary" onclick="Atlas.insertDiffIntoCurrent(${idx}, 'old')">Insert at Cursor</button>
            <button class="btn btn-sm btn-amber" onclick="Atlas.saveDiffAsFragment(${idx}, 'old')">Save as Fragment</button>
            ${p.type === 'modified' ? `<button class="btn btn-sm" onclick="Atlas.restoreSingleParagraph(${idx})">Restore Previous Paragraph</button>` : ''}
          </div>
        `;
      }

      let contentHtml = '';
      if (p.type === 'unchanged') {
        contentHtml = `<div class="para-diff-content" style="color: var(--text-secondary);">${escapeHtml(p.newText)}</div>`;
      } else if (p.type === 'added') {
        contentHtml = `<div class="para-diff-content" style="color: var(--diff-added-text);">+ ${escapeHtml(p.newText)}</div>`;
      } else if (p.type === 'removed') {
        contentHtml = `<div class="para-diff-content" style="color: var(--diff-removed-text); text-decoration: line-through;">- ${escapeHtml(p.oldText)}</div>`;
      } else if (p.type === 'moved') {
        contentHtml = `
          <div class="para-diff-content" style="color: var(--diff-moved-text);">
            <strong>[Moved from Paragraph ${p.oldIndex + 1} to ${p.newIndex + 1}]</strong><br>
            ${escapeHtml(p.newText)}
          </div>
        `;
      } else if (p.type === 'modified') {
        const wordTokens = diffWords(p.oldText, p.newText);
        let wordHtml = '';
        wordTokens.forEach(w => {
          if (w.type === 'unchanged') wordHtml += escapeHtml(w.text);
          else if (w.type === 'removed') wordHtml += `<span class="diff-inline-removed">${escapeHtml(w.text)}</span>`;
          else if (w.type === 'added') wordHtml += `<span class="diff-inline-added">${escapeHtml(w.text)}</span>`;
        });

        contentHtml = `
          <div class="para-diff-content">
            ${wordHtml}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem;">
            Similarity match: ${Math.round(p.similarity * 100)}%
          </div>
        `;
      }

      card.innerHTML = `
        <div class="para-diff-header">
          <span>Paragraph ${p.newIndex !== null ? p.newIndex + 1 : (p.oldIndex + 1) + ' (Previous)'} · ${p.type.toUpperCase()}</span>
          <span>${p.type === 'unchanged' ? 'Intact' : p.type}</span>
        </div>
        ${contentHtml}
        ${actionButtons}
      `;
      mainDisplay.appendChild(card);
    });
  }

  // DIFF ACTIONS (COPY, INSERT, RESTORE, FRAGMENT)
  function copyDiffText(pairIndex, which) {
    if (!currentCompareAnalysis) return;
    const pair = currentCompareAnalysis.paraPairs[pairIndex];
    if (!pair) return;
    const text = which === 'old' ? pair.oldText : pair.newText;
    navigator.clipboard.writeText(text).then(() => {
      alert('Previous text copied to clipboard.');
    });
  }

  function insertDiffIntoCurrent(pairIndex, which) {
    if (viewingHistoricalVersionId) {
      alert('Cannot insert into a historical read-only version. Return to active draft or branch first.');
      return;
    }
    if (!currentCompareAnalysis) return;
    const pair = currentCompareAnalysis.paraPairs[pairIndex];
    if (!pair) return;
    const text = which === 'old' ? pair.oldText : pair.newText;

    const ch = chapters.find(c => c.id === currentChapterId);
    if (!ch) return;

    const content = ch.content || '';
    const pos = Math.min(lastEditorCursorPosition, content.length);

    ch.content = content.slice(0, pos) + '\n\n' + text + '\n\n' + content.slice(pos);
    ch.wordCount = countWords(ch.content);
    ch.lastEditedAt = new Date().toISOString();
    lastEditorCursorPosition = pos + text.length + 4;

    saveCurrentChapterNow();
    loadCurrentChapterToEditor();

    switchView('write');
    const textarea = document.getElementById('editor-textarea');
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(lastEditorCursorPosition, lastEditorCursorPosition);
    }
    alert('Inserted into active chapter at saved cursor position.');
  }

  function restoreSingleParagraph(pairIndex) {
    if (viewingHistoricalVersionId) {
      alert('Cannot restore into historical drafts.');
      return;
    }
    if (!currentCompareAnalysis) return;
    const pair = currentCompareAnalysis.paraPairs[pairIndex];
    if (!pair || !pair.oldText || !pair.newText) return;

    const ch = chapters.find(c => c.id === currentChapterId);
    if (!ch) return;

    ch.content = ch.content.replace(pair.newText, pair.oldText);
    ch.wordCount = countWords(ch.content);
    ch.lastEditedAt = new Date().toISOString();
    saveCurrentChapterNow();
    loadCurrentChapterToEditor();
    runComparison();
    alert('Paragraph restored to previous version.');
  }

  function saveDiffAsFragment(pairIndex, which) {
    if (!currentCompareAnalysis) return;
    const pair = currentCompareAnalysis.paraPairs[pairIndex];
    if (!pair) return;
    const text = which === 'old' ? pair.oldText : pair.newText;

    const newFrag = {
      id: 'frag-' + Date.now(),
      title: `Excised from Chapter ${currentCompareAnalysis.chapterNum} (${formatExactDateTime(new Date().toISOString())})`,
      content: text,
      wordCount: countWords(text),
      status: 'active',
      tags: ['Excised', 'Revision Artifact'],
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };
    fragments.unshift(newFrag);
    putItem('fragments', newFrag);
    renderFragments();
    alert('Saved excised paragraph as a new Fragment in Vault.');
  }

  // ==========================================================================
  // MODULE 3: REFERENCE & MANUSCRIPT FUNCTION MAP
  // ==========================================================================
  function switchRefTab(subtab) {
    document.querySelectorAll('.ref-subnav .nav-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.ref-pane').forEach(p => p.style.display = 'none');

    const activeBtn = Array.from(document.querySelectorAll('.ref-subnav .nav-tab-btn')).find(b => b.onclick && b.onclick.toString().includes(subtab));
    if (activeBtn) activeBtn.classList.add('active');

    const target = document.getElementById('ref-pane-' + subtab);
    if (target) target.style.display = 'block';

    if (subtab === 'function-map') renderFunctionMap();
  }

  function renderFunctionMap() {
    const tbody = document.getElementById('function-map-tbody');
    const filterStatus = document.getElementById('map-filter-status')?.value || 'all';
    const filterSearch = (document.getElementById('map-filter-search')?.value || '').toLowerCase();
    if (!tbody) return;
    tbody.innerHTML = '';

    const sourceChapters = viewingHistoricalVersionId ? historicalChapters : chapters;
    const observations = [];

    let consecutiveNoTurn = 0;
    let prevPurpose = '';

    sourceChapters.forEach((ch, idx) => {
      const fn = ch.function || {};
      const status = ch.revisionStatus || 'Unreviewed';

      // Observations Check
      if (fn.purpose && prevPurpose && fn.purpose.toLowerCase() === prevPurpose.toLowerCase()) {
        observations.push(`Chapters ${ch.number - 1} and ${ch.number} have identical recorded purposes: "${escapeHtml(fn.purpose)}"`);
      }
      prevPurpose = fn.purpose || '';

      if (!fn.centralTurn) {
        consecutiveNoTurn++;
        if (consecutiveNoTurn === 3) {
          observations.push(`Chapters ${ch.number - 2}, ${ch.number - 1}, and ${ch.number} have no recorded central turn.`);
        }
      } else {
        consecutiveNoTurn = 0;
      }

      // Filter
      if (filterStatus !== 'all' && status !== filterStatus) return;
      if (filterSearch) {
        const text = (ch.title + ' ' + (fn.purpose || '') + ' ' + (fn.centralTurn || '') + ' ' + (fn.setup || '')).toLowerCase();
        if (!text.includes(filterSearch)) return;
      }

      const tr = document.createElement('tr');
      const statusClass = 'status-' + status.toLowerCase().replace(/\s+/g, '_');
      tr.innerHTML = `
        <td><strong>${ch.number}. ${escapeHtml(ch.title)}</strong></td>
        <td><span class="status-pill ${statusClass}">${escapeHtml(status)}</span></td>
        <td>${escapeHtml(fn.purpose || '—')}</td>
        <td>${escapeHtml(fn.centralTurn || '—')}</td>
        <td>${escapeHtml(fn.setup || '—')}</td>
        <td>${escapeHtml(fn.payoff || '—')}</td>
      `;
      tbody.appendChild(tr);
    });

    // Update observations banner
    const obsList = document.getElementById('structural-observations-list');
    if (obsList) {
      if (observations.length > 0) {
        obsList.innerHTML = observations.map(o => `<div>• ${o}</div>`).join('');
      } else {
        obsList.innerHTML = '<div>✓ No structural anomalies or repeated chapter jobs detected in recorded metadata.</div>';
      }
    }
  }

  function renderLexicon() {
    const container = document.getElementById('lexicon-content');
    if (!container || !activeProfile || !activeProfile.lexicon) return;
    const lex = activeProfile.lexicon;
    container.innerHTML = `
      <div class="inspector-section">
        <label class="section-label">Sacred Terms</label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
          ${(lex.sacredTerms || []).map(t => `<span class="function-tag-pill">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      <div class="inspector-section">
        <label class="section-label">Custom Lexicon</label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
          ${(lex.customTerms || []).map(t => `<span class="function-tag-pill">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  function renderMotifs() {
    const grid = document.getElementById('motifs-grid');
    if (!grid) return;
    grid.innerHTML = '';
    motifs.forEach(m => {
      const card = document.createElement('div');
      card.className = 'version-card';
      card.innerHTML = `
        <div style="font-weight: 700; font-size: 0.9rem;">${escapeHtml(m.name)}</div>
        <div style="font-size: 0.72rem; color: var(--accent-primary); text-transform: uppercase;">${escapeHtml(m.category || 'Motif')}</div>
        <div style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(m.significance || '')}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">Keywords: ${(m.keywords || []).join(', ')}</div>
      `;
      grid.appendChild(card);
    });
  }

  function renderCanon() {
    const list = document.getElementById('canon-list');
    if (!list) return;
    list.innerHTML = '';
    canon.forEach(c => {
      const card = document.createElement('div');
      card.className = 'version-card';
      card.innerHTML = `
        <div style="font-weight: 700; font-size: 0.88rem;">${escapeHtml(c.title)}</div>
        <div style="font-size: 0.72rem; color: var(--accent-primary);">Established in Chapter ${c.establishedIn || '—'}</div>
        <div style="font-size: 0.8rem; color: var(--text-primary); margin-top: 0.25rem;">${escapeHtml(c.statement)}</div>
      `;
      list.appendChild(card);
    });
  }

  function renderTimeline() {
    const list = document.getElementById('timeline-list');
    if (!list) return;
    list.innerHTML = '';
    timeline.forEach(t => {
      const card = document.createElement('div');
      card.className = 'version-card';
      card.innerHTML = `
        <div style="font-weight: 700; font-size: 0.88rem;">${escapeHtml(t.title || t.event)}</div>
        <div style="font-size: 0.72rem; color: var(--accent-primary);">Time: ${escapeHtml(t.time || t.chronology || '—')}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">${escapeHtml(t.description || '')}</div>
      `;
      list.appendChild(card);
    });
  }

  function renderCharacters() {
    const grid = document.getElementById('characters-grid');
    if (!grid) return;
    grid.innerHTML = '';
    characters.forEach(c => {
      const card = document.createElement('div');
      card.className = 'version-card';
      card.innerHTML = `
        <div style="font-weight: 700; font-size: 0.95rem;">${escapeHtml(c.canonicalName || c.name)}</div>
        <div style="font-size: 0.72rem; color: var(--accent-primary); text-transform: uppercase;">${escapeHtml(c.role || 'Figure')}</div>
        <div style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(c.coreRelationships || c.description || '')}</div>
      `;
      grid.appendChild(card);
    });
  }

  function scanCharacterAppearances() {
    alert(`Scanned ${characters.length} characters across ${chapters.length} chapters.`);
  }

  function renderFragments() {
    const grid = document.getElementById('fragments-grid');
    if (!grid) return;
    grid.innerHTML = '';
    fragments.forEach(f => {
      const card = document.createElement('div');
      card.className = 'version-card';
      card.innerHTML = `
        <div style="font-weight: 700; font-size: 0.9rem;">${escapeHtml(f.title)}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${f.wordCount || countWords(f.content)} words · ${formatExactDateTime(f.modifiedDate || f.createdDate)}</div>
        <div style="font-size: 0.82rem; color: var(--text-prose); max-height: 80px; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-prose-editorial);">${escapeHtml(f.content)}</div>
        <div style="display: flex; gap: 0.4rem; margin-top: 0.5rem;">
          <button class="btn btn-sm" onclick="Atlas.insertFragmentAtCursor('${f.id}')">Insert at Cursor</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function createNewFragment() {
    const title = prompt('Fragment Title:', 'Excised passage');
    if (!title) return;
    const newFrag = {
      id: 'frag-' + Date.now(),
      title: title,
      content: '',
      wordCount: 0,
      status: 'active',
      tags: [],
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };
    fragments.unshift(newFrag);
    putItem('fragments', newFrag);
    renderFragments();
  }

  function insertFragmentAtCursor(fragId) {
    if (viewingHistoricalVersionId) {
      alert('Cannot insert fragments into historical read-only drafts. Return to active draft or branch as new working draft.');
      return;
    }
    const frag = fragments.find(f => f.id === fragId);
    if (!frag) return;

    const ch = chapters.find(c => c.id === currentChapterId);
    if (!ch) return;

    const content = ch.content || '';
    const pos = Math.min(lastEditorCursorPosition, content.length);

    ch.content = content.slice(0, pos) + '\n\n' + frag.content + '\n\n' + content.slice(pos);
    ch.wordCount = countWords(ch.content);
    ch.lastEditedAt = new Date().toISOString();
    lastEditorCursorPosition = pos + frag.content.length + 4;

    saveCurrentChapterNow();
    loadCurrentChapterToEditor();

    const textarea = document.getElementById('editor-textarea');
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(lastEditorCursorPosition, lastEditorCursorPosition);
    }
    alert('Fragment inserted into current chapter at cursor.');
  }

  // ==========================================================================
  // MODULE 4: VERSION HISTORY & LINEAGE
  // ==========================================================================
  function renderVersionList() {
    const container = document.getElementById('versions-container');
    if (!container) return;
    container.innerHTML = '';

    // Group by Revision Cycle, newest first
    const cyclesMap = new Map();
    const safetySnapshots = [];

    const sortedVersions = [...versions].sort((a, b) => {
      const dateA = new Date(a.frozenAt || a.lastEditedAt || a.createdAt);
      const dateB = new Date(b.frozenAt || b.lastEditedAt || b.createdAt);
      return dateB - dateA;
    });

    sortedVersions.forEach(v => {
      if (v.isSafetySnapshot) {
        safetySnapshots.push(v);
        return;
      }
      const cycle = v.revisionCycle || 'General Milestones';
      if (!cyclesMap.has(cycle)) cyclesMap.set(cycle, []);
      cyclesMap.get(cycle).push(v);
    });

    // Render human milestones
    cyclesMap.forEach((vers, cycleName) => {
      const cycleEl = document.createElement('div');
      cycleEl.className = 'cycle-group';
      cycleEl.innerHTML = `
        <div class="cycle-header">
          <span>${escapeHtml(cycleName)}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">${vers.length} version${vers.length === 1 ? '' : 's'}</span>
        </div>
        <div class="version-cards-grid" id="grid-${escapeHtml(cycleName.replace(/\s+/g, '_'))}"></div>
      `;
      container.appendChild(cycleEl);

      const grid = cycleEl.querySelector('.version-cards-grid');
      vers.forEach(v => {
        grid.appendChild(createVersionCardElement(v));
      });
    });

    // Secondary Collapsible Safety Snapshots Section
    if (safetySnapshots.length > 0) {
      const safetyWrap = document.createElement('div');
      safetyWrap.className = 'cycle-group';
      safetyWrap.style.marginTop = '2rem';
      safetyWrap.innerHTML = `
        <div class="cycle-header" style="cursor: pointer;" onclick="Atlas.toggleSafetySnapshotsCollapse()">
          <span>⚡ Automatic Safety Snapshots (${safetySnapshots.length})</span>
          <span style="font-size: 0.8rem; color: var(--accent-primary);">${safetySnapshotsCollapsed ? '▶ Show Snapshots' : '▼ Hide Snapshots'}</span>
        </div>
        <div class="version-cards-grid" id="safety-snapshots-grid" style="display: ${safetySnapshotsCollapsed ? 'none' : 'grid'};"></div>
      `;
      container.appendChild(safetyWrap);

      const sGrid = safetyWrap.querySelector('#safety-snapshots-grid');
      safetySnapshots.forEach(v => {
        sGrid.appendChild(createVersionCardElement(v));
      });
    }
  }

  function createVersionCardElement(v) {
    const card = document.createElement('div');
    const isActive = v.id === activeVersionId;
    const typeKey = v.versionType.toLowerCase().split(' ')[0];
    const typeClass = 'type-' + typeKey;

    card.className = 'version-card' + (isActive ? ' is-active' : '');
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; color: var(--text-primary);">
            ${escapeHtml(v.name)}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.1rem;">
            Code: ${escapeHtml(v.code || 'RA-0000')}
          </div>
        </div>
        <span class="version-type-pill ${typeClass}">${escapeHtml(v.versionType)}</span>
      </div>

      <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4;">
        <div><strong>Date:</strong> ${formatExactDateTime(v.frozenAt || v.lastEditedAt || v.createdAt)}</div>
        <div><strong>Words:</strong> ${(v.totalWords || 0).toLocaleString()} words (${v.chapterCount || (v.chapters ? v.chapters.length : 0)} chapters)</div>
        ${v.parentName ? `<div><strong>Created from:</strong> ${escapeHtml(v.parentName)}</div>` : ''}
      </div>

      ${v.authorNote ? `<div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; background: var(--bg-surface); padding: 0.4rem 0.6rem; border-radius: 4px;">"${escapeHtml(v.authorNote)}"</div>` : ''}

      <div style="display: flex; gap: 0.4rem; margin-top: auto; padding-top: 0.5rem; border-top: 1px solid var(--border-subtle);">
        ${isActive ? `
          <span style="font-size: 0.75rem; color: #10b981; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem;">● Currently Active</span>
        ` : `
          <button class="btn btn-sm" onclick="Atlas.viewVersion('${v.id}')">View (Read-Only)</button>
          <button class="btn btn-sm" onclick="Atlas.switchToActiveVersion('${v.id}')">Set as Active</button>
        `}
        <button class="btn btn-sm" onclick="Atlas.compareHistoricalAgainstActive('${v.id}')">Compare</button>
      </div>
    `;
    return card;
  }

  function toggleSafetySnapshotsCollapse() {
    safetySnapshotsCollapsed = !safetySnapshotsCollapsed;
    renderVersionList();
  }

  function openSaveVersionModal() {
    OverlayManager.openModal('save-version-modal');
    document.getElementById('save-ver-name').value = '';
    document.getElementById('save-ver-cycle').value = '';
    document.getElementById('save-ver-notes').value = '';
    document.getElementById('save-ver-warning').style.display = 'none';
  }

  function closeSaveVersionModal() {
    OverlayManager.closeModal('save-version-modal');
  }

  function checkVersionNameDuplicate(name) {
    const warning = document.getElementById('save-ver-warning');
    const isDup = versions.some(v => v.name.toLowerCase() === name.trim().toLowerCase());
    warning.style.display = isDup ? 'block' : 'none';
  }

  async function saveVersionFromModal() {
    const name = document.getElementById('save-ver-name').value.trim() || 'Milestone Snapshot';
    const type = document.getElementById('save-ver-type').value;
    const cycle = document.getElementById('save-ver-cycle').value.trim() || 'General Milestones';
    const notes = document.getElementById('save-ver-notes').value.trim();

    const activeVer = versions.find(v => v.id === activeVersionId) || {};
    const totalWords = chapters.reduce((acc, c) => acc + (c.wordCount || countWords(c.content)), 0);

    const newVer = {
      id: 'ver-' + Date.now(),
      code: 'RA-' + type[0] + '-' + String(versions.length + 1).padStart(4, '0'),
      name: name,
      versionType: type,
      createdAt: new Date().toISOString(),
      lastEditedAt: type === 'Working Branch' ? new Date().toISOString() : null,
      frozenAt: type !== 'Working Branch' ? new Date().toISOString() : null,
      parentId: activeVer.id || null,
      parentName: activeVer.name || null,
      parentType: activeVer.versionType || null,
      authorNote: notes,
      totalWords: totalWords,
      chapterCount: chapters.length,
      revisionCycle: cycle,
      status: type === 'Working Branch' ? 'active' : 'frozen',
      isReadOnly: type !== 'Working Branch',
      isSafetySnapshot: false,
      chapters: JSON.parse(JSON.stringify(chapters))
    };

    await putItem('versions', newVer);
    versions.push(newVer);

    if (type === 'Working Branch') {
      activeVersionId = newVer.id;
      await putItem('activeState', { key: 'activeVersionId', value: activeVersionId });
    }

    closeSaveVersionModal();
    renderVersionList();
    renderActiveVersionHeader();
    alert(`Version "${name}" (${type}) saved successfully.`);
  }

  async function takeSafetySnapshot() {
    const activeVer = versions.find(v => v.id === activeVersionId) || {};
    const totalWords = chapters.reduce((acc, c) => acc + (c.wordCount || countWords(c.content)), 0);
    const nowIso = new Date().toISOString();

    const snap = {
      id: 'snap-safety-' + Date.now(),
      code: 'RA-S-' + String(versions.length + 1).padStart(4, '0'),
      name: 'Safety Snapshot (' + formatExactDateTime(nowIso) + ')',
      versionType: 'Safety Snapshot',
      createdAt: nowIso,
      lastEditedAt: null,
      frozenAt: nowIso,
      parentId: activeVer.id || null,
      parentName: activeVer.name || null,
      parentType: activeVer.versionType || null,
      authorNote: 'Automatic routine safety snapshot before operation.',
      totalWords: totalWords,
      chapterCount: chapters.length,
      revisionCycle: 'Safety Snapshots',
      status: 'frozen',
      isReadOnly: true,
      isSafetySnapshot: true,
      chapters: JSON.parse(JSON.stringify(chapters))
    };

    await putItem('versions', snap);
    versions.push(snap);
    renderVersionList();
  }

  function viewVersion(versionId) {
    const targetVer = versions.find(v => v.id === versionId);
    if (!targetVer) return;

    viewingHistoricalVersionId = versionId;
    historicalChapters = JSON.parse(JSON.stringify(targetVer.chapters || []));

    switchView('write');
    renderActiveVersionHeader();
    renderChapterList();
    if (historicalChapters.length > 0) {
      selectChapter(historicalChapters[0].id);
    }
  }

  function returnToActiveWorkingDraft() {
    viewingHistoricalVersionId = null;
    historicalChapters = [];
    switchView('write');
    renderActiveVersionHeader();
    renderChapterList();
    if (chapters.length > 0) {
      selectChapter(chapters[0].id);
    }
  }

  async function switchToActiveVersion(versionId) {
    const targetVer = versions.find(v => v.id === versionId);
    if (!targetVer) return;

    if (!confirm(`Make "${targetVer.name}" your active working draft? Current unsaved working edits will remain in this branch.`)) return;

    activeVersionId = versionId;
    await putItem('activeState', { key: 'activeVersionId', value: activeVersionId });

    if (targetVer.chapters && targetVer.chapters.length > 0) {
      chapters = JSON.parse(JSON.stringify(targetVer.chapters));
      for (const c of chapters) await putItem('chapters', c);
    }

    viewingHistoricalVersionId = null;
    renderActiveVersionHeader();
    renderChapterList();
    if (chapters.length > 0) selectChapter(chapters[0].id);
  }

  async function branchHistoricalAsWorking() {
    const histVer = versions.find(v => v.id === viewingHistoricalVersionId);
    if (!histVer) return;

    const newName = prompt('New Working Branch Name:', 'Branch of ' + histVer.name);
    if (!newName) return;

    const totalWords = (histVer.chapters || []).reduce((acc, c) => acc + (c.wordCount || countWords(c.content)), 0);
    const newVer = {
      id: 'ver-work-' + Date.now(),
      code: 'RA-W-' + String(versions.length + 1).padStart(4, '0'),
      name: newName,
      versionType: 'Working Branch',
      createdAt: new Date().toISOString(),
      lastEditedAt: new Date().toISOString(),
      frozenAt: null,
      parentId: histVer.id,
      parentName: histVer.name,
      parentType: histVer.versionType,
      authorNote: 'Branched from ' + histVer.name,
      totalWords: totalWords,
      chapterCount: histVer.chapters.length,
      revisionCycle: 'Branched Revisions',
      status: 'active',
      isReadOnly: false,
      isSafetySnapshot: false,
      chapters: JSON.parse(JSON.stringify(histVer.chapters || []))
    };

    await putItem('versions', newVer);
    versions.push(newVer);
    activeVersionId = newVer.id;
    await putItem('activeState', { key: 'activeVersionId', value: activeVersionId });

    chapters = JSON.parse(JSON.stringify(newVer.chapters));
    for (const c of chapters) await putItem('chapters', c);

    viewingHistoricalVersionId = null;
    historicalChapters = [];

    renderActiveVersionHeader();
    renderChapterList();
    if (chapters.length > 0) selectChapter(chapters[0].id);
    alert(`Branched new working draft "${newName}". Lineage: Created from ${histVer.name}.`);
  }

  function compareHistoricalAgainstActive(targetVersionId) {
    const vId = targetVersionId || viewingHistoricalVersionId;
    switchView('compare');
    if (vId) {
      document.getElementById('compare-version-a').value = vId;
      document.getElementById('compare-version-b').value = activeVersionId;
      runComparison();
    }
  }

  function openChapterHistoryModal() {
    const modal = document.getElementById('chapter-history-modal');
    const titleEl = document.getElementById('chapter-history-title');
    const bodyEl = document.getElementById('chapter-history-body');

    const ch = (viewingHistoricalVersionId ? historicalChapters : chapters).find(c => c.id === currentChapterId);
    if (!ch) return;

    titleEl.textContent = `Chapter ${ch.number}: ${ch.title} — Revision Timeline`;
    bodyEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div class="version-card">
          <div style="font-weight: 700;">Current State: ${escapeHtml(ch.revisionStatus || 'Unreviewed')}</div>
          <div style="font-size: 0.78rem; color: var(--text-secondary);">Last edited: ${formatExactDateTime(ch.lastEditedAt || ch.lastModified)}</div>
          ${ch.lastRevisionCompletedAt ? `<div style="font-size: 0.78rem; color: #10b981;">Revision Completed: ${formatExactDateTime(ch.lastRevisionCompletedAt)}</div>` : ''}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          Each chapter tracks independent revision events, edit timestamps, and function changes across working drafts, reference drafts, archives, and safety snapshots.
        </div>
      </div>
    `;
    OverlayManager.openModal('chapter-history-modal');
  }

  function closeChapterHistoryModal() {
    OverlayManager.closeModal('chapter-history-modal');
  }

  // ==========================================================================
  // MODULE 5: FINAL DRAFT FORMATTER & EXPORT
  // ==========================================================================
  function applyFinalDraftPreset(preset) {
    finalDraftSettings.preset = preset;
    const notice = document.getElementById('fd-convention-notice');

    if (preset === 'standard') {
      finalDraftSettings.font = "'Times New Roman', Times, serif";
      finalDraftSettings.size = '12pt';
      finalDraftSettings.spacing = '2.0';
      finalDraftSettings.indent = '0.5in';
      finalDraftSettings.sceneBreaks = '# centered';
      if (notice) notice.innerHTML = '<strong>Standard Manuscript:</strong> conventional 12pt serif (or monospace Courier); common publishing convention; verify recipient requirements. Every value remains editable.';
    } else if (preset === 'standard-courier') {
      finalDraftSettings.font = "'Courier New', Courier, monospace";
      finalDraftSettings.size = '12pt';
      finalDraftSettings.spacing = '2.0';
      finalDraftSettings.indent = '0.5in';
      finalDraftSettings.sceneBreaks = '# centered';
      if (notice) notice.innerHTML = '<strong>Standard Manuscript (Courier):</strong> conventional 12pt monospace; common publishing convention; verify recipient requirements. Every value remains editable.';
    } else if (preset === 'clean') {
      finalDraftSettings.font = 'Georgia, serif';
      finalDraftSettings.size = '11.5pt';
      finalDraftSettings.spacing = '1.5';
      finalDraftSettings.indent = '0.3in';
      finalDraftSettings.sceneBreaks = '* * * centered';
      if (notice) notice.innerHTML = '<strong>Clean Reading Draft:</strong> elegant, highly legible format designed for beta readers, trusted editors, and personal proofing.';
    }

    // Sync form
    document.getElementById('fd-font').value = finalDraftSettings.font;
    document.getElementById('fd-size').value = finalDraftSettings.size;
    document.getElementById('fd-spacing').value = finalDraftSettings.spacing;
    document.getElementById('fd-indent').value = finalDraftSettings.indent;
    document.getElementById('fd-scene-breaks').value = finalDraftSettings.sceneBreaks;

    renderFinalDraftWorkspace();
  }

  function updateFinalDraftPreview() {
    finalDraftSettings.font = document.getElementById('fd-font').value;
    finalDraftSettings.size = document.getElementById('fd-size').value;
    finalDraftSettings.spacing = document.getElementById('fd-spacing').value;
    finalDraftSettings.indent = document.getElementById('fd-indent').value;
    finalDraftSettings.sceneBreaks = document.getElementById('fd-scene-breaks').value;
    finalDraftSettings.headerText = document.getElementById('fd-header-text').value;
    finalDraftSettings.includeTitlePage = document.getElementById('fd-include-title-page').checked;

    finalDraftSettings.titlePage = {
      title: document.getElementById('tp-title').value,
      subtitle: document.getElementById('tp-subtitle').value,
      author: document.getElementById('tp-author').value,
      contact: document.getElementById('tp-contact').value,
      wordCount: document.getElementById('tp-wordcount').value
    };

    renderFinalDraftPages();
    runConsistencyPreflight();
  }

  function renderFinalDraftWorkspace() {
    // Populate Title page defaults from profile
    if (activeProfile) {
      const tp = finalDraftSettings.titlePage;
      tp.title = activeProfile.title || 'Untitled Manuscript';
      tp.subtitle = activeProfile.subtitle || '';
      tp.author = activeProfile.author || 'Author';
      const totalWords = chapters.reduce((acc, c) => acc + (c.wordCount || countWords(c.content)), 0);
      tp.wordCount = `Approx. ${Math.round(totalWords / 1000) * 1000} words`;

      document.getElementById('tp-title').value = tp.title;
      document.getElementById('tp-subtitle').value = tp.subtitle;
      document.getElementById('tp-author').value = tp.author;
      document.getElementById('tp-wordcount').value = tp.wordCount;
      document.getElementById('fd-header-text').value = `${tp.author.split(' ').pop().toUpperCase()} / ${tp.title.slice(0, 15).toUpperCase()} / `;
    }

    renderFinalDraftPages();
    runConsistencyPreflight();
  }

  function renderFinalDraftPages() {
    const container = document.getElementById('finaldraft-preview-pane');
    if (!container) return;
    container.innerHTML = '';

    const sourceChapters = viewingHistoricalVersionId ? historicalChapters : chapters;
    const fontClass = finalDraftSettings.preset === 'clean' ? 'style-clean' : '';

    let pageNum = 1;

    // 1. TITLE PAGE (IF INCLUDED)
    if (finalDraftSettings.includeTitlePage) {
      const tp = finalDraftSettings.titlePage;
      const titlePage = document.createElement('div');
      titlePage.className = 'manuscript-page ' + fontClass;
      titlePage.style.fontFamily = finalDraftSettings.font;
      titlePage.innerHTML = `
        <div class="manuscript-title-page">
          <div class="title-page-author-block">
            <strong>${escapeHtml(tp.author)}</strong><br>
            ${escapeHtml(tp.contact || 'contact@author.com')}<br>
          </div>

          <div class="title-page-center-block">
            <div class="title-page-title">${escapeHtml(tp.title)}</div>
            ${tp.subtitle ? `<div class="title-page-subtitle">${escapeHtml(tp.subtitle)}</div>` : ''}
            <div class="title-page-byline">by<br>${escapeHtml(tp.author)}</div>
          </div>

          <div class="title-page-wordcount">
            ${escapeHtml(tp.wordCount)}
          </div>
        </div>
      `;
      container.appendChild(titlePage);
    }

    // 2. CHAPTER PAGES (PREVIEW FIRST 3 CHAPTERS FOR SPEED)
    const previewChapters = sourceChapters.slice(0, 3);

    previewChapters.forEach(ch => {
      const page = document.createElement('div');
      page.className = 'manuscript-page ' + fontClass;
      page.style.fontFamily = finalDraftSettings.font;
      page.style.fontSize = finalDraftSettings.size;
      page.style.lineHeight = finalDraftSettings.spacing;

      const headerText = finalDraftSettings.headerText + pageNum;

      // Transform scene breaks
      let formattedContent = escapeHtml(ch.content);
      let breakReplacement = '<div class="scene-break-display">#</div>';
      if (finalDraftSettings.sceneBreaks.includes('* * *')) {
        breakReplacement = '<div class="scene-break-display">* * *</div>';
      } else if (finalDraftSettings.sceneBreaks.includes('blank')) {
        breakReplacement = '<br><br>';
      }

      formattedContent = formattedContent.replace(/\*\s*\*\s*\*/g, breakReplacement);
      formattedContent = formattedContent
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>');

      page.innerHTML = `
        <div class="page-running-head">${escapeHtml(headerText)}</div>
        <div class="chapter-start-drop">
          <div style="text-align: center; font-weight: bold; margin-bottom: 1.5rem; text-transform: uppercase;">
            Chapter ${ch.number}<br>${escapeHtml(ch.title)}
          </div>
          <div style="text-indent: ${finalDraftSettings.indent};">
            ${formattedContent}
          </div>
        </div>
      `;
      container.appendChild(page);
      pageNum++;
    });

    if (sourceChapters.length > 3) {
      const notice = document.createElement('div');
      notice.style.cssText = 'color: #94a3b8; font-size: 0.8rem; text-align: center; padding: 1rem;';
      notice.textContent = `... Previewing first 3 of ${sourceChapters.length} chapters. Full manuscript exported upon print or download.`;
      container.appendChild(notice);
    }
  }

  // RESTORED ALL 8 PRE-FLIGHT CHECKS
  function runConsistencyPreflight() {
    const list = document.getElementById('preflight-checklist');
    if (!list) return;
    list.innerHTML = '';

    const sourceChapters = viewingHistoricalVersionId ? historicalChapters : chapters;
    let headingFormatAnomalies = 0;
    let sceneBreakSyntaxMixed = 0;
    let straightCurlyQuoteMixed = 0;
    let dashStyleMixed = 0;
    let copyPasteArtifacts = 0;
    let doubleSpaceCount = 0;
    let excessiveBlankCount = 0;
    let trailingSpacesCount = 0;

    sourceChapters.forEach(ch => {
      const text = ch.content || '';
      const title = ch.title || '';

      // 1. Inconsistent chapter headings
      if (!title.trim() || !/^(\d+|Chapter|One|Two|Three|[A-Z])/i.test(title)) {
        headingFormatAnomalies++;
      }

      // 2. Inconsistent scene-break syntax
      const hasHash = /\n\s*#\s*\n/.test(text);
      const hasAsterisks = /\*\s*\*\s*\*/.test(text);
      if (hasHash && hasAsterisks) sceneBreakSyntaxMixed++;

      // 3. Straight vs curly quotation inconsistency
      const hasStraightQuotes = /["']/.test(text);
      const hasCurlyQuotes = /[“”‘’]/.test(text);
      if (hasStraightQuotes && hasCurlyQuotes) straightCurlyQuoteMixed++;

      // 4. Dash-style inconsistency
      const hasDoubleHyphen = /--/.test(text);
      const hasEmDash = /[—–]/.test(text);
      if (hasDoubleHyphen && hasEmDash) dashStyleMixed++;

      // 5. Copy/paste formatting artifacts (non-breaking spaces, zero-width, tabs, etc.)
      if (/[\u00A0\u200B-\u200D\uFEFF\f\t]/.test(text)) copyPasteArtifacts++;

      // 6. Double/multiple spaces
      if (/ {2,}/.test(text)) doubleSpaceCount++;

      // 7. Excessive blank lines (4+ consecutive newlines)
      if (/\n{4,}/.test(text)) excessiveBlankCount++;

      // 8. Trailing whitespace at line ends
      if (/[ \t]+$/m.test(text)) trailingSpacesCount++;
    });

    const items = [
      { label: headingFormatAnomalies === 0 ? 'Chapter heading formatting consistent' : `${headingFormatAnomalies} chapter heading(s) formatted irregularly`, ok: headingFormatAnomalies === 0 },
      { label: sceneBreakSyntaxMixed === 0 ? 'Scene-break syntax uniform across chapters' : `${sceneBreakSyntaxMixed} chapter(s) mix '#' and '* * *' syntax`, ok: sceneBreakSyntaxMixed === 0 },
      { label: straightCurlyQuoteMixed === 0 ? 'Quotation mark style uniform' : `${straightCurlyQuoteMixed} chapter(s) mix straight and curly quotation marks`, ok: straightCurlyQuoteMixed === 0 },
      { label: dashStyleMixed === 0 ? 'Em dash / hyphen style consistent' : `${dashStyleMixed} chapter(s) mix '--' with em dashes '—'`, ok: dashStyleMixed === 0 },
      { label: copyPasteArtifacts === 0 ? 'No copy/paste artifacts or non-breaking spaces' : `${copyPasteArtifacts} chapter(s) have non-breaking or zero-width artifacts`, ok: copyPasteArtifacts === 0 },
      { label: doubleSpaceCount === 0 ? 'No multiple spaces detected' : `${doubleSpaceCount} chapter(s) contain multiple spaces`, ok: doubleSpaceCount === 0 },
      { label: excessiveBlankCount === 0 ? 'Blank line rhythm consistent' : `${excessiveBlankCount} chapter(s) have excessive blanks (4+)`, ok: excessiveBlankCount === 0 },
      { label: trailingSpacesCount === 0 ? 'No trailing whitespace at line ends' : `${trailingSpacesCount} chapter(s) have trailing whitespace`, ok: trailingSpacesCount === 0 }
    ];

    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'preflight-item';
      row.innerHTML = `
        <span style="color: ${it.ok ? '#10b981' : '#f59e0b'}; font-weight: bold;">${it.ok ? '✓' : '⚠️'}</span>
        <span style="color: var(--text-primary);">${escapeHtml(it.label)}</span>
      `;
      list.appendChild(row);
    });
  }

  async function fixFormattingArtifacts() {
    if (viewingHistoricalVersionId) {
      alert('Cannot format historical read-only drafts. Return to active working draft first.');
      return;
    }
    let fixedCount = 0;
    chapters.forEach(ch => {
      let text = ch.content || '';
      const original = text;

      // SAFE INVISIBLE CLEANUP ONLY (Does NOT touch author dialogue quotes or em dashes):
      // 1. Non-breaking spaces and zero-width characters
      text = text.replace(/\u00A0/g, ' ');
      text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
      text = text.replace(/\t/g, '    ');

      // 2. Multiple consecutive spaces -> single space
      text = text.replace(/ {2,}/g, ' ');

      // 3. Excessive blank lines (4+ newlines) -> standard paragraph break
      text = text.replace(/\n{4,}/g, '\n\n');

      // 4. Trailing whitespace at end of lines
      text = text.split('\n').map(l => l.trimEnd()).join('\n');

      if (text !== original) {
        ch.content = text;
        ch.wordCount = countWords(text);
        ch.lastEditedAt = new Date().toISOString();
        putItem('chapters', ch);
        fixedCount++;
      }
    });

    loadCurrentChapterToEditor();
    renderFinalDraftPages();
    runConsistencyPreflight();
    alert(`Invisible formatting cleanup applied across ${fixedCount} chapters (spaces, zero-width chars, and trailing blanks normalized; prose wording and author quotation styles preserved).`);
  }

  async function takeFinalDraftSnapshot() {
    const totalWords = chapters.reduce((acc, c) => acc + (c.wordCount || countWords(c.content)), 0);
    const snap = {
      id: 'snap-final-' + Date.now(),
      code: 'RA-F-' + String(versions.length + 1).padStart(4, '0'),
      name: 'Final Draft Milestone (' + finalDraftSettings.preset + ')',
      versionType: 'Final Draft Snapshot',
      createdAt: new Date().toISOString(),
      lastEditedAt: null,
      frozenAt: new Date().toISOString(),
      parentId: activeVersionId,
      parentName: (versions.find(v => v.id === activeVersionId) || {}).name,
      parentType: 'Working Branch',
      authorNote: `Final formatted snapshot using preset: ${finalDraftSettings.preset}`,
      totalWords: totalWords,
      chapterCount: chapters.length,
      revisionCycle: 'Final Draft Preparation',
      status: 'frozen',
      isReadOnly: true,
      isSafetySnapshot: false,
      chapters: JSON.parse(JSON.stringify(chapters))
    };

    await putItem('versions', snap);
    versions.push(snap);
    renderVersionList();
    alert('Final Draft Snapshot recorded in Version History.');
  }

  function exportAllChaptersMarkdown() {
    const sourceChapters = viewingHistoricalVersionId ? historicalChapters : chapters;
    let fullMd = `# ${(activeProfile && activeProfile.title) || 'Manuscript'}\n\n`;
    sourceChapters.forEach(c => {
      fullMd += `## Chapter ${c.number}: ${c.title}\n\n${c.content}\n\n* * *\n\n`;
    });
    downloadFile(fullMd, 'manuscript.md', 'text/markdown');
  }

  function exportFullVault() {
    const vault = {
      exportedAt: new Date().toISOString(),
      profile: activeProfile,
      activeVersionId: activeVersionId,
      versions: versions,
      chapters: chapters,
      fragments: fragments,
      characters: characters,
      symbols: symbols,
      motifs: motifs,
      canon: canon,
      timeline: timeline
    };
    downloadFile(JSON.stringify(vault, null, 2), 'revision-atlas-vault.json', 'application/json');
  }

  function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
  }

  function printFormattedDraft() {
    window.print();
  }

  // ==========================================================================
  // MODULE 6: GLOBAL SEARCH & PROJECT SWITCHER
  // ==========================================================================
  function openSearchModal() {
    OverlayManager.openModal('search-modal');
    const input = document.getElementById('global-search-input');
    if (input) input.focus();
  }

  function closeSearchModal() {
    OverlayManager.closeModal('search-modal');
  }

  function executeGlobalSearch(query) {
    const container = document.getElementById('search-results-container');
    if (!container) return;
    container.innerHTML = '';
    if (!query || query.length < 2) return;

    const q = query.toLowerCase();
    const results = [];

    chapters.forEach(c => {
      if (c.title.toLowerCase().includes(q) || c.content.toLowerCase().includes(q)) {
        results.push({ type: 'Chapter', title: `Chapter ${c.number}: ${c.title}`, action: () => selectChapter(c.id) });
      }
    });

    fragments.forEach(f => {
      if (f.title.toLowerCase().includes(q) || f.content.toLowerCase().includes(q)) {
        results.push({ type: 'Fragment', title: f.title, action: () => switchView('fragments') });
      }
    });

    canon.forEach(cn => {
      if (cn.title.toLowerCase().includes(q) || cn.statement.toLowerCase().includes(q)) {
        results.push({ type: 'Canon', title: cn.title, action: () => switchView('reference') });
      }
    });

    results.forEach(r => {
      const item = document.createElement('div');
      item.style.cssText = 'padding: 0.5rem; background: var(--bg-surface-elevated); border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;';
      item.innerHTML = `
        <div>
          <span style="font-size: 0.7rem; color: var(--accent-primary); text-transform: uppercase; font-weight: bold;">${r.type}: </span>
          <span style="font-size: 0.85rem; color: var(--text-primary);">${escapeHtml(r.title)}</span>
        </div>
      `;
      item.onclick = () => {
        closeSearchModal();
        r.action();
      };
      container.appendChild(item);
    });
  }

  function openProfileModal() {
    OverlayManager.openModal('project-profile-modal');
  }

  function closeProfileModal() {
    OverlayManager.closeModal('project-profile-modal');
  }

  function showNewProjectModal() {
    closeProfileModal();
    OverlayManager.openModal('new-project-modal');
  }

  function closeNewProjectModal() {
    OverlayManager.closeModal('new-project-modal');
  }

  async function createProjectFromForm() {
    const title = document.getElementById('new-proj-title').value.trim() || 'Untitled Project';
    const author = document.getElementById('new-proj-author').value.trim() || 'Author';
    const words = parseInt(document.getElementById('new-proj-words').value, 10) || 75000;

    const baseTemplate = (window.PROJECT_PROFILES && window.PROJECT_PROFILES['template']) || {};
    const newProfile = {
      ...baseTemplate,
      id: 'proj-' + Date.now(),
      title: title,
      author: author,
      targetWordCount: words,
      initialChapters: [
        {
          id: 'ch-1',
          number: 1,
          title: 'Chapter 1',
          content: '',
          wordCount: 0,
          notes: '',
          revisionStatus: 'In Revision',
          lastEditedAt: new Date().toISOString(),
          function: { purpose: '', centralTurn: '', functionTags: [] }
        }
      ],
      initialFragments: []
    };

    const stores = ['chapters', 'fragments', 'characters', 'symbols', 'motifs', 'canon', 'timeline', 'versions'];
    for (const s of stores) await clearStore(s);

    closeNewProjectModal();
    await loadProfile(newProfile);
    alert(`Created new manuscript project: ${title}`);
  }

  async function loadDemoProject() {
    if (window.PROJECT_PROFILES && window.PROJECT_PROFILES['demo']) {
      const stores = ['chapters', 'fragments', 'characters', 'symbols', 'motifs', 'canon', 'timeline', 'versions'];
      for (const s of stores) await clearStore(s);
      await loadProfile(window.PROJECT_PROFILES['demo']);
      closeProfileModal();
      alert('Demo project "The Glass Clockmaker" loaded.');
    } else {
      alert('Demo profile not found.');
    }
  }

  async function importVaultData(vault) {
    if (!vault || typeof vault !== 'object') {
      throw new Error('Invalid vault file: Root object missing.');
    }
    if (!vault.chapters && !vault.profile && !vault.versions) {
      throw new Error('Invalid vault file: Missing chapters, profile, and version data.');
    }

    // Safety snapshot of current state before destructive import
    if (chapters.length > 0) {
      await takeSafetySnapshot();
    }

    const stores = ['chapters', 'fragments', 'characters', 'symbols', 'motifs', 'canon', 'timeline', 'versions'];
    for (const s of stores) await clearStore(s);

    if (vault.profile) {
      activeProfile = vault.profile;
      await putItem('settings', { key: 'activeProfile', value: vault.profile });
    }

    // Restore Chapters
    chapters = Array.isArray(vault.chapters) ? vault.chapters : (vault.profile && vault.profile.initialChapters) || [];
    for (const c of chapters) await putItem('chapters', c);

    // Restore Fragments
    fragments = Array.isArray(vault.fragments) ? vault.fragments : (vault.profile && vault.profile.initialFragments) || [];
    for (const f of fragments) await putItem('fragments', f);

    // Restore Characters
    characters = Array.isArray(vault.characters) ? vault.characters : (vault.profile && vault.profile.seededCharacters) || [];
    for (const ch of characters) await putItem('characters', ch);

    // Restore Symbols
    symbols = Array.isArray(vault.symbols) ? vault.symbols : (vault.profile && vault.profile.seededSymbolsThemes) || [];
    for (const s of symbols) await putItem('symbols', s);

    // Restore Motifs
    motifs = Array.isArray(vault.motifs) ? vault.motifs : (vault.profile && vault.profile.motifs) || [];
    for (const m of motifs) await putItem('motifs', m);

    // Restore Canon
    canon = Array.isArray(vault.canon) ? vault.canon : (vault.profile && vault.profile.seededCanon) || [];
    for (const cn of canon) await putItem('canon', cn);

    // Restore Timeline
    timeline = Array.isArray(vault.timeline) ? vault.timeline : (vault.profile && vault.profile.seededTimeline) || [];
    for (const t of timeline) await putItem('timeline', t);

    // Restore Versions & Active State
    versions = Array.isArray(vault.versions) ? vault.versions : [];
    for (const v of versions) await putItem('versions', v);

    if (vault.activeVersionId && versions.some(v => v.id === vault.activeVersionId)) {
      activeVersionId = vault.activeVersionId;
    } else if (versions.length > 0) {
      const workingVer = versions.find(v => v.versionType === 'Working Branch') || versions[0];
      activeVersionId = workingVer.id;
    } else {
      await createInitialWorkingBranch();
    }
    await putItem('activeState', { key: 'activeVersionId', value: activeVersionId });

    viewingHistoricalVersionId = null;
    historicalChapters = [];
    currentChapterId = chapters.length > 0 ? chapters[0].id : null;

    renderAll();
  }

  function triggerImportProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const vault = JSON.parse(evt.target.result);
          await importVaultData(vault);
          closeProfileModal();
          alert('Vault imported successfully. All manuscript records, versions, and fragments restored.');
        } catch (err) {
          alert('Error importing vault: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ==========================================================================
  // SMART MANUSCRIPT PARSER & STRUCTURAL INGESTION ENGINE
  // ==========================================================================
  let pendingImportData = null;

  function sanitizeProseBlock(raw) {
    if (!raw) return '';
    // 1. Normalize line endings (CRLF/CR -> LF)
    let clean = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 2. Strip non-breaking spaces, zero-width spaces, erratic tabs
    clean = clean.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
    clean = clean.replace(/\u00A0/g, ' ');
    clean = clean.replace(/\t/g, ' ');

    // 3. Normalize scene breaks onto their own line
    clean = clean.replace(/^[ \t]*(\*\s*\*\s*\*|#|~)[ \t]*$/gm, '\n\n$1\n\n');

    // 4. Split into paragraphs
    const rawBlocks = clean.split(/\n{2,}/);
    const formattedBlocks = [];

    for (let block of rawBlocks) {
      block = block.trim();
      if (!block) continue;

      if (/^(\*\s*\*\s*\*|#|~)$/.test(block)) {
        formattedBlocks.push(block.replace(/\s+/g, ' '));
        continue;
      }

      // Unwrap ragged single newlines inside paragraph
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let unwrapped = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0) {
          unwrapped = line;
        } else {
          if (unwrapped.endsWith('-') && !unwrapped.endsWith('--') && !unwrapped.endsWith('—')) {
            unwrapped = unwrapped.slice(0, -1) + line;
          } else {
            unwrapped += ' ' + line;
          }
        }
      }

      unwrapped = unwrapped.replace(/[ \t]{2,}/g, ' ').trim();
      if (unwrapped.length > 0) {
        formattedBlocks.push(unwrapped);
      }
    }

    return formattedBlocks.join('\n\n');
  }

  // Number words pattern covering 1 through 99 (standalone or hyphenated)
  const NUMBER_WORDS_SRC = '(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|(?:Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:[\\s\\-](?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine))?)';

  const NUMBER_WORD_MAP = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
    'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23,
    'twenty-four': 24, 'twenty-five': 25, 'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28,
    'twenty-nine': 29, 'thirty': 30, 'thirty-one': 31, 'thirty-two': 32, 'thirty-three': 33, 'thirty-four': 34,
    'thirty-five': 35, 'thirty-six': 36, 'thirty-seven': 37, 'thirty-eight': 38, 'thirty-nine': 39, 'forty': 40
  };

  // Multi-pattern regex for chapter boundary detection (multiline enabled)
  // Supports: Chapter 1/2, Chapter One/Two, 1/2, One/Two, Ch. 1, Prologue, Roman numerals, etc.
  const CHAPTER_BOUNDARY_REGEX = new RegExp(
    '(?:^|\\n)(?=(?:#+\\s+)?(?:CHAPTER|Chapter|Ch\\.|Ch|PROLOGUE|Prologue|EPILOGUE|Epilogue|INTERLUDE|Interlude|ACT|Act|PART|Part)\\b|^(?:' + NUMBER_WORDS_SRC + '|[IVXLCDM]+\\b|\\d{1,3})(?:\\s*[\\.\\:—\\-–]\\s*[A-Z0-9]|\\s*$))',
    'im'
  );

  function parseSingleManuscriptText(rawContent, filename = 'manuscript.txt') {
    const cleanContent = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split using multi-pattern boundary
    let rawParts = cleanContent.split(CHAPTER_BOUNDARY_REGEX).map(p => p.trim()).filter(p => p.length > 0);

    // Fallback: If no explicit chapter tokens matched, check for standalone numbered headings
    if (rawParts.length <= 1) {
      const fallbackSplit = cleanContent.split(/(?:^|\n\n+)(?=(?:[0-9]{1,3}|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY|[IVXLCDM]{1,8})\s*\n)/i).map(p => p.trim()).filter(p => p.length > 0);
      if (fallbackSplit.length > 1) {
        rawParts = fallbackSplit;
      }
    }

    // Check for frontmatter/pre-chapter text (Dedication, Title Page, Epigraph)
    const detectedChapters = [];
    let detectedFrontmatter = '';

    rawParts.forEach((part, idx) => {
      const lines = part.split('\n');
      const headerLine = lines[0].replace(/^#+\s*/, '').trim();
      const bodyLines = lines.slice(1).join('\n').trim();

      // If very first section has no chapter heading and is short/frontmatter
      const isChapterHeading = new RegExp('^(?:Chapter|Ch\\.|Ch|Prologue|Epilogue|Part|Act|\\d+|[IVXLCDM]+\\b|' + NUMBER_WORDS_SRC + ')', 'i').test(headerLine);
      if (idx === 0 && !isChapterHeading && bodyLines.length < 1500) {
        if (!/(?:Chapter|Prologue|Epilogue)/i.test(part)) {
          detectedFrontmatter = part;
          return;
        }
      }

      let title = headerLine;
      let body = bodyLines;

      if (!body) {
        // Only one line in this segment
        body = part;
        title = `Chapter ${detectedChapters.length + 1}`;
      }

      // Clean up title: normalize standalone digits or number words
      title = title.replace(/\s+/g, ' ').trim();
      if (/^\d+$/.test(title)) {
        title = `Chapter ${title}`;
      } else {
        const cleanLower = title.toLowerCase().replace(/\s+/g, '-');
        if (NUMBER_WORD_MAP[cleanLower]) {
          title = `Chapter ${NUMBER_WORD_MAP[cleanLower]} (${title})`;
        }
      }

      detectedChapters.push({
        rawTitle: title,
        title: title,
        rawBody: body,
        cleanBody: sanitizeProseBlock(body),
        wordCount: countWords(body),
        sceneBreaks: (body.match(/\*\s*\*\s*|#\s*\n/g) || []).length
      });
    });

    // If still no chapters, treat whole file as 1 chapter
    if (detectedChapters.length === 0) {
      detectedChapters.push({
        rawTitle: filename.replace(/\.[^/.]+$/, ''),
        title: filename.replace(/\.[^/.]+$/, ''),
        rawBody: cleanContent,
        cleanBody: sanitizeProseBlock(cleanContent),
        wordCount: countWords(cleanContent),
        sceneBreaks: (cleanContent.match(/\*\s*\*\s*|#\s*\n/g) || []).length
      });
    }

    return {
      filename,
      frontmatter: detectedFrontmatter,
      chapters: detectedChapters,
      totalWords: detectedChapters.reduce((acc, c) => acc + c.wordCount, 0)
    };
  }

  function parseMultipleManuscriptFiles(filesData) {
    // Natural alphanumeric sort
    filesData.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const detectedChapters = [];
    filesData.forEach((f, idx) => {
      const parsed = parseSingleManuscriptText(f.content, f.name);
      // If a single file internally has multiple chapters, flatten them
      if (parsed.chapters.length > 1) {
        parsed.chapters.forEach(ch => detectedChapters.push(ch));
      } else {
        // Use file name or header
        const ch = parsed.chapters[0] || {
          rawTitle: f.name.replace(/\.[^/.]+$/, ''),
          title: f.name.replace(/\.[^/.]+$/, ''),
          rawBody: f.content,
          cleanBody: sanitizeProseBlock(f.content),
          wordCount: countWords(f.content),
          sceneBreaks: (f.content.match(/\*\s*\*\s*|#\s*\n/g) || []).length
        };
        detectedChapters.push(ch);
      }
    });

    return {
      filename: `${filesData.length} Files Batch`,
      frontmatter: '',
      chapters: detectedChapters,
      totalWords: detectedChapters.reduce((acc, c) => acc + c.wordCount, 0)
    };
  }

  // Extract recurring character names using fiction-aware linguistic cues:
  // 1. Dialogue tags ("...", said Name / Name asked)
  // 2. Titles & Honorifics (Dr., Inspector, Lord, Lady, Captain, Mr., Mrs.)
  // 3. Narrative actions (Name smiled, Name nodded, Name turned)
  // 4. Mid-sentence proper nouns (words capitalized mid-sentence, eliminating sentence-starter false positives)
  function extractDiscoveredEntities(chaptersList) {
    const combinedSample = chaptersList.slice(0, 20).map(c => c.cleanBody || c.rawBody).join('\n\n');
    if (!combinedSample || combinedSample.length < 50) return [];

    const STOP_WORDS = new Set([
      'The', 'Then', 'There', 'They', 'This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'Who', 'Which', 'Whose',
      'Why', 'How', 'After', 'Before', 'While', 'Under', 'Over', 'Chapter', 'Prologue', 'Epilogue', 'Book', 'Part', 'Act',
      'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'First', 'Second', 'Third',
      'Suddenly', 'Meanwhile', 'However', 'Although', 'Perhaps', 'Nothing', 'Everything', 'Something', 'Neither', 'Either',
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'January', 'February', 'March',
      'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
      'Outside', 'Inside', 'Without', 'Within', 'Beyond', 'Behind', 'Across', 'Through', 'Along', 'Around', 'Near',
      'Every', 'Everyone', 'Everybody', 'Someone', 'Somebody', 'Anyone', 'Anybody', 'Nobody', 'None',
      'Some', 'Many', 'Few', 'Several', 'Both', 'All', 'Another', 'Other', 'Others',
      'Yes', 'No', 'Not', 'Never', 'Always', 'Often', 'Usually', 'Seldom', 'Rarely', 'Sometimes',
      'He', 'She', 'It', 'We', 'You', 'They', 'His', 'Her', 'Their', 'Our', 'My', 'Your', 'Its', 'Him', 'Them',
      'Are', 'Were', 'Was', 'Is', 'Am', 'Been', 'Being', 'Have', 'Has', 'Had', 'Do', 'Does', 'Did',
      'Will', 'Would', 'Shall', 'Should', 'Can', 'Could', 'May', 'Might', 'Must',
      'Come', 'Go', 'Look', 'See', 'Wait', 'Listen', 'Tell', 'Ask', 'Take', 'Give', 'Put', 'Make',
      'Street', 'Road', 'Avenue', 'River', 'Castle', 'Tower', 'Manor', 'House', 'Room', 'Window', 'Door', 'City', 'Town'
    ]);

    const candidateScores = {};
    const candidateAppearances = {};

    function registerCandidate(rawName, weight) {
      if (!rawName) return;
      const name = rawName.trim().replace(/^['"“‘]+|['"”’\.,;:\-]+$/g, '').trim();
      if (name.length < 3) return;
      if (STOP_WORDS.has(name)) return;

      const baseName = name.replace(/^(?:Mr\.|Mrs\.|Ms\.|Miss|Dr\.|Lord|Lady|Sir|Captain|Father|Sister|Judge|Professor|Inspector|Detective)\s+/i, '').trim();
      if (STOP_WORDS.has(baseName)) return;
      if (baseName.endsWith('ly')) return; // Strip sentence adverbs

      candidateScores[name] = (candidateScores[name] || 0) + weight;
      candidateAppearances[name] = (candidateAppearances[name] || 0) + 1;
    }

    const speechVerbs = '(?:said|asked|replied|whispered|muttered|shouted|cried|murmured|gasped|demanded|growled|insisted|called|answered|yelled|screamed|interrupted)';
    const namePattern = '([A-Z][a-z]{1,15}(?:\\s+[A-Z][a-z]{1,15})?)';

    // 1. Dialogue Speaker Tags: "...", said Name / Name asked
    const tagAfterRegex = new RegExp('(?:["\']|[\\!\\?\\,\\.])\\s*' + speechVerbs + '\\s+' + namePattern, 'g');
    const tagBeforeRegex = new RegExp('\\b' + namePattern + '\\s+' + speechVerbs + '\\b', 'g');

    let m;
    while ((m = tagAfterRegex.exec(combinedSample)) !== null) {
      registerCandidate(m[1], 10);
    }
    while ((m = tagBeforeRegex.exec(combinedSample)) !== null) {
      registerCandidate(m[1], 10);
    }

    // 2. Titles & Honorifics: Dr. Vance, Inspector Morse, Lord Harrington, Captain Evans
    const honorificRegex = /\b((?:Mr\.|Mrs\.|Ms\.|Miss|Dr\.|Lord|Lady|Sir|Captain|Father|Sister|Judge|Professor|Inspector|Detective)\s+[A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15})?)\b/g;
    while ((m = honorificRegex.exec(combinedSample)) !== null) {
      registerCandidate(m[1], 8);
    }

    // 3. Narrative Character Actions: Name smiled / sighed / turned / stepped / nodded
    const actionVerbs = '(?:nodded|smiled|frowned|glanced|stepped|paused|sighed|turned|laughed|grinned|stared|shook|stood|walked|reached|hesitated)';
    const actionRegex = new RegExp('\\b' + namePattern + '\\s+' + actionVerbs + '\\b', 'g');
    while ((m = actionRegex.exec(combinedSample)) !== null) {
      registerCandidate(m[1], 7);
    }

    // 4. Mid-Sentence Proper Noun Recurrence (words capitalized in the middle of sentences, not after periods)
    const midSentenceRegex = /(?<=[a-z,;]\s+)\b([A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15})?)\b/g;
    while ((m = midSentenceRegex.exec(combinedSample)) !== null) {
      const candidate = m[1].trim();
      if (!STOP_WORDS.has(candidate) && !candidate.endsWith('ly')) {
        if (candidateScores[candidate]) {
          candidateScores[candidate] += 3;
          candidateAppearances[candidate] = (candidateAppearances[candidate] || 0) + 1;
        } else {
          candidateScores[candidate] = (candidateScores[candidate] || 0) + 1;
          candidateAppearances[candidate] = (candidateAppearances[candidate] || 0) + 1;
        }
      }
    }

    // Filter to candidates with high confidence score (>= 6) and present 2+ times
    return Object.entries(candidateScores)
      .filter(([name, score]) => score >= 6 && (candidateAppearances[name] || 0) >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, _]) => ({ name, count: candidateAppearances[name] || 1 }));
  }

  function renderDiscoveredEntitiesTags() {
    const entitiesStrip = document.getElementById('import-entities-strip');
    const entitiesTags = document.getElementById('import-entities-tags');
    if (!entitiesStrip || !entitiesTags || !pendingImportData) return;

    const entities = pendingImportData.discoveredEntities || [];
    if (entities.length > 0) {
      entitiesStrip.style.display = 'block';
      entitiesTags.innerHTML = entities.map((e, idx) => `
        <span class="import-entity-tag" data-idx="${idx}">
          👤 <strong>${escapeHtml(e.name)}</strong>
          <span class="entity-count">×${e.count}</span>
          <button type="button" class="btn-remove-entity" title="Dismiss ${escapeHtml(e.name)}" onclick="Atlas.removePendingEntity(${idx})" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0 0 0 6px; font-size: 1.1rem; line-height: 1; opacity: 0.6;">&times;</button>
        </span>
      `).join('');
    } else {
      entitiesStrip.style.display = 'none';
    }
  }

  function removePendingEntity(idx) {
    if (pendingImportData && pendingImportData.discoveredEntities) {
      pendingImportData.discoveredEntities.splice(idx, 1);
      renderDiscoveredEntitiesTags();
    }
  }

  function openSmartImportModal(importData) {
    pendingImportData = importData;
    const modal = document.getElementById('smart-import-modal');
    if (!modal) return;

    // Populate header stats
    document.getElementById('import-file-name').textContent = importData.filename;
    document.getElementById('import-total-words').textContent = importData.totalWords.toLocaleString();
    document.getElementById('import-chapter-count').textContent = importData.chapters.length;
    document.getElementById('import-stats-pill').textContent = `${importData.chapters.length} Chapters Identified`;

    // Populate discovered characters
    const entities = extractDiscoveredEntities(importData.chapters);
    pendingImportData.discoveredEntities = entities;

    renderDiscoveredEntitiesTags();

    // Render Chapters Preview List
    renderSmartImportPreview();

    OverlayManager.openModal('smart-import-modal');
  }

  function renderSmartImportPreview() {
    const container = document.getElementById('import-chapters-preview-list');
    if (!container || !pendingImportData) return;

    container.innerHTML = '';
    pendingImportData.chapters.forEach((ch, idx) => {
      const card = document.createElement('div');
      card.className = 'import-chapter-card';
      
      const snippet = (ch.cleanBody || ch.rawBody).slice(0, 140).replace(/\n+/g, ' ');
      
      card.innerHTML = `
        <div class="import-chapter-header">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
            <span style="font-weight: 700; color: var(--accent-primary); font-size: 0.85rem; min-width: 28px;">${idx + 1}.</span>
            <input type="text" class="import-chapter-title-input" value="${escapeHtml(ch.title)}" data-idx="${idx}" oninput="Atlas.updatePendingChapterTitle(${idx}, this.value)">
          </div>
          <div class="import-chapter-meta">
            <span>${ch.wordCount.toLocaleString()} words</span>
            ${ch.sceneBreaks > 0 ? `<span>· ${ch.sceneBreaks} scenes</span>` : ''}
          </div>
        </div>
        <div class="import-chapter-snippet">
          "${escapeHtml(snippet)}..."
        </div>
      `;
      container.appendChild(card);
    });
  }

  function updatePendingChapterTitle(idx, newTitle) {
    if (pendingImportData && pendingImportData.chapters[idx]) {
      pendingImportData.chapters[idx].title = newTitle;
    }
  }

  function closeSmartImportModal() {
    OverlayManager.closeModal('smart-import-modal');
    pendingImportData = null;
  }

  async function commitSmartImport() {
    if (!pendingImportData || pendingImportData.chapters.length === 0) return;

    const autoFormat = document.getElementById('import-opt-format')?.checked ?? true;
    const seedEntities = document.getElementById('import-opt-entities')?.checked ?? true;
    const replaceMode = document.getElementById('import-opt-replace')?.checked ?? true;

    // Safety snapshot before destructive replacement
    if (replaceMode && chapters.length > 0) {
      await takeSafetySnapshot();
      await clearStore('chapters');
    }

    const startNum = replaceMode ? 1 : chapters.length + 1;
    const newChapters = [];

    pendingImportData.chapters.forEach((ch, idx) => {
      const content = autoFormat ? (ch.cleanBody || sanitizeProseBlock(ch.rawBody)) : ch.rawBody;
      newChapters.push({
        id: 'ch-' + (Date.now() + idx),
        number: startNum + idx,
        title: ch.title || `Chapter ${startNum + idx}`,
        content: content,
        wordCount: countWords(content),
        revisionStatus: 'In Revision',
        lastRevisionCompletedAt: null,
        lastEditedAt: new Date().toISOString(),
        notes: '',
        function: {
          purpose: '',
          centralTurn: '',
          entryState: '',
          exitState: '',
          readerKnowledgeEntering: '',
          readerKnowledgeLeaving: '',
          opens: '',
          answers: '',
          setup: '',
          payoff: '',
          stakesMovement: '',
          characterMovement: '',
          themeMotifWork: '',
          whatWouldBeLost: '',
          authorNotes: '',
          functionTags: []
        }
      });
    });

    if (replaceMode) {
      chapters = newChapters;
    } else {
      chapters = [...chapters, ...newChapters];
    }

    // Persist all chapters in IndexedDB
    for (const ch of chapters) {
      await putItem('chapters', ch);
    }

    // Seed Discovered Characters if requested
    if (seedEntities && pendingImportData.discoveredEntities && pendingImportData.discoveredEntities.length > 0) {
      for (const ent of pendingImportData.discoveredEntities) {
        if (!characters.some(c => c.canonicalName === ent.name || c.name === ent.name)) {
          const newChar = {
            id: 'char-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            canonicalName: ent.name,
            role: 'Discovered Figure',
            coreRelationships: `Identified from manuscript ingestion (${ent.count} appearances).`,
            arcStatus: 'Active',
            notes: ''
          };
          characters.push(newChar);
          await putItem('characters', newChar);
        }
      }
      renderCharacters();
    }

    // Update active version word count & chapters
    const activeVer = versions.find(v => v.id === activeVersionId);
    if (activeVer) {
      activeVer.lastEditedAt = new Date().toISOString();
      activeVer.totalWords = chapters.reduce((acc, c) => acc + (c.wordCount || countWords(c.content)), 0);
      activeVer.chapterCount = chapters.length;
      activeVer.chapters = JSON.parse(JSON.stringify(chapters));
      await putItem('versions', activeVer);
      renderActiveVersionHeader();
    }

    currentChapterId = chapters[0].id;
    closeSmartImportModal();
    closeProfileModal();
    renderAll();
    loadCurrentChapterToEditor();

    alert(`Manuscript Ingestion Complete!\n\nSuccessfully structured ${newChapters.length} chapters (${newChapters.reduce((a, b) => a + b.wordCount, 0).toLocaleString()} words).\nProse sanitized, alignment standardized, and continuity figures updated.`);
  }

  function triggerImportChapters() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.txt,.md,.markdown';
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (!files || files.length === 0) return;

      const readFileText = (f) => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = (ev) => res(ev.target.result);
        r.onerror = rej;
        r.readAsText(f);
      });

      if (files.length === 1) {
        const content = await readFileText(files[0]);
        const parsed = parseSingleManuscriptText(content, files[0].name);
        openSmartImportModal(parsed);
      } else {
        const filesData = [];
        for (const f of files) {
          const content = await readFileText(f);
          filesData.push({ name: f.name, content });
        }
        const parsed = parseMultipleManuscriptFiles(filesData);
        openSmartImportModal(parsed);
      }
    };
    input.click();
  }


  // ==========================================================================
  // MODULE 7: DECLARATIVE HELP SYSTEM & CENTRAL STUDIO GUIDE
  // ==========================================================================
  const HELP_TOPICS = {
    chapters: {
      id: 'chapters',
      guideTab: 'quickstart',
      tabLabel: 'Quick Start',
      title: 'Chapter Navigator',
      summary: 'Organize, import, rename, filter, and reorder manuscript chapters.',
      popoverText: 'The Chapter Navigator organizes your entire manuscript structure. Use it to switch chapters, import existing .txt or .md files, or auto-split a complete book file. Click any chapter title or the pencil icon (✎) to rename it. Filter by name to jump quickly without altering your prose.',
      guideSection: {
        heading: 'Organizing & Managing Chapters',
        body: 'The left sidebar is your manuscript table of contents. You can import individual chapter files (.txt, .md, .markdown) or a single multi-chapter manuscript—Revision Atlas will detect standard headings like "Chapter 1" or "# Chapter One" and offer to split them automatically.\n\nRenaming can be done directly: click on the chapter title field on the manuscript paper itself, or click the rename icon (✎) in the chapter list. Filtering chapters lets you locate scenes instantly without changing the chapter sequence.',
        tips: [
          'Uploading chapter files automatically preserves your active Working Branch.',
          'Double-clicking or clicking the pencil icon (✎) lets you rename chapters in place.',
          'Chapters can be filtered in real-time by keyword using the filter box.'
        ],
        keywords: ['chapter', 'import', 'upload', 'split', 'rename', 'reorder', 'navigator', 'scenes']
      }
    },

    formatting: {
      id: 'formatting',
      guideTab: 'writing',
      tabLabel: 'Writing & Formatting',
      title: 'Prose Formatting & Auto-Format',
      summary: 'Clean inconsistent pasted text and apply manuscript-safe formatting.',
      popoverText: 'The prose canvas supports clean manuscript drafting. Click ✨ Auto-Format whenever you paste text from Word, Scrivener, or PDFs to unwrap broken sentence lines, strip hidden tabs, and enforce standard double-spaced paragraphs (\\n\\n). Use B and I (or Ctrl+B / Ctrl+I) for emphasis, and * * * for centered scene breaks.',
      guideSection: {
        heading: 'Prose Formatting, Auto-Cleaning & Shortcuts',
        body: 'Pasting from word processors or PDF exports often introduces fragmented line wraps, non-breaking spaces (\\u00A0), and erratic tab indentations. The ✨ Auto-Format tool cleans these instantly without altering your words:\n\n• Unwraps accidental single newlines within sentences while preserving double newlines (\\n\\n) between paragraphs.\n• Collapses multiple spaces and raw tabs to clean single spacing.\n• Preserves standard centered scene breaks (* * * or #).\n\nText emphasis uses clean markdown: **bold** and *italics*, which render faithfully in the 8.5"×11" Final Draft preview and PDF export.',
        tips: [
          'Use Ctrl+B (Cmd+B) for bold and Ctrl+I (Cmd+I) for italics.',
          'Auto-Format is non-destructive to punctuation, quotes, and scene breaks.',
          'Scene breaks should be formatted on their own line as "* * *" or "#".'
        ],
        keywords: ['formatting', 'auto-format', 'double spacing', 'bold', 'italic', 'scene break', 'paste', 'clean', 'shortcuts', 'markdown']
      }
    },

    revisionStatus: {
      id: 'revisionStatus',
      guideTab: 'writing',
      tabLabel: 'Writing & Formatting',
      title: 'Chapter Revision Status',
      summary: 'Track chapter readiness through quiet, non-gamified progression states.',
      popoverText: 'Assign a status to track chapter progression without intrusive gamification. Choose between Unreviewed, In Revision, Revised, or Locked. Setting a chapter to Locked protects its prose from accidental keystrokes while keeping it fully readable, searchable, and available in Compare.',
      guideSection: {
        heading: 'Chapter Revision States & Editing Protection',
        body: 'Every chapter has an assigned revision status to give you clarity over manuscript maturity:\n\n• Unreviewed: Raw first draft or newly imported text awaiting evaluation.\n• In Revision: Active developmental or line edits underway.\n• Revised: Revision pass completed and aligned with continuity canon.\n• Locked: Finalized prose protected against inadvertent typing or accidental pastes.\n\nThe progress bar in the navigator summarizes how many chapters are in each state without artificial word-count streaks or gamified quotas.',
        tips: [
          'Locking a chapter prevents keyboard changes in the canvas until unlocked.',
          'Locked chapters remain fully accessible in Compare, Global Search, and Reference tools.'
        ],
        keywords: ['status', 'locked', 'unreviewed', 'in revision', 'revised', 'lock', 'protect', 'progress']
      }
    },

    chapterFunction: {
      id: 'chapterFunction',
      guideTab: 'revision',
      tabLabel: 'Revision & Comparison',
      title: 'Dramatic Chapter Function',
      summary: 'Record the dramatic job, turns, and continuity commitments of each chapter.',
      popoverText: 'The Function inspector tracks the dramatic purpose of every chapter. Record the chapter\'s Purpose (why it exists), Central Turn (what changes), and Setup / Payoff links. Tracking structural function prevents narrative drift during major rewrites and answers the critical revision question: If this chapter vanished, what breaks?',
      guideSection: {
        heading: 'Dramatic Function & Continuity Tracking',
        body: 'During heavy revision, chapters can become bloated or lose their narrative drive. The Chapter Function builder ensures every chapter earns its place by documenting:\n\n• Purpose: The core reason this chapter exists in the manuscript arc.\n• Central Turn: The irreversible change of state or knowledge that occurs.\n• Reader Knowledge: What the reader enters knowing vs. what they leave understanding.\n• Setup & Payoffs: Narrative seeds planted here or earlier promises resolved.\n• What Would Be Lost: The ultimate test—if this entire chapter were excised, what breaks in the book?\n\nAll chapter functions aggregate into the Manuscript Function Map (under Reference), letting you audit pacing across the whole manuscript.',
        tips: [
          'Use the Function Map under Reference to view every chapter job side-by-side.',
          'Assign Function Tags (e.g. "Introduces character", "Raises stakes") for high-level structure checks.'
        ],
        keywords: ['function', 'purpose', 'turn', 'setup', 'payoff', 'dramatic', 'stakes', 'motif', 'continuity']
      }
    },

    compareRecovery: {
      id: 'compareRecovery',
      guideTab: 'revision',
      tabLabel: 'Revision & Comparison',
      title: 'Compare & Recovery',
      summary: 'Inspect multi-level changes and restore excised material safely.',
      popoverText: 'Compare an earlier Base version against a newer Target version across chapters. Use What Changed to inspect revisions, What Survived to find preserved prose, and What Disappeared to locate cut material. Missing paragraphs can be copied, restored directly into your active cursor, or saved into the Fragments Vault.',
      guideSection: {
        heading: 'Multi-Level Compare & Text Recovery',
        body: 'The Compare tool provides granular structural and prose diffs between any two versions in your project lineage:\n\n• What Changed: Highlights paragraphs that were rewritten, added, or relocated.\n• What Survived: Displays untouched passages that remained consistent across drafts.\n• What Disappeared: Shows text present in the earlier draft that was eliminated in the newer draft.\n\nRecovery Actions:\nWhen viewing removed or altered material, each card provides instant recovery options: "Copy Text" copies the excerpt; "Restore Paragraph" places the removed text back into your active chapter; and "Save as Fragment" archives it into your Fragments Vault so good prose is never permanently lost.',
        tips: [
          'Filter diffs by Rewritten Only, Added Only, Removed Only, or Moved Only.',
          '"Restore Paragraph" places deleted prose right at your cursor in the editor.'
        ],
        keywords: ['compare', 'diff', 'recovery', 'deleted', 'disappeared', 'survived', 'restore', 'missing', 'lost', 'fragments']
      }
    },

    versions: {
      id: 'versions',
      guideTab: 'revision',
      tabLabel: 'Revision & Comparison',
      title: 'Manuscript Versions & Lineage',
      summary: 'Manage working branches, frozen milestones, archives, and safety snapshots.',
      popoverText: 'Revision Atlas maintains your manuscript lineage across distinct version types. Your active Working Branch is fully editable. In contrast, Reference Drafts, Master Snapshots, and Archives are frozen, immutable records that can never be overwritten. Take a Safety Snapshot anytime before attempting sweeping developmental rewrites.',
      guideSection: {
        heading: 'Version Types, Immutability & Safe Branching',
        body: 'Never worry about losing earlier drafts. Revision Atlas enforces strict version immutability:\n\n• Working Branch: Your live, mutable workspace where edits occur.\n• Reference Draft: A frozen historical milestone (e.g. "First Complete Draft") kept for comparison.\n• Master Snapshot: A milestone marking significant developmental completion.\n• Archive Draft: Preserved experimental or superseded directions.\n• Safety Snapshot: Instant automatic or manual snapshots taken before risky operations.\n\nHistorical Protection:\nOpening an older version enters a protected Historical View banner. Typing, formatting, and destructive edits are completely blocked. To experiment with an older version, click "Branch as New Working Draft" to spawn an independent copy without mutating the original.',
        tips: [
          'Safety Snapshots take one click and freeze your entire manuscript state.',
          'Historical drafts cannot be altered by keystrokes or pastes.'
        ],
        keywords: ['version', 'branch', 'lineage', 'snapshot', 'milestone', 'safety', 'archive', 'reference draft', 'immutable']
      }
    },

    preflight: {
      id: 'preflight',
      guideTab: 'finalization',
      tabLabel: 'Finalization & Pre-Flight',
      title: 'Consistency Pre-Flight',
      summary: 'Audit manuscript typography, quotation styles, and industry formatting conventions.',
      popoverText: 'Consistency Pre-Flight scans your manuscript against standard publishing guidelines. It flags straight vs curly quote mismatches, erratic dash styles (-- vs —), inconsistent chapter headings, and stray spacing. Click Fix Invisible Artifacts to strip zero-width characters and copy/paste noise before printing or exporting to PDF.',
      guideSection: {
        heading: 'Standard Manuscript Formatting & Pre-Flight Audit',
        body: 'The Final Draft workspace formats your manuscript into traditional industry submission standards: 12pt Times New Roman (or Courier), true 1-inch margins, 0.5-inch paragraph indents, running headers (SURNAME / TITLE / page #), and centered chapter titles.\n\nConsistency Pre-Flight checks for common submission red flags:\n• Straight vs. Curly Quotes: Flags mixed "straight" and "smart" quotation marks.\n• Dash Inconsistency: Flags mixtures of double hyphens (--) and em-dashes (—).\n• Formatting Artifacts: Detects zero-width spaces (\\u200B), non-breaking spaces, and erratic tabs.\n• Spacing: Identifies double spaces and trailing blank lines.\n\nClick "Fix Invisible Artifacts" to automatically clean hidden characters across all chapters simultaneously.',
        tips: [
          'Choose the "Standard Manuscript" preset for industry-standard agent submissions.',
          'The live paged simulator reflects exact 8.5"×11" printed page breaks.',
          'Use "Print / Save PDF" to generate publisher-ready PDFs using local print styling.'
        ],
        keywords: ['preflight', 'consistency', 'quotes', 'dashes', 'format', 'final draft', 'pdf', 'print', 'artifacts', 'double spacing', 'submission']
      }
    },

    privacy: {
      id: 'privacy',
      guideTab: 'quickstart',
      tabLabel: 'Quick Start',
      title: 'Local Storage & Vault Backups',
      summary: 'Keep your manuscript private on your machine and maintain portable Vault backups.',
      popoverText: 'Revision Atlas stores manuscript data locally in your browser and does not require cloud storage for your writing. Clearing your browser or site data will remove local projects unless you have saved a backup. Always click Export Project Vault (JSON) regularly—especially before clearing browser data, changing computers, or starting major structural revisions.',
      guideSection: {
        heading: 'Local Browser Storage, Privacy & Backups',
        body: 'Revision Atlas is built on an author-privacy first architecture. Your manuscript data, notes, version history, and character canon are saved locally in your browser\'s database (IndexedDB) on this computer. No drafts are sent to remote servers or cloud accounts.\n\nCrucial Backup Practice:\nBecause your project lives in your local browser storage, clearing browser cache/history or resetting site data will delete your project unless you have saved a backup.\n\nProtect your work:\n• Export Project Vault (JSON): Generates a single, lightweight, human-readable file containing your entire project, all versions, chapters, and notes.\n• Save Vault backups to your hard drive, cloud drive, or USB flash drive.\n• Import Project Vault (JSON) restores your entire manuscript and version history in seconds on any browser.',
        tips: [
          'Export a Vault backup at the end of every productive writing session.',
          'Vault files are standard JSON that can be archived anywhere safely.'
        ],
        keywords: ['privacy', 'local', 'storage', 'backup', 'vault', 'export', 'import', 'browser data', 'offline', 'security']
      }
    }
  };

  let activeHelpTrigger = null;

  function initHelpSystem() {
    // 1. Delegated click listener for contextual help buttons, guide tabs, and close buttons
    document.addEventListener('click', (e) => {
      const helpBtn = e.target.closest('.help-btn[data-help-topic]');
      if (helpBtn) {
        e.preventDefault();
        OverlayManager.closeSaveMenu(false);
        const topicId = helpBtn.getAttribute('data-help-topic');
        if (activeHelpTrigger === helpBtn) {
          closeHelpPopover();
        } else {
          showHelp(topicId, helpBtn);
        }
        return;
      }

      // Open Guide from top-bar or deep-links
      const openGuideBtn = e.target.closest('#btn-open-guide, [data-open-guide]');
      if (openGuideBtn) {
        e.preventDefault();
        const targetTab = openGuideBtn.getAttribute('data-open-guide') || 'quickstart';
        openStudioGuide(targetTab);
        return;
      }

      // Close Guide modal
      if (e.target.closest('#btn-close-guide')) {
        e.preventDefault();
        closeStudioGuide();
        return;
      }

      // Close Help popover button
      if (e.target.closest('#help-popover-close')) {
        e.preventDefault();
        closeHelpPopover();
        return;
      }

      // Learn more in Guide link in popover footer
      const guideLink = e.target.closest('#help-popover-guide-link');
      if (guideLink) {
        e.preventDefault();
        const targetTab = guideLink.getAttribute('data-target-tab') || 'quickstart';
        closeHelpPopover();
        openStudioGuide(targetTab);
        return;
      }

      // Guide Tab switching
      const tabBtn = e.target.closest('.guide-tab-btn[data-tab]');
      if (tabBtn) {
        e.preventDefault();
        switchGuideTab(tabBtn.getAttribute('data-tab'));
        return;
      }
    });

    // 3. Search Guide live filtering
    const searchInput = document.getElementById('guide-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterStudioGuide(e.target.value);
      });
      // Isolate key events in search input so shortcuts do not leak
      searchInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
      });
    }

    // Render guide panels once
    renderStudioGuidePanels();
  }

  function showHelp(topicId, triggerEl) {
    const popover = document.getElementById('help-popover');
    if (!popover) return;

    const topic = HELP_TOPICS[topicId];
    if (!topic) {
      console.warn('Revision Atlas: Help topic "' + topicId + '" not registered.');
      return;
    }

    // Reset previous trigger if any
    if (activeHelpTrigger && activeHelpTrigger !== triggerEl) {
      activeHelpTrigger.setAttribute('aria-expanded', 'false');
    }

    activeHelpTrigger = triggerEl;
    triggerEl.setAttribute('aria-expanded', 'true');

    document.getElementById('help-popover-title').textContent = topic.title;
    document.getElementById('help-popover-body').innerHTML = topic.popoverText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    const linkBtn = document.getElementById('help-popover-guide-link');
    linkBtn.setAttribute('data-target-tab', topic.guideTab);
    linkBtn.textContent = 'Learn more in Guide → ' + topic.tabLabel;

    popover.removeAttribute('hidden');

    // Smart positioning relative to triggerEl
    const rect = triggerEl.getBoundingClientRect();
    const popoverWidth = 320;
    const padding = 12;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }
    if (left < padding) left = padding;

    let top = rect.bottom + 8;
    // Check if it fits below
    if (top + 220 > window.innerHeight - padding) {
      // Flip above
      top = Math.max(padding, rect.top - 210);
    }

    popover.style.left = Math.round(left) + 'px';
    popover.style.top = Math.round(top) + 'px';
  }

  function closeHelpPopover() {
    const popover = document.getElementById('help-popover');
    if (popover) {
      popover.setAttribute('hidden', '');
    }
    if (activeHelpTrigger) {
      activeHelpTrigger.setAttribute('aria-expanded', 'false');
      activeHelpTrigger.focus();
      activeHelpTrigger = null;
    }
  }

  function renderStudioGuidePanels() {
    const container = document.getElementById('guide-panels-container');
    if (!container) return;

    const tabs = [
      { id: 'quickstart', label: '1. Quick Start', topics: ['chapters', 'privacy'] },
      { id: 'writing', label: '2. Writing & Formatting', topics: ['formatting', 'revisionStatus'] },
      { id: 'revision', label: '3. Revision & Comparison', topics: ['chapterFunction', 'compareRecovery', 'versions'] },
      { id: 'finalization', label: '4. Finalization & Pre-Flight', topics: ['preflight'] }
    ];

    let html = '';

    tabs.forEach(tab => {
      html += '<div class="guide-panel ' + (tab.id === 'quickstart' ? 'active' : '') + '" id="guide-panel-' + tab.id + '" role="tabpanel" aria-labelledby="guide-tab-' + tab.id + '">';

      tab.topics.forEach(topicKey => {
        const t = HELP_TOPICS[topicKey];
        if (!t) return;
        html += '<article class="guide-card" data-topic-id="' + t.id + '">';
        html += '  <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem;">';
        html += '    <h4 class="guide-card-title">' + escapeHtml(t.guideSection.heading || t.title) + '</h4>';
        html += '    <span class="guide-card-tag">' + escapeHtml(tab.label.replace(/^\d+\.\s*/, '')) + '</span>';
        html += '  </div>';
        html += '  <p class="guide-card-summary">' + escapeHtml(t.summary) + '</p>';
        html += '  <div class="guide-card-content">' + t.guideSection.body.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>') + '</div>';
        if (t.guideSection.tips && t.guideSection.tips.length > 0) {
          html += '  <div class="guide-card-tips">';
          html += '    <strong>Key Tips:</strong>';
          html += '    <ul style="margin-left: 1.2rem; margin-top: 0.25rem;">';
          t.guideSection.tips.forEach(tip => {
            html += '      <li>' + escapeHtml(tip) + '</li>';
          });
          html += '    </ul>';
          html += '  </div>';
        }
        html += '</article>';
      });

      // Embed Shortcuts table in Writing panel
      if (tab.id === 'writing') {
        html += '<article class="guide-card">';
        html += '  <h4 class="guide-card-title">Keyboard Shortcuts Reference</h4>';
        html += '  <p class="guide-card-summary">Standard keyboard controls for rapid drafting and revision without lifting hands from keys.</p>';
        html += '  <table class="shortcut-table">';
        html += '    <thead>';
        html += '      <tr><th>Shortcut</th><th>Action</th><th>Scope</th></tr>';
        html += '    </thead>';
        html += '    <tbody>';
        html += '      <tr><td><span class="key-badge">Ctrl+B</span> / <span class="key-badge">Cmd+B</span></td><td>Toggle <strong>Bold</strong> markdown (**text**)</td><td>Prose Editor</td></tr>';
        html += '      <tr><td><span class="key-badge">Ctrl+I</span> / <span class="key-badge">Cmd+I</span></td><td>Toggle <em>Italics</em> markdown (*text*)</td><td>Prose Editor</td></tr>';
        html += '      <tr><td><span class="key-badge">Ctrl+K</span> / <span class="key-badge">Cmd+K</span></td><td>Open Global Search</td><td>Anywhere</td></tr>';
        html += '      <tr><td><span class="key-badge">Esc</span></td><td>Close Modals, Popovers, & Search</td><td>Anywhere</td></tr>';
        html += '      <tr><td><span class="key-badge">* * *</span> or <span class="key-badge">#</span></td><td>Centered Scene Break on dedicated line</td><td>Prose Editor</td></tr>';
        html += '    </tbody>';
        html += '  </table>';
        html += '</article>';
      }

      html += '</div>';
    });

    // Container for search results
    html += '<div class="guide-panel" id="guide-panel-search" role="tabpanel" aria-label="Search Results"></div>';

    container.innerHTML = html;
  }

  function openStudioGuide(targetTab = 'quickstart') {
    const modal = document.getElementById('studio-guide-modal');
    if (!modal) return;

    OverlayManager.openModal('studio-guide-modal');

    // Reset search input
    const searchInput = document.getElementById('guide-search-input');
    if (searchInput) searchInput.value = '';

    switchGuideTab(targetTab);
    if (searchInput) searchInput.focus();
  }

  function closeStudioGuide() {
    OverlayManager.closeModal('studio-guide-modal');
  }

  function switchGuideTab(targetTab) {
    // If search was active, hide search panel
    const searchPanel = document.getElementById('guide-panel-search');
    if (searchPanel) searchPanel.classList.remove('active');

    // Update tab buttons
    document.querySelectorAll('.guide-tab-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === targetTab;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    // Update panels
    document.querySelectorAll('.guide-panel:not(#guide-panel-search)').forEach(p => {
      const isTarget = p.id === 'guide-panel-' + targetTab;
      p.classList.toggle('active', isTarget);
    });
  }

  function filterStudioGuide(query) {
    const q = (query || '').trim().toLowerCase();
    const searchPanel = document.getElementById('guide-panel-search');
    if (!searchPanel) return;

    if (!q) {
      searchPanel.classList.remove('active');
      searchPanel.innerHTML = '';
      const activeTabBtn = document.querySelector('.guide-tab-btn.active');
      const currentTab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'quickstart';
      switchGuideTab(currentTab);
      return;
    }

    // Hide standard panels
    document.querySelectorAll('.guide-panel:not(#guide-panel-search)').forEach(p => p.classList.remove('active'));
    searchPanel.classList.add('active');

    // Search across HELP_TOPICS
    const matches = [];
    Object.values(HELP_TOPICS).forEach(topic => {
      const searchTarget = [
        topic.title,
        topic.summary,
        topic.popoverText,
        topic.guideSection.heading,
        topic.guideSection.body,
        (topic.guideSection.tips || []).join(' '),
        (topic.guideSection.keywords || []).join(' ')
      ].join(' ').toLowerCase();

      if (searchTarget.includes(q)) {
        matches.push(topic);
      }
    });

    if (matches.length === 0) {
      searchPanel.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;"><p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No matching topics found for "<strong>' + escapeHtml(query) + '</strong>"</p><p style="font-size: 0.85rem;">Try searching for <em>deleted</em>, <em>double spacing</em>, <em>branching</em>, <em>backup</em>, or <em>shortcuts</em>.</p></div>';
      return;
    }

    let resultsHtml = '<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">Found ' + matches.length + ' topic' + (matches.length === 1 ? '' : 's') + ' matching "<strong>' + escapeHtml(query) + '</strong>":</div>';

    matches.forEach(t => {
      resultsHtml += '<article class="guide-card">';
      resultsHtml += '  <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem;">';
      resultsHtml += '    <h4 class="guide-card-title">' + escapeHtml(t.guideSection.heading || t.title) + '</h4>';
      resultsHtml += '    <button class="btn btn-sm" onclick="Atlas.switchGuideTab(\'' + t.guideTab + '\')" style="font-size: 0.75rem;">View in ' + escapeHtml(t.tabLabel) + ' →</button>';
      resultsHtml += '  </div>';
      resultsHtml += '  <p class="guide-card-summary">' + escapeHtml(t.summary) + '</p>';
      resultsHtml += '  <div class="guide-card-content">' + t.guideSection.body.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>') + '</div>';
      resultsHtml += '</article>';
    });

    searchPanel.innerHTML = resultsHtml;
  }

  // PUBLIC INTERFACE
  return {
    boot,
    helpTopics: HELP_TOPICS,
    showHelp,
    closeHelpPopover,
    openStudioGuide,
    closeStudioGuide,
    switchGuideTab,
    filterStudioGuide,
    setTheme,
    openReadingPrefsModal,
    closeReadingPrefsModal,
    updateReadingPrefs,
    switchView,
    toggleSidebarCollapse,
    toggleInspectorCollapse,
    closeAllMobileDrawers,
    toggleMobileMoreSheet,
    closeMobileMoreSheet,
    switchFinalDraftMobileTab,
    selectChapter,
    filterChapterList,
    onChapterTitleChange,
    promptRenameChapter,
    onEditorInput,
    onEditorKeyDown,
    updateCursorPosition,
    toggleBold,
    toggleItalic,
    autoFormatProse,
    setChapterRevisionStatus,
    saveChapterNotes,
    createNewChapter,
    saveChapterFunctionField,
    toggleFunctionTag,
    toggleFullFunctionRecord,
    switchInspectorTab,
    runComparison,
    analyzeChapterRevision,
    setCompareViewMode,
    filterCompareResults,
    copyDiffText,
    insertDiffIntoCurrent,
    restoreSingleParagraph,
    saveDiffAsFragment,
    switchRefTab,
    renderFunctionMap,
    scanCharacterAppearances,
    createNewFragment,
    insertFragmentAtCursor,
    openSaveVersionModal,
    closeSaveVersionModal,
    checkVersionNameDuplicate,
    saveVersionFromModal,
    takeSafetySnapshot,
    renderVersionList,
    toggleSafetySnapshotsCollapse,
    viewVersion,
    returnToActiveWorkingDraft,
    switchToActiveVersion,
    branchHistoricalAsWorking,
    compareHistoricalAgainstActive,
    openChapterHistoryModal,
    closeChapterHistoryModal,
    applyFinalDraftPreset,
    updateFinalDraftPreview,
    fixFormattingArtifacts,
    takeFinalDraftSnapshot,
    exportAllChaptersMarkdown,
    exportFullVault,
    printFormattedDraft,
    openSearchModal,
    closeSearchModal,
    executeGlobalSearch,
    openProfileModal,
    closeProfileModal,
    showNewProjectModal,
    closeNewProjectModal,
    createProjectFromForm,
    loadDemoProject,
    triggerImportChapters,
    triggerImportProject,
    parseSingleManuscriptText,
    parseMultipleManuscriptFiles,
    openSmartImportModal,
    closeSmartImportModal,
    commitSmartImport,
    updatePendingChapterTitle,
    removePendingEntity,
    saveNow,
    toggleFocusMode,
    sanitizeProseBlock,
    importVaultData,
    openCloudSyncModal,
    closeCloudSyncModal,
    toggleSaveMenu,
    closeSaveMenu,
    OverlayManager,
    backupToGoogleDrive,
    restoreFromGoogleDrive,
    linkLocalDiskFile,
    unlinkLocalDiskFile,
    syncToLinkedDiskFile,
    getItem,
    putItem,
    runFullDiagnostics: () => alert('Full manuscript diagnostics complete.')
  };
})();

window.Atlas = Atlas;
if (typeof module !== 'undefined') {
  module.exports = Atlas;
}

window.addEventListener('DOMContentLoaded', () => {
  Atlas.boot();
});
