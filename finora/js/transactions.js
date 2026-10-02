/* ============================================================
   FINORA — TRANSACTIONS
   Trang quản lý giao dịch: Add / Edit / Delete / Search / Filter.
   ============================================================ */
(function (global) {
  'use strict';

  const CATEGORIES = {
    income: [
      { key: 'salary', name: 'Lương' },
      { key: 'bonus',  name: 'Thưởng' },
      { key: 'other',  name: 'Thu nhập khác' }
    ],
    expense: [
      { key: 'food',      name: 'Ăn uống' },
      { key: 'transport', name: 'Đi lại' },
      { key: 'education', name: 'Học tập' },
      { key: 'fun',       name: 'Giải trí' },
      { key: 'shopping',  name: 'Mua sắm' },
      { key: 'health',    name: 'Sức khỏe' },
      { key: 'housing',   name: 'Nhà ở' },
      { key: 'other',     name: 'Khác' }
    ]
  };

  const Transactions = {

    _editingId: null,
    _deletingId: null,

    /* ========================================================
       INIT
       ======================================================== */
    init() {
      this._bindFilters();
      this._bindTableActions();
      this._bindModal();
      this._bindConfirmModal();
      this._populateCategoryFilter();
      this.render();
    },

    /* ========================================================
       RENDER
       ======================================================== */
    render() {
      const all = FinoraStorage.getTransactions();
      const filtered = this._applyFilters(all);

      this._renderTable(filtered);
      this._renderCards(filtered);
      this._updateSummary(filtered, all);
      this._toggleEmpty(filtered, all);

      if (window.lucide) window.lucide.createIcons();
    },

    /* ========================================================
       FILTER + SORT
       ======================================================== */
    _getFilterState() {
      return {
        q: (document.getElementById('txSearch')?.value || '').trim().toLowerCase(),
        type: document.getElementById('filterType')?.value || 'all',
        category: document.getElementById('filterCategory')?.value || 'all',
        range: document.getElementById('filterRange')?.value || 'all',
        sort: document.getElementById('sortBy')?.value || 'date-desc'
      };
    },

    _applyFilters(list) {
      const f = this._getFilterState();
      const now = new Date();
      let out = list.slice();

      // Search
      if (f.q) {
        out = out.filter(tx => {
          const note = (tx.note || '').toLowerCase();
          const cat = Utils.categoryMeta(tx.category).name.toLowerCase();
          return note.includes(f.q) || cat.includes(f.q);
        });
      }

      // Type
      if (f.type !== 'all') out = out.filter(tx => tx.type === f.type);

      // Category
      if (f.category !== 'all') out = out.filter(tx => tx.category === f.category);

      // Range
      if (f.range !== 'all') {
        let minDate = null;
        if (f.range === 'thisMonth') {
          minDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
          const days = { '7d': 7, '30d': 30, '3m': 90, '1y': 365 }[f.range];
          if (days) {
            minDate = new Date(now);
            minDate.setDate(minDate.getDate() - days);
          }
        }
        if (minDate) {
          out = out.filter(tx => new Date(tx.date) >= minDate);
        }
      }

      // Sort
      out.sort((a, b) => {
        switch (f.sort) {
          case 'date-asc':    return new Date(a.date) - new Date(b.date);
          case 'amount-desc': return (Number(b.amount) || 0) - (Number(a.amount) || 0);
          case 'amount-asc':  return (Number(a.amount) || 0) - (Number(b.amount) || 0);
          case 'date-desc':
          default:
            return new Date(b.date) - new Date(a.date);
        }
      });

      return out;
    },

    _bindFilters() {
      const search = document.getElementById('txSearch');
      const type   = document.getElementById('filterType');
      const cat    = document.getElementById('filterCategory');
      const range  = document.getElementById('filterRange');
      const sort   = document.getElementById('sortBy');
      const clear  = document.getElementById('clearFilters');

      if (search) {
        const debounced = Utils.debounce(() => this.render(), 180);
        search.addEventListener('input', debounced);
      }

      [type, cat, range, sort].forEach(el => {
        if (el) el.addEventListener('change', () => this.render());
      });

      if (clear) {
        clear.addEventListener('click', () => {
          if (search) search.value = '';
          if (type)  type.value = 'all';
          if (cat)   cat.value = 'all';
          if (range) range.value = 'all';
          if (sort)  sort.value = 'date-desc';
          this.render();
        });
      }
    },

    _populateCategoryFilter() {
      const sel = document.getElementById('filterCategory');
      if (!sel) return;

      sel.innerHTML = '<option value="all">Tất cả</option>';

      const all = [...CATEGORIES.expense, ...CATEGORIES.income];
      const seen = new Set();
      all.forEach(c => {
        if (seen.has(c.key)) return;
        seen.add(c.key);
        const opt = document.createElement('option');
        opt.value = c.key;
        opt.textContent = Utils.categoryMeta(c.key).name;
        sel.appendChild(opt);
      });
    },

    /* ========================================================
       TABLE (desktop)
       ======================================================== */
    _renderTable(list) {
      const tbody = document.getElementById('txTableBody');
      if (!tbody) return;

      tbody.innerHTML = '';

      list.forEach(tx => {
        const meta = Utils.categoryMeta(tx.category);
        const isIncome = tx.type === 'income';
        const sign = isIncome ? '+' : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="tx-cat">
              <span class="tx-cat__icon">${meta.icon}</span>
              <span>${meta.name}</span>
            </div>
          </td>
          <td><div class="tx-note">${this._escape(tx.note) || '—'}</div></td>
          <td><span class="tx-date">${Utils.formatDate(tx.date)}</span></td>
          <td class="ta-right">
            <span class="tx-amount tx-amount--${isIncome ? 'income' : 'expense'}">
              ${sign}${Utils.formatCurrency(tx.amount).trim()}
            </span>
          </td>
          <td class="ta-right">
            <div class="tx-actions">
              <button class="tx-action" type="button" aria-label="Sửa giao dịch"
                      data-edit="${tx.id}">
                <i data-lucide="pencil" aria-hidden="true"></i>
              </button>
              <button class="tx-action tx-action--delete" type="button" aria-label="Xóa giao dịch"
                      data-delete="${tx.id}">
                <i data-lucide="trash-2" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    },

    /* ========================================================
       CARDS (mobile)
       ======================================================== */
    _renderCards(list) {
      const wrap = document.getElementById('txCards');
      if (!wrap) return;

      wrap.innerHTML = '';

      list.forEach(tx => {
        const meta = Utils.categoryMeta(tx.category);
        const isIncome = tx.type === 'income';
        const sign = isIncome ? '+' : '-';

        const card = document.createElement('div');
        card.className = 'tx-card';
        card.innerHTML = `
          <div class="tx-card__icon">${meta.icon}</div>
          <div class="tx-card__main">
            <div class="tx-card__name">${this._escape(tx.note) || meta.name}</div>
            <div class="tx-card__meta">${meta.name} · ${Utils.formatDate(tx.date)}</div>
          </div>
          <div class="tx-card__right">
            <div class="tx-card__amount tx-card__amount--${isIncome ? 'income' : 'expense'}">
              ${sign}${Utils.formatCurrency(tx.amount).trim()}
            </div>
            <div class="tx-card__actions">
              <button class="tx-action" type="button" aria-label="Sửa giao dịch"
                      data-edit="${tx.id}">
                <i data-lucide="pencil" aria-hidden="true"></i>
              </button>
              <button class="tx-action tx-action--delete" type="button" aria-label="Xóa giao dịch"
                      data-delete="${tx.id}">
                <i data-lucide="trash-2" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        `;
        wrap.appendChild(card);
      });
    },

    /* ========================================================
       SUMMARY + EMPTY
       ======================================================== */
    _updateSummary(filtered, all) {
      const el = document.getElementById('txSummary');
      if (!el) return;

      if (all.length === 0) {
        el.textContent = 'Chưa có giao dịch nào';
        return;
      }

      let inc = 0, exp = 0;
      filtered.forEach(tx => {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income')  inc += amt;
        else                       exp += amt;
      });

      const count = filtered.length;
      el.textContent = `${count} giao dịch · Thu ${Utils.formatCurrency(inc)} · Chi ${Utils.formatCurrency(exp)}`;
    },

    _toggleEmpty(filtered, all) {
      const empty = document.getElementById('txEmpty');
      const table = document.getElementById('txTable');
      const cards = document.getElementById('txCards');
      const title = document.getElementById('txEmptyTitle');
      const desc  = document.getElementById('txEmptyDesc');

      if (!empty) return;

      if (filtered.length === 0) {
        empty.hidden = false;
        if (table) table.style.display = 'none';
        if (cards) cards.style.display = 'none';

        if (all.length === 0) {
          title.textContent = 'Chưa có giao dịch';
          desc.textContent  = 'Thêm giao dịch đầu tiên để bắt đầu theo dõi tài chính.';
        } else {
          title.textContent = 'Không tìm thấy giao dịch';
          desc.textContent  = 'Thử thay đổi từ khóa hoặc bộ lọc để xem kết quả khác.';
        }
      } else {
        empty.hidden = true;
        if (table) table.style.display = '';
        if (cards) cards.style.display = '';
      }
    },

    /* ========================================================
       ACTIONS (edit / delete từ bảng)
       ======================================================== */
    _bindTableActions() {
      document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit]');
        if (editBtn) {
          e.preventDefault();
          this.openEdit(editBtn.dataset.edit);
          return;
        }

        const delBtn = e.target.closest('[data-delete]');
        if (delBtn) {
          e.preventDefault();
          this.openConfirmDelete(delBtn.dataset.delete);
          return;
        }
      });
    },

    /* ========================================================
       MODAL ADD / EDIT
       ======================================================== */
    _bindModal() {
      const modal = document.getElementById('txModal');
      if (!modal) return;

      // Close buttons
      modal.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-modal]')) this.closeModal();
      });

      // Type toggle
      const typeToggle = modal.querySelector('.type-toggle');
      if (typeToggle) {
        typeToggle.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-type]');
          if (!btn) return;
          this._setFormType(btn.dataset.type);
        });
      }

      // Amount input: chỉ cho số
      const amount = document.getElementById('txAmount');
      if (amount) {
        amount.addEventListener('input', () => {
          const digits = amount.value.replace(/[^\d]/g, '');
          amount.value = digits ? new Intl.NumberFormat('vi-VN').format(digits) : '';
        });
      }

      // Submit
      const form = document.getElementById('txForm');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this._handleSubmit();
        });
      }

      // ESC để đóng
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) this.closeModal();
      });
    },

    openAdd() {
      this._editingId = null;
      this._resetForm();
      this._setFormType('expense');
      this._setModalTitle('Thêm giao dịch');
      document.getElementById('txSubmitText').textContent = 'Lưu giao dịch';
      this._showModal();
    },

    openEdit(id) {
      const tx = FinoraStorage.getTransaction(id);
      if (!tx) {
        Utils.toast('Không tìm thấy giao dịch', 'error');
        return;
      }

      this._editingId = id;
      this._setFormType(tx.type);
      document.getElementById('txId').value = tx.id;
      document.getElementById('txAmount').value = new Intl.NumberFormat('vi-VN').format(tx.amount);
      document.getElementById('txCategory').value = tx.category;
      document.getElementById('txDate').value = tx.date;
      document.getElementById('txNote').value = tx.note || '';

      this._setModalTitle('Sửa giao dịch');
      document.getElementById('txSubmitText').textContent = 'Cập nhật';
      this._showModal();
    },

    _setFormType(type) {
      const modal = document.getElementById('txModal');
      if (!modal) return;

      modal.querySelectorAll('.type-toggle button').forEach(b => {
        const active = b.dataset.type === type;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      this._populateFormCategories(type);
    },

    _populateFormCategories(type) {
      const sel = document.getElementById('txCategory');
      if (!sel) return;

      const list = CATEGORIES[type] || CATEGORIES.expense;
      const current = sel.value;

      sel.innerHTML = '';
      list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.key;
        opt.textContent = Utils.categoryMeta(c.key).name;
        sel.appendChild(opt);
      });

      // Giữ lại value cũ nếu vẫn tồn tại
      if (list.some(c => c.key === current)) sel.value = current;
    },

    _resetForm() {
      document.getElementById('txId').value = '';
      document.getElementById('txAmount').value = '';
      document.getElementById('txDate').value = Utils.toISODate(new Date());
      document.getElementById('txNote').value = '';

      // Ẩn lỗi
      ['errAmount', 'errCategory', 'errDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.hidden = true; el.textContent = ''; }
      });

      ['txAmount', 'txCategory', 'txDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.removeAttribute('aria-invalid');
      });
    },

    _setModalTitle(text) {
      const el = document.getElementById('txModalTitle');
      if (el) el.textContent = text;
    },

    _showModal() {
      const modal = document.getElementById('txModal');
      if (!modal) return;

      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');

      if (window.lucide) window.lucide.createIcons();

      setTimeout(() => {
        const amount = document.getElementById('txAmount');
        if (amount) amount.focus();
      }, 60);
    },

    closeModal() {
      const modal = document.getElementById('txModal');
      if (!modal) return;

      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    },

    /* ========================================================
       SUBMIT
       ======================================================== */
    _handleSubmit() {
      if (!this._validateForm()) return;

      const submitBtn = document.getElementById('txSubmit');
      const submitText = document.getElementById('txSubmitText');
      const originalText = submitText.textContent;

      submitBtn.classList.add('is-loading');
      submitText.textContent = 'Đang lưu...';

      const activeType = document.querySelector('#txModal .type-toggle button.is-active');
      const type = activeType ? activeType.dataset.type : 'expense';

      const amountRaw = document.getElementById('txAmount').value.replace(/[^\d]/g, '');
      const data = {
        type,
        amount: Number(amountRaw),
        category: document.getElementById('txCategory').value,
        date: document.getElementById('txDate').value,
        note: document.getElementById('txNote').value.trim()
      };

      // Giả lập loading ngắn để có micro-interaction
      setTimeout(() => {
        let ok = false;

        if (this._editingId) {
          ok = !!FinoraStorage.updateTransaction(this._editingId, data);
          if (ok) Utils.toast('✓ Đã cập nhật giao dịch');
          else    Utils.toast('Không thể cập nhật. Vui lòng thử lại.', 'error');
        } else {
          const tx = FinoraStorage.addTransaction(data);
          ok = !!tx;
          if (ok) Utils.toast('✓ Đã thêm giao dịch');
          else    Utils.toast('Không thể lưu dữ liệu. Vui lòng thử lại.', 'error');
        }

        submitBtn.classList.remove('is-loading');
        submitText.textContent = originalText;

        if (ok) {
          this.closeModal();
          this.render();
          // Cập nhật dashboard nếu đang cache
          if (global.FinoraDashboard) global.FinoraDashboard.render();
        }
      }, 280);
    },

    _validateForm() {
      let valid = true;

      // Amount
      const amountEl = document.getElementById('txAmount');
      const amountRaw = amountEl.value.replace(/[^\d]/g, '');
      const errAmount = document.getElementById('errAmount');
      if (!amountRaw || Number(amountRaw) <= 0) {
        amountEl.setAttribute('aria-invalid', 'true');
        errAmount.textContent = 'Vui lòng nhập số tiền lớn hơn 0.';
        errAmount.hidden = false;
        valid = false;
      } else {
        amountEl.removeAttribute('aria-invalid');
        errAmount.hidden = true;
      }

      // Category
      const catEl = document.getElementById('txCategory');
      const errCat = document.getElementById('errCategory');
      if (!catEl.value) {
        catEl.setAttribute('aria-invalid', 'true');
        errCat.textContent = 'Vui lòng chọn danh mục.';
        errCat.hidden = false;
        valid = false;
      } else {
        catEl.removeAttribute('aria-invalid');
        errCat.hidden = true;
      }

      // Date
      const dateEl = document.getElementById('txDate');
      const errDate = document.getElementById('errDate');
      if (!dateEl.value || isNaN(new Date(dateEl.value))) {
        dateEl.setAttribute('aria-invalid', 'true');
        errDate.textContent = 'Ngày không hợp lệ.';
        errDate.hidden = false;
        valid = false;
      } else {
        dateEl.removeAttribute('aria-invalid');
        errDate.hidden = true;
      }

      return valid;
    },

    /* ========================================================
       CONFIRM DELETE
       ======================================================== */
    _bindConfirmModal() {
      const modal = document.getElementById('confirmModal');
      if (!modal) return;

      modal.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-modal]')) this.closeConfirm();
      });

      const delBtn = document.getElementById('confirmDelete');
      if (delBtn) {
        delBtn.addEventListener('click', () => this._doDelete());
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) this.closeConfirm();
      });
    },

    openConfirmDelete(id) {
      const tx = FinoraStorage.getTransaction(id);
      if (!tx) return;

      this._deletingId = id;
      const modal = document.getElementById('confirmModal');
      const desc = document.getElementById('confirmDesc');
      const meta = Utils.categoryMeta(tx.category);

      if (desc) {
        desc.textContent = `Bạn có chắc muốn xóa "${tx.note || meta.name}"? Hành động này không thể hoàn tác.`;
      }

      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');

      if (window.lucide) window.lucide.createIcons();
      setTimeout(() => {
        const btn = document.getElementById('confirmDelete');
        if (btn) btn.focus();
      }, 60);
    },

    closeConfirm() {
      const modal = document.getElementById('confirmModal');
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      this._deletingId = null;
    },

    _doDelete() {
      if (!this._deletingId) return;

      const ok = FinoraStorage.deleteTransaction(this._deletingId);
      this.closeConfirm();

      if (ok) {
        Utils.toast('Đã xóa giao dịch');
        this.render();
        if (global.FinoraDashboard) global.FinoraDashboard.render();
      } else {
        Utils.toast('Không thể xóa giao dịch. Vui lòng thử lại.', 'error');
      }
    },

    /* ========================================================
       HELPER
       ======================================================== */
    _escape(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  };

  global.FinoraTransactions = Transactions;
})(window);