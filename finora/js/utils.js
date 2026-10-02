/* ============================================================
   FINORA — UTILS
   Các helper dùng chung toàn app.
   ============================================================ */
(function (global) {
  'use strict';

  const Utils = {

    /* ---------- Format tiền tệ VND ---------- */
    formatCurrency(value, opts) {
      const n = Number(value) || 0;
      const sign = opts && opts.signed && n > 0 ? '+' : '';
      const formatted = new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: 0
      }).format(Math.abs(n));
      const suffix = opts && opts.short ? '₫' : ' ₫';
      return `${sign}${n < 0 ? '-' : ''}${formatted}${suffix}`;
    },

    formatCurrencyShort(value) {
      const n = Math.abs(Number(value) || 0);
      if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace('.0','') + ' tỷ';
      if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1).replace('.0','') + ' tr';
      if (n >= 1_000)         return (n / 1_000).toFixed(0) + 'k';
      return String(n);
    },

    /* ---------- Format ngày ---------- */
    formatDate(iso, style) {
      const d = new Date(iso);
      if (isNaN(d)) return '—';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();

      if (style === 'short')  return `${dd}/${mm}`;
      if (style === 'month')  return `Tháng ${mm}`;
      if (style === 'long')   return `${dd} tháng ${mm}, ${yyyy}`;
      return `${dd}/${mm}/${yyyy}`;
    },

    toISODate(date) {
      const d = date instanceof Date ? date : new Date(date);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    },

    startOfDay(date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    },

    daysBetween(a, b) {
      const MS = 86400000;
      return Math.round((Utils.startOfDay(b) - Utils.startOfDay(a)) / MS);
    },

    /* ---------- Debounce ---------- */
    debounce(fn, wait) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait || 200);
      };
    },

    /* ---------- Count-up animation ---------- */
    countUp(el, to, duration) {
      if (!el) return;
      const from = Number(el.dataset.value) || 0;
      const target = Number(to) || 0;
      const start = performance.now();
      const dur = duration || 600;

      function frame(now) {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const current = from + (target - from) * eased;
        el.textContent = Utils.formatCurrency(Math.round(current));
        if (p < 1) requestAnimationFrame(frame);
        else {
          el.dataset.value = target;
          el.textContent = Utils.formatCurrency(target);
        }
      }
      requestAnimationFrame(frame);
    },

    /* ---------- Category helpers ---------- */
    categoryMeta(key) {
      const map = {
        food:      { name: 'Ăn uống',   icon: '🍜', color: 'var(--c-food)' },
        transport: { name: 'Đi lại',    icon: '🚌', color: 'var(--c-transport)' },
        education: { name: 'Học tập',   icon: '📚', color: 'var(--c-edu)' },
        fun:       { name: 'Giải trí',  icon: '🎮', color: 'var(--c-fun)' },
        shopping:  { name: 'Mua sắm',   icon: '🛒', color: 'var(--c-shop)' },
        health:    { name: 'Sức khỏe',  icon: '💊', color: 'var(--c-health)' },
        housing:   { name: 'Nhà ở',     icon: '🏠', color: 'var(--c-home)' },
        salary:    { name: 'Lương',     icon: '💰', color: 'var(--income)' },
        bonus:     { name: 'Thưởng',    icon: '🎁', color: 'var(--income)' },
        other:     { name: 'Khác',      icon: '📦', color: 'var(--c-other)' }
      };
      return map[key] || map.other;
    },

    /* ---------- Toast ---------- */
    toast(message, type) {
      const stack = document.getElementById('toastStack');
      if (!stack) return;

      const el = document.createElement('div');
      el.className = 'toast';
      const icon = type === 'error' ? 'alert-circle' : 'check';
      el.innerHTML = `
        <span class="toast__icon"><i data-lucide="${icon}" aria-hidden="true"></i></span>
        <span>${message}</span>
      `;
      stack.appendChild(el);

      if (window.lucide) window.lucide.createIcons();

      setTimeout(() => {
        el.classList.add('toast--out');
        setTimeout(() => el.remove(), 280);
      }, 2600);
    },

    /* ---------- DOM helpers ---------- */
    qs(sel, root) { return (root || document).querySelector(sel); },
    qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },

    el(tag, attrs, children) {
      const node = document.createElement(tag);
      if (attrs) {
        Object.entries(attrs).forEach(([k, v]) => {
          if (k === 'class') node.className = v;
          else if (k === 'html') node.innerHTML = v;
          else if (k === 'text') node.textContent = v;
          else if (k.startsWith('on') && typeof v === 'function') {
            node.addEventListener(k.slice(2).toLowerCase(), v);
          } else if (v !== null && v !== undefined && v !== false) {
            node.setAttribute(k, v);
          }
        });
      }
      if (children) {
        (Array.isArray(children) ? children : [children]).forEach(c => {
          if (c == null) return;
          node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
      }
      return node;
    }
  };

  global.Utils = Utils;
})(window);