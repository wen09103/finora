/* ============================================================
   FINORA — DASHBOARD
   Stats theo THÁNG hiện tại + banner thông báo tháng mới.
   ============================================================ */
(function (global) {
  'use strict';

  const Dashboard = {

    _range: '7d',

    render() {
      const txs = FinoraStorage.getTransactions();
      this.renderMonthBanner();
      this.renderStats(txs);
      this.renderChart(txs, this._range);
      this.renderDonut(txs);
      this.renderRecent(txs);
      if (window.lucide) window.lucide.createIcons();
    },

    /* ========================================================
       BANNER THÁNG MỚI
       ======================================================== */
    renderMonthBanner() {
      const banner = document.getElementById('monthBanner');
      if (!banner) return;

      const info = window.FinoraNewMonth;
      if (!info || !info.isNewMonth) {
        banner.hidden = true;
        return;
      }

      // Đã đóng trong session này chưa?
      const dismissed = sessionStorage.getItem('finora.bannerDismissed');
      if (dismissed === info.monthLabel) {
        banner.hidden = true;
        return;
      }

      const titleEl = document.getElementById('monthBannerTitle');
      const descEl = document.getElementById('monthBannerDesc');

      if (titleEl) titleEl.textContent = `🎉 ${info.monthLabel} đã bắt đầu!`;
      if (descEl) {
        descEl.textContent = `${info.oldMonthLabel || 'Tháng trước'} đã được lưu vào lịch sử. Số liệu tháng này bắt đầu từ 0 — xem tại trang Thống kê.`;
      }

      banner.hidden = false;

      const closeBtn = document.getElementById('monthBannerClose');
      if (closeBtn && !closeBtn._bound) {
        closeBtn._bound = true;
        closeBtn.addEventListener('click', () => {
          sessionStorage.setItem('finora.bannerDismissed', info.monthLabel);
          banner.hidden = true;
        });
      }

      // Nút "Xem lịch sử" → chuyển sang Statistics
      const historyBtn = document.getElementById('monthBannerHistory');
      if (historyBtn && !historyBtn._bound) {
        historyBtn._bound = true;
        historyBtn.addEventListener('click', () => {
          sessionStorage.setItem('finora.bannerDismissed', info.monthLabel);
          banner.hidden = true;
          window.location.hash = '#statistics';
        });
      }
    },

    /* ========================================================
       STATS — chỉ tính THÁNG hiện tại
       ======================================================== */
    renderStats(txs) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      let monthIncome = 0;
      let monthExpense = 0;

      txs.forEach(tx => {
        const txDate = new Date(tx.date);
        if (txDate < monthStart || txDate > monthEnd) return;

        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income')  monthIncome += amt;
        if (tx.type === 'expense') monthExpense += amt;
      });

      const monthBalance = monthIncome - monthExpense;
      const monthSaving  = monthIncome - monthExpense;

      Utils.countUp(document.getElementById('statBalance'), monthBalance);
      const balanceMeta = document.getElementById('statBalanceMeta');
      if (balanceMeta) {
        balanceMeta.textContent = monthBalance >= 0
          ? `Thu - chi tháng ${now.getMonth() + 1}`
          : 'Chi vượt thu tháng này';
      }

      Utils.countUp(document.getElementById('statIncome'), monthIncome);
      const incMeta = document.getElementById('statIncomeMeta');
      if (incMeta) incMeta.textContent = `Tháng ${now.getMonth() + 1}`;

      Utils.countUp(document.getElementById('statExpense'), monthExpense);
      const expMeta = document.getElementById('statExpenseMeta');
      if (expMeta) expMeta.textContent = `Tháng ${now.getMonth() + 1}`;

      Utils.countUp(document.getElementById('statSaving'), monthSaving);
      const savMeta = document.getElementById('statSavingMeta');
      if (savMeta) {
        const rate = monthIncome > 0 ? Math.round((monthSaving / monthIncome) * 100) : 0;
        savMeta.textContent = monthIncome > 0
          ? `Tỷ lệ tiết kiệm ${rate}%`
          : 'Chưa có thu nhập tháng này';
      }
    },

    /* ========================================================
       RANGE HELPERS
       ======================================================== */
    _rangeMeta(range) {
      switch (range) {
        case '7d':  return { days: 7,  label: '7 ngày gần nhất',  bucket: 'day' };
        case '30d': return { days: 30, label: '30 ngày gần nhất', bucket: 'day' };
        case '3m':  return { days: 90, label: '3 tháng gần nhất', bucket: 'month' };
        case '6m':  return { days: 180,label: '6 tháng gần nhất', bucket: 'month' };
        case '1y':  return { days: 365,label: '1 năm gần nhất',   bucket: 'month' };
        default:    return { days: 7,  label: '7 ngày gần nhất',  bucket: 'day' };
      }
    },

    _buildBuckets(range) {
      const meta = this._rangeMeta(range);
      const now = new Date();
      const buckets = [];

      if (meta.bucket === 'day') {
        for (let i = meta.days - 1; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          buckets.push({
            key: Utils.toISODate(d),
            label: range === '7d'
              ? ['CN','T2','T3','T4','T5','T6','T7'][d.getDay()]
              : String(d.getDate()),
            fullLabel: Utils.formatDate(d, 'short'),
            income: 0, expense: 0
          });
        }
      } else {
        const months = meta.days === 90 ? 3 : (meta.days === 180 ? 6 : 12);
        for (let i = months - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: 'T' + (d.getMonth() + 1),
            fullLabel: 'Tháng ' + (d.getMonth() + 1) + '/' + d.getFullYear(),
            income: 0, expense: 0
          });
        }
      }
      return { buckets, meta };
    },

    renderChart(txs, range) {
      this._range = range || '7d';
      const chartEl = document.getElementById('chartEl');
      const subtitleEl = document.getElementById('chartSubtitle');
      if (!chartEl) return;

      const { buckets, meta } = this._buildBuckets(this._range);
      if (subtitleEl) subtitleEl.textContent = meta.label;

      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - meta.days);

      txs.forEach(tx => {
        const txDate = new Date(tx.date);
        if (txDate < startDate) return;
        const amt = Number(tx.amount) || 0;

        if (meta.bucket === 'day') {
          const key = Utils.toISODate(txDate);
          const b = buckets.find(x => x.key === key);
          if (b) {
            if (tx.type === 'income')  b.income  += amt;
            if (tx.type === 'expense') b.expense += amt;
          }
        } else {
          const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
          const b = buckets.find(x => x.key === key);
          if (b) {
            if (tx.type === 'income')  b.income  += amt;
            if (tx.type === 'expense') b.expense += amt;
          }
        }
      });

      const maxVal = Math.max(1, ...buckets.map(b => Math.max(b.income, b.expense)));

      chartEl.innerHTML = '';
      const frag = document.createDocumentFragment();

      buckets.forEach((b, i) => {
        const group = document.createElement('div');
        group.className = 'chart__group';
        group.dataset.index = i;

        const incH = Math.max((b.income / maxVal) * 100, b.income > 0 ? 3 : 0);
        const expH = Math.max((b.expense / maxVal) * 100, b.expense > 0 ? 3 : 0);

        const incBar = document.createElement('div');
        incBar.className = 'chart__bar chart__bar--income';
        incBar.style.height = incH + '%';
        incBar.style.animationDelay = (i * 30) + 'ms';

        const expBar = document.createElement('div');
        expBar.className = 'chart__bar chart__bar--expense';
        expBar.style.height = expH + '%';
        expBar.style.animationDelay = (i * 30 + 40) + 'ms';

        const label = document.createElement('span');
        label.className = 'chart__label';
        label.textContent = b.label;

        group.appendChild(incBar);
        group.appendChild(expBar);
        group.appendChild(label);
        frag.appendChild(group);
      });

      chartEl.appendChild(frag);
      this._bindChartTooltip(chartEl, buckets);
    },

    _bindChartTooltip(chartEl, buckets) {
      const tip = document.getElementById('chartTooltip');
      if (!tip) return;

      const onMove = (e) => {
        const group = e.target.closest('.chart__group');
        if (!group) { tip.hidden = true; return; }
        const idx = Number(group.dataset.index);
        const b = buckets[idx];
        if (!b) return;

        const rect = group.getBoundingClientRect();
        const parentRect = chartEl.parentElement.getBoundingClientRect();
        const x = rect.left - parentRect.left + rect.width / 2;

        tip.hidden = false;
        tip.style.left = x + 'px';
        tip.innerHTML = `
          <div style="font-weight:600;margin-bottom:4px">${b.fullLabel}</div>
          <div class="row"><span class="dot" style="background:var(--income)"></span>Thu: ${Utils.formatCurrency(b.income)}</div>
          <div class="row"><span class="dot" style="background:var(--expense)"></span>Chi: ${Utils.formatCurrency(b.expense)}</div>
        `;
      };

      const onLeave = () => { tip.hidden = true; };

      chartEl.addEventListener('mousemove', onMove);
      chartEl.addEventListener('mouseleave', onLeave);
      chartEl.addEventListener('touchstart', onMove, { passive: true });
      chartEl.addEventListener('touchend', onLeave);
    },

    renderDonut(txs) {
      const svg = document.getElementById('donutSvg');
      const list = document.getElementById('catList');
      const totalEl = document.getElementById('donutTotal');
      if (!svg || !list) return;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const byCat = {};
      let total = 0;

      txs.forEach(tx => {
        if (tx.type !== 'expense') return;
        const d = new Date(tx.date);
        if (d < monthStart) return;
        const amt = Number(tx.amount) || 0;
        byCat[tx.category] = (byCat[tx.category] || 0) + amt;
        total += amt;
      });

      if (total === 0) {
        svg.innerHTML = `<circle cx="21" cy="21" r="15.9" stroke="var(--border)" stroke-width="5" />`;
        if (totalEl) totalEl.textContent = '0 ₫';
        list.innerHTML = `<li style="padding:12px;color:var(--text-2);font-size:13px;text-align:center">Chưa có chi tiêu tháng này</li>`;
        return;
      }

      const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
      if (totalEl) totalEl.textContent = Utils.formatCurrencyShort(total);

      const R = 15.9155;
      const C = 2 * Math.PI * R;
      let offset = 0;

      svg.innerHTML = '';
      entries.forEach(([cat, amt]) => {
        const pct = amt / total;
        const dash = pct * C;
        const gap  = C - dash;
        const color = Utils.categoryMeta(cat).color;

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '21');
        circle.setAttribute('cy', '21');
        circle.setAttribute('r', R);
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-dasharray', `${dash} ${gap}`);
        circle.setAttribute('stroke-dashoffset', -offset);
        circle.setAttribute('stroke-linecap', pct < 0.02 ? 'butt' : 'round');
        svg.appendChild(circle);
        offset += dash;
      });

      list.innerHTML = '';
      entries.forEach(([cat, amt]) => {
        const meta = Utils.categoryMeta(cat);
        const pct = ((amt / total) * 100).toFixed(1);

        const li = document.createElement('li');
        li.className = 'cat-item';
        li.innerHTML = `
          <span class="cat-item__dot" style="background:${meta.color}"></span>
          <span class="cat-item__name">${meta.icon} ${meta.name}</span>
          <span class="cat-item__value">${Utils.formatCurrencyShort(amt)}</span>
          <span class="cat-item__pct">${pct}%</span>
        `;
        list.appendChild(li);
      });
    },

    renderRecent(txs) {
      const wrap = document.getElementById('recentList');
      if (!wrap) return;

      // Chỉ hiển thị giao dịch THÁNG HIỆN TẠI
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const recent = txs
        .filter(tx => {
          const d = new Date(tx.date);
          return d >= monthStart && d <= monthEnd;
        })
        .slice(0, 5);

      wrap.innerHTML = '';

      if (recent.length === 0) {
        wrap.innerHTML = `
          <div class="empty" style="padding:32px 16px">
            <div class="empty__icon"><i data-lucide="receipt" aria-hidden="true"></i></div>
            <h3 class="empty__title">Chưa có giao dịch</h3>
            <p class="empty__desc">Thêm giao dịch đầu tiên để bắt đầu theo dõi tài chính.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      recent.forEach(tx => {
        const meta = Utils.categoryMeta(tx.category);
        const isIncome = tx.type === 'income';
        const sign = isIncome ? '+' : '-';
        const amount = sign + Utils.formatCurrency(tx.amount).trim();

        const item = document.createElement('div');
        item.className = 'tx-item';
        item.innerHTML = `
          <div class="tx-item__icon">${meta.icon}</div>
          <div class="tx-item__main">
            <div class="tx-item__name">${tx.note || meta.name}</div>
            <div class="tx-item__meta">${meta.name} · ${Utils.formatDate(tx.date, 'short')}</div>
          </div>
          <div class="tx-item__amount tx-item__amount--${isIncome ? 'income' : 'expense'}">${amount}</div>
        `;
        wrap.appendChild(item);
      });
    },

    bindRangePicker() {
      const picker = document.getElementById('rangePicker');
      if (!picker) return;

      picker.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-range]');
        if (!btn) return;

        Utils.qsa('button', picker).forEach(b => {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });

        const txs = FinoraStorage.getTransactions();
        this.renderChart(txs, btn.dataset.range);
      });
    }
  };

  global.FinoraDashboard = Dashboard;
})(window);