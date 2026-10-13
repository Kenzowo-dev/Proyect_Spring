'use strict';
const sessionKey = 'pandaBobba.session';
const form = document.getElementById('login');
const statusMessage = document.getElementById('loginEstado');
function mensaje(texto, error = false) {
  statusMessage.hidden = false; statusMessage.textContent = texto;
  statusMessage.className = `alert ${error ? 'alert-danger' : 'alert-secondary'}`;
}
const params = new URLSearchParams(location.search);
if (params.has('expired')) mensaje('Tu sesión terminó. Inicia sesión de nuevo para continuar.');
else if (params.has('logout')) mensaje('Cerraste sesión correctamente.');
else if (params.has('error')) mensaje('Usuario o contraseña incorrectos.',true);
form.addEventListener('submit',async event => {
  event.preventDefault();
  const button = document.getElementById('entrar');
  const buttonLabel = button.querySelector('span');
  button.disabled = true; buttonLabel.textContent = 'Iniciando sesión…'; form.setAttribute('aria-busy','true'); statusMessage.hidden = true;
  try {
    const response = await fetch('/api/auth/login',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
    const session = await response.json().catch(() => null);
    if (!response.ok) throw new Error(response.status === 401 ? 'Usuario o contraseña incorrectos.' : session?.errors?.join('\n') || 'No se pudo iniciar sesión. Inténtalo de nuevo.');
    sessionStorage.setItem(sessionKey,JSON.stringify(session));
    document.getElementById('clave').value = '';
    location.replace('/panel');
  } catch(error) {mensaje(error.message,true);}
  finally {button.disabled = false; buttonLabel.textContent = 'Iniciar sesión'; form.removeAttribute('aria-busy');}
});
async function revisarSesion() {
  let session;
  try {session = JSON.parse(sessionStorage.getItem(sessionKey));} catch {sessionStorage.removeItem(sessionKey);}
  if (!session?.accessToken) return;
  try {
    const response = await fetch('/api/auth/me',{credentials:'omit',headers:{Authorization:`Bearer ${session.accessToken}`}});
    if (response.ok) location.replace('/panel');
    else if (response.status === 401 || response.status === 403) sessionStorage.removeItem(sessionKey);
  } catch { /* La pantalla permite reintentar el inicio de sesión. */ }
}
revisarSesion();
