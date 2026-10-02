/* ============================================================
   FINORA — SETTINGS (PHASE 6)
   Giao diện, tiền tệ, ngày tháng, Import/Export, PWA, Đăng xuất.
   ============================================================ */
(function (global) {
  'use strict';

  const Settings = {

    _deferredInstallPrompt: null,

    /* ========================================================
       INIT
       ======================================================== */
    init() {
      this._bindThemeSegmented();
      this._bindCurrency();
      this._bindDateFormat();
      this._bindDataActions();
      this._bindLogout();
      this._bindClearModal();
      this._bindPwa();

      this._syncUi();
      this._updateMeta();
    },

    /* ========================================================
       RENDER (gọi khi vào trang)
       ======================================================== */
    render() {
      this._syncUi();
      this._updateMeta();

      if (window.lucide) window.lucide.createIcons();
    },

    /* ========================================================
       SYNC UI
       ======================================================== */
    _syncUi() {
      // Theme
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      document.querySelectorAll('#themeSegmented button').forEach(b => {
        const active = b.dataset.themeSet === theme;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      // Currency
      const cur = document.getElementById('settingCurrency');
      if (cur) cur.value = FinoraStorage.getSetting('currency', 'VND');

      // Date format
      const df = document.getElementById('settingDateFormat');
      if (df) df.value = FinoraStorage.getSetting('dateFormat', 'DD/MM/YYYY');

      // User email (nếu có)
      const userEmailEl = document.getElementById('metaUserEmail');
      if (userEmailEl && global.FinoraUser) {
        userEmailEl.textContent = global.FinoraUser.email || '—';
      }
    },

    _updateMeta() {
      // Tổng giao dịch
      const count = FinoraStorage.getTransactions().length;
      const countEl = document.getElementById('metaTxCount');
      if (countEl) countEl.textContent = count.toLocaleString('vi-VN');

      // Dung lượng
      const sizeEl = document.getElementById('metaStorage');
      if (sizeEl) {
        try {
          let bytes = 0;
          for (const k in localStorage) {
            if (k.startsWith('finora.')) {
              bytes += (localStorage[k] || '').length + k.length;
            }
          }
          const kb = (bytes / 1024).toFixed(1);
          sizeEl.textContent = `${kb} KB`;
        } catch (e) {
          sizeEl.textContent = '—';
        }
      }

      // PWA
      const pwaEl = document.getElementById('metaPwa');
      if (pwaEl) {
        const standalone = window.matchMedia('(display-mode: standalone)').matches
          || window.navigator.standalone === true;
        pwaEl.textContent = standalone ? 'Đã cài đặt' : 'Sẵn sàng';
      }
    },

    /* ========================================================
       THEME
       ======================================================== */
    _bindThemeSegmented() {
      const wrap = document.getElementById('themeSegmented');
      if (!wrap) return;

      wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-theme-set]');
        if (!btn) return;
        const theme = btn.dataset.themeSet;

        if (global.FinoraApp) {
          global.FinoraApp.applyTheme(theme);
        }
        this._syncUi();
      });
    },

    /* ========================================================
       CURRENCY / DATE FORMAT
       ======================================================== */
    _bindCurrency() {
      const sel = document.getElementById('settingCurrency');
      if (!sel) return;
      sel.addEventListener('change', () => {
        FinoraStorage.setSetting('currency', sel.value);
        Utils.toast('Đã lưu đơn vị tiền tệ');
      });
    },

    _bindDateFormat() {
      const sel = document.getElementById('settingDateFormat');
      if (!sel) return;
      sel.addEventListener('change', () => {
        FinoraStorage.setSetting('dateFormat', sel.value);
        Utils.toast('Đã lưu định dạng ngày');
      });
    },

    /* ========================================================
       DATA ACTIONS
       ======================================================== */
    _bindDataActions() {
      const expJson = document.getElementById('exportJson');
      const expCsv  = document.getElementById('exportCsv');
      const impFile = document.getElementById('importFile');
      const clearBtn = document.getElementById('clearAllData');

      if (expJson) expJson.addEventListener('click', () => this._exportJson());
      if (expCsv)  expCsv.addEventListener('click', () => this._exportCsv());
      if (impFile) impFile.addEventListener('change', (e) => this._importJson(e));
      if (clearBtn) clearBtn.addEventListener('click', () => this._openClearModal());
    },

    _exportJson() {
      try {
        const data = {
          app: 'FINORA',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          transactions: FinoraStorage.getTransactions(),
          budgets: FinoraStorage.getBudgets(),
          goals: FinoraStorage.getGoals(),
          settings: {
            theme: FinoraStorage.getTheme(),
            currency: FinoraStorage.getSetting('currency', 'VND'),
            dateFormat: FinoraStorage.getSetting('dateFormat', 'DD/MM/YYYY')
          }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this._downloadBlob(blob, `finora-backup-${this._todayStr()}.json`);
        Utils.toast('✓ Đã xuất file JSON');
      } catch (e) {
        console.error(e);
        Utils.toast('Không thể xuất file. Vui lòng thử lại.', 'error');
      }
    },

    _exportCsv() {
      try {
        const txs = FinoraStorage.getTransactions();
        if (txs.length === 0) {
          Utils.toast('Chưa có giao dịch để xuất', 'error');
          return;
        }

        const header = ['Ngày', 'Loại', 'Danh mục', 'Số tiền', 'Ghi chú'];
        const rows = txs.map(t => {
          const meta = Utils.categoryMeta(t.category);
          return [
            t.date,
            t.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
            meta.name,
            t.amount,
            (t.note || '').replace(/"/g, '""')
          ];
        });

        const csv = '\uFEFF' + [header, ...rows].map(r =>
          r.map(cell => `"${cell}"`).join(',')
        ).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        this._downloadBlob(blob, `finora-transactions-${this._todayStr()}.csv`);
        Utils.toast('✓ Đã xuất file CSV');
      } catch (e) {
        console.error(e);
        Utils.toast('Không thể xuất file. Vui lòng thử lại.', 'error');
      }
    },

    _importJson(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);

          if (!data || typeof data !== 'object') {
            throw new Error('Định dạng file không hợp lệ');
          }
          if (!Array.isArray(data.transactions)) {
            throw new Error('File thiếu dữ liệu transactions');
          }

          const clean = [];
          for (const t of data.transactions) {
            if (!t || typeof t !== 'object') continue;
            if (t.type !== 'income' && t.type !== 'expense') continue;
            if (typeof t.amount !== 'number' || t.amount <= 0) continue;
            if (!t.date) continue;
            clean.push({
              id: t.id || ('imp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
              type: t.type,
              amount: t.amount,
              category: t.category || 'other',
              date: t.date,
              note: typeof t.note === 'string' ? t.note.slice(0, 80) : '',
              createdAt: t.createdAt || new Date().toISOString()
            });
          }

          if (clean.length === 0) {
            throw new Error('Không có giao dịch hợp lệ trong file');
          }

          const ok = window.confirm(`Tìm thấy ${clean.length} giao dịch hợp lệ.\n\nBấm OK để GHI ĐÈ dữ liệu hiện tại.\nBấm Cancel để HỦY.`);
          if (!ok) return;

          FinoraStorage.setTransactions(clean);

          if (data.budgets && typeof data.budgets === 'object') {
            try {
              Object.keys(data.budgets).forEach(k => {
                FinoraStorage.setBudget(k, data.budgets[k]);
              });
            } catch (e) { /* bỏ qua */ }
          }

          if (Array.isArray(data.goals)) {
            try {
              FinoraStorage.setGoals(data.goals);
            } catch (e) { /* bỏ qua */ }
          }

          Utils.toast(`✓ Đã nhập ${clean.length} giao dịch`);

          if (global.FinoraDashboard) FinoraDashboard.render();
          if (global.FinoraTransactions) FinoraTransactions.render();
          if (global.FinoraBudget) FinoraBudget.render();
          if (global.FinoraStatistics) FinoraStatistics.render();
          if (global.FinoraGoals) FinoraGoals.render();
          this._updateMeta();
        } catch (err) {
          console.error(err);
          Utils.toast('File không hợp lệ. Vui lòng kiểm tra lại.', 'error');
        } finally {
          event.target.value = '';
        }
      };

      reader.onerror = () => {
        Utils.toast('Không thể đọc file. Vui lòng thử lại.', 'error');
        event.target.value = '';
      };

      reader.readAsText(file, 'utf-8');
    },

    /* ========================================================
       ĐĂNG XUẤT
       ======================================================== */
    _bindLogout() {
      const logoutBtn = document.getElementById('logoutBtn');
      if (!logoutBtn) return;

      logoutBtn.addEventListener('click', async () => {
        const ok = window.confirm('Bạn có chắc muốn đăng xuất khỏi FINORA?');
        if (!ok) return;

        try {
          if (global.FinoraBackend && global.FinoraBackend.Auth) {
            await global.FinoraBackend.Auth.signOut();
          }
          Utils.toast('✓ Đã đăng xuất');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 400);
        } catch (e) {
          console.error(e);
          Utils.toast('Không thể đăng xuất. Vui lòng thử lại.', 'error');
        }
      });
    },

    /* ========================================================
       CLEAR DATA MODAL
       ======================================================== */
    _bindClearModal() {
      const modal = document.getElementById('clearDataModal');
      if (!modal) return;

      modal.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-modal]')) this._closeClearModal();
      });

      const confirmBtn = document.getElementById('clearDataConfirm');
      if (confirmBtn) confirmBtn.addEventListener('click', () => this._doClearAll());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) this._closeClearModal();
      });
    },

    _openClearModal() {
      const modal = document.getElementById('clearDataModal');
      if (!modal) return;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (window.lucide) window.lucide.createIcons();
    },

    _closeClearModal() {
      const modal = document.getElementById('clearDataModal');
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    },

    _doClearAll() {
      const ok = FinoraStorage.clearAll();
      this._closeClearModal();

      if (!ok) {
        Utils.toast('Không thể xóa dữ liệu. Vui lòng thử lại.', 'error');
        return;
      }

      if (global.FinoraApp) global.FinoraApp.applyTheme('light', true);

      if (global.FinoraDashboard) FinoraDashboard.render();
      if (global.FinoraTransactions) FinoraTransactions.render();
      if (global.FinoraBudget) FinoraBudget.render();
      if (global.FinoraStatistics) FinoraStatistics.render();
      if (global.FinoraGoals) FinoraGoals.render();

      this._updateMeta();
      Utils.toast('✓ Đã xóa toàn bộ dữ liệu');
    },

    /* ========================================================
       PWA
       ======================================================== */
    _bindPwa() {
      const installBtn = document.getElementById('installPwa');
      if (!installBtn) return;

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this._deferredInstallPrompt = e;
        installBtn.hidden = false;
        if (window.lucide) window.lucide.createIcons();
      });

      installBtn.addEventListener('click', async () => {
        if (!this._deferredInstallPrompt) {
          Utils.toast('Ứng dụng đã sẵn sàng hoặc không hỗ trợ cài đặt.', 'error');
          return;
        }
        this._deferredInstallPrompt.prompt();
        const { outcome } = await this._deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          Utils.toast('✓ Đang cài đặt FINORA');
        }
        this._deferredInstallPrompt = null;
        installBtn.hidden = true;
      });

      window.addEventListener('appinstalled', () => {
        Utils.toast('✓ FINORA đã được cài đặt');
        installBtn.hidden = true;
        this._updateMeta();
      });
    },

    /* ========================================================
       HELPERS
       ======================================================== */
    _todayStr() {
      const d = new Date();
      return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    },

    _downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  global.FinoraSettings = Settings;
})(window);