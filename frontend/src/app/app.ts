import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './auth';

@Component({
  selector: 'panda-root',
  imports: [RouterLink, RouterOutlet],
  template: `
    <button class="button skip-link" type="button" (click)="content.focus()">Ir al contenido</button>
    <header class="site-header">
      <div class="shell header-row">
        <a routerLink="/productos" class="brand">
          <img src="/images/icono.jpg" width="40" height="40" alt="">
          <span>Panda Bobba <small>Gestión de catálogo</small></span>
        </a>
        @if (session(); as account) {
          <div class="account">
            <div class="identity"><strong>{{ account.username }}</strong><small>{{ role() }}</small></div>
            <button type="button" class="button quiet" (click)="logout()">Cerrar sesión</button>
          </div>
        }
      </div>
    </header>
    <main #content class="shell main" id="contenido" tabindex="-1"><router-outlet /></main>
    <footer class="shell footer">Panda Bobba <span>Catálogo de bebidas</span></footer>
  `,
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly session = this.auth.session;
  readonly role = computed(() => this.session()?.roles.includes('ROLE_ADMIN') ? 'Administrador' : 'Operador');

  logout() {
    this.auth.logout();
    void this.router.navigate(['/acceso']);
  }
}
