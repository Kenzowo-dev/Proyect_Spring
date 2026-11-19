import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth';
import { Cart, maxQuantity } from './cart';

@Component({
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.html',
})
export class Checkout {
  private readonly auth = inject(AuthService);
  private readonly username = computed(() => this.auth.session()?.username);
  readonly signedIn = computed(() => Boolean(this.username()));
  readonly cart = inject(Cart);
  readonly maxQuantity = maxQuantity;
  readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    telefono: ['', [
      Validators.required,
      Validators.maxLength(25),
      Validators.pattern(/^\s*\+?(?:[\s()-]*\d){7,15}[\s()-]*$/),
    ]],
  });

  constructor() {
    effect(() => {
      const username = this.username();
      const pending = username ? untracked(this.cart.pending) : null;
      this.form.reset({ nombre: pending?.nombre ?? '', telefono: pending?.telefono ?? '' });
    });
    this.cart.refresh();
  }

  confirm() {
    if (!this.signedIn()) return;
    this.form.markAllAsTouched();
    if (this.form.valid) this.cart.submit(this.form.getRawValue());
  }
}
