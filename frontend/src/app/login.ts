import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './auth';
import { errorMessage } from './products';

@Component({
  imports: [ReactiveFormsModule],
  template: `
    <section class="login-layout panel" aria-labelledby="login-title">
      <div class="login-photo" role="img" aria-label="Bebida de Panda Bobba"></div>
      <div class="login-body">
        <p class="eyebrow">Acceso al catálogo</p>
        <h1 id="login-title">Iniciar sesión</h1>
        <p>Consulta el menú o administra los productos según los permisos de tu cuenta.</p>
        @if (expired) { <p class="notice" role="status">Tu sesión ha terminado. Ingresa nuevamente para continuar.</p> }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="username">Usuario</label>
            <input id="username" formControlName="username" autocomplete="username" maxlength="100"
              [attr.aria-invalid]="form.controls.username.touched && form.controls.username.invalid"
              aria-describedby="username-feedback">
            <p class="field-error" id="username-feedback">
              @if (form.controls.username.touched && form.controls.username.invalid) { Ingresa tu usuario. }
            </p>
          </div>
          <div class="field">
            <label for="password">Contraseña</label>
            <input id="password" type="password" formControlName="password" autocomplete="current-password" maxlength="255"
              [attr.aria-invalid]="form.controls.password.touched && form.controls.password.invalid"
              aria-describedby="password-feedback">
            <p class="field-error" id="password-feedback">
              @if (form.controls.password.touched && form.controls.password.invalid) { Ingresa tu contraseña. }
            </p>
          </div>
          @if (error()) { <p class="notice error" role="alert">{{ error() }}</p> }
          <button class="button primary" type="submit" [disabled]="busy()">
            {{ busy() ? 'Iniciando sesión…' : 'Iniciar sesión' }}
          </button>
        </form>
      </div>
    </section>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly expired = this.route.snapshot.queryParamMap.get('motivo') === 'sesion';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(/\S/)]],
    password: ['', Validators.required],
  });

  submit() {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { username, password } = this.form.getRawValue();
    this.error.set('');
    this.busy.set(true);
    this.auth.login(username.trim(), password).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        const next = this.route.snapshot.queryParamMap.get('volver') ?? '';
        const destination = /^\/productos(?:\/(?:nuevo|\d+(?:\/editar)?))?$/.test(next) ? next : '/productos';
        void this.router.navigateByUrl(destination, { replaceUrl: true });
      },
      error: error => this.error.set(error instanceof HttpErrorResponse && error.status === 401
        ? 'Usuario o contraseña incorrectos.'
        : errorMessage(error, 'No pudimos iniciar sesión. Inténtalo nuevamente.')),
    });
  }
}
