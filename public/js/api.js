// Client-side API helper
const API = {
  getToken() { return localStorage.getItem('token'); },

  async fetch(url, opts = {}) {
    const token = this.getToken();
    const timeout = opts.timeout || 300000; // 5dk varsayilan
    delete opts.timeout;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        ...opts,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...opts.headers,
        }
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        Router.navigate('/login');
        throw new Error('Oturum suresi doldu');
      }

      return res;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Istek zaman asimina ugradi. AI islemleri uzun surebilir, tekrar deneyin.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },

  async get(url) {
    const res = await this.fetch(url);
    return res.json();
  },

  async post(url, body, opts = {}) {
    const res = await this.fetch(url, { method: 'POST', body: JSON.stringify(body), ...opts });
    return res.json();
  },

  async put(url, body, opts = {}) {
    const res = await this.fetch(url, { method: 'PUT', body: JSON.stringify(body), ...opts });
    return res.json();
  },

  async del(url) {
    const res = await this.fetch(url, { method: 'DELETE' });
    return res.json();
  }
};
