/* ============================================================
   FINORA — STATISTICS
   Phân tích + LỊCH SỬ CÁC THÁNG (từ monthly archive).
   ============================================================ */
(function (global) {
  'use strict';

  const Statistics = {

    _range: 'month',

    init() {
      this._bindRangePicker();
      this._bindHistoryToggle();
      this.render();
    },

    render() {
      const txs = FinoraStorage.getTransactions();
      const { start, end, label, prevStart, prevEnd } = this._getRangeDates();

      const current = this._filterByDate(txs, start, end);
      const previous = this._filterByDate(txs, prevStart, prevEnd);

      const sub = document.getElementById('statsSubtitle');
      if (sub) sub.textContent = label;

      const emptyEl = document.getElementById('statsEmpty');
      const hasData = txs.length > 0 || FinoraStorage.getMonthlyArchive().length > 0;
      if (emptyEl) emptyEl.hidden = hasData;

      this._renderSummary(current, previous);
      this._renderComparison(current, previous);
      this._renderIEChart(current, start, end);
      this._renderCategoryChart(current);
      this._renderLineChart('statsLineExpense', txs, start, end, 'expense');
      this._renderLineChart('statsLineSaving', txs, start, end, 'saving');
      this._renderHistory();   // ⭐ LỊCH SỬ THÁNG

      if (window.lucide) window.lucide.createIcons();
    },

    /* ========================================================
       HISTORY — LỊCH SỬ CÁC THÁNG ĐÃ QUA
       ======================================================== */
    _bindHistoryToggle() {
      const btn = document.getElementById('toggleHistoryBtn');
      const panel = document.getElementById('historyPanel');
      if (!btn || !panel) return;

      btn.addEventListener('click', () => {
        const isHidden = panel.hidden;
        panel.hidden = !isHidden;
        btn.classList.toggle('is-open', isHidden);
        const textEl = btn.querySelector('span');
        if (textEl) {
          textEl.textContent = isHidden ? 'Ẩn lịch sử' : 'Xem lịch sử';
        }
        if (isHidden && window.lucide) window.lucide.createIcons();
      });
    },

    _renderHistory() {
      const wrap = document.getElementById('historyList');
      const countEl = document.getElementById('historyCount');
      const totalEl = document.getElementById('historyTotal');
      if (!wrap) return;

      const archive = FinoraStorage.getMonthlyArchive();

      if (countEl) countEl.textContent = archive.length;

      if (archive.length === 0) {
        wrap.innerHTML = `
          <div class="empty" style="padding:32px 16px">
            <div class="empty__icon"><i data-lucide="archive" aria-hidden="true"></i></div>
            <h3 class="empty__title">Chưa có lịch sử</h3>
            <p class="empty__desc">Lịch sử sẽ được lưu tự động khi bước sang tháng mới.</p>
          </div>
        `;
        if (totalEl) totalEl.textContent = '0 ₫';
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      let grandTotalSaving = 0;
      wrap.innerHTML = '';

      archive.forEach(rec => {
        grandTotalSaving += rec.saving;

        const savingClass = rec.saving >= 0 ? 'income' : 'expense';
        const sign = rec.saving >= 0 ? '+' : '';

        // Top 3 danh mục chi
        const topCats = Object.entries(rec.byCategory || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        const catHtml = topCats.map(([cat, amt]) => {
          const m = Utils.categoryMeta(cat);
          return `<span class="history-item__cat"><span style="color:${m.color}">${m.icon}</span> ${m.name}: ${Utils.formatCurrencyShort(amt)}</span>`;
        }).join('');

        const el = document.createElement('div');
        el.className = 'history-item';
        el.innerHTML = `
          <div class="history-item__head">
            <div class="history-item__month">
              <i data-lucide="calendar" aria-hidden="true"></i>
              <strong>${rec.monthLabel}</strong>
              <span class="history-item__count">${rec.transactionCount} giao dịch</span>
            </div>
            <div class="history-item__saving history-item__saving--${savingClass}">
              ${sign}${Utils.formatCurrency(rec.saving)}
            </div>
          </div>
          <div class="history-item__stats">
            <div class="history-item__stat">
              <span class="history-item__stat-label">Thu nhập</span>
              <strong class="history-item__stat-value history-item__stat-value--income">
                ${Utils.formatCurrency(rec.income)}
              </strong>
            </div>
            <div class="history-item__stat">
              <span class="history-item__stat-label">Chi tiêu</span>
              <strong class="history-item__stat-value history-item__stat-value--expense">
                ${Utils.formatCurrency(rec.expense)}
              </strong>
            </div>
            <div class="history-item__stat">
              <span class="history-item__stat-label">Tiết kiệm</span>
              <strong class="history-item__stat-value history-item__stat-value--${savingClass}">
                ${sign}${Utils.formatCurrency(rec.saving)}
              </strong>
            </div>
          </div>
          ${catHtml ? `<div class="history-item__cats">${catHtml}</div>` : ''}
        `;
        wrap.appendChild(el);
      });

      if (totalEl) totalEl.textContent = Utils.formatCurrency(grandTotalSaving);
    },

    /* ========================================================
       RANGE HELPERS
       ======================================================== */
    _getRangeDates() {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      let start, prevStart, prevEnd, label;

      switch (this._range) {
        case 'week': {
          const day = now.getDay() || 7;
          start = new Date(now);
          start.setDate(now.getDate() - day + 1);
          start.setHours(0, 0, 0, 0);
          label = 'Tuần này';
          prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1); prevEnd.setHours(23,59,59,999);
          prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 6); prevStart.setHours(0,0,0,0);
          break;
        }
        case 'month': {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          label = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
          prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          prevEnd.setHours(23, 59, 59, 999);
          break;
        }
        case '3m': {
          start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          label = '3 tháng gần nhất';
          prevStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          prevEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0);
          prevEnd.setHours(23, 59, 59, 999);
          break;
        }
        case '6m': {
          start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          label = '6 tháng gần nhất';
          prevStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
          prevEnd = new Date(now.getFullYear(), now.getMonth() - 5, 0);
          prevEnd.setHours(23, 59, 59, 999);
          break;
        }
        case 'year': {
          start = new Date(now.getFullYear(), 0, 1);
          label = `Năm ${now.getFullYear()}`;
          prevStart = new Date(now.getFullYear() - 1, 0, 1);
          prevEnd = new Date(now.getFullYear() - 1, 11, 31);
          prevEnd.setHours(23, 59, 59, 999);
          break;
        }
        default: {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          label = 'Tháng này';
          prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        }
      }
      return { start, end, label, prevStart, prevEnd };
    },

    _filterByDate(txs, start, end) {
      return txs.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    },

    /* ========================================================
       SUMMARY
       ======================================================== */
    _renderSummary(current, previous) {
      let inc = 0, exp = 0;
      const byCat = {};

      current.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') inc += amt;
        else {
          exp += amt;
          byCat[t.category] = (byCat[t.category] || 0) + amt;
        }
      });

      const save = inc - exp;

      let prevInc = 0, prevExp = 0;
      previous.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') prevInc += amt;
        else prevExp += amt;
      });

      Utils.countUp(document.getElementById('statsTotalIncome'), inc);
      Utils.countUp(document.getElementById('statsTotalExpense'), exp);
      Utils.countUp(document.getElementById('statsTotalSaving'), save);

      const incMeta = document.getElementById('statsTotalIncomeMeta');
      if (incMeta) incMeta.textContent = this._pctCompareText(inc, prevInc);

      const expMeta = document.getElementById('statsTotalExpenseMeta');
      if (expMeta) expMeta.textContent = this._pctCompareText(exp, prevExp);

      const savMeta = document.getElementById('statsTotalSavingMeta');
      if (savMeta) {
        const rate = inc > 0 ? Math.round((save / inc) * 100) : 0;
        savMeta.textContent = inc > 0 ? `Tỷ lệ ${rate}%` : '—';
      }

      const topEntry = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
      const topEl = document.getElementById('statsTopCat');
      const topMeta = document.getElementById('statsTopCatMeta');
      if (topEntry) {
        const meta = Utils.categoryMeta(topEntry[0]);
        if (topEl) topEl.textContent = meta.name;
        if (topMeta) topMeta.textContent = Utils.formatCurrency(topEntry[1]);
      } else {
        if (topEl) topEl.textContent = '—';
        if (topMeta) topMeta.textContent = 'Chưa có chi tiêu';
      }
    },

    _pctCompareText(current, previous) {
      if (previous === 0) {
        return current === 0 ? 'Không đổi' : 'Chưa có kỳ trước';
      }
      const pct = Math.round(((current - previous) / previous) * 100);
      if (pct === 0) return 'Không đổi';
      const sign = pct > 0 ? '+' : '';
      return `${sign}${pct}% so kỳ trước`;
    },

    /* ========================================================
       COMPARISON
       ======================================================== */
    _renderComparison(current, previous) {
      const grid = document.getElementById('compareGrid');
      const sub = document.getElementById('compareSub');
      if (!grid) return;

      const metrics = ['income', 'expense', 'saving'];
      const labels = { income: 'Thu nhập', expense: 'Chi tiêu', saving: 'Tiết kiệm' };

      const calc = (txs, key) => {
        let inc = 0, exp = 0;
        txs.forEach(t => {
          const amt = Number(t.amount) || 0;
          if (t.type === 'income') inc += amt;
          else exp += amt;
        });
        if (key === 'income') return inc;
        if (key === 'expense') return exp;
        return inc - exp;
      };

      if (sub) sub.textContent = 'Kỳ hiện tại so với kỳ liền trước';
      grid.innerHTML = '';

      metrics.forEach(key => {
        const curr = calc(current, key);
        const prev = calc(previous, key);

        let diff = 0, pct = 0, trend = 'flat';
        if (prev === 0 && curr === 0) { diff = 0; pct = 0; trend = 'flat'; }
        else if (prev === 0) { diff = curr; pct = 100; trend = curr > 0 ? 'up' : 'flat'; }
        else {
          diff = curr - prev;
          pct = Math.round((diff / Math.abs(prev)) * 100);
          trend = diff > 0 ? 'up' : (diff < 0 ? 'down' : 'flat');
        }

        let tone = 'flat';
        if (trend !== 'flat') {
          if (key === 'expense') tone = trend === 'up' ? 'bad' : 'good';
          else tone = trend === 'up' ? 'good' : 'bad';
        }

        const iconMap = { up: 'arrow-up-right', down: 'arrow-down-right', flat: 'minus' };
        const signPct = pct > 0 ? '+' : '';

        const el = document.createElement('div');
        el.className = 'compare-item';
        el.innerHTML = `
          <div class="compare-item__label">${labels[key]}</div>
          <div class="compare-item__value">${Utils.formatCurrency(curr)}</div>
          <div class="compare-item__trend compare-item__trend--${tone}">
            <i data-lucide="${iconMap[trend]}" aria-hidden="true"></i>
            <span>${prev === 0 ? (curr === 0 ? 'Không đổi' : 'Mới') : `${signPct}${pct}%`}</span>
          </div>
          <div class="compare-item__prev">Kỳ trước: ${Utils.formatCurrency(prev)}</div>
        `;
        grid.appendChild(el);
      });
    },

    /* ========================================================
       CHARTS
       ======================================================== */
    _renderIEChart(current, start, end) {
      const chartEl = document.getElementById('statsChartIE');
      const subEl = document.getElementById('statsC1Sub');
      if (!chartEl) return;

      const days = Math.round((end - start) / 86400000) + 1;
      const bucketMode = days <= 31 ? 'day' : 'month';
      const buckets = [];

      if (bucketMode === 'day') {
        for (let i = 0; i < days; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          buckets.push({
            key: Utils.toISODate(d),
            label: String(d.getDate()),
            fullLabel: Utils.formatDate(d, 'short'),
            income: 0, expense: 0
          });
        }
      } else {
        const months = Math.round(days / 30);
        for (let i = 0; i < months; i++) {
          const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
          if (d > end) break;
          buckets.push({
            key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
            label: 'T' + (d.getMonth() + 1),
            fullLabel: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
            income: 0, expense: 0
          });
        }
      }

      current.forEach(t => {
        const d = new Date(t.date);
        const key = bucketMode === 'day'
          ? Utils.toISODate(d)
          : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const b = buckets.find(x => x.key === key);
        if (!b) return;
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') b.income += amt;
        else b.expense += amt;
      });

      if (subEl) subEl.textContent = bucketMode === 'day' ? `${days} ngày` : `${buckets.length} tháng`;

      const maxVal = Math.max(1, ...buckets.map(b => Math.max(b.income, b.expense)));
      chartEl.innerHTML = '';
      const frag = document.createDocumentFragment();

      buckets.forEach((b, i) => {
        const group = document.createElement('div');
        group.className = 'chart__group';
        group.dataset.tip = JSON.stringify({ label: b.fullLabel, income: b.income, expense: b.expense });

        const incH = Math.max((b.income / maxVal) * 100, b.income > 0 ? 3 : 0);
        const expH = Math.max((b.expense / maxVal) * 100, b.expense > 0 ? 3 : 0);

        const incBar = document.createElement('div');
        incBar.className = 'chart__bar chart__bar--income';
        incBar.style.height = incH + '%';
        incBar.style.animationDelay = (i * 25) + 'ms';

        const expBar = document.createElement('div');
        expBar.className = 'chart__bar chart__bar--expense';
        expBar.style.height = expH + '%';
        expBar.style.animationDelay = (i * 25 + 30) + 'ms';

        const label = document.createElement('span');
        label.className = 'chart__label';
        label.textContent = b.label;

        group.appendChild(incBar);
        group.appendChild(expBar);
        group.appendChild(label);
        frag.appendChild(group);
      });

      chartEl.appendChild(frag);
      this._bindSimpleTooltip(chartEl);
    },

    _bindSimpleTooltip(chartEl) {
      const tip = document.getElementById('chartTooltip');
      if (!tip) return;
      if (chartEl._tooltipBound) return;
      chartEl._tooltipBound = true;

      const onMove = (e) => {
        const group = e.target.closest('.chart__group');
        if (!group || !group.dataset.tip) { tip.hidden = true; return; }

        const data = JSON.parse(group.dataset.tip);
        const rect = group.getBoundingClientRect();
        const parentRect = chartEl.parentElement.getBoundingClientRect();
        const x = rect.left - parentRect.left + rect.width / 2;

        tip.hidden = false;
        tip.style.left = x + 'px';
        tip.innerHTML = `
          <div style="font-weight:600;margin-bottom:4px">${data.label}</div>
          <div class="row"><span class="dot" style="background:var(--income)"></span>Thu: ${Utils.formatCurrency(data.income)}</div>
          <div class="row"><span class="dot" style="background:var(--expense)"></span>Chi: ${Utils.formatCurrency(data.expense)}</div>
        `;
      };

      const onLeave = () => { tip.hidden = true; };

      chartEl.addEventListener('mousemove', onMove);
      chartEl.addEventListener('mouseleave', onLeave);
      chartEl.addEventListener('touchstart', onMove, { passive: true });
      chartEl.addEventListener('touchend', onLeave);
    },

    _renderCategoryChart(current) {
      const svg = document.getElementById('statsDonut');
      const list = document.getElementById('statsCatList');
      const totalEl = document.getElementById('statsDonutTotal');
      const subEl = document.getElementById('statsC2Sub');
      if (!svg || !list) return;

      const byCat = {};
      let total = 0;

      current.forEach(t => {
        if (t.type !== 'expense') return;
        const amt = Number(t.amount) || 0;
        byCat[t.category] = (byCat[t.category] || 0) + amt;
        total += amt;
      });

      if (subEl) subEl.textContent = total > 0 ? Utils.formatCurrency(total) : 'Không có chi tiêu';

      if (total === 0) {
        svg.innerHTML = `<circle cx="21" cy="21" r="15.9" stroke="var(--border)" stroke-width="5" />`;
        if (totalEl) totalEl.textContent = '0 ₫';
        list.innerHTML = `<li style="padding:12px;color:var(--text-2);font-size:13px;text-align:center">Chưa có chi tiêu</li>`;
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
        const gap = C - dash;
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

    _renderLineChart(elId, txs, start, end, type) {
      const el = document.getElementById(elId);
      if (!el) return;

      const buckets = [];
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

      let cursor = new Date(startMonth);
      while (cursor <= endMonth) {
        buckets.push({
          key: `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}`,
          label: 'T' + (cursor.getMonth() + 1),
          income: 0, expense: 0
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      txs.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const b = buckets.find(x => x.key === key);
        if (!b) return;
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') b.income += amt;
        else b.expense += amt;
      });

      const subId = elId === 'statsLineExpense' ? 'statsC3Sub' : 'statsC4Sub';
      const subEl = document.getElementById(subId);
      if (subEl) {
        subEl.textContent = type === 'expense' ? 'Theo từng tháng' : 'Thu trừ chi theo tháng';
      }

      const values = buckets.map(b => type === 'expense' ? b.expense : (b.income - b.expense));
      const maxAbs = Math.max(1, ...values.map(v => Math.abs(v)));

      const W = 600, H = 200;
      const PAD_L = 40, PAD_R = 20, PAD_T = 16, PAD_B = 28;
      const chartW = W - PAD_L - PAD_R;
      const chartH = H - PAD_T - PAD_B;

      const n = values.length;
      const stepX = n > 1 ? chartW / (n - 1) : 0;

      const hasNegative = type === 'saving' && values.some(v => v < 0);

      const toY = (v) => {
        if (type === 'saving' && hasNegative) {
          const t = (maxAbs - v) / (maxAbs * 2);
          return PAD_T + chartH * t;
        }
        return PAD_T + chartH - (v / maxAbs) * chartH;
      };

      const points = values.map((v, i) => {
        const x = n > 1 ? PAD_L + i * stepX : PAD_L + chartW / 2;
        return { x, y: toY(v), v };
      });

      let pathD = '';
      points.forEach((p, i) => {
        if (i === 0) pathD += `M ${p.x} ${p.y}`;
        else {
          const prev = points[i - 1];
          const cx = (prev.x + p.x) / 2;
          pathD += ` C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
        }
      });

      const areaD = pathD +
        ` L ${points[points.length-1].x} ${PAD_T + chartH}` +
        ` L ${points[0].x} ${PAD_T + chartH} Z`;

      const gridCount = 3;
      let gridSvg = '';
      for (let i = 0; i <= gridCount; i++) {
        const y = PAD_T + (chartH / gridCount) * i;
        gridSvg += `<line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 4" opacity="0.6"/>`;
      }

      let xLabels = '';
      points.forEach((p, i) => {
        xLabels += `<text x="${p.x}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="var(--text-2)">${buckets[i].label}</text>`;
      });

      let dotsSvg = '';
      points.forEach((p, i) => {
        dotsSvg += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--surface)" stroke="${type === 'expense' ? 'var(--expense)' : 'var(--primary)'}" stroke-width="2">
          <title>${buckets[i].label}: ${Utils.formatCurrency(p.v)}</title>
        </circle>`;
      });

      const strokeColor = type === 'expense' ? 'var(--expense)' : 'var(--primary)';
      const fillId = `grad-${elId}`;

      el.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:100%">
          <defs>
            <linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${gridSvg}
          <path d="${areaD}" fill="url(#${fillId})"/>
          <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${dotsSvg}
          ${xLabels}
        </svg>
      `;
    },

    _bindRangePicker() {
      const picker = document.getElementById('statsRangePicker');
      if (!picker) return;

      picker.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-range]');
        if (!btn) return;

        picker.querySelectorAll('button').forEach(b => {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });

        this._range = btn.dataset.range;
        this.render();
      });
    }
  };

  global.FinoraStatistics = Statistics;
})(window);