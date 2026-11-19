'use strict';

const sessionKey = 'pandaBobba.session';
const $ = id => document.getElementById(id);
const moneda = new Intl.NumberFormat('es-PE', {style:'currency', currency:'PEN'});
const fechaPedido = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima'
});
const estadosPedido = {RECIBIDO: 'Recibido', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado'};
const confirmacionesPedido = {
  ENTREGADO: {titulo: '¿Confirmar la entrega?', boton: 'Confirmar entrega', clase: 'primary'},
  CANCELADO: {titulo: '¿Cancelar este pedido?', boton: 'Confirmar cancelación', clase: 'danger'}
};

let token = null;
let admin = false;
let vistaActual = '';
let consultaCatalogo = 0;
let pendienteEliminar = null;
let preciosBase = [];
let cambiosPreparados = [];
let pedidos = [];
let cargandoPedidos = false;
let pendientePedido = null;

function informar(mensaje, error = false) {
  const estado = $('estado');
  estado.hidden = false;
  estado.textContent = mensaje;
  estado.className = `app-notice ${error ? 'error' : 'success'}`;
}

function cerrarSesion(motivo = 'logout') {
  token = null;
  sessionStorage.removeItem(sessionKey);
  location.replace(`/login?${motivo}=1`);
}

async function solicitud(url, method = 'GET', body) {
  const headers = {Authorization: `Bearer ${token}`};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(url, {
      method, headers, credentials: 'omit', cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new Error('No pudimos conectar con el servidor. Inténtalo de nuevo.');
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.ok) return data;

  if (response.status === 401) cerrarSesion('expired');
  const mensajes = {
    401: 'Tu sesión terminó. Inicia sesión para continuar.',
    403: 'Tu cuenta no tiene permiso para realizar esta acción.',
    404: 'El registro ya no está disponible.'
  };
  const campos = data?.fieldErrors ?? {};
  const detalle = Object.values(campos).join('\n') || data?.message || data?.detail
    || mensajes[response.status] || 'No se pudo completar la operación.';
  const error = new Error(detalle);
  error.estado = response.status;
  error.campos = campos;
  throw error;
}

function conectar(id, operacion, mensaje) {
  const formulario = $(id);
  formulario.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    const label = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = mensaje;
    }
    formulario.setAttribute('aria-busy', 'true');
    try {
      await operacion();
    } catch (error) {
      if (id === 'producto' && $('editor').open) {
        errorDialogo('errorProducto', error);
        for (const campo of Object.keys(error.campos ?? {})) {
          formulario.elements[campo]?.setAttribute('aria-invalid', 'true');
        }
        formulario.querySelector('[aria-invalid=true]')?.focus();
      } else {
        informar(error.message, true);
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
      formulario.removeAttribute('aria-busy');
    }
  });
}

function texto(tag, valor, clase) {
  const elemento = document.createElement(tag);
  elemento.textContent = valor;
  if (clase) elemento.className = clase;
  return elemento;
}

function accion(etiqueta, clase, operacion) {
  const boton = texto('button', etiqueta, `app-button ${clase}`);
  boton.type = 'button';
  boton.addEventListener('click', async () => {
    boton.disabled = true;
    try {
      await operacion();
    } catch (error) {
      informar(error.message, true);
    } finally {
      boton.disabled = false;
    }
  });
  return boton;
}

function errorDialogo(id, error) {
  $(id).textContent = error.message;
  $(id).hidden = false;
}

function imagenProducto(producto, clase, alt = '') {
  const imagen = document.createElement('img');
  imagen.className = clase;
  imagen.alt = alt;
  imagen.loading = 'lazy';
  imagen.referrerPolicy = 'no-referrer';
  imagen.src = /^(\/images\/|https:\/\/)/.test(producto.imagen) ? producto.imagen : '/images/icono.jpg';
  imagen.addEventListener('error', () => { imagen.src = '/images/icono.jpg'; }, {once: true});
  return imagen;
}

function actualizarResumen(productos) {
  const grupos = new Map();
  for (const producto of productos) {
    grupos.set(producto.categoria, (grupos.get(producto.categoria) || 0) + 1);
  }

  $('cantidad').textContent = productos.length;
  $('cantidadDescripcion').textContent = productos.length === 1 ? 'producto encontrado' : 'productos encontrados';
  $('categorias').textContent = grupos.size;
  const precios = productos.map(producto => producto.precio);
  $('promedio').textContent = productos.length
    ? moneda.format(precios.reduce((suma, precio) => suma + precio, 0) / precios.length) : '—';
  $('precioMinimo').textContent = productos.length ? moneda.format(Math.min(...precios)) : '—';
  $('precioMaximo').textContent = productos.length ? moneda.format(Math.max(...precios)) : '—';
  $('vistasProductos').replaceChildren(...productos.slice(0, 3).map(producto => imagenProducto(producto, '', producto.nombre)));
  if (!productos.length) $('vistasProductos').append(texto('span', 'Sin productos', 'read-only'));

  const grafico = $('graficoCategorias');
  grafico.replaceChildren();
  if (!productos.length) {
    const mensaje = 'No hay productos en esta selección.';
    grafico.setAttribute('aria-label', mensaje);
    grafico.append(texto('p', mensaje, 'chart-empty'));
    return;
  }
  grafico.setAttribute('aria-label', [...grupos].map(([nombre, total]) => `${nombre}: ${total}`).join(', '));
  const maximo = Math.max(...grupos.values());
  for (const [nombre, total] of grupos) {
    const columna = texto('div', '', 'chart-column');
    const pista = texto('div', '', 'chart-track');
    const barra = texto('div', '', `chart-bar ${total === maximo ? 'highlight' : ''}`);
    barra.style.height = `${Math.max(8, total / maximo * 100)}%`;
    barra.append(texto('span', total, 'bar-count'));
    pista.append(barra);
    columna.append(pista, texto('span', nombre, 'bar-label'));
    grafico.append(columna);
  }
}

function agregarOpcion(select, nombre) {
  if (![...select.options].some(opcion => opcion.value === nombre)) {
    select.add(new Option(nombre, nombre));
  }
}

async function cargarCategorias() {
  const categorias = await solicitud('/api/categorias');
  for (const id of ['categoriaFiltro', 'categoria']) {
    const select = $(id);
    const seleccion = select.value;
    select.length = 1;
    for (const categoria of categorias) agregarOpcion(select, categoria);
    select.value = categorias.includes(seleccion) ? seleccion : '';
  }
}

function limpiarEditor() {
  const formulario = $('producto');
  formulario.reset();
  formulario.elements.id.value = '';
  $('tituloEditor').textContent = 'Nuevo producto';
  $('errorProducto').hidden = true;
  for (const input of formulario.querySelectorAll('[aria-invalid]')) input.removeAttribute('aria-invalid');
}

async function editar(id) {
  const producto = await solicitud(`/api/productos/${id}`);
  limpiarEditor();
  agregarOpcion($('categoria'), producto.categoria);
  for (const [campo, valor] of Object.entries(producto)) {
    const input = $('producto').elements[campo];
    if (input) input.value = valor;
  }
  $('tituloEditor').textContent = `Editar ${producto.nombre}`;
  $('editor').showModal();
  $('nombre').focus();
}

function filaProducto(producto) {
  const fila = document.createElement('tr');
  const principal = document.createElement('td');
  const celda = texto('div', '', 'product-cell');
  const titulo = texto('a', producto.nombre, 'product-name');
  titulo.href = `/gestion-catalogo/carta/${producto.id}`;
  const info = document.createElement('div');
  info.append(titulo, texto('span', producto.descripcion, 'product-description'));
  celda.append(imagenProducto(producto, 'product-thumb'), info);
  principal.append(celda);

  const categoria = document.createElement('td');
  const color = {Caliente: 'warm', 'Frío': 'cold'}[producto.categoria] || '';
  categoria.append(texto('span', producto.categoria, `category-chip ${color}`));
  const precio = texto('td', moneda.format(producto.precio), 'product-price');
  const acciones = document.createElement('td');
  const grupo = texto('div', '', 'row-actions');
  if (admin) {
    const edicion = accion('Editar', 'secondary', () => editar(producto.id));
    edicion.setAttribute('aria-label', `Editar ${producto.nombre}`);
    const eliminar = accion('Eliminar', 'ghost delete-action', () => {
      pendienteEliminar = producto;
      $('detalleEliminar').textContent = producto.nombre;
      $('errorEliminar').hidden = true;
      $('confirmarEliminar').showModal();
      $('cancelarEliminar').focus();
    });
    eliminar.setAttribute('aria-label', `Eliminar ${producto.nombre}`);
    grupo.append(edicion, eliminar);
  } else {
    grupo.append(texto('span', 'Solo consulta', 'read-only'));
  }
  acciones.append(grupo);
  fila.append(principal, categoria, precio, acciones);
  return fila;
}

async function listar() {
  const consulta = ++consultaCatalogo;
  $('catalogo').setAttribute('aria-busy', 'true');
  try {
    const filtros = new URLSearchParams();
    for (const [campo, valor] of new FormData($('filtros'))) {
      if (valor.trim()) filtros.set(campo, campo === 'categoria' ? valor : valor.trim());
    }
    const productos = await solicitud(`/api/productos${filtros.size ? '?' + filtros : ''}`);
    if (consulta !== consultaCatalogo) return;
    actualizarResumen(productos);
    $('filas').replaceChildren(...productos.map(filaProducto));
    $('total').textContent = `${productos.length} ${productos.length === 1 ? 'producto' : 'productos'}`;
    $('total').hidden = false;
    $('vacio').hidden = productos.length !== 0;
    $('tablaProductos').hidden = productos.length === 0;
  } finally {
    if (consulta === consultaCatalogo) $('catalogo').removeAttribute('aria-busy');
  }
}

function cambiosDePrecios() {
  return preciosBase
    .map(producto => ({...producto, nuevoPrecio: Number($(`precioLote${producto.id}`).value)}))
    .filter(producto => producto.nuevoPrecio !== producto.precio);
}

function actualizarCambios() {
  const cambios = cambiosDePrecios();
  $('cambiosPendientes').textContent = cambios.length
    ? `${cambios.length} ${cambios.length === 1 ? 'precio pendiente' : 'precios pendientes'} de confirmación.`
    : 'No hay cambios pendientes.';
  for (const producto of preciosBase) {
    const nuevo = Number($(`precioLote${producto.id}`).value);
    const diferencia = Math.round((nuevo - producto.precio) * 100) / 100;
    $(`filaPrecio${producto.id}`).classList.toggle('changed', diferencia !== 0);
    $(`diferencia${producto.id}`).textContent = !Number.isFinite(nuevo) || nuevo <= 0 ? 'Revisa el precio'
      : diferencia ? `${diferencia > 0 ? '+' : ''}${moneda.format(diferencia)}` : 'Sin cambios';
  }
}

async function cargarPrecios(preservar = true) {
  const borrador = new Map(preservar ? cambiosDePrecios().map(producto => [producto.id, producto.nuevoPrecio]) : []);
  preciosBase = await solicitud('/api/productos');
  const tabla = $('preciosTabla');
  tabla.replaceChildren();
  for (const producto of preciosBase) {
    const fila = document.createElement('tr');
    fila.id = `filaPrecio${producto.id}`;
    const nombre = document.createElement('td');
    nombre.append(texto('span', producto.nombre, 'pricing-name'), texto('span', producto.categoria, 'pricing-category'));
    const actual = texto('td', moneda.format(producto.precio));
    const nuevo = document.createElement('td');
    const input = document.createElement('input');
    input.id = `precioLote${producto.id}`;
    input.type = 'number';
    input.min = '0.01';
    input.step = '0.01';
    input.required = true;
    input.value = (borrador.get(producto.id) ?? producto.precio).toFixed(2);
    input.setAttribute('aria-label', `Nuevo precio de ${producto.nombre}`);
    input.addEventListener('input', actualizarCambios);
    nuevo.append(input);
    const diferencia = texto('td', 'Sin cambios', 'price-difference');
    diferencia.id = `diferencia${producto.id}`;
    fila.append(nombre, actual, nuevo, diferencia);
    tabla.append(fila);
  }
  if (!preciosBase.length) {
    const fila = document.createElement('tr');
    const celda = texto('td', 'Agrega productos al catálogo para gestionar sus precios.');
    celda.colSpan = 4;
    fila.append(celda);
    tabla.append(fila);
  }
  actualizarCambios();
}

function informarPedidos(mensaje = '', error = false) {
  const estado = $('estadoPedidos');
  estado.textContent = mensaje;
  estado.className = `app-notice ${error ? 'error' : 'neutral'}`;
  estado.hidden = !mensaje;
}

function mostrarConfirmacionPedido(pedido, estado) {
  pendientePedido = {id: pedido.id, estado};
  const confirmacion = confirmacionesPedido[estado];
  $('tituloConfirmarPedido').textContent = confirmacion.titulo;
  $('detalleConfirmarPedido').textContent = `Pedido #${pedido.id} · ${pedido.nombre} · ${moneda.format(pedido.total)}`;
  $('aplicarPedido').textContent = confirmacion.boton;
  $('aplicarPedido').className = `app-button ${confirmacion.clase}`;
  $('errorConfirmarPedido').hidden = true;
  $('confirmarPedido').showModal();
  $('volverPedido').focus();
}

function tarjetaPedido(pedido) {
  const tarjeta = texto('article', '', 'pedido-card');
  const titulo = texto('h3', `Pedido #${pedido.id}`);
  titulo.id = `pedido-${pedido.id}`;
  titulo.tabIndex = -1;
  tarjeta.setAttribute('aria-labelledby', titulo.id);
  const cliente = texto('div', '', 'pedido-cliente');
  const telefono = texto('a', pedido.telefono);
  telefono.href = `tel:${pedido.telefono.replace(/[^\d+]/g, '')}`;
  cliente.append(texto('strong', pedido.nombre), telefono);

  const encabezado = texto('header', '', 'pedido-encabezado');
  const identificacion = document.createElement('div');
  const fecha = texto('time', fechaPedido.format(new Date(pedido.creadoEn)));
  fecha.dateTime = pedido.creadoEn;
  identificacion.append(titulo, fecha);
  const estado = texto('span', estadosPedido[pedido.estado], `pedido-estado ${pedido.estado.toLowerCase()}`);
  encabezado.append(identificacion, estado);

  const items = texto('ul', '', 'pedido-items');
  for (const item of pedido.items) {
    const fila = document.createElement('li');
    fila.append(texto('span', `${item.cantidad} × ${item.nombre}`), texto('span', moneda.format(item.subtotal)));
    items.append(fila);
  }
  const total = texto('div', '', 'pedido-total');
  total.append(texto('span', 'Total'), texto('strong', moneda.format(pedido.total)));
  tarjeta.append(encabezado, cliente, items, total);

  if (pedido.estado === 'RECIBIDO') {
    const acciones = texto('div', '', 'pedido-acciones');
    acciones.append(
      accion('Marcar como entregado', 'primary', () => mostrarConfirmacionPedido(pedido, 'ENTREGADO')),
      accion('Cancelar pedido', 'secondary delete-action', () => mostrarConfirmacionPedido(pedido, 'CANCELADO'))
    );
    tarjeta.append(acciones);
  }
  return tarjeta;
}

function mostrarPedidos() {
  const total = pedidos.filter(pedido => pedido.estado === 'RECIBIDO').length;
  $('pedidosPendientes').textContent = `${total} ${total === 1 ? 'pendiente' : 'pendientes'}`;
  $('pedidosPendientes').hidden = false;
  $('listaPedidos').replaceChildren(...pedidos.map(tarjetaPedido));
  if (!pedidos.length) $('listaPedidos').append(texto('p', 'Todavía no hay pedidos.', 'empty-state'));
}

async function cargarPedidos() {
  if (!admin || cargandoPedidos) return;
  cargandoPedidos = true;
  const boton = $('actualizarPedidos');
  boton.disabled = true;
  $('listaPedidos').setAttribute('aria-busy', 'true');
  $('listaPedidos').inert = true;
  informarPedidos('Actualizando pedidos…');
  try {
    pedidos = await solicitud('/api/pedidos');
    mostrarPedidos();
    informarPedidos();
  } catch (error) {
    informarPedidos(error.message, true);
  } finally {
    cargandoPedidos = false;
    boton.disabled = false;
    $('listaPedidos').removeAttribute('aria-busy');
    $('listaPedidos').inert = false;
  }
}

function mostrarVista(hash, enfocar = false) {
  const nueva = hash.slice(1);
  const enlaces = [...$('navegacionPanel').querySelectorAll('a:not([hidden])')];
  const vista = enlaces.some(enlace => enlace.hash === hash) ? nueva : 'resumen';
  if (vista === vistaActual) return;
  vistaActual = vista;
  $('estado').hidden = true;
  for (const seccion of document.querySelectorAll('.panel-vista')) {
    seccion.hidden = seccion.id !== vista;
  }
  for (const enlace of enlaces) {
    const activo = enlace.hash === `#${vista}`;
    enlace.classList.toggle('active', activo);
    if (activo) enlace.setAttribute('aria-current', 'location');
    else enlace.removeAttribute('aria-current');
  }
  if (enfocar) $(vista).querySelector('h1, h2').focus();
  if (vista === 'pedidos') void cargarPedidos();
}

async function iniciarPanel() {
  let sesion;
  try {
    sesion = JSON.parse(sessionStorage.getItem(sessionKey));
  } catch {
    sessionStorage.removeItem(sessionKey);
  }
  if (typeof sesion?.accessToken !== 'string' || !sesion.accessToken) {
    location.replace('/login');
    return;
  }
  token = sesion.accessToken;
  const cuenta = await solicitud('/api/auth/me');
  admin = cuenta.roles.some(rol => rol.authority === 'ROLE_ADMIN');
  for (const id of ['salir', 'rol', 'navegacionPanel']) $(id).hidden = false;
  for (const id of ['nuevo', 'navLote', 'navPedidos']) $(id).hidden = !admin;
  $('rol').textContent = admin ? 'Administrador' : 'Usuario';
  $('panelTipo').textContent = admin ? 'Panel administrativo' : 'Panel de catálogo';
  $('bienvenidaUsuario').textContent = cuenta.username;
  document.title = `${$('panelTipo').textContent} | Panda Bobba`;

  await Promise.all([listar(), cargarCategorias(), admin ? cargarPrecios() : undefined]);
  mostrarVista(location.hash);
}

conectar('filtros', async () => {
  await listar();
  $('estado').hidden = true;
}, 'Buscando…');

conectar('producto', async () => {
  const datos = Object.fromEntries(new FormData($('producto')));
  const id = datos.id;
  delete datos.id;
  datos.precio = Number(datos.precio);
  await solicitud(id ? `/api/productos/${id}` : '/api/productos', id ? 'PUT' : 'POST', datos);
  $('editor').close();
  limpiarEditor();
  informar(id ? 'Producto actualizado.' : 'Producto creado.');
  await Promise.all([listar(), cargarCategorias(), cargarPrecios()]);
}, 'Guardando…');

conectar('lote', () => {
  cambiosPreparados = cambiosDePrecios();
  if (!cambiosPreparados.length) throw new Error('Edita al menos un precio antes de abrir la vista previa.');
  if (cambiosPreparados.length > 50) throw new Error('Puedes confirmar hasta 50 cambios a la vez.');
  const resumen = $('resumenPrecios');
  resumen.replaceChildren();
  $('errorPrecios').hidden = true;
  for (const producto of cambiosPreparados) {
    const fila = texto('div', '', 'price-preview-row');
    const valores = document.createElement('span');
    valores.append(
      texto('del', moneda.format(producto.precio)), texto('span', ' → '),
      texto('b', moneda.format(producto.nuevoPrecio))
    );
    fila.append(texto('strong', producto.nombre), valores);
    resumen.append(fila);
  }
  $('confirmarPrecios').showModal();
  $('volverPrecios').focus();
}, 'Preparando…');

$('restablecerPrecios').addEventListener('click', () => {
  for (const producto of preciosBase) $(`precioLote${producto.id}`).value = producto.precio.toFixed(2);
  actualizarCambios();
});
$('volverPrecios').addEventListener('click', () => $('confirmarPrecios').close());
$('aplicarPrecios').addEventListener('click', async () => {
  const boton = $('aplicarPrecios');
  boton.disabled = true;
  boton.textContent = 'Guardando precios…';
  $('volverPrecios').disabled = true;
  $('errorPrecios').hidden = true;
  let guardados = false;
  try {
    await solicitud('/api/productos/precios', 'PATCH', {
      cambios: cambiosPreparados.map(producto => ({id: producto.id, precio: producto.nuevoPrecio}))
    });
    guardados = true;
    $('confirmarPrecios').close();
    await Promise.all([cargarPrecios(false), listar()]);
    informar('Precios actualizados.');
  } catch (error) {
    if (guardados) informar('Los precios se guardaron, pero la vista no se actualizó. Recarga el panel para verlos.', true);
    else errorDialogo('errorPrecios', error);
  } finally {
    boton.disabled = false;
    boton.textContent = 'Confirmar cambios';
    $('volverPrecios').disabled = false;
  }
});

$('nuevo').addEventListener('click', () => {
  limpiarEditor();
  $('editor').showModal();
  $('nombre').focus();
});
for (const id of ['cancelar', 'cerrarEditor']) $(id).addEventListener('click', () => $('editor').close());
$('producto').addEventListener('input', event => event.target.removeAttribute('aria-invalid'));

$('cancelarEliminar').addEventListener('click', () => $('confirmarEliminar').close());
$('eliminarConfirmado').addEventListener('click', async () => {
  const boton = $('eliminarConfirmado');
  boton.disabled = true;
  $('cancelarEliminar').disabled = true;
  $('errorEliminar').hidden = true;
  try {
    await solicitud(`/api/productos/${pendienteEliminar.id}`, 'DELETE');
    $('confirmarEliminar').close();
    informar('Producto eliminado de la carta.');
    await Promise.all([listar(), cargarCategorias(), cargarPrecios()]);
  } catch (error) {
    if ($('confirmarEliminar').open) errorDialogo('errorEliminar', error);
    else informar(error.message, true);
  } finally {
    boton.disabled = false;
    $('cancelarEliminar').disabled = false;
  }
});

$('actualizarPedidos').addEventListener('click', cargarPedidos);
$('volverPedido').addEventListener('click', () => $('confirmarPedido').close());
$('aplicarPedido').addEventListener('click', async () => {
  const {id, estado} = pendientePedido;
  const boton = $('aplicarPedido');
  boton.disabled = true;
  $('volverPedido').disabled = true;
  $('errorConfirmarPedido').hidden = true;
  try {
    const actualizado = await solicitud(`/api/pedidos/${id}`, 'PATCH', {estado});
    pedidos = pedidos.map(pedido => pedido.id === actualizado.id ? actualizado : pedido);
    $('confirmarPedido').close();
    mostrarPedidos();
    informarPedidos(`Pedido #${id} ${estadosPedido[estado].toLowerCase()}.`);
    $(`pedido-${id}`).focus();
  } catch (error) {
    errorDialogo('errorConfirmarPedido', error);
    if (error.estado === 409) await cargarPedidos();
  } finally {
    boton.disabled = false;
    $('volverPedido').disabled = false;
  }
});

for (const [dialogo, boton] of [
  ['confirmarEliminar', 'eliminarConfirmado'], ['confirmarPrecios', 'aplicarPrecios'], ['confirmarPedido', 'aplicarPedido']
]) {
  $(dialogo).addEventListener('cancel', event => {
    if ($(boton).disabled) event.preventDefault();
  });
}

$('salir').addEventListener('click', () => cerrarSesion());
for (const id of ['limpiarFiltros', 'restablecer']) {
  $(id).addEventListener('click', async () => {
    $('filtros').reset();
    try {
      await listar();
      $('estado').hidden = true;
    } catch (error) {
      informar(error.message, true);
    }
  });
}

for (const enlace of document.querySelectorAll('[data-vista]')) {
  enlace.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (enlace.hash !== location.hash) history.pushState(null, '', enlace.hash);
    mostrarVista(enlace.hash, true);
  });
}
window.addEventListener('hashchange', () => {
  if (vistaActual && location.hash !== '#contenido') mostrarVista(location.hash, true);
});
iniciarPanel().catch(error => {
  if (!$('navegacionPanel').hidden) mostrarVista(location.hash);
  informar(error.message, true);
});
