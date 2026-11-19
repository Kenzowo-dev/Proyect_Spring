import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, tap, throwError } from 'rxjs';

interface Login {
  username: string;
  roles: string[];
  accessToken: string;
  expiresIn: number;
}

interface Session extends Login {
  expiresAt: number;
}

export interface ProductData {
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  imagen: string;
}

export interface Product extends ProductData {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly key = 'panda-bobba.angular.session';
  private readonly http = inject(HttpClient);
  private readonly state = signal(this.restore());
  readonly identity = this.state.asReadonly();
  readonly admin = computed(() => this.identity()?.roles.includes('ROLE_ADMIN') ?? false);

  private restore(): Session | null {
    try {
      const session = JSON.parse(sessionStorage.getItem(this.key) ?? 'null') as Session | null;
      return session && session.expiresAt > Date.now() ? session : null;
    } catch {
      return null;
    }
  }

  current() {
    const session = this.state();
    return session && session.expiresAt > Date.now() ? session : null;
  }

  login(username: string, password: string) {
    return this.http.post<Login>('/api/auth/login', { username, password }).pipe(tap(response => {
      const session = { ...response, expiresAt: Date.now() + response.expiresIn * 1000 };
      sessionStorage.setItem(this.key, JSON.stringify(session));
      this.state.set(session);
    }));
  }

  clear() {
    sessionStorage.removeItem(this.key);
    this.state.set(null);
  }
}

const anonymous = new HttpContextToken(() => false);

export const bearerInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/') || request.url === '/api/auth/login' || request.context.get(anonymous)) {
    return next(request);
  }
  const auth = inject(SessionService);
  const router = inject(Router);
  const identity = auth.identity();
  const session = auth.current();
  const outgoing = session
    ? request.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } })
    : request;
  return next(outgoing).pipe(catchError(error => {
    if (error instanceof HttpErrorResponse && error.status === 401 && auth.identity() === identity) {
      auth.clear();
      void router.navigate(['/acceso'], { queryParams: { sesion: 'vencida' } });
    }
    return throwError(() => error);
  }));
};

function requireSession() {
  const auth = inject(SessionService);
  const router = inject(Router);
  if (auth.current()) return true;
  auth.clear();
  return router.createUrlTree(['/acceso']);
}

export const sessionGuard: CanActivateFn = requireSession;

export const adminGuard: CanActivateFn = () => {
  const allowed = requireSession();
  if (allowed !== true) return allowed;
  return inject(SessionService).admin() || inject(Router).createUrlTree(['/sin-permiso']);
};

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/productos';

  list(filters: Record<string, string> = {}) {
    return this.http.get<Product[]>(this.url, { params: filters });
  }

  get(id: number) {
    return this.http.get<Product>(`${this.url}/${id}`);
  }

  save(data: ProductData, id?: number) {
    return id === undefined
      ? this.http.post<Product>(this.url, data)
      : this.http.put<Product>(`${this.url}/${id}`, data);
  }

  remove(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  updatePrices(changes: { id: number; precio: number }[]) {
    return this.http.patch<Product[]>(`${this.url}/precios`, { cambios: changes });
  }

  checkAnonymous(invalid = false) {
    return this.http.get<Product[]>(this.url, {
      context: new HttpContext().set(anonymous, true),
      headers: invalid ? { Authorization: 'Bearer token-invalido' } : {},
      observe: 'response',
    }).pipe(map(response => response.status));
  }

  checkAdminAccess() {
    // Un cuerpo vacío no supera la validación, incluso si la cuenta tiene permisos.
    return this.http.post<Product>(this.url, {}, { observe: 'response' }).pipe(map(response => response.status));
  }
}

export function httpMessage(error: HttpErrorResponse): string {
  const messages: Record<number, string> = {
    0: 'No se pudo conectar con el servidor. Intenta nuevamente.',
    400: 'Revisa los datos ingresados.',
    401: 'Se requiere una sesión válida.',
    403: 'Tu cuenta no tiene permiso para esta acción.',
    404: 'El producto ya no está disponible.',
  };
  if (Array.isArray(error.error?.errors)) return error.error.errors.join(' · ');
  return error.error?.message || messages[error.status] || 'No se pudo completar la operación.';
}
