// Client-side API helper
const API = {
  getToken() { return localStorage.getItem('token'); },

  async fetch(url, opts = {}) {
    const token = this.getToken();
    const res = await fetch(url, {
      ...opts,
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
  },

  async get(url) {
    const res = await this.fetch(url);
    return res.json();
  },

  async post(url, body) {
    const res = await this.fetch(url, { method: 'POST', body: JSON.stringify(body) });
    return res.json();
  },

  async put(url, body) {
    const res = await this.fetch(url, { method: 'PUT', body: JSON.stringify(body) });
    return res.json();
  },

  async del(url) {
    const res = await this.fetch(url, { method: 'DELETE' });
    return res.json();
  }
};
