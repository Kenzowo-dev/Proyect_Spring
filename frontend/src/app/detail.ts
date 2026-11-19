import { CurrencyPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from './auth';
import { Cart } from './cart';
import { errorMessage, Product, Products } from './products';

@Component({
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './detail.html',
})
export class Detail {
  private readonly api = inject(Products);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  readonly storefront = this.route.snapshot.data['storefront'] === true;
  readonly admin = computed(() => !this.storefront && (this.auth.session()?.roles.includes('ROLE_ADMIN') ?? false));
  readonly cart = inject(Cart);
  readonly cartNotice = signal('');
  readonly product = signal<Product | null>(null);
  readonly loading = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');
  readonly deleteError = signal('');
  readonly notice = { creado: 'El producto se agregó al catálogo.', editado: 'El producto se actualizó correctamente.' }[
    this.route.snapshot.queryParamMap.get('resultado') as 'creado' | 'editado'
  ] ?? '';

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.load());
  }

  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.cartNotice.set('');
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.request = this.api.get(id, this.storefront).pipe(
      takeUntilDestroyed(this.destroy),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: product => this.product.set(product),
      error: error => this.error.set(errorMessage(error, 'No pudimos cargar el producto.')),
    });
  }

  addToCart(product: Product) {
    this.cartNotice.set(this.cart.add(product)
      ? `${product.nombre} en tu carrito (${this.cart.quantity(product.id)}).`
      : 'Alcanzaste el límite de esta bebida o del carrito.');
  }

  delete(dialog: HTMLDialogElement, product: Product) {
    if (this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.api.delete(product.id).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.deleting.set(false))).subscribe({
      next: () => {
        dialog.close();
        void this.router.navigate(['/productos'], { queryParams: { resultado: 'eliminado' } });
      },
      error: error => this.deleteError.set(errorMessage(error, 'No pudimos eliminar el producto.')),
    });
  }
}
