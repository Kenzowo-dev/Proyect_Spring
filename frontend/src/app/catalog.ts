import { CurrencyPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './auth';
import { errorMessage, Product, Products } from './products';

@Component({
  imports: [CurrencyPipe, FormsModule, RouterLink],
  templateUrl: './catalog.html',
})
export class Catalog {
  private readonly api = inject(Products);
  private readonly auth = inject(AuthService);
  private readonly destroy = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly storefront = this.route.snapshot.data['storefront'] === true;
  readonly base = this.storefront ? '/carta' : '/productos';
  readonly admin = computed(() => !this.storefront && (this.auth.session()?.roles.includes('ROLE_ADMIN') ?? false));
  readonly rows = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly query = signal('');
  readonly category = signal('');
  readonly categories = computed(() => [...new Set(this.rows().map(product => product.categoria))]
    .sort((first, second) => first.localeCompare(second, 'es')));
  readonly visible = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('es');
    const category = this.category();
    return this.rows().filter(product =>
      (!category || product.categoria === category) &&
      (!query || [product.nombre, product.descripcion, product.categoria]
        .some(value => value?.toLocaleLowerCase('es').includes(query))));
  });
  readonly notice = !this.storefront && this.route.snapshot.queryParamMap.get('resultado') === 'eliminado'
    ? 'El producto se eliminó del catálogo.'
    : '';

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.list(this.storefront).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false))).subscribe({
      next: rows => this.rows.set(rows),
      error: error => this.error.set(errorMessage(error, 'No pudimos cargar el catálogo.')),
    });
  }

  clearFilters() {
    this.query.set('');
    this.category.set('');
  }
}
