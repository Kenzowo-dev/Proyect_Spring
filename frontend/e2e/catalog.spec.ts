import { execFileSync } from 'node:child_process';
import { expect, Page, test } from '@playwright/test';

function apiResponse(page: Page, method: string, path: string) {
  return page.waitForResponse(response =>
    response.request().method() === method && new URL(response.url()).pathname === path);
}

async function login(page: Page, username: string, password: string) {
  await expect(page).toHaveURL(/#\/acceso$/);
  const userInput = page.getByLabel('Usuario');
  const passwordInput = page.getByLabel('Contraseña');
  await userInput.fill(username);
  await passwordInput.fill(password);
  await expect(userInput).toHaveValue(username);
  await expect(passwordInput).not.toHaveValue('');
  const response = apiResponse(page, 'POST', '/api/auth/login');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Catálogo de productos' })).toBeVisible();
}

async function logout(page: Page) {
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Cerrar sesión' }).click(),
  ]);
}

function checkSql(name: string, expected: number | null) {
  const container = process.env.E2E_SQL_CONTAINER;
  if (!container) return;
  // El nombre se genera en esta prueba a partir de Date.now().
  const condition = expected === null
    ? `EXISTS (SELECT 1 FROM dbo.productos WHERE name = '${name}')`
    : `(SELECT COUNT(*) FROM dbo.productos WHERE name = '${name}' AND price = ${expected}) <> 1`;
  execFileSync('docker', [
    'exec', container, 'sh', '-c',
    'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -d PandaBobbaBD -b -Q "$1"',
    'sqlcmd', `IF ${condition} THROW 51000, 'La fila SQL no coincide con el resultado del navegador', 1;`,
  ], { stdio: 'inherit' });
}

test('Angular navega, valida, aplica roles y persiste el CRUD mediante Spring', async ({ page }) => {
  const name = `Bobba E2E ${Date.now()}`;
  await page.goto('#/catalogo/nuevo');
  await expect(page).toHaveURL(/#\/acceso$/);
  await page.getByLabel('Usuario').fill('admin');
  await page.getByLabel('Contraseña').fill('clave-incorrecta');
  const failedLogin = apiResponse(page, 'POST', '/api/auth/login');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  expect((await failedLogin).status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText('incorrectos');
  await login(page, 'admin', process.env.DEMO_ADMIN_PASSWORD ?? 'admin123');
  const menu = page.getByRole('navigation', { name: 'Menú del panel' });
  await expect(menu.getByRole('link', { name: 'Catálogo', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(menu).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await menu.getByRole('link', { name: 'Nuevo producto' }).click();
  await expect(menu.getByRole('link', { name: 'Nuevo producto' })).toHaveAttribute('aria-current', 'page');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  await expect(page.getByText('El precio debe ser mayor que cero.')).toBeVisible();
  await page.getByLabel('Nombre').fill(name);
  await page.getByLabel('Descripción').fill('Producto temporal de integración');
  await page.getByLabel('Categoría').fill('Frío');
  await page.getByLabel('Precio en soles').fill('12.5');

  const created = apiResponse(page, 'POST', '/api/productos');
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  const createResponse = await created;
  expect(createResponse.status()).toBe(201);
  const { id } = await createResponse.json();
  expect(createResponse.headers()['location']).toBe(`/api/productos/${id}`);
  expect(createResponse.request().postDataJSON()).toMatchObject({ nombre: name, precio: 12.5 });
  expect(await createResponse.request().headerValue('authorization')).toMatch(/^Bearer /);
  checkSql(name, 12.5);

  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) });
  await card.getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel('Precio en soles').fill('13.75');
  const updated = apiResponse(page, 'PUT', `/api/productos/${id}`);
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  expect((await updated).status()).toBe(200);
  checkSql(name, 13.75);

  await card.getByLabel('Nuevo precio en lote').fill('14.25');
  await page.getByRole('button', { name: 'Revisar cambios' }).click();
  const batch = apiResponse(page, 'PATCH', '/api/productos/precios');
  await page.getByRole('button', { name: 'Confirmar precios' }).click();
  expect((await batch).status()).toBe(200);
  checkSql(name, 14.25);
  await page.reload();
  await expect(card).toContainText('14.25');
  const filtered = apiResponse(page, 'GET', '/api/productos');
  await page.getByLabel('Nombre').fill(name);
  await page.getByRole('button', { name: 'Buscar' }).click();
  expect(await (await filtered).json()).toMatchObject([{ id, nombre: name, precio: 14.25 }]);

  await page.getByText('Comprobar acceso a la API').click();
  for (const [button, authorization] of [
    ['Consultar sin token', null],
    ['Consultar con token inválido', 'Bearer token-invalido'],
  ] as const) {
    const result = apiResponse(page, 'GET', '/api/productos');
    await page.getByRole('button', { name: button, exact: true }).click();
    const response = await result;
    expect(response.status()).toBe(401);
    expect(await response.request().headerValue('authorization')).toBe(authorization);
    await expect(page.getByText('HTTP 401', { exact: false })).toBeVisible();
  }
  await logout(page);
  await login(page, 'user', process.env.DEMO_USER_PASSWORD ?? 'user123');
  await expect(card).toContainText('14.25');
  await expect(page.getByRole('link', { name: 'Nuevo producto' })).toHaveCount(0);
  await page.goto('#/catalogo/nuevo');
  await expect(page).toHaveURL(/#\/sin-permiso$/);
  await page.getByRole('link', { name: 'Volver al catálogo' }).click();
  await page.getByText('Comprobar acceso a la API').click();
  const forbidden = apiResponse(page, 'POST', '/api/productos');
  await page.getByRole('button', { name: 'Comprobar permiso de escritura' }).click();
  expect((await forbidden).status()).toBe(403);
  await expect(page.getByText('HTTP 403', { exact: false })).toBeVisible();
  checkSql(name, 14.25);

  await logout(page);
  await login(page, 'admin', process.env.DEMO_ADMIN_PASSWORD ?? 'admin123');
  await card.getByRole('button', { name: 'Eliminar' }).click();
  const removed = apiResponse(page, 'DELETE', `/api/productos/${id}`);
  await page.getByRole('button', { name: 'Confirmar eliminación' }).click();
  expect((await removed).status()).toBe(204);
  await expect(card).toHaveCount(0);
  checkSql(name, null);
});
