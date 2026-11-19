import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, storefrontReturnPath } from './auth';
import { errorMessage } from './products';

const usernamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{2,49}$/;
const passwordBytes = (control: AbstractControl<string>) =>
  new TextEncoder().encode(control.value).length > 72 ? { tooLong: true } : null;

type AuthField = 'username' | 'password';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="login-layout panel" aria-labelledby="register-title">
      <div class="login-photo" role="img" aria-label="Bebida de Panda Bobba"></div>
      <div class="login-body">
        <h1 id="register-title">Crear cuenta</h1>
        @if (destination() === '/carrito') { <p>Crea tu cuenta para confirmar el pedido.</p> }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="register-username">Usuario</label>
            <input id="register-username" formControlName="username" autocomplete="username"
              autocapitalize="none" spellcheck="false" maxlength="50" required
              (input)="clearFieldError('username')"
              [attr.aria-invalid]="!!fieldError('username')" aria-describedby="register-username-error">
            <p class="field-error" id="register-username-error">{{ fieldError('username') }}</p>
          </div>
          <div class="field">
            <label for="register-password">Contraseña</label>
            <input id="register-password" type="password" formControlName="password" autocomplete="new-password"
              minlength="12" maxlength="72" required
              (input)="clearFieldError('password')"
              [attr.aria-invalid]="!!fieldError('password')"
              aria-describedby="register-password-hint register-password-error">
            <small id="register-password-hint">Usa al menos 12 caracteres.</small>
            <p class="field-error" id="register-password-error">{{ fieldError('password') }}</p>
          </div>
          @if (error()) { <p class="notice error" role="alert">{{ error() }}</p> }
          <button class="button primary" type="submit" [disabled]="busy()">
            {{ busy() ? 'Creando cuenta…' : 'Crear cuenta' }}
          </button>
        </form>
        <p class="auth-support">¿Ya tienes cuenta? <a routerLink="/acceso" [queryParams]="{ volver: destination() }">Iniciar sesión</a></p>
      </div>
    </section>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly destination = computed(() => storefrontReturnPath(this.params().get('volver')) ?? '/carta');
  readonly busy = signal(false);
  readonly error = signal('');
  private readonly serverErrors = signal<Partial<Record<AuthField, string>>>({});
  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(usernamePattern)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72), Validators.pattern(/\S/), passwordBytes]],
  });

  fieldError(field: AuthField): string {
    const control = this.form.controls[field];
    const serverError = this.serverErrors()[field];
    if (serverError) return serverError;
    if (!control.touched || control.valid) return '';
    if (field === 'username') {
      if (control.hasError('required')) return 'Ingresa tu usuario.';
      return 'Usa de 3 a 50 caracteres. Comienza con una letra o un número y usa solo letras sin tildes, números, puntos, guiones o guiones bajos.';
    }
    if (control.hasError('required')) return 'Ingresa tu contraseña.';
    if (control.hasError('tooLong') || control.hasError('maxlength')) return 'Acorta la contraseña.';
    if (control.hasError('pattern')) return 'Incluye al menos un carácter que no sea un espacio.';
    return 'Usa al menos 12 caracteres.';
  }

  clearFieldError(field: AuthField) {
    this.serverErrors.update(errors => ({ ...errors, [field]: undefined }));
  }

  submit() {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { username, password } = this.form.getRawValue();
    this.error.set('');
    this.serverErrors.set({});
    this.busy.set(true);
    this.auth.register(username, password).pipe(
      takeUntilDestroyed(this.destroy),
      finalize(() => this.busy.set(false)),
    ).subscribe({
      next: () => void this.router.navigateByUrl(this.destination(), { replaceUrl: true }),
      error: (failure: unknown) => {
        if (failure instanceof HttpErrorResponse) {
          if (failure.status === 409) {
            if (this.form.controls.username.value === username) {
              this.serverErrors.set({ username: 'Elige otro usuario. Este nombre ya está en uso o está reservado.' });
            }
            return;
          }
          const fields = failure.error?.fieldErrors;
          if (typeof fields?.username === 'string' || typeof fields?.password === 'string') {
            this.serverErrors.set({
              username: this.form.controls.username.value === username && typeof fields.username === 'string' ? fields.username : undefined,
              password: this.form.controls.password.value === password && typeof fields.password === 'string' ? fields.password : undefined,
            });
            return;
          }
        }
        this.error.set(errorMessage(failure, 'No pudimos crear tu cuenta. Inténtalo nuevamente.'));
      },
    });
  }
}
