/**
 * Cliente de autenticación del frontend.
 *
 * El navegador solo habla con el backend de Django (/api/auth/...). Django es
 * quien se comunica con Supabase usando las credenciales guardadas en
 * variables de entorno, así ninguna clave llega al HTML ni al JavaScript.
 */

function getCookie(name) {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : '';
}

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { success: false, error: 'No se pudo conectar con el servidor. Revisa tu conexión.' };
  }

  let data = {};
  try { data = await response.json(); } catch { /* respuesta sin JSON */ }

  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Ocurrió un error inesperado. Inténtalo nuevamente.',
      fieldErrors: data.fieldErrors || {},
      status: response.status,
    };
  }
  return { success: true, ...data };
}

export const authApi = {
  register: (payload) => request('/api/auth/register/', { method: 'POST', body: payload }),
  login: (email, password) => request('/api/auth/login/', { method: 'POST', body: { email, password } }),
  logout: () => request('/api/auth/logout/', { method: 'POST' }),
  me: () => request('/api/auth/me/'),
  getStudents: () => request('/api/students/'),
  updateStudentStatus: (studentId, state) =>
    request(`/api/students/${studentId}/status/`, { method: 'POST', body: { state } }),
};
