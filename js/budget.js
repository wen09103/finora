/* ============================================================
   FINORA — BUDGET
   Trang Ngân sách tháng: progress, cảnh báo, chỉnh sửa.
   ============================================================ */
(function (global) {
  'use strict';

  const EXPENSE_CATEGORIES = [
    { key: 'food',      name: 'Ăn uống' },
    { key: 'transport', name: 'Đi lại' },
    { key: 'education', name: 'Học tập' },
    { key: 'fun',       name: 'Giải trí' },
    { key: 'shopping',  name: 'Mua sắm' },
    { key: 'health',    name: 'Sức khỏe' },
    { key: 'housing',   name: 'Nhà ở' },
    { key: 'other',     name: 'Khác' }
  ];

  const Budget = {

    _viewMonth: null,  // Date object, first day of month being viewed

    /* ========================================================
       INIT
       ======================================================== */
    init() {
      this._viewMonth = new Date();
      this._viewMonth.setDate(1);

      this._bindMonthSwitch();
      this._bindModal();
      this._bindSetupButtons();
      this.render();
    },

    /* ========================================================
       MONTH HELPERS
       ======================================================== */
    _monthKey(date) {
      const d = date || this._viewMonth;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },

    _monthLabel(date) {
      const d = date || this._viewMonth;
      return `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
    },

    _isCurrentMonth(date) {
      const now = new Date();
      const d = date || this._viewMonth;
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    },

    /* ========================================================
       RENDER
       ======================================================== */
    render() {
      const monthKey = this._monthKey();
      const monthLabel = this._monthLabel();

      // Cập nhật label
      const monthEl = document.getElementById('monthLabel');
      if (monthEl) monthEl.textContent = monthLabel;

      const subEl = document.getElementById('budgetSubtitle');
      if (subEl) {
        subEl.textContent = this._isCurrentMonth()
          ? 'Theo dõi chi tiêu so với ngân sách đã đặt'
          : `Xem lại ngân sách ${monthLabel.toLowerCase()}`;
      }

      // Lấy budget
      const budget = FinoraStorage.getBudget(monthKey);

      // Tính spent theo danh mục trong tháng
      const spentByCat = this._computeSpentByCategory();

      // Render
      this._renderStats(budget, spentByCat);
      this._renderOverall(budget, spentByCat);
      this._renderCategoryGrid(budget, spentByCat);

      if (window.lucide) window.lucide.createIcons();
    },

    _computeSpentByCategory() {
      const txs = FinoraStorage.getTransactions();
      const monthKey = this._monthKey();
      const byCat = {};

      txs.forEach(tx => {
        if (tx.type !== 'expense') return;
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== monthKey) return;

        byCat[tx.category] = (byCat[tx.category] || 0) + (Number(tx.amount) || 0);
      });

      return byCat;
    },

    /* ========================================================
       STATS
       ======================================================== */
    _renderStats(budget, spentByCat) {
      const totalBudget = budget
        ? Object.values(budget.categories).reduce((s, v) => s + (Number(v) || 0), 0)
        : 0;

      const totalSpent = Object.values(spentByCat).reduce((s, v) => s + v, 0);
      const remaining = totalBudget - totalSpent;

      // Tổng ngân sách
      Utils.countUp(document.getElementById('budgetTotal'), totalBudget);
      const totalMeta = document.getElementById('budgetTotalMeta');
      if (totalMeta) {
        totalMeta.textContent = budget
          ? `${Object.keys(budget.categories).filter(k => budget.categories[k] > 0).length} danh mục`
          : 'Chưa thiết lập';
      }

      // Đã sử dụng
      Utils.countUp(document.getElementById('budgetSpent'), totalSpent);
      const spentMeta = document.getElementById('budgetSpentMeta');
      if (spentMeta) {
        if (totalBudget > 0) {
          const pct = Math.round((totalSpent / totalBudget) * 100);
          spentMeta.textContent = `${pct}% ngân sách`;
        } else {
          spentMeta.textContent = 'Chưa có ngân sách';
        }
      }

      // Còn lại
      Utils.countUp(document.getElementById('budgetRemaining'), Math.max(remaining, 0));
      const remainMeta = document.getElementById('budgetRemainingMeta');
      if (remainMeta) {
        if (remaining < 0) {
          remainMeta.textContent = `Vượt ${Utils.formatCurrency(Math.abs(remaining))}`;
          remainMeta.style.color = 'var(--expense)';
        } else if (totalBudget > 0) {
          const pct = Math.round((remaining / totalBudget) * 100);
          remainMeta.textContent = `${pct}% còn lại`;
          remainMeta.style.color = '';
        } else {
          remainMeta.textContent = '—';
          remainMeta.style.color = '';
        }
      }
    },

    /* ========================================================
       OVERALL PROGRESS
       ======================================================== */
    _renderOverall(budget, spentByCat) {
      const totalBudget = budget
        ? Object.values(budget.categories).reduce((s, v) => s + (Number(v) || 0), 0)
        : 0;
      const totalSpent = Object.values(spentByCat).reduce((s, v) => s + v, 0);

      const bar = document.getElementById('overallProgressBar');
      const pct = document.getElementById('overallProgressPct');
      const text = document.getElementById('overallProgressText');
      const badge = document.getElementById('budgetStatusBadge');
      const sub = document.getElementById('budgetOverallSub');

      if (!bar) return;

      // Không có ngân sách
      if (totalBudget <= 0) {
        bar.style.width = '0%';
        bar.className = 'progress__bar';
        if (pct) pct.textContent = '0%';
        if (text) text.textContent = 'Chưa thiết lập ngân sách';
        if (badge) {
          badge.textContent = 'Chưa có';
          badge.className = 'badge';
        }
        if (sub) sub.textContent = 'Bấm "Thiết lập ngân sách" để bắt đầu';
        return;
      }

      const ratio = totalSpent / totalBudget;
      const percent = Math.min(Math.round(ratio * 100), 999);
      const widthPct = Math.min(percent, 100);

      bar.style.width = widthPct + '%';
      bar.className = 'progress__bar';

      let status, badgeClass, badgeText;

      if (ratio >= 1) {
        bar.classList.add('progress__bar--danger');
        status = 'over';
        badgeClass = 'badge badge--danger';
        badgeText = '⚠ Vượt ngân sách';
      } else if (ratio >= 0.7) {
        bar.classList.add('progress__bar--warning');
        status = 'warning';
        badgeClass = 'badge badge--warning';
        badgeText = '⚠ Sắp vượt';
      } else {
        status = 'ok';
        badgeClass = 'badge';
        badgeText = '✓ Trong tầm kiểm soát';
      }

      if (pct)  pct.textContent = percent + '%';
      if (text) {
        text.textContent = `${Utils.formatCurrency(totalSpent)} / ${Utils.formatCurrency(totalBudget)}`;
      }
      if (badge) {
        badge.textContent = badgeText;
        badge.className = badgeClass;
      }
      if (sub) {
        if (status === 'over') {
          sub.textContent = `Đã vượt ${Utils.formatCurrency(totalSpent - totalBudget)}`;
        } else if (status === 'warning') {
          sub.textContent = `Còn ${Utils.formatCurrency(totalBudget - totalSpent)} — chú ý chi tiêu`;
        } else {
          sub.textContent = `Còn ${Utils.formatCurrency(totalBudget - totalSpent)} để chi tiêu`;
        }
      }
    },

    /* ========================================================
       CATEGORY GRID
       ======================================================== */
    _renderCategoryGrid(budget, spentByCat) {
      const grid = document.getElementById('budgetGrid');
      const emptyEl = document.getElementById('budgetEmpty');
      const subEl = document.getElementById('budgetCatSub');
      if (!grid) return;

      const hasBudget = budget && budget.categories &&
        Object.keys(budget.categories).some(k => (budget.categories[k] || 0) > 0);

      // Nếu chưa có ngân sách → hiển thị empty
      if (!hasBudget) {
        grid.innerHTML = '';
        if (emptyEl) emptyEl.hidden = false;
        if (subEl) subEl.textContent = 'Chưa có dữ liệu';
        return;
      }

      if (emptyEl) emptyEl.hidden = true;

      // Đếm số danh mục có budget > 0 hoặc có chi tiêu
      let visibleCount = 0;
      EXPENSE_CATEGORIES.forEach(cat => {
        const b = Number(budget.categories[cat.key] || 0);
        const s = spentByCat[cat.key] || 0;
        if (b > 0 || s > 0) visibleCount++;
      });

      if (subEl) subEl.textContent = `${visibleCount} danh mục`;

      grid.innerHTML = '';
      const frag = document.createDocumentFragment();

      EXPENSE_CATEGORIES.forEach(cat => {
        const budgetAmt = Number(budget.categories[cat.key] || 0);
        const spent = spentByCat[cat.key] || 0;

        // Bỏ qua danh mục không có ngân sách và không có chi tiêu
        if (budgetAmt === 0 && spent === 0) return;

        const meta = Utils.categoryMeta(cat.key);
        const ratio = budgetAmt > 0 ? spent / budgetAmt : (spent > 0 ? 1.1 : 0);
        const percent = budgetAmt > 0 ? Math.min(Math.round(ratio * 100), 999) : (spent > 0 ? 100 : 0);
        const widthPct = Math.min(percent, 100);

        let statusClass = '';
        let remainText = '';
        let remainClass = '';

        if (budgetAmt > 0) {
          const remain = budgetAmt - spent;
          if (ratio >= 1) {
            statusClass = 'danger';
            remainText = `Vượt ${Utils.formatCurrency(Math.abs(remain))}`;
            remainClass = 'budget-item__remain--danger';
          } else if (ratio >= 0.7) {
            statusClass = 'warning';
            remainText = `Còn ${Utils.formatCurrency(remain)}`;
            remainClass = 'budget-item__remain--warning';
          } else {
            remainText = `Còn ${Utils.formatCurrency(remain)}`;
          }
        } else {
          remainText = `Chưa đặt ngân sách · Đã chi ${Utils.formatCurrency(spent)}`;
          statusClass = 'danger';
          remainClass = 'budget-item__remain--danger';
        }

        const item = document.createElement('div');
        item.className = 'budget-item';
        item.innerHTML = `
          <div class="budget-item__head">
            <div class="budget-item__cat">
              <span class="budget-item__icon">${meta.icon}</span>
              <span class="budget-item__name">${meta.name}</span>
            </div>
            <span class="budget-item__pct budget-item__pct--${statusClass}">${percent}%</span>
          </div>
          <div class="budget-item__amounts">
            <span class="budget-item__spent">${Utils.formatCurrency(spent)}</span>
            <span class="budget-item__budget">/ ${budgetAmt > 0 ? Utils.formatCurrency(budgetAmt) : '—'}</span>
          </div>
          <div class="progress">
            <div class="progress__bar progress__bar--${statusClass}" style="width:${widthPct}%"></div>
          </div>
          <div class="budget-item__remain ${remainClass}">${remainText}</div>
        `;
        frag.appendChild(item);
      });

      grid.appendChild(frag);
    },

    /* ========================================================
       MONTH SWITCH
       ======================================================== */
    _bindMonthSwitch() {
      const prev = document.getElementById('prevMonth');
      const next = document.getElementById('nextMonth');

      if (prev) {
        prev.addEventListener('click', () => {
          this._viewMonth = new Date(
            this._viewMonth.getFullYear(),
            this._viewMonth.getMonth() - 1,
            1
          );
          this.render();
        });
      }

      if (next) {
        next.addEventListener('click', () => {
          this._viewMonth = new Date(
            this._viewMonth.getFullYear(),
            this._viewMonth.getMonth() + 1,
            1
          );
          this.render();
        });
      }
    },

    /* ========================================================
       MODAL
       ======================================================== */
    _bindModal() {
      const modal = document.getElementById('budgetModal');
      if (!modal) return;

      modal.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-modal]')) this.closeModal();
      });

      const form = document.getElementById('budgetForm');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this._handleSubmit();
        });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) this.closeModal();
      });
    },

    _bindSetupButtons() {
      const openBtn = document.getElementById('openBudgetModal');
      const emptyBtn = document.getElementById('setupBudgetEmptyBtn');

      if (openBtn) openBtn.addEventListener('click', () => this.openModal());
      if (emptyBtn) emptyBtn.addEventListener('click', () => this.openModal());
    },

    openModal() {
      const modal = document.getElementById('budgetModal');
      const wrap = document.getElementById('budgetInputs');
      if (!modal || !wrap) return;

      const monthKey = this._monthKey();
      const budget = FinoraStorage.getBudget(monthKey) || { categories: {} };

      // Cập nhật hint
      const hint = document.getElementById('budgetModalHint');
      if (hint) {
        hint.textContent = `Nhập ngân sách cho từng danh mục trong ${this._monthLabel().toLowerCase()}. Để trống = không giới hạn.`;
      }

      // Render form
      wrap.innerHTML = '';
      EXPENSE_CATEGORIES.forEach(cat => {
        const meta = Utils.categoryMeta(cat.key);
        const val = Number(budget.categories[cat.key] || 0);

        const row = document.createElement('div');
        row.className = 'budget-input-row';
        row.innerHTML = `
          <span class="budget-input-row__icon">${meta.icon}</span>
          <span class="budget-input-row__name">${meta.name}</span>
          <div class="budget-input-row__input-wrap">
            <input
              type="text"
              inputmode="numeric"
              class="budget-input-row__input"
              data-cat="${cat.key}"
              placeholder="0"
              value="${val > 0 ? new Intl.NumberFormat('vi-VN').format(val) : ''}"
              autocomplete="off"
            >
            <span class="budget-input-row__suffix">₫</span>
          </div>
        `;
        wrap.appendChild(row);
      });

      // Bind input formatting
      wrap.querySelectorAll('input[data-cat]').forEach(inp => {
        inp.addEventListener('input', () => {
          const digits = inp.value.replace(/[^\d]/g, '');
          inp.value = digits ? new Intl.NumberFormat('vi-VN').format(digits) : '';
          this._updateFormTotal();
        });
      });

      this._updateFormTotal();

      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');

      if (window.lucide) window.lucide.createIcons();

      setTimeout(() => {
        const firstInput = wrap.querySelector('input[data-cat]');
        if (firstInput) firstInput.focus();
      }, 80);
    },

    closeModal() {
      const modal = document.getElementById('budgetModal');
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    },

    _updateFormTotal() {
      const wrap = document.getElementById('budgetInputs');
      const totalEl = document.getElementById('budgetFormTotal');
      if (!wrap || !totalEl) return;

      let total = 0;
      wrap.querySelectorAll('input[data-cat]').forEach(inp => {
        const raw = inp.value.replace(/[^\d]/g, '');
        total += Number(raw) || 0;
      });

      totalEl.textContent = Utils.formatCurrency(total);
    },

    _handleSubmit() {
      const wrap = document.getElementById('budgetInputs');
      const submitBtn = document.getElementById('budgetSubmit');
      if (!wrap || !submitBtn) return;

      const categories = {};
      wrap.querySelectorAll('input[data-cat]').forEach(inp => {
        const raw = inp.value.replace(/[^\d]/g, '');
        const val = Number(raw) || 0;
        if (val > 0) categories[inp.dataset.cat] = val;
      });

      // Nếu tất cả = 0 → coi như xóa ngân sách tháng này
      const monthKey = this._monthKey();

      submitBtn.classList.add('is-loading');
      const submitText = submitBtn.querySelector('span');
      const originalText = submitText ? submitText.textContent : '';
      if (submitText) submitText.textContent = 'Đang lưu...';

      setTimeout(() => {
        let ok = false;

        if (Object.keys(categories).length === 0) {
          ok = FinoraStorage.deleteBudget(monthKey);
          if (ok) Utils.toast('Đã xóa ngân sách tháng này');
        } else {
          ok = FinoraStorage.setBudget(monthKey, { categories });
          if (ok) Utils.toast('✓ Đã lưu ngân sách');
        }

        submitBtn.classList.remove('is-loading');
        if (submitText) submitText.textContent = originalText;

        if (ok) {
          this.closeModal();
          this.render();
        } else {
          Utils.toast('Không thể lưu ngân sách. Vui lòng thử lại.', 'error');
        }
      }, 280);
    }
  };

  global.FinoraBudget = Budget;
})(window);