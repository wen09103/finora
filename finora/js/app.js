/* ============================================================
   FINORA — APP
   Boot: Auth → Reset user mới → Check tháng mới → Sync → Init.
   ============================================================ */
(function () {
  'use strict';

  const App = {

    currentPage: 'dashboard',

    init() {
      FinoraStorage.init();
      this.applyTheme(FinoraStorage.getTheme(), true);

      if (window.lucide) window.lucide.createIcons();

      FinoraDashboard.render();
      FinoraDashboard.bindRangePicker();

      FinoraTransactions.init();
      FinoraBudget.init();
      FinoraStatistics.init();
      FinoraGoals.init();
      FinoraSettings.init();

      this.handleRoute();
      window.addEventListener('hashchange', () => this.handleRoute());

      this.bindThemeToggle();
      this.bindAddButtons();

      window.addEventListener('resize', Utils.debounce(() => {
        if (this.currentPage === 'dashboard') {
          const txs = FinoraStorage.getTransactions();
          FinoraDashboard.renderChart(txs, FinoraDashboard._range);
        }
      }, 220));

      this.registerServiceWorker();
    },

    updateUserInfo() {
      const user = window.FinoraUser;
      if (!user || !user.email) return;

      const email = user.email;
      const displayName = email.split('@')[0];
      const initials = displayName.slice(0, 2).toUpperCase();

      const sidebarAvatar = document.getElementById('sidebarAvatar');
      const sidebarName = document.getElementById('sidebarName');
      const sidebarEmail = document.getElementById('sidebarEmail');
      const topbarAvatar = document.getElementById('topbarAvatar');

      if (sidebarAvatar) sidebarAvatar.textContent = initials;
      if (sidebarName) sidebarName.textContent = displayName;
      if (sidebarEmail) sidebarEmail.textContent = email;
      if (topbarAvatar) topbarAvatar.textContent = initials;
    },

    applyTheme(theme, silent) {
      document.documentElement.setAttribute('data-theme', theme);
      FinoraStorage.setTheme(theme);

      const topIcon = document.querySelector('#themeToggleTop i');
      const sideText = document.querySelector('.theme-toggle__text');
      if (topIcon) topIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (sideText) sideText.textContent = theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối';

      if (window.lucide) window.lucide.createIcons();

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = theme === 'dark' ? '#0F1720' : '#16A779';

      if (!silent) {
        Utils.toast(theme === 'dark' ? 'Đã bật chế độ tối' : 'Đã bật chế độ sáng');
      }
    },

    toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      this.applyTheme(current === 'dark' ? 'light' : 'dark');
    },

    bindThemeToggle() {
      const a = document.getElementById('themeToggleSidebar');
      const b = document.getElementById('themeToggleTop');
      if (a) a.addEventListener('click', () => this.toggleTheme());
      if (b) b.addEventListener('click', () => this.toggleTheme());
    },

    handleRoute() {
      const hash = (location.hash || '#dashboard').replace('#', '');
      const known = ['dashboard', 'transactions', 'budget', 'statistics', 'goals', 'settings'];
      const page = known.includes(hash) ? hash : 'dashboard';
      this.currentPage = page;

      Utils.qsa('[data-page]').forEach(el => {
        const isActive = el.dataset.page === page;
        el.classList.toggle('is-active', isActive);
        if (isActive) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
      });

      const map = {
        dashboard:    document.getElementById('page-dashboard'),
        transactions: document.getElementById('page-transactions'),
        budget:       document.getElementById('page-budget'),
        statistics:   document.getElementById('page-statistics'),
        goals:        document.getElementById('page-goals'),
        settings:     document.getElementById('page-settings')
      };

      Object.entries(map).forEach(([key, el]) => {
        if (el) el.hidden = key !== page;
      });

      const ph = document.getElementById('page-placeholder');
      if (ph) ph.hidden = true;

      if (page === 'dashboard')         FinoraDashboard.render();
      else if (page === 'transactions') FinoraTransactions.render();
      else if (page === 'budget')       FinoraBudget.render();
      else if (page === 'statistics')   FinoraStatistics.render();
      else if (page === 'goals')        FinoraGoals.render();
      else if (page === 'settings')     FinoraSettings.render();

      if (window.lucide) window.lucide.createIcons();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    bindAddButtons() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="add-transaction"]');
        if (!btn) return;
        FinoraTransactions.openAdd();
      });
    },

    registerServiceWorker() {
      if (!('serviceWorker' in navigator)) return;
      if (location.protocol === 'file:') return;

      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(reg => console.log('[Finora] SW registered', reg.scope))
          .catch(err => console.warn('[Finora] SW failed', err));
      });
    }
  };

  /* ========================================================
     BOOT
     ======================================================== */
  async function boot() {
    // 1. Chờ Backend
    if (!window.FinoraBackend) {
      console.warn('[Finora] Backend chưa load — offline mode');
      const start = () => App.init();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
      } else {
        start();
      }
      return;
    }

    // 2. Check session
    let session;
    try {
      session = await FinoraBackend.Auth.getSession();
    } catch (e) {
      console.error('[Finora] Lỗi session:', e);
      session = null;
    }

    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    window.FinoraUser = session.user;

    // ========================================================
    // 3. USER MỚI → RESET VỀ 0
    // ========================================================
    const currentUserId = session.user.id;
    const lastUserId = localStorage.getItem('finora.lastUserId');

    if (lastUserId !== currentUserId) {
      console.log('[Finora] 🆕 User mới → reset LocalStorage về 0');
      localStorage.removeItem('finora.transactions.v1');
      localStorage.removeItem('finora.budgets.v1');
      localStorage.removeItem('finora.goals.v1');
      localStorage.removeItem('finora.seeded.v1');
      localStorage.removeItem('finora.budget-seeded.v1');
      localStorage.removeItem('finora.goals-seeded.v1');
      localStorage.removeItem('finora.activeMonth');
      localStorage.removeItem('finora.monthlyArchive.v1');
      localStorage.setItem('finora.lastUserId', currentUserId);
    }

    // ========================================================
    // 4. CHECK THÁNG MỚI → ARCHIVE + RESET + BANNER
    // ========================================================
    const monthInfo = FinoraStorage.checkNewMonth();
    if (monthInfo.isNewMonth) {
      console.log(`[Finora] 📅 Tháng mới: ${monthInfo.monthLabel} (cũ: ${monthInfo.oldMonthLabel})`);
      window.FinoraNewMonth = monthInfo;
    }

    // 5. Sync từ cloud
    if (window.FinoraSync) {
      try {
        await FinoraSync.start();
      } catch (e) {
        console.warn('[Finora] Sync lỗi:', e.message);
      }
    }

    // 6. Init app
    const startApp = () => {
      App.init();
      App.updateUserInfo();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startApp);
    } else {
      startApp();
    }

    // 7. Logout listener
    try {
      FinoraBackend.Auth.onChange((event, sess) => {
        if (event === 'SIGNED_OUT' || !sess) {
          localStorage.removeItem('finora.lastUserId');
          window.location.href = 'login.html';
        }
      });
    } catch (e) {
      console.warn('[Finora] Auth listener fail');
    }
  }

  boot();
  window.FinoraApp = App;
})();