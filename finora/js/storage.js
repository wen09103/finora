/* ============================================================
   FINORA — STORAGE
   LocalStorage + seed + budget + settings + goals
   + monthly archive (lịch sử tháng).
   ============================================================ */
(function (global) {
  'use strict';

  const KEY_TX      = 'finora.transactions.v1';
  const KEY_THEME   = 'finora.theme';
  const KEY_SEEDED  = 'finora.seeded.v1';
  const KEY_BUDGET  = 'finora.budgets.v1';
  const KEY_BUDGET_SEEDED = 'finora.budget-seeded.v1';
  const KEY_SETTINGS = 'finora.settings.v1';
  const KEY_GOALS    = 'finora.goals.v1';
  const KEY_GOALS_SEEDED = 'finora.goals-seeded.v1';
  const KEY_ACTIVE_MONTH = 'finora.activeMonth';
  const KEY_ARCHIVE = 'finora.monthlyArchive.v1';

  const Storage = {

    _read(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        console.warn('[Finora] Read error:', e);
        return fallback;
      }
    },

    _write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn('[Finora] Write error:', e);
        if (global.Utils) Utils.toast('Không thể lưu dữ liệu. Vui lòng thử lại.', 'error');
        return false;
      }
    },

    /* ========================================================
       TRANSACTIONS
       ======================================================== */
    getTransactions() { return this._read(KEY_TX, []); },
    setTransactions(list) { return this._write(KEY_TX, list || []); },

    addTransaction(tx) {
      const list = this.getTransactions();
      const item = Object.assign({
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        type: 'expense', amount: 0, category: 'other',
        date: Utils.toISODate(new Date()), note: '',
        createdAt: new Date().toISOString()
      }, tx);
      list.unshift(item);
      this.setTransactions(list);
      return item;
    },

    updateTransaction(id, patch) {
      const list = this.getTransactions();
      const idx = list.findIndex(t => t.id === id);
      if (idx === -1) return null;
      list[idx] = Object.assign({}, list[idx], patch);
      this.setTransactions(list);
      return list[idx];
    },

    deleteTransaction(id) {
      const list = this.getTransactions();
      const next = list.filter(t => t.id !== id);
      if (next.length === list.length) return false;
      this.setTransactions(next);
      return true;
    },

    getTransaction(id) {
      return this.getTransactions().find(t => t.id === id) || null;
    },

    replaceAllTransactions(list) {
      if (!Array.isArray(list)) return false;
      return this.setTransactions(list);
    },

    /* ========================================================
       BUDGETS
       ======================================================== */
    getBudgets() { return this._read(KEY_BUDGET, {}); },
    getBudget(monthKey) {
      const all = this.getBudgets();
      return all[monthKey] || null;
    },
    setBudget(monthKey, data) {
      const all = this.getBudgets();
      all[monthKey] = data;
      return this._write(KEY_BUDGET, all);
    },
    deleteBudget(monthKey) {
      const all = this.getBudgets();
      delete all[monthKey];
      return this._write(KEY_BUDGET, all);
    },

    /* ========================================================
       SETTINGS
       ======================================================== */
    getSettings() { return this._read(KEY_SETTINGS, {}); },
    getSetting(key, fallback) {
      const all = this.getSettings();
      return (key in all) ? all[key] : fallback;
    },
    setSetting(key, value) {
      const all = this.getSettings();
      all[key] = value;
      return this._write(KEY_SETTINGS, all);
    },

    /* ========================================================
       GOALS
       ======================================================== */
    getGoals() { return this._read(KEY_GOALS, []); },
    setGoals(list) { return this._write(KEY_GOALS, list || []); },

    addGoal(goal) {
      const list = this.getGoals();
      const item = Object.assign({
        id: 'goal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: 'Mục tiêu mới', target: 0, saved: 0,
        deadline: null, icon: '🎯', color: '#16A779',
        createdAt: new Date().toISOString()
      }, goal);
      list.unshift(item);
      this.setGoals(list);
      return item;
    },

    updateGoal(id, patch) {
      const list = this.getGoals();
      const idx = list.findIndex(g => g.id === id);
      if (idx === -1) return null;
      list[idx] = Object.assign({}, list[idx], patch);
      this.setGoals(list);
      return list[idx];
    },

    deleteGoal(id) {
      const list = this.getGoals();
      const next = list.filter(g => g.id !== id);
      if (next.length === list.length) return false;
      this.setGoals(next);
      return true;
    },

    getGoal(id) {
      return this.getGoals().find(g => g.id === id) || null;
    },

    /* ========================================================
       MONTHLY ARCHIVE (LỊCH SỬ THÁNG)
       ======================================================== */
    getMonthlyArchive() {
      return this._read(KEY_ARCHIVE, []);
    },

    setMonthlyArchive(list) {
      return this._write(KEY_ARCHIVE, list || []);
    },

    /**
     * Lưu dữ liệu tháng hiện tại vào archive.
     * @param {String} monthKey VD: "2026-10"
     * @returns {Object|null} Bản ghi đã lưu
     */
    archiveCurrentMonth(monthKey) {
      const txs = this.getTransactions();
      const monthStart = new Date(monthKey + '-01T00:00:00');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);

      let income = 0, expense = 0;
      const byCat = {};

      txs.forEach(tx => {
        const d = new Date(tx.date);
        if (d < monthStart || d > monthEnd) return;

        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income') income += amt;
        if (tx.type === 'expense') {
          expense += amt;
          byCat[tx.category] = (byCat[tx.category] || 0) + amt;
        }
      });

      // Không có dữ liệu → không lưu
      if (income === 0 && expense === 0) return null;

      const record = {
        monthKey,
        monthLabel: this._formatMonthLabel(monthStart),
        income,
        expense,
        saving: income - expense,
        transactionCount: txs.filter(tx => {
          const d = new Date(tx.date);
          return d >= monthStart && d <= monthEnd;
        }).length,
        byCategory: byCat,
        archivedAt: new Date().toISOString()
      };

      const archive = this.getMonthlyArchive();
      // Tránh trùng — nếu đã có cùng monthKey, ghi đè
      const existingIdx = archive.findIndex(a => a.monthKey === monthKey);
      if (existingIdx >= 0) archive[existingIdx] = record;
      else archive.unshift(record);

      // Sắp xếp mới nhất trước
      archive.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

      this.setMonthlyArchive(archive);
      console.log('[Storage] Đã archive tháng', monthKey, { income, expense });
      return record;
    },

    /**
     * Xóa giao dịch thuộc 1 tháng cụ thể.
     */
    clearMonthTransactions(monthKey) {
      const txs = this.getTransactions();
      const monthStart = new Date(monthKey + '-01T00:00:00');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);

      const remaining = txs.filter(tx => {
        const d = new Date(tx.date);
        return d < monthStart || d > monthEnd;
      });

      this.setTransactions(remaining);
      return remaining.length;
    },

    _formatMonthLabel(date) {
      const d = date instanceof Date ? date : new Date(date);
      return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
    },

    /* ========================================================
       ACTIVE MONTH — CHECK NEW MONTH
       ======================================================== */
    getCurrentMonthKey() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },

    getActiveMonth() {
      return this._read(KEY_ACTIVE_MONTH, null);
    },

    setActiveMonth(monthKey) {
      return this._write(KEY_ACTIVE_MONTH, monthKey);
    },

    /**
     * Kiểm tra tháng mới.
     * @returns {Object} { isNewMonth, monthLabel, oldMonth, firstTime }
     */
    checkNewMonth() {
      const current = this.getCurrentMonthKey();
      const stored = this.getActiveMonth();

      const d = new Date();
      const monthLabel = this._formatMonthLabel(d);

      // Lần đầu dùng
      if (!stored) {
        this.setActiveMonth(current);
        return { isNewMonth: false, monthLabel, oldMonth: null, firstTime: true };
      }

      // Cùng tháng
      if (stored === current) {
        return { isNewMonth: false, monthLabel, oldMonth: stored, firstTime: false };
      }

      // ⭐ Khác tháng → ARCHIVE tháng cũ + đánh dấu tháng mới
      console.log(`[Storage] 📅 Chuyển tháng: ${stored} → ${current}`);

      // 1. Lưu tháng cũ vào archive
      this.archiveCurrentMonth(stored);

      // 2. Xóa giao dịch của tháng cũ (giữ lịch sử ở archive)
      this.clearMonthTransactions(stored);

      // 3. Đánh dấu tháng mới
      this.setActiveMonth(current);

      // 4. Lấy label tháng cũ
      const oldDate = new Date(stored + '-01T00:00:00');
      const oldMonthLabel = this._formatMonthLabel(oldDate);

      return {
        isNewMonth: true,
        monthLabel,
        oldMonth: stored,
        oldMonthLabel,
        firstTime: false
      };
    },

    /* ========================================================
       CLEAR
       ======================================================== */
    clearAll() {
      try {
        localStorage.removeItem(KEY_TX);
        localStorage.removeItem(KEY_SEEDED);
        localStorage.removeItem(KEY_BUDGET);
        localStorage.removeItem(KEY_BUDGET_SEEDED);
        localStorage.removeItem(KEY_SETTINGS);
        localStorage.removeItem(KEY_GOALS);
        localStorage.removeItem(KEY_GOALS_SEEDED);
        localStorage.removeItem(KEY_ACTIVE_MONTH);
        localStorage.removeItem(KEY_ARCHIVE);
        localStorage.removeItem(KEY_THEME);
        return true;
      } catch (e) {
        return false;
      }
    },

    /* ========================================================
       THEME
       ======================================================== */
    getTheme() {
      try { return localStorage.getItem(KEY_THEME) || 'light'; }
      catch (e) { return 'light'; }
    },
    setTheme(theme) {
      try { localStorage.setItem(KEY_THEME, theme); } catch (e) {}
    },

    /* ========================================================
       SEED
       ======================================================== */
    init() {
      if (global.FinoraUser) {
        console.log('[Storage] Đã đăng nhập — bỏ qua seed');
        return;
      }
      this._seedTransactions();
      this._seedBudgets();
      this._seedGoals();
    },

    _seedTransactions() {
      const seeded = this._read(KEY_SEEDED, false);
      const existing = this.getTransactions();
      if (seeded || existing.length > 0) return;

      const today = new Date();
      const d = (offset) => {
        const dt = new Date(today);
        dt.setDate(dt.getDate() - offset);
        return Utils.toISODate(dt);
      };

      const seed = [
        { type: 'income',  amount: 5000000, category: 'salary',  date: d(0),  note: 'Tiền bố mẹ' },
        { type: 'income',  amount: 2000000, category: 'salary',  date: d(3),  note: 'Tiền bố mẹ' },
        { type: 'income',  amount: 1500000, category: 'bonus',   date: d(8),  note: 'Thưởng dự án' },
        { type: 'expense', amount: 45000,  category: 'food',     date: d(0),  note: 'Ăn sáng' },
        { type: 'expense', amount: 80000,  category: 'food',     date: d(0),  note: 'Ăn tối' },
        { type: 'expense', amount: 65000,  category: 'food',     date: d(1),  note: 'Cơm trưa' },
        { type: 'expense', amount: 120000, category: 'food',     date: d(2),  note: 'Ăn ngoài' },
        { type: 'expense', amount: 55000,  category: 'food',     date: d(4),  note: 'Cà phê' },
        { type: 'expense', amount: 30000,  category: 'transport', date: d(0), note: 'Đi xe bus' },
        { type: 'expense', amount: 50000,  category: 'transport', date: d(2), note: 'Grab' },
        { type: 'expense', amount: 200000, category: 'transport', date: d(5), note: 'Đổ xăng' },
        { type: 'expense', amount: 120000, category: 'education', date: d(1), note: 'Mua sách' },
        { type: 'expense', amount: 400000, category: 'education', date: d(6), note: 'Khóa học' },
        { type: 'expense', amount: 150000, category: 'fun',      date: d(3),  note: 'Xem phim' },
        { type: 'expense', amount: 300000, category: 'fun',      date: d(7),  note: 'Game' },
        { type: 'expense', amount: 350000, category: 'shopping', date: d(2),  note: 'Quần áo' },
        { type: 'expense', amount: 280000, category: 'shopping', date: d(9),  note: 'Tai nghe' },
        { type: 'expense', amount: 200000, category: 'health',   date: d(4),  note: 'Thuốc' },
        { type: 'expense', amount: 800000, category: 'housing',  date: d(1),  note: 'Điện nước' }
      ];

      const list = seed.map((tx, i) => Object.assign({
        id: 'seed_' + i + '_' + Date.now(),
        createdAt: new Date(Date.now() - i * 3600000).toISOString()
      }, tx));

      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      this.setTransactions(list);
      this._write(KEY_SEEDED, true);
    },

    _seedBudgets() {
      const seeded = this._read(KEY_BUDGET_SEEDED, false);
      const existing = this.getBudgets();
      if (seeded || Object.keys(existing).length > 0) return;

      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      this.setBudget(monthKey, {
        categories: {
          food: 2000000, transport: 500000, education: 1000000,
          fun: 500000, shopping: 800000, health: 500000,
          housing: 2000000, other: 700000
        }
      });
      this._write(KEY_BUDGET_SEEDED, true);
    },

    _seedGoals() {
      const seeded = this._read(KEY_GOALS_SEEDED, false);
      const existing = this.getGoals();
      if (seeded || existing.length > 0) return;

      const now = new Date();
      const future = (days) => {
        const d = new Date(now);
        d.setDate(d.getDate() + days);
        return Utils.toISODate(d);
      };

      const seed = [
        { name: 'Mua laptop', target: 15000000, saved: 5500000, icon: '💻', color: '#16A779', deadline: future(90) },
        { name: 'Du lịch Đà Nẵng', target: 5000000, saved: 2000000, icon: '✈️', color: '#4A9DEC', deadline: future(60) },
        { name: 'Quỹ khẩn cấp', target: 20000000, saved: 8000000, icon: '🛡️', color: '#F3AD46', deadline: null }
      ];

      const list = seed.map((g, i) => Object.assign({
        id: 'goal_seed_' + i + '_' + Date.now(),
        createdAt: new Date(Date.now() - i * 3600000).toISOString()
      }, g));

      this.setGoals(list);
      this._write(KEY_GOALS_SEEDED, true);
    }
  };

  global.FinoraStorage = Storage;
})(window);