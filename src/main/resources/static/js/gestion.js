'use strict';
const sessionKey = 'pandaBobba.session';
let token = null;
let admin = false;
let productos = [];
let pendienteEliminar = null;
let preciosBase = [];
let cambiosPreparados = [];
const $ = id => document.getElementById(id);
const moneda = valor => new Intl.NumberFormat('es-PE', {style:'currency', currency:'PEN'}).format(valor);
function informar(mensaje, error = false) {
  $('estado').hidden = false;
  $('estado').textContent = mensaje;
  $('estado').className = `app-notice ${error ? 'error' : 'success'}`;
}
function cerrarSesion(motivo = 'logout') {
  token = null; admin = false; productos = [];
  sessionStorage.removeItem(sessionKey);
  location.replace(`/login?${motivo}=1`);
}
async function solicitud(url, method = 'GET', body, credencial = token) {
  const headers = {};
  if (credencial) headers.Authorization = `Bearer ${credencial}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {method, headers, credentials:'omit', body:body === undefined ? undefined : JSON.stringify(body)});
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && credencial && credencial === token) cerrarSesion('expired');
    const detalle = data?.errors?.join('\n') || data?.message || ({401:'Credencial ausente, incorrecta o expirada. Inicia sesión para continuar.',403:'Tu rol no permite esta operación.',404:'Producto no encontrado.'}[response.status]) || 'No se pudo completar la operación.';
    const error = new Error(`${method} · HTTP ${response.status}: ${detalle}`);
    error.estadoHTTP = response.status;
    error.campos = data?.errors || [];
    throw error;
  }
  return {data, status:response.status};
}
function conectar(id, accion) {
  $(id).addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter; const label = button?.textContent;
    if (button) {button.disabled = true; button.textContent = ({login:'Iniciando sesión…',filtros:'Buscando…',lote:'Preparando…'})[id] || 'Guardando…';}
    $(id).setAttribute('aria-busy','true');
    try { await accion(); } catch (error) {
      informar(error.message,true);
      if (id === 'producto' && $('editor').open) {
        $('errorProducto').hidden = false; $('errorProducto').textContent = error.message;
        for (const campo of error.campos || []) {
          const input = $('producto').elements[campo.split(':')[0]];
          if (input) input.setAttribute('aria-invalid','true');
        }
        $('producto').querySelector('[aria-invalid=true]')?.focus();
      }
    } finally { if (button) {button.disabled = false; button.textContent = label;} $(id).removeAttribute('aria-busy'); }
  });
}
function limpiarEditor() {
  $('producto').reset(); $('producto').elements.id.value = ''; $('tituloEditor').textContent = 'Nuevo producto'; $('errorProducto').hidden = true;
  for (const input of $('producto').querySelectorAll('[aria-invalid]')) input.removeAttribute('aria-invalid');
}
function texto(tag, valor, clase) {
  const node = document.createElement(tag); node.textContent = valor; if (clase) node.className = clase; return node;
}
async function editar(id) {
  const {data} = await solicitud(`/api/productos/${id}`);
  limpiarEditor();
  for (const [key,value] of Object.entries(data)) if ($('producto').elements[key]) $('producto').elements[key].value = value;
  $('tituloEditor').textContent = `Editar ${data.nombre}`; $('editor').showModal(); $('nombre').focus();
}
function accion(label, clase, operacion) {
  const button = texto('button',label,`app-button ${clase}`); button.type = 'button';
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {await operacion();} catch(e) {informar(e.message,true);} finally {button.disabled = false;}
  });
  return button;
}
function actualizarResumen(data) {
  const grupos = new Map();
  for (const p of data) grupos.set(p.categoria,(grupos.get(p.categoria) || 0)+1);
  const maximo = Math.max(1,...grupos.values());
  $('graficoCategorias').replaceChildren();
  $('graficoCategorias').setAttribute('aria-label',data.length ? [...grupos].map(([nombre,n]) => `${nombre}: ${n} ${n === 1 ? 'producto' : 'productos'}`).join(', ') : 'Sin productos para mostrar');
  for (const [nombre,n] of grupos) {
    const columna = document.createElement('div'); columna.className = 'chart-column';
    const pista = document.createElement('div'); pista.className = 'chart-track';
    const barra = document.createElement('div'); barra.className = `chart-bar ${n === maximo ? 'highlight' : ''}`;
    barra.style.height = `${Math.max(8,n/maximo*100)}%`;
    barra.append(texto('span',n,'bar-count')); pista.append(barra);
    columna.append(pista,texto('span',nombre,'bar-label')); $('graficoCategorias').append(columna);
  }
  if (!data.length) $('graficoCategorias').append(texto('p','No hay productos en esta selección.','chart-empty'));
  const precios = data.map(p => p.precio);
  $('precioMinimo').textContent = data.length ? moneda(Math.min(...precios)) : '—';
  $('precioMaximo').textContent = data.length ? moneda(Math.max(...precios)) : '—';
  $('vistasProductos').replaceChildren();
  for (const p of data.slice(0,3)) {
    const imagen = document.createElement('img'); imagen.alt = p.nombre; imagen.title = p.nombre;
    imagen.src = /^(\/images\/|https:\/\/)/.test(p.imagen) ? p.imagen : '/images/icono.jpg';
    imagen.addEventListener('error',() => {imagen.src = '/images/icono.jpg';},{once:true});
    $('vistasProductos').append(imagen);
  }
  if (!data.length) $('vistasProductos').append(texto('span','Sin productos','read-only'));
}
async function listar() {
  $('catalogo').setAttribute('aria-busy','true');
  try {
    const filtros = new URLSearchParams();
    for (const [key,value] of new FormData($('filtros'))) if (value.trim()) filtros.set(key,value.trim());
    const {data} = await solicitud(`/api/productos?${filtros}`); productos = data;
    $('filas').replaceChildren();
    $('cantidad').textContent = data.length; $('categorias').textContent = new Set(data.map(p => p.categoria)).size;
    $('cantidadDescripcion').textContent = data.length === 1 ? 'producto encontrado' : 'productos encontrados';
    $('promedio').textContent = data.length ? moneda(data.reduce((s,p) => s+p.precio,0)/data.length) : '—';
    actualizarResumen(data);
    $('total').textContent = `${data.length} ${data.length === 1 ? 'producto' : 'productos'}`;
    $('vacio').hidden = data.length > 0; $('tablaProductos').hidden = !data.length;
    for (const p of data) {
      const tr = document.createElement('tr');
      const principal = document.createElement('td'); const cell = document.createElement('div'); cell.className = 'product-cell';
      const image = document.createElement('img'); image.className = 'product-thumb'; image.alt = ''; image.loading = 'lazy';
      image.src = /^(\/images\/|https:\/\/)/.test(p.imagen) ? p.imagen : '/images/icono.jpg';
      image.addEventListener('error', () => {image.src = '/images/icono.jpg';}, {once:true});
      const info = document.createElement('div'); info.append(texto('div',p.nombre,'product-name'),texto('span',p.descripcion,'product-description'),texto('span',`ID ${p.id}`,'product-id'));
      cell.append(image,info); principal.append(cell);
      const category = document.createElement('td'); category.append(texto('span',p.categoria,`category-chip ${p.categoria === 'Caliente' ? 'warm' : p.categoria === 'Frío' ? 'cold' : ''}`));
      const price = texto('td',moneda(p.precio),'product-price');
      const actions = document.createElement('td'); const group = document.createElement('div'); group.className = 'row-actions';
      if (admin) {
        const edit = accion('Editar','secondary',() => editar(p.id)); edit.setAttribute('aria-label',`Editar ${p.nombre}`);
        const remove = accion('Eliminar','ghost delete-action',() => {
          pendienteEliminar = p; $('detalleEliminar').textContent = p.nombre; $('confirmarEliminar').showModal(); $('cancelarEliminar').focus();
        }); remove.setAttribute('aria-label',`Eliminar ${p.nombre}`); group.append(edit,remove);
      } else {group.append(texto('span','Solo consulta','read-only'));}
      actions.append(group); tr.append(principal,category,price,actions); $('filas').append(tr);
    }
  } finally {$('catalogo').removeAttribute('aria-busy');}
}
async function iniciarPanel() {
  let session;
  try {session = JSON.parse(sessionStorage.getItem(sessionKey));} catch {sessionStorage.removeItem(sessionKey);}
  if (typeof session?.accessToken !== 'string' || !session.accessToken) {
    location.replace('/login'); return;
  }
  token = session.accessToken;
  const {data} = await solicitud('/api/auth/me');
  admin = data.roles.some(role => role.authority === 'ROLE_ADMIN');
  for (const id of ['salir','sesion','resumen','catalogo']) $(id).hidden = false;
  for (const id of ['nuevo','lotePanel','navLote']) $(id).hidden = !admin;
  $('sinPermiso').hidden = admin; $('permisoAyuda').hidden = admin;
  $('rol').textContent = admin ? 'Administrador' : 'Usuario';
  $('panelTipo').textContent = admin ? 'Panel administrativo' : 'Panel de catálogo';
  $('bienvenidaUsuario').textContent = data.username;
  $('avatarCuenta').textContent = data.username.slice(0,1).toUpperCase();
  $('avatarCuenta').setAttribute('aria-label',`Cuenta de ${data.username}`);
  document.title = `${admin ? 'Panel administrativo' : 'Panel de catálogo'} | Panda Bobba`;
  $('sesion').textContent = `${data.username} · ${admin ? 'Puedes gestionar la carta de la tienda.' : 'Tu cuenta permite consultar el catálogo.'}`;
  await listar(); if (admin) await cargarPrecios(); $('estado').hidden = true;
}
conectar('filtros', async () => {await listar(); informar('Búsqueda completada · HTTP 200');});
conectar('producto', async () => {
  const datos = Object.fromEntries(new FormData($('producto'))); const id = datos.id; delete datos.id; datos.precio = Number(datos.precio);
  const {status} = await solicitud(`/api/productos${id ? '/'+id : ''}`,id ? 'PUT' : 'POST',datos);
  $('editor').close(); limpiarEditor(); await listar(); informar(`Producto ${id ? 'actualizado' : 'creado'} correctamente · HTTP ${status}`);
  if (admin) await cargarPrecios();
});
function cambiosDePrecios() {
  return preciosBase.map(p => ({...p,nuevoPrecio:Number($(`precioLote${p.id}`).value)})).filter(p => p.nuevoPrecio !== p.precio);
}
function actualizarCambios() {
  const cambios = cambiosDePrecios();
  $('cambiosPendientes').textContent = cambios.length ? `${cambios.length} ${cambios.length === 1 ? 'precio pendiente' : 'precios pendientes'} de confirmación.` : 'No hay cambios pendientes.';
  for (const p of preciosBase) {
    const nuevo = Number($(`precioLote${p.id}`).value); const diferencia = Math.round((nuevo-p.precio)*100)/100;
    $(`filaPrecio${p.id}`).classList.toggle('changed',diferencia !== 0);
    $(`diferencia${p.id}`).textContent = !Number.isFinite(nuevo) || nuevo <= 0 ? 'Revisa el precio' : diferencia ? `${diferencia > 0 ? '+' : ''}${moneda(diferencia)}` : 'Sin cambios';
  }
}
async function cargarPrecios(preservar = true) {
  const borrador = new Map(preservar ? cambiosDePrecios().map(p => [p.id,p.nuevoPrecio]) : []);
  const {data} = await solicitud('/api/productos'); preciosBase = data; $('preciosTabla').replaceChildren();
  for (const p of data) {
    const tr = document.createElement('tr'); tr.id = `filaPrecio${p.id}`;
    const nombre = document.createElement('td'); nombre.append(texto('span',p.nombre,'pricing-name'),texto('span',p.categoria,'pricing-category'));
    const actual = texto('td',moneda(p.precio));
    const nuevo = document.createElement('td'); const input = document.createElement('input');
    input.id = `precioLote${p.id}`; input.type = 'number'; input.min = '0.01'; input.step = '0.01'; input.required = true;
    input.value = (borrador.get(p.id) ?? p.precio).toFixed(2); input.setAttribute('aria-label',`Nuevo precio de ${p.nombre}`); input.addEventListener('input',actualizarCambios); nuevo.append(input);
    const diferencia = texto('td','Sin cambios','price-difference'); diferencia.id = `diferencia${p.id}`;
    tr.append(nombre,actual,nuevo,diferencia); $('preciosTabla').append(tr);
  }
  if (!data.length) {const tr = document.createElement('tr'); const td = texto('td','Agrega productos al catálogo para gestionar sus precios.'); td.colSpan = 4; tr.append(td); $('preciosTabla').append(tr);}
  actualizarCambios();
}
conectar('lote',async () => {
  cambiosPreparados = cambiosDePrecios();
  if (!cambiosPreparados.length) throw new Error('Edita al menos un precio antes de abrir la vista previa.');
  if (cambiosPreparados.length > 50) throw new Error('Puedes confirmar hasta 50 cambios a la vez.');
  if (cambiosPreparados.some(p => !Number.isFinite(p.nuevoPrecio) || p.nuevoPrecio <= 0)) throw new Error('Todos los nuevos precios deben ser positivos.');
  $('resumenPrecios').replaceChildren(); $('errorPrecios').hidden = true;
  for (const p of cambiosPreparados) {
    const fila = document.createElement('div'); fila.className = 'price-preview-row'; const valores = document.createElement('span');
    valores.append(texto('del',moneda(p.precio)),texto('span',' → '),texto('b',moneda(p.nuevoPrecio)));
    fila.append(texto('strong',p.nombre),valores); $('resumenPrecios').append(fila);
  }
  $('confirmarPrecios').showModal(); $('volverPrecios').focus();
});
$('restablecerPrecios').addEventListener('click',() => {for (const p of preciosBase) $(`precioLote${p.id}`).value = p.precio.toFixed(2); actualizarCambios();});
$('volverPrecios').addEventListener('click',() => $('confirmarPrecios').close());
$('aplicarPrecios').addEventListener('click',async () => {
  const button = $('aplicarPrecios'); button.disabled = true; button.textContent = 'Aplicando cambios…';
  let guardados = false;
  try {
    await solicitud('/api/productos/precios','PATCH',{cambios:cambiosPreparados.map(p => ({id:p.id,precio:p.nuevoPrecio}))});
    guardados = true;
    $('confirmarPrecios').close(); await cargarPrecios(false); await listar(); informar('Precios confirmados y guardados en una sola transacción · HTTP 200');
  } catch(error) {
    if (guardados) informar('Los precios se guardaron, pero no se pudo actualizar la vista. Recarga el panel para comprobarlos.',true);
    else {
      const detalle = [400,401,403,404,409].includes(error.estadoHTTP) ? 'No se guardó ningún precio del lote.' : 'No pudimos comprobar el resultado. Consulta los precios antes de reintentar.';
      $('errorPrecios').textContent = `${error.message}\n${detalle}`; $('errorPrecios').hidden = false;
    }
  } finally {button.disabled = false; button.textContent = 'Confirmar cambios';}
});
$('nuevo').addEventListener('click',() => {limpiarEditor(); $('editor').showModal(); $('nombre').focus();});
for (const id of ['cancelar','cerrarEditor']) $(id).addEventListener('click',() => $('editor').close());
$('producto').addEventListener('input',e => e.target.removeAttribute('aria-invalid'));
$('cancelarEliminar').addEventListener('click',() => $('confirmarEliminar').close());
$('eliminarConfirmado').addEventListener('click',async () => {
  const button = $('eliminarConfirmado'); button.disabled = true;
  try {await solicitud(`/api/productos/${pendienteEliminar.id}`,'DELETE'); $('confirmarEliminar').close(); await listar(); if (admin) await cargarPrecios(); informar('Producto eliminado de la carta · HTTP 204');}
  catch(e) {$('confirmarEliminar').close(); informar(e.message,true);}
  finally {button.disabled = false; pendienteEliminar = null;}
});
$('salir').addEventListener('click',() => cerrarSesion());
for (const id of ['limpiarFiltros','restablecer']) $(id).addEventListener('click',async () => {
  $('filtros').reset(); try {await listar(); informar('Se muestran todos los productos.');} catch(e) {informar(e.message,true);}
});
for (const [id,credencial] of [['sinToken',null],['invalido','token-invalido']]) $(id).addEventListener('click',async () => {
  try {await solicitud('/api/productos','GET',undefined,credencial); informar('El servidor aceptó la solicitud.');} catch(e) {informar(e.message,true);}
});
$('sinPermiso').addEventListener('click',async () => {
  if (admin) return;
  const p = productos[0];
  if (!p) {informar('Busca un producto existente para comprobar el permiso de edición.',true); return;}
  try {await solicitud(`/api/productos/${p.id}`,'PUT',{nombre:p.nombre,descripcion:p.descripcion,categoria:p.categoria,precio:p.precio,imagen:p.imagen}); informar('El servidor aceptó la edición.');}
  catch(e) {informar(e.message,true);}
});
iniciarPanel().catch(error => informar(error.message,true));
for (const link of document.querySelectorAll('.dashboard-tabs a[href^="#"]')) link.addEventListener('click',() => {
  for (const item of document.querySelectorAll('.dashboard-tabs a')) {item.classList.remove('active'); item.removeAttribute('aria-current');}
  link.classList.add('active'); link.setAttribute('aria-current','location');
});
