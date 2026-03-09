// API utilities
const PROPERTIES_URL = '/api/properties';
const AUTH_URL = '/api/auth';
const RESERVATIONS_URL = '/api/reservations';
const ADMIN_URL = '/api/admin';
const ASSISTANT_URL = '/api/assistant/chat';

export async function getProperties() {
  try {
    const res = await fetch(PROPERTIES_URL);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error al obtener propiedades', error);
    return [];
  }
}

export async function getPropertyById(id) {
  if (!id) return null;

  try {
    const res = await fetch(`${PROPERTIES_URL}/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error al obtener propiedad', error);
    return null;
  }
}

export async function registerUser(payload) {
  try {
    const res = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, message: data?.message, errors: data?.errors };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

export async function loginUser(payload) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message || 'Credenciales inválidas.'
      };
    }

    return {
      ok: true,
      data
    };
  } catch {
    return {
      ok: false,
      message: 'No se pudo conectar con el servidor.'
    };
  }
}

export async function createReservation(payload) {
  try {
    const token = localStorage.getItem('userToken');
    const res = await fetch(RESERVATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      const errorMessage = data?.errors?.join(' ') || data?.message || 'No se pudo registrar la reserva';
      return { ok: false, message: errorMessage };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

export async function getReservations(propertyId) {
  try {
    const url = propertyId ? `${RESERVATIONS_URL}?property_id=${propertyId}` : RESERVATIONS_URL;
    const token = localStorage.getItem('adminToken');
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.status === 401) {
      return { error: 'unauthorized' };
    }
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error al obtener reservas', error);
    return { error: 'unknown' };
  }
}

export async function getRegisteredUsers() {
  try {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${ADMIN_URL}/users`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.status === 401) {
      return { error: 'unauthorized' };
    }
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error al obtener usuarios', error);
    return { error: 'unknown' };
  }
}

export async function getAvailability(propertyId) {
  if (!propertyId) return [];
  try {
    const res = await fetch(`${RESERVATIONS_URL}/availability/${propertyId}`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error al obtener disponibilidad', error);
    return [];
  }
}

export async function deleteReservation(id) {
  if (!id) return { ok: false, message: 'ID requerido' };
  const token = localStorage.getItem('adminToken');
  try {
    const res = await fetch(`${RESERVATIONS_URL}/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, message: data?.message || 'No se pudo eliminar' };
    }
    return { ok: true, message: data?.message };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

export async function adminLogin(payload) {
  try {
    const res = await fetch(`${ADMIN_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, message: data?.message || 'No autorizado' };
    }
    return { ok: true, token: data.token };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

export async function adminLogout() {
  const token = localStorage.getItem('adminToken');
  try {
    await fetch(`${ADMIN_URL}/logout`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  } catch (error) {
    console.error('Error cerrando sesión admin', error);
  }
  localStorage.removeItem('adminToken');
}

export async function askAssistant(payload) {
  try {
    const res = await fetch(ASSISTANT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, message: data?.message || 'No se pudo obtener respuesta' };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

export async function getMyProfile(token) {
  const res = await fetch('/api/user/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function updateMyProfile(token, payload) {
  const res = await fetch('/api/user/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function getMyReservations(token) {
  const response = await fetch('/api/user/my-reservations', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
  return response.json();
}