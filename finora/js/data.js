/* ============================================================
   FINORA — DATA SYNC LAYER
   Đồng bộ LocalStorage ↔ Supabase ngầm.
   UI không đổi — chỉ storage được "hook".
   ============================================================ */
(function (global) {
  'use strict';

  const Sync = {

    ready: false,
    user: null,
    _hooked: false,

    /* ========================================================
       KHỞI ĐỘNG
       ======================================================== */
    async start() {
      if (!global.FinoraBackend) {
        console.log('[Sync] Backend chưa sẵn sàng — chỉ dùng LocalStorage');
        this.ready = true;
        return;
      }

      this.user = await global.FinoraBackend.Auth.getUser();

      if (!this.user) {
        console.log('[Sync] Chưa đăng nhập — chỉ dùng LocalStorage');
        this.ready = true;
        return;
      }

      console.log('[Sync] Đăng nhập:', this.user.email);

      // Tải dữ liệu từ cloud về LocalStorage
      await this.pullAll();

      // Hook storage để tự động đẩy lên cloud
      this.hookStorage();

      this.ready = true;
      console.log('[Sync] Sẵn sàng');
    },

    /* ========================================================
       PULL — Cloud → LocalStorage
       ======================================================== */
    async pullAll() {
      try {
        const cloudTx = await global.FinoraBackend.Data.getTransactions();

        // Cloud trống → đẩy LocalStorage lên cloud (lần đầu đăng nhập)
        if (cloudTx.length === 0) {
          const localTx = global.FinoraStorage.getTransactions();
          if (localTx.length > 0) {
            console.log(`[Sync] Cloud trống → đẩy ${localTx.length} giao dịch lên`);
            await this._pushBatch(localTx);
          }
        } else {
          // Cloud có dữ liệu → ghi đè LocalStorage
          const mapped = cloudTx.map(this._mapTxFromDb);
          global.FinoraStorage.setTransactions(mapped);
          console.log(`[Sync] Đã tải ${mapped.length} giao dịch từ cloud`);
        }
      } catch (e) {
        console.warn('[Sync] Pull thất bại:', e.message);
      }
    },

    async _pushBatch(list) {
      for (const tx of list) {
        try {
          await global.FinoraBackend.Data.addTransaction({
            type: tx.type,
            amount: tx.amount,
            category: tx.category,
            date: tx.date,
            note: tx.note || ''
          });
        } catch (e) {
          console.warn('[Sync] Push 1 giao dịch lỗi:', e.message);
        }
      }
    },

    /* ========================================================
       HOOK STORAGE — Tự động đẩy lên cloud
       ======================================================== */
    hookStorage() {
      if (this._hooked) return;
      this._hooked = true;

      const S = global.FinoraStorage;
      const self = this;

      /* ----- ADD ----- */
      const _add = S.addTransaction.bind(S);
      S.addTransaction = function (tx) {
        const item = _add(tx);
        self._pushAdd(item);
        return item;
      };

      /* ----- UPDATE ----- */
      const _update = S.updateTransaction.bind(S);
      S.updateTransaction = function (id, patch) {
        const item = _update(id, patch);
        if (item) self._pushUpdate(item);
        return item;
      };

      /* ----- DELETE ----- */
      const _delete = S.deleteTransaction.bind(S);
      S.deleteTransaction = function (id) {
        // Lấy cloudId TRƯỚC KHI xóa
        const tx = S.getTransaction(id);
        const cloudId = tx && tx.cloudId;
        const ok = _delete(id);
        if (ok && cloudId) self._pushDelete(cloudId);
        return ok;
      };

      console.log('[Sync] Đã hook storage (auto push)');
    },

    /* ========================================================
       PUSH — LocalStorage → Cloud (background, fire-forget)
       ======================================================== */
    async _pushAdd(tx) {
      if (!this.user) return;
      try {
        const row = await global.FinoraBackend.Data.addTransaction({
          type: tx.type,
          amount: tx.amount,
          category: tx.category,
          date: tx.date,
          note: tx.note || ''
        });

        // Ghi cloudId vào localStorage để dùng cho update/delete
        if (row && row.id) {
          const list = global.FinoraStorage.getTransactions();
          const idx = list.findIndex(t => t.id === tx.id);
          if (idx >= 0) {
            list[idx].cloudId = row.id;
            global.FinoraStorage._write('finora.transactions.v1', list);
          }
        }
      } catch (e) {
        console.warn('[Sync] Push add lỗi:', e.message);
      }
    },

    async _pushUpdate(tx) {
      if (!this.user || !tx.cloudId) return;
      try {
        await global.FinoraBackend.Data.updateTransaction(tx.cloudId, {
          type: tx.type,
          amount: tx.amount,
          category: tx.category,
          date: tx.date,
          note: tx.note || ''
        });
      } catch (e) {
        console.warn('[Sync] Push update lỗi:', e.message);
      }
    },

    async _pushDelete(cloudId) {
      if (!this.user || !cloudId) return;
      try {
        await global.FinoraBackend.Data.deleteTransaction(cloudId);
      } catch (e) {
        console.warn('[Sync] Push delete lỗi:', e.message);
      }
    },

    /* ========================================================
       MAPPER: DB row → LocalStorage item
       ======================================================== */
    _mapTxFromDb(row) {
      return {
        id: 'cloud_' + row.id,
        cloudId: row.id,
        type: row.type,
        amount: Number(row.amount),
        category: row.category,
        date: row.date,
        note: row.note || '',
        createdAt: row.created_at
      };
    }
  };

  global.FinoraSync = Sync;
})(window);