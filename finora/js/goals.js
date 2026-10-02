/* ============================================================
   FINORA — GOALS (PHASE 5)
   Mục tiêu tiết kiệm: tạo / sửa / xóa / cập nhật tiền.
   ============================================================ */
(function (global) {
  'use strict';

  const ICONS = ['🎯','💻','✈️','🏠','🚗','📱','🎓','💍','🛡️','🎁','💰','🏖️','⌚','📷','🎸','🏋️'];
  const COLORS = ['#16A779','#4A9DEC','#8B7DF3','#EF6464','#EC7FB4','#52C5B2','#F3AD46','#F97316'];

  const Goals = {

    _editingId: null,
    _updatingId: null,
    _deletingId: null,
    _selectedIcon: '🎯',
    _selectedColor: '#16A779',

    /* ========================================================
       INIT
       ======================================================== */
    init() {
      this._renderIconPicker();
      this._renderColorPicker();
      this._bindGoalModal();
      this._bindUpdateModal();
      this._bindConfirmModal();
      this._bindButtons();
      this.render();
    },

    /* ========================================================
       RENDER
       ======================================================== */
    render() {
      const goals = FinoraStorage.getGoals();
      this._renderStats(goals);
      this._renderGrid(goals);
      if (window.lucide) window.lucide.createIcons();
    },

    _renderStats(goals) {
      const total = goals.length;
      const totalSaved = goals.reduce((s, g) => s + (Number(g.saved) || 0), 0);
      const totalTarget = goals.reduce((s, g) => s + (Number(g.target) || 0), 0);
      const completed = goals.filter(g => (Number(g.saved) || 0) >= (Number(g.target) || 0) && g.target > 0).length;

      // Total count
      const countEl = document.getElementById('goalsTotalCount');
      if (countEl) countEl.textContent = total;

      const totalMeta = document.getElementById('goalsTotalMeta');
      if (totalMeta) {
        totalMeta.textContent = totalTarget > 0
          ? `Tổng mục tiêu ${Utils.formatCurrency(totalTarget)}`
          : 'Chưa có mục tiêu';
      }

      // Saved total
      Utils.countUp(document.getElementById('goalsSavedTotal'), totalSaved);
      const savedMeta = document.getElementById('goalsSavedMeta');
      if (savedMeta) {
        const pct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
        savedMeta.textContent = totalTarget > 0 ? `${pct}% tổng mục tiêu` : '—';
      }

      // Completed
      const compEl = document.getElementById('goalsCompleted');
      if (compEl) compEl.textContent = completed;

      const compMeta = document.getElementById('goalsCompletedMeta');
      if (compMeta) {
        compMeta.textContent = total > 0 ? `Trên ${total} mục tiêu` : '—';
      }

      // Subtitle
      const sub = document.getElementById('goalsSubtitle');
      if (sub) {
        sub.textContent = total > 0
          ? `${completed}/${total} mục tiêu đã hoàn thành`
          : 'Bắt đầu hành trình tiết kiệm';
      }
    },

    _renderGrid(goals) {
      const grid = document.getElementById('goalsGrid');
      const empty = document.getElementById('goalsEmpty');
      if (!grid) return;

      if (goals.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.hidden = false;
        return;
      }
      if (empty) empty.hidden = true;

      grid.innerHTML = '';
      const frag = document.createDocumentFragment();

      goals.forEach(goal => {
        const card = this._buildCard(goal);
        frag.appendChild(card);
      });
      grid.appendChild(frag);
    },

    _buildCard(goal) {
      const target = Number(goal.target) || 0;
      const saved = Number(goal.saved) || 0;
      const remain = Math.max(target - saved, 0);
      const pct = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0;
      const isDone = target > 0 && saved >= target;

      // Deadline
      let deadlineHtml = '';
      if (goal.deadline) {
        const d = new Date(goal.deadline);
        const now = new Date();
        const days = Math.ceil((d - now) / 86400000);
        let tone = '';
        let text = `Còn ${days} ngày`;
        if (isDone) text = 'Đã hoàn thành';
        else if (days < 0) { tone = 'danger'; text = `Quá hạn ${Math.abs(days)} ngày`; }
        else if (days <= 7) { tone = 'warning'; text = `Còn ${days} ngày`; }

        deadlineHtml = `
          <div class="goal-card__deadline goal-card__deadline--${tone}">
            <i data-lucide="calendar" aria-hidden="true"></i>
            <span>${text}</span>
          </div>
        `;
      }

      const card = document.createElement('div');
      card.className = 'goal-card' + (isDone ? ' goal-card--done' : '');
      card.innerHTML = `
        ${isDone ? `
          <div class="goal-card__done-badge">
            <i data-lucide="check" aria-hidden="true"></i>
            <span>Hoàn thành</span>
          </div>
        ` : ''}

        <div class="goal-card__head">
          <div class="goal-card__icon" style="background:${this._withAlpha(goal.color, 0.15)};color:${goal.color}">${goal.icon || '🎯'}</div>
          <div class="goal-card__info">
            <div class="goal-card__name">${this._esc(goal.name)}</div>
            ${deadlineHtml}
          </div>
        </div>

        <div class="goal-card__amounts">
          <div>
            <div class="goal-card__amounts-label">Đã có</div>
            <div class="goal-card__amounts-value goal-card__amounts-value--primary">${Utils.formatCurrency(saved)}</div>
          </div>
          <div>
            <div class="goal-card__amounts-label">Mục tiêu</div>
            <div class="goal-card__amounts-value">${Utils.formatCurrency(target)}</div>
          </div>
        </div>

        <div>
          <div class="progress">
            <div class="progress__bar" style="width:${pct}%;background:${goal.color || 'var(--primary)'}"></div>
          </div>
          <div class="goal-card__progress-text">
            <strong>${pct}%</strong>
            <span>${isDone ? 'Hoàn thành 🎉' : `Còn ${Utils.formatCurrency(remain)}`}</span>
          </div>
        </div>

        <div class="goal-card__actions">
          <button class="goal-card__action" type="button" data-update="${goal.id}" aria-label="Cập nhật tiền">
            <i data-lucide="plus-circle" aria-hidden="true"></i>
            <span>Thêm tiền</span>
          </button>
          <button class="goal-card__action" type="button" data-edit="${goal.id}" aria-label="Sửa mục tiêu">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
          <button class="goal-card__action goal-card__action--danger" type="button" data-delete="${goal.id}" aria-label="Xóa mục tiêu">
            <i data-lucide="trash-2" aria-hidden="true"></i>
          </button>
        </div>
      `;
      return card;
    },

    _withAlpha(hex, alpha) {
      if (!hex || !hex.startsWith('#')) return 'var(--primary-soft)';
      const h = hex.replace('#', '');
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    },

    _esc(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    /* ========================================================
       ICON + COLOR PICKER
       ======================================================== */
    _renderIconPicker() {
      const wrap = document.getElementById('iconPicker');
      if (!wrap) return;
      wrap.innerHTML = '';
      ICONS.forEach(icon => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = icon;
        btn.dataset.icon = icon;
        btn.addEventListener('click', () => {
          this._selectedIcon = icon;
          wrap.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b === btn));
        });
        if (icon === this._selectedIcon) btn.classList.add('is-active');
        wrap.appendChild(btn);
      });
    },

    _renderColorPicker() {
      const wrap = document.getElementById('colorPicker');
      if (!wrap) return;
      wrap.innerHTML = '';
      COLORS.forEach(color => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.background = color;
        btn.dataset.color = color;
        btn.addEventListener('click', () => {
          this._selectedColor = color;
          wrap.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b === btn));
        });
        if (color === this._selectedColor) btn.classList.add('is-active');
        wrap.appendChild(btn);
      });
    },

    _setIconActive(icon) {
      this._selectedIcon = icon;
      const wrap = document.getElementById('iconPicker');
      if (!wrap) return;
      wrap.querySelectorAll('button').forEach(b => {
        b.classList.toggle('is-active', b.dataset.icon === icon);
      });
    },

    _setColorActive(color) {
      this._selectedColor = color;
      const wrap = document.getElementById('colorPicker');
      if (!wrap) return;
      wrap.querySelectorAll('button').forEach(b => {
        b.classList.toggle('is-active', b.dataset.color === color);
      });
    },

    /* ========================================================
       BIND BUTTONS
       ======================================================== */
    _bindButtons() {
      // Global open button
      const openBtn = document.getElementById('openGoalModal');
      const emptyBtn = document.getElementById('createGoalEmptyBtn');
      if (openBtn) openBtn.addEventListener('click', () => this.openAdd());
      if (emptyBtn) emptyBtn.addEventListener('click', () => this.openAdd());

      // Card action buttons (event delegation)
      document.addEventListener('click', (e) => {
        const edit = e.target.closest('[data-edit]');
        if (edit && edit.dataset.edit.startsWith('goal_')) {
          this.openEdit(edit.dataset.edit);
          return;
        }
        const upd = e.target.closest('[data-update]');
        if (upd && upd.dataset.update.startsWith('goal_')) {
          this.openUpdate(upd.dataset.update);
          return;
        }
        const del = e.target.closest('[data-delete]');
        if (del && del.dataset.delete.startsWith('goal_')) {
          this.openConfirmDelete(del.dataset.delete);
          return;
        }
      });
    },

    /* ========================================================
       MODAL TẠO / SỬA
       ======================================================== */
    _bindGoalModal() {
      const modal = document.getElementById('goalModal');
      if (!modal) return;

      modal.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-modal]')) this.closeModal();
      });

      // Auto format số tiền
      ['goalTarget', 'goalSaved'].forEach(id => {
        const inp = document.getElementById(id);
        if (!inp) return;
        inp.addEventListener('input', () => {
          const digits = inp.value.replace(/[^\d]/g, '');
          inp.value = digits ? new Intl.NumberFormat('vi-VN').format(digits) : '';
        });
      });

      const form = document.getElementById('goalForm');
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

    openAdd() {
      this._editingId = null;
      this._resetForm();
      this._setIconActive('🎯');
      this._setColorActive('#16A779');
      document.getElementById('goalModalTitle').textContent = 'Tạo mục tiêu';
      document.getElementById('goalSubmitText').textContent = 'Tạo mục tiêu';
      this._showModal();
    },

    openEdit(id) {
      const goal = FinoraStorage.getGoal(id);
      if (!goal) return;

      this._editingId = id;
      document.getElementById('goalId').value = id;
      document.getElementById('goalName').value = goal.name || '';
      document.getElementById('goalTarget').value = goal.target
        ? new Intl.NumberFormat('vi-VN').format(goal.target) : '';
      document.getElementById('goalSaved').value = goal.saved
        ? new Intl.NumberFormat('vi-VN').format(goal.saved) : '';
      document.getElementById('goalDeadline').value = goal.deadline || '';

      this._setIconActive(goal.icon || '🎯');
      this._setColorActive(goal.color || '#16A779');

      document.getElementById('goalModalTitle').textContent = 'Sửa mục tiêu';
      document.getElementById('goalSubmitText').textContent = 'Cập nhật';
      this._showModal();
    },

    _resetForm() {
      document.getElementById('goalId').value = '';
      document.getElementById('goalName').value = '';
      document.getElementById('goalTarget').value = '';
      document.getElementById('goalSaved').value = '';
      document.getElementById('goalDeadline').value = '';

      ['errGoalName', 'errGoalTarget'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.hidden = true; el.textContent = ''; }
      });
      ['goalName', 'goalTarget'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.removeAttribute('aria-invalid');
      });
    },

    _showModal() {
      const modal = document.getElementById('goalModal');
      if (!modal) return;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (window.lucide) window.lucide.createIcons();
      setTimeout(() => {
        const inp = document.getElementById('goalName');
        if (inp) inp.focus();
      }, 80);
    },

    closeModal() {
      const modal = document.getElementById('goalModal');
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    },

    _handleSubmit() {
      // Validate
      let valid = true;
      const nameEl = document.getElementById('goalName');
      const targetEl = document.getElementById('goalTarget');
      const errName = document.getElementById('errGoalName');
      const errTarget = document.getElementById('errGoalTarget');

      if (!nameEl.value.trim()) {
        nameEl.setAttribute('aria-invalid', 'true');
        errName.textContent = 'Vui lòng nhập tên mục tiêu.';
        errName.hidden = false;
        valid = false;
      } else {
        nameEl.removeAttribute('aria-invalid');
        errName.hidden = true;
      }

      const targetRaw = targetEl.value.replace(/[^\d]/g, '');
      if (!targetRaw || Number(targetRaw) <= 0) {
        targetEl.setAttribute('aria-invalid', 'true');
        errTarget.textContent = 'Số tiền mục tiêu phải lớn hơn 0.';
        errTarget.hidden = false;
        valid = false;
      } else {
        targetEl.removeAttribute('aria-invalid');
        errTarget.hidden = true;
      }

      if (!valid) return;

      const submitBtn = document.getElementById('goalSubmit');
      const submitText = document.getElementById('goalSubmitText');
      const originalText = submitText.textContent;

      submitBtn.classList.add('is-loading');
      submitText.textContent = 'Đang lưu...';

      const savedRaw = document.getElementById('goalSaved').value.replace(/[^\d]/g, '');
      const data = {
        name: nameEl.value.trim(),
        target: Number(targetRaw),
        saved: Number(savedRaw) || 0,
        deadline: document.getElementById('goalDeadline').value || null,
        icon: this._selectedIcon,
        color: this._selectedColor
      };

      setTimeout(() => {
        let ok = false;
        if (this._editingId) {
          ok = !!FinoraStorage.updateGoal(this._editingId, data);
          if (ok) Utils.toast('✓ Đã cập nhật mục tiêu');
        } else {
          ok = !!FinoraStorage.addGoal(data);
          if (ok) Utils.toast('✓ Đã tạo mục tiêu');
        }

        submitBtn.classList.remove('is-loading');
        submitText.textContent = originalText;

        if (ok) {
          this.closeModal();
          this.render();
        } else {
          Utils.toast('Không thể lưu. Vui lòng thử lại.', 'error');
        }
      }, 250);
    },

    /* ========================================================
       MODAL UPDATE MONEY
       ======================================================== */
    _bindUpdateModal() {
      const modal = document.getElementById('goalUpdateModal');
      if (!modal) return;

      modal.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-modal]')) this.closeUpdateModal();
      });

      const amountInp = document.getElementById('goalUpdateAmount');
      if (amountInp) {
        amountInp.addEventListener('input', () => {
          const digits = amountInp.value.replace(/[^\d]/g, '');
          amountInp.value = digits ? new Intl.NumberFormat('vi-VN').format(digits) : '';
        });
        amountInp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); this._applyMoney(1); }
        });
      }

      const addBtn = document.getElementById('btnAddMoney');
      const wdBtn = document.getElementById('btnWithdrawMoney');
      if (addBtn) addBtn.addEventListener('click', () => this._applyMoney(1));
      if (wdBtn) wdBtn.addEventListener('click', () => this._applyMoney(-1));

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) this.closeUpdateModal();
      });
    },

    openUpdate(id) {
      const goal = FinoraStorage.getGoal(id);
      if (!goal) return;

      this._updatingId = id;

      const iconEl = document.getElementById('updateGoalIcon');
      const nameEl = document.getElementById('updateGoalName');
      const metaEl = document.getElementById('updateGoalMeta');

      if (iconEl) {
        iconEl.textContent = goal.icon || '🎯';
        iconEl.style.background = this._withAlpha(goal.color, 0.15);
      }
      if (nameEl) nameEl.textContent = goal.name;
      if (metaEl) {
        metaEl.textContent = `${Utils.formatCurrency(goal.saved)} / ${Utils.formatCurrency(goal.target)}`;
      }

      document.getElementById('goalUpdateAmount').value = '';
      document.getElementById('goalUpdateId').value = id;

      const modal = document.getElementById('goalUpdateModal');
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (window.lucide) window.lucide.createIcons();
      setTimeout(() => document.getElementById('goalUpdateAmount').focus(), 80);
    },

    closeUpdateModal() {
      const modal = document.getElementById('goalUpdateModal');
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      this._updatingId = null;
    },

    _applyMoney(sign) {
      if (!this._updatingId) return;

      const goal = FinoraStorage.getGoal(this._updatingId);
      if (!goal) return;

      const raw = document.getElementById('goalUpdateAmount').value.replace(/[^\d]/g, '');
      const amount = Number(raw);
      if (!amount || amount <= 0) {
        Utils.toast('Vui lòng nhập số tiền hợp lệ', 'error');
        return;
      }

      const newSaved = Math.max(0, (Number(goal.saved) || 0) + sign * amount);
      const ok = FinoraStorage.updateGoal(this._updatingId, { saved: newSaved });

      if (ok) {
        Utils.toast(sign > 0 ? `✓ Đã thêm ${Utils.formatCurrency(amount)}` : `✓ Đã rút ${Utils.formatCurrency(amount)}`);
        this.closeUpdateModal();
        this.render();
      } else {
        Utils.toast('Không thể cập nhật. Vui lòng thử lại.', 'error');
      }
    },

    /* ========================================================
       MODAL CONFIRM DELETE
       ======================================================== */
    _bindConfirmModal() {
      const modal = document.getElementById('confirmModal');
      if (!modal) return;
      // Reuse confirm modal của Transactions nếu đã bind, hoặc bind riêng
      // Ở đây dùng chung modal confirmModal.
    },

    openConfirmDelete(id) {
      const goal = FinoraStorage.getGoal(id);
      if (!goal) return;

      this._deletingId = id;

      const title = document.getElementById('confirmTitle');
      const desc = document.getElementById('confirmDesc');
      const btn = document.getElementById('confirmDelete');

      if (title) title.textContent = 'Xóa mục tiêu?';
      if (desc) desc.textContent = `Bạn có chắc muốn xóa "${goal.name}"? Hành động này không thể hoàn tác.`;

      // Đổi handler (off rồi on)
      const modal = document.getElementById('confirmModal');
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');

      // Gán lại handler tạm thời
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => this._doDelete());

      if (window.lucide) window.lucide.createIcons();
    },

    _doDelete() {
      if (!this._deletingId) return;

      const ok = FinoraStorage.deleteGoal(this._deletingId);

      const modal = document.getElementById('confirmModal');
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      this._deletingId = null;

      if (ok) {
        Utils.toast('Đã xóa mục tiêu');
        this.render();
      } else {
        Utils.toast('Không thể xóa. Vui lòng thử lại.', 'error');
      }
    }
  };

  global.FinoraGoals = Goals;
})(window);