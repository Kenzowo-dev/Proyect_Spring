import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `
    <section class="panel empty narrow" aria-labelledby="denied-title">
      <p class="eyebrow">Permisos de cuenta</p>
      <h1 id="denied-title">Acceso restringido</h1>
      <p>Tu cuenta puede consultar el catálogo. Para crear, editar o eliminar productos se requiere el rol de administrador.</p>
      <a class="button primary" routerLink="/productos">Volver al catálogo</a>
    </section>
  `,
})
export class Denied {}
