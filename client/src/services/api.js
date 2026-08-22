export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(path, {
      credentials: 'include',
      headers,
      ...options,
    });

    if (res.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw { status: 401, message: 'Not authenticated' };
    }

    if (res.status === 204) {
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/csv')) {
      return await res.blob();
    }

    const text = await res.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!res.ok) {
      throw {
        status: res.status,
        body,
        message: (body && body.message) || `Request failed (${res.status})`,
        fieldErrors: (body && body.fieldErrors) || null,
        code: (body && body.code) || null,
      };
    }

    return body;
  } catch (err) {
    if (err.status) throw err;
    throw {
      status: 0,
      message: "Couldn't reach the server — check your connection.",
      body: null,
    };
  }
}

export function money(n) {
  return Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtAcct(num) {
  const s = String(num || '');
  return s.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default api;
