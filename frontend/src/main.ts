import { CurrencyPipe } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter, Router, RouterLink, RouterOutlet, withHashLocation } from '@angular/router';
import { finalize } from 'rxjs';
import { adminGuard, bearerInterceptor, CatalogApi, httpMessage, Product, SessionService, sessionGuard } from './api';

@Component({
  selector: 'pb-app',
  imports: [RouterLink, RouterOutlet],
  template: `
    <header><nav aria-label="Navegación principal">
      <a class="brand" href="/inicio">Panda Bobba</a>
      @if (auth.identity(); as session) {
        <a routerLink="/catalogo">Catálogo</a>
        @if (auth.admin()) { <a routerLink="/catalogo/nuevo">Nuevo producto</a> }
        <span class="identity">{{ session.username }} · {{ auth.admin() ? 'Administrador' : 'Consulta' }}</span>
        <button class="secondary" (click)="logout()">Cerrar sesión</button>
      }
    </nav></header>
    <main><router-outlet /></main>
  `,
})
class App {
  readonly auth = inject(SessionService);
  private readonly router = inject(Router);

  async logout() {
    this.auth.clear();
    const moved = await this.router.navigate(['/acceso'], { replaceUrl: true });
    if (moved) window.location.reload();
  }
}

@Component({
  imports: [ReactiveFormsModule],
  template: `
    <section class="login card">
      <h1>Acceso al catálogo</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Usuario <input formControlName="username" autocomplete="username"></label>
        <label>Contraseña <input formControlName="password" type="password" autocomplete="current-password"></label>
        @if (form.invalid && form.touched) { <p class="error">Completa el usuario y la contraseña.</p> }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <button [disabled]="busy()">Ingresar</button>
      </form>
    </section>
  `,
})
class LoginPage {
  private readonly auth = inject(SessionService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal(inject(ActivatedRoute).snapshot.queryParamMap.has('sesion')
    ? 'Tu sesión terminó. Ingresa nuevamente.' : '');
  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(/\S/)]],
    password: ['', Validators.required],
  });

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.error.set('');
    this.busy.set(true);
    const { username, password } = this.form.getRawValue();
    this.auth.login(username.trim(), password).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => void this.router.navigate(['/catalogo']),
      error: error => this.error.set(error.status === 401 ? 'El usuario o la contraseña son incorrectos.' : httpMessage(error)),
    });
  }
}

@Component({
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  templateUrl: './catalog.html',
})
class CatalogPage implements OnInit {
  private readonly api = inject(CatalogApi);
  readonly auth = inject(SessionService);
  readonly products = signal<Product[]>([]);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly checkResult = signal('');
  readonly checking = signal(false);
  readonly busy = signal(false);
  readonly deleting = signal<Product | null>(null);
  readonly drafts = signal<Partial<Record<number, number>>>({});
  readonly preview = signal(false);
  readonly filters = inject(FormBuilder).nonNullable.group({
    texto: '', categoria: '', minimo: '', maximo: '',
  });

  ngOnInit() {
    this.load();
  }

  load() {
    if (this.busy()) return;
    this.error.set('');
    const filters = Object.fromEntries(Object.entries(this.filters.getRawValue())
      .map(([key, value]) => [key, String(value ?? '').trim()]).filter(([, value]) => value !== ''));
    if (Number(filters['minimo']) < 0 || Number(filters['maximo']) < 0
        || (filters['maximo'] !== undefined && Number(filters['minimo'] ?? 0) > Number(filters['maximo']))) {
      this.error.set('Usa precios mayores o iguales a cero y un máximo mayor o igual al mínimo.');
      return;
    }
    this.busy.set(true);
    this.api.list(filters).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: products => this.products.set(products),
      error: error => this.error.set(httpMessage(error)),
    });
  }

  remove(product: Product) {
    if (this.busy()) return;
    this.error.set('');
    this.feedback.set('');
    this.busy.set(true);
    this.api.remove(product.id).subscribe({
      next: () => {
        this.setPrice(product.id, '');
        this.deleting.set(null);
        this.feedback.set(`Se eliminó «${product.nombre}».`);
        this.busy.set(false);
        this.load();
      },
      error: error => {
        this.busy.set(false);
        this.deleting.set(null);
        this.error.set(httpMessage(error));
      },
    });
  }

  setPrice(id: number, value: string) {
    const drafts = { ...this.drafts() };
    if (value === '') delete drafts[id];
    else drafts[id] = Number(value);
    this.drafts.set(drafts);
    this.preview.set(false);
  }

  changes() {
    return Object.entries(this.drafts()).flatMap(([id, precio]) =>
      precio === undefined ? [] : [{ id: Number(id), precio }]);
  }

  previewPrices() {
    const changes = this.changes();
    this.error.set('');
    if (!changes.length || changes.length > 50 || changes.some(change => !Number.isFinite(change.precio) || change.precio <= 0)) {
      this.error.set('Ingresa entre 1 y 50 precios positivos.');
      return;
    }
    this.preview.set(true);
  }

  savePrices() {
    if (!this.preview() || this.busy()) return;
    this.busy.set(true);
    this.feedback.set('');
    this.api.updatePrices(this.changes()).subscribe({
      next: () => {
        this.drafts.set({});
        this.preview.set(false);
        this.feedback.set('Se guardaron los precios del lote.');
        this.busy.set(false);
        this.load();
      },
      error: error => {
        this.busy.set(false);
        this.error.set(httpMessage(error));
      },
    });
  }

  checkAccess(mode: 'missing' | 'invalid' | 'role') {
    this.checkResult.set('');
    this.checking.set(true);
    const request = mode === 'role' ? this.api.checkAdminAccess() : this.api.checkAnonymous(mode === 'invalid');
    request.pipe(finalize(() => this.checking.set(false))).subscribe({
      next: status => this.checkResult.set(`HTTP ${status}`),
      error: error => this.checkResult.set(`HTTP ${error.status} · ${httpMessage(error)}`),
    });
  }
}

function positive(control: AbstractControl) {
  return typeof control.value === 'number' && Number.isFinite(control.value) && control.value > 0
    ? null : { positive: true };
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './editor.html',
})
class ProductEditor implements OnInit {
  private readonly api = inject(CatalogApi);
  private readonly router = inject(Router);
  private readonly param = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly id = this.param === null ? undefined : Number(this.param);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly loaded = signal(this.id === undefined);
  readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    descripcion: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    categoria: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
    precio: [0, positive],
    imagen: ['/images/oreo.jpg', [Validators.required, Validators.maxLength(255), Validators.pattern(/^(?:\/images\/|https:\/\/)\S+$/)]],
  });

  ngOnInit() {
    if (this.id === undefined) return;
    if (!Number.isSafeInteger(this.id) || this.id <= 0) {
      this.error.set('El identificador del producto no es válido.');
      return;
    }
    this.busy.set(true);
    this.api.get(this.id).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: product => {
        this.form.patchValue(product);
        this.loaded.set(true);
      },
      error: error => this.error.set(httpMessage(error)),
    });
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy() || !this.loaded()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.save(this.form.getRawValue(), this.id).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => void this.router.navigate(['/catalogo']),
      error: error => this.error.set(httpMessage(error)),
    });
  }
}

@Component({
  imports: [RouterLink],
  template: '<h1>Acceso restringido</h1><p>Esta ruta requiere una cuenta de administrador.</p><a routerLink="/catalogo">Volver al catálogo</a>',
})
class ForbiddenPage {}

bootstrapApplication(App, {
  providers: [
    provideHttpClient(withInterceptors([bearerInterceptor])),
    provideRouter([
      { path: 'acceso', component: LoginPage },
      { path: 'catalogo/nuevo', component: ProductEditor, canActivate: [adminGuard] },
      { path: 'catalogo/:id/editar', component: ProductEditor, canActivate: [adminGuard] },
      { path: 'catalogo', component: CatalogPage, canActivate: [sessionGuard] },
      { path: 'sin-permiso', component: ForbiddenPage, canActivate: [sessionGuard] },
      { path: '**', redirectTo: 'catalogo' },
    ], withHashLocation()),
  ],
}).catch(console.error);
