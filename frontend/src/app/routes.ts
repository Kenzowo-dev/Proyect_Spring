import { Routes } from '@angular/router';
import { administrator, signedIn } from './auth';

export const routes: Routes = [
  { path: 'carta', title: 'Carta de bebidas | Panda Bobba', data: { storefront: true }, loadComponent: () => import('./catalog').then(m => m.Catalog) },
  { path: 'carta/:id', title: 'Detalle de bebida | Panda Bobba', data: { storefront: true }, loadComponent: () => import('./detail').then(m => m.Detail) },
  { path: 'carrito', title: 'Tu carrito | Panda Bobba', data: { storefront: true }, loadComponent: () => import('./checkout').then(m => m.Checkout) },
  { path: 'acceso', title: 'Iniciar sesión | Panda Bobba', loadComponent: () => import('./login').then(m => m.Login) },
  { path: 'registro', title: 'Crear cuenta | Panda Bobba', loadComponent: () => import('./register').then(m => m.Register) },
  { path: 'sin-permiso', title: 'Acceso restringido | Panda Bobba', canActivate: [signedIn], loadComponent: () => import('./denied').then(m => m.Denied) },
  { path: 'productos', title: 'Catálogo | Panda Bobba', canActivate: [signedIn], loadComponent: () => import('./catalog').then(m => m.Catalog) },
  { path: 'productos/nuevo', title: 'Nuevo producto | Panda Bobba', canActivate: [signedIn, administrator], loadComponent: () => import('./editor').then(m => m.Editor) },
  { path: 'productos/:id/editar', title: 'Editar producto | Panda Bobba', canActivate: [signedIn, administrator], loadComponent: () => import('./editor').then(m => m.Editor) },
  { path: 'productos/:id', title: 'Detalle de producto | Panda Bobba', canActivate: [signedIn], loadComponent: () => import('./detail').then(m => m.Detail) },
  { path: '', pathMatch: 'full', redirectTo: 'productos' },
  { path: '**', redirectTo: 'productos' },
];
