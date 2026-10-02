/* ============================================================
   FINORA — SUPABASE CLIENT
   Kết nối front-end với Supabase backend.
   ============================================================ */
(function (global) {
  'use strict';

  // ⚠️ THAY 2 GIÁ TRỊ NÀY BẰNG CỦA BẠN
  const SUPABASE_URL = 'https://fyexjbbpngkgjqbvcfbz.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZXhqYmJwbmdrZ2pxYnZjZmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MzEzNDIsImV4cCI6MjEwNjQwNzM0Mn0.jsyNKwi7Q_RONnvtC1KCWWZUNeiynWujzEgLHb0-uS4';

  if (!global.supabase) {
    console.error('[Finora] Supabase SDK chưa load. Kiểm tra thẻ <script> trong HTML.');
    return;
  }

  const client = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* ---------- Auth helpers ---------- */
  const Auth = {
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async getUser() {
      const { data } = await client.auth.getUser();
      return data.user;
    },

    async getSession() {
      const { data } = await client.auth.getSession();
      return data.session;
    },

    onChange(callback) {
      return client.auth.onAuthStateChange(callback);
    }
  };

  /* ---------- Data helpers ---------- */
  const Data = {
    /* Transactions */
    async getTransactions() {
      const { data, error } = await client
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async addTransaction(tx) {
      const user = await Auth.getUser();
      if (!user) throw new Error('Chưa đăng nhập');

      const { data, error } = await client
        .from('transactions')
        .insert([{ ...tx, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async updateTransaction(id, patch) {
      const { data, error } = await client
        .from('transactions')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async deleteTransaction(id) {
      const { error } = await client.from('transactions').delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    /* Budgets */
    async getBudgets() {
      const { data, error } = await client.from('budgets').select('*');
      if (error) throw error;
      return data || [];
    },

    async upsertBudget(monthKey, categories) {
      const user = await Auth.getUser();
      if (!user) throw new Error('Chưa đăng nhập');

      const { data, error } = await client
        .from('budgets')
        .upsert({ user_id: user.id, month_key: monthKey, categories })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async deleteBudget(monthKey) {
      const { error } = await client.from('budgets').delete().eq('month_key', monthKey);
      if (error) throw error;
      return true;
    },

    /* Goals */
    async getGoals() {
      const { data, error } = await client
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async addGoal(goal) {
      const user = await Auth.getUser();
      if (!user) throw new Error('Chưa đăng nhập');

      const { data, error } = await client
        .from('goals')
        .insert([{ ...goal, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async updateGoal(id, patch) {
      const { data, error } = await client
        .from('goals')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async deleteGoal(id) {
      const { error } = await client.from('goals').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
  };

  /* ---------- Export ---------- */
  global.FinoraBackend = { client, Auth, Data };
  console.log('[Finora] Supabase client ready');
})(window);