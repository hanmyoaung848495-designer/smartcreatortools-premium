// Custom client-side proxy to execute database operations via our secure server-side endpoint
// This ensures that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are 100% hidden from the browser network and DevTools (F12)

class SupabaseQueryBuilder {
  private table: string;
  private _select: string = '*';
  private _eq: Record<string, any> = {};
  private _order: { column: string; ascending?: boolean } | null = null;
  private _limit: number | null = null;
  private _single: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = '*') {
    this._select = fields;
    return this;
  }

  eq(column: string, value: any) {
    this._eq[column] = value;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this._order = { column, ascending: options?.ascending };
    return this;
  }

  limit(count: number) {
    this._limit = count;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  // To support standard Promise-like await on the query builder:
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const response = await fetch('/api/db-query', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'select',
          table: this.table,
          select: this._select,
          eq: this._eq,
          order: this._order,
          limit: this._limit,
          single: this._single
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const val = { data: null, error: { message: errorData.error || 'Query failed' } };
        if (onfulfilled) return onfulfilled(val);
        return val;
      }

      const resData = await response.json();
      const val = { data: resData.data, error: null };
      if (onfulfilled) return onfulfilled(val);
      return val;
    } catch (err: any) {
      const val = { data: null, error: { message: err.message } };
      if (onfulfilled) return onfulfilled(val);
      return val;
    }
  }
}

class SupabaseProxyClient {
  from(table: string) {
    return {
      select: (fields?: string) => new SupabaseQueryBuilder(table).select(fields),
      upsert: async (values: any, options?: { onConflict?: string }) => {
        try {
          const response = await fetch('/api/db-query', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: 'upsert',
              table,
              upsertData: values,
              onConflict: options?.onConflict
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { data: null, error: { message: errorData.error || 'Upsert failed' } };
          }

          const resData = await response.json();
          return { data: resData.data, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      },
      insert: async (values: any) => {
        try {
          const response = await fetch('/api/db-query', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: 'upsert',
              table,
              upsertData: values
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { data: null, error: { message: errorData.error || 'Insert failed' } };
          }

          const resData = await response.json();
          return { data: resData.data, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      }
    };
  }
}

export const supabase = new SupabaseProxyClient();
