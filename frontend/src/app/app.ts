import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService, storefrontReturnPath } from './auth';
import { Cart } from './cart';

@Component({
  selector: 'panda-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <button class="button skip-link" type="button" (click)="content.focus()">Ir al contenido</button>
    <header class="site-header">
      <div class="shell header-row" [class.storefront-header]="storefront()">
        <a [routerLink]="storefront() ? '/carta' : '/productos'" class="brand">
          <img src="/images/icono.jpg" width="40" height="40" alt="">
          <span>Panda Bobba</span>
        </a>
        @if (storefront()) {
          <nav class="site-nav" aria-label="Tienda">
            <a routerLink="/carta" routerLinkActive="active" ariaCurrentWhenActive="page">Carta</a>
            <a routerLink="/carrito" routerLinkActive="active" ariaCurrentWhenActive="page">
              Carrito <span class="cart-count">{{ cart.count() }}</span>
            </a>
          </nav>
        }
        <div class="account">
          @if (!storefront()) {
            <a class="button quiet" routerLink="/carta">Ver carta pública</a>
          }
          @if (session(); as account) {
            <div class="identity" [title]="account.username">
              <strong>{{ account.username }}</strong>
              @if (!storefront()) { <small>{{ role() }}</small> }
            </div>
            <button type="button" class="button quiet" (click)="logout()">Cerrar sesión</button>
          } @else if (storefront() && !isCustomerAccess()) {
            <a class="button quiet" routerLink="/acceso" [queryParams]="{ volver: returnToStorefront() }">Iniciar sesión</a>
          }
        </div>
      </div>
    </header>
    <main #content class="shell main" id="contenido" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer">
      <div class="shell footer-row">
        <a class="footer-brand" routerLink="/carta">Panda Bobba</a>
        <nav aria-label="Enlaces del pie de página">
          <a href="/">Inicio</a>
          <a href="/nosotros">Nosotros</a>
          <a href="/panel">Panel administrativo</a>
        </nav>
      </div>
    </footer>
  `,
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly url = toSignal(this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map(event => event.urlAfterRedirects),
  ), { initialValue: this.router.url });
  private readonly path = computed(() => this.url().split(/[?#]/, 1)[0]);
  private readonly publicPath = computed(() => storefrontReturnPath(this.path()));
  private readonly customerReturn = computed(() => {
    const volver = this.router.parseUrl(this.url()).queryParamMap.get('volver');
    return storefrontReturnPath(volver);
  });
  readonly cart = inject(Cart);
  readonly isCustomerAccess = computed(() => this.path() === '/registro'
    || (this.path() === '/acceso' && Boolean(this.customerReturn())));
  readonly storefront = computed(() => Boolean(this.publicPath()) || this.isCustomerAccess());
  readonly returnToStorefront = computed(() => this.publicPath() ?? this.customerReturn() ?? '/carta');
  readonly session = this.auth.session;
  readonly role = computed(() => this.session()?.roles.includes('ROLE_ADMIN') ? 'Administrador' : 'Usuario');

  logout() {
    this.auth.logout();
    if (!this.storefront()) void this.router.navigate(['/acceso']);
  }
}
