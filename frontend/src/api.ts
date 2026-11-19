import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

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
  private readonly http = inject(HttpClient);
  private readonly state = signal<Session | null>(null);
  private readonly channel = typeof BroadcastChannel === 'function'
    ? new BroadcastChannel('panda-bobba-session') : null;
  private pending?: Observable<Session | null>;
  readonly identity = this.state.asReadonly();
  readonly admin = computed(() => this.identity()?.roles.includes('ROLE_ADMIN') ?? false);

  constructor() {
    sessionStorage.removeItem('panda-bobba.angular.session');
    this.channel?.addEventListener('message', event => {
      if (event.data === 'changed') window.location.reload();
    });
  }

  ensure() {
    const session = this.state();
    if (session && session.expiresAt > Date.now() + 30_000) return of(session);
    if (!this.pending) {
      this.pending = this.http.get<Login>('/api/session/token').pipe(
        map(response => this.remember(response)),
        catchError(error => {
          if (error.status !== 401) return throwError(() => error);
          this.state.set(null);
          return of(null);
        }),
        finalize(() => { this.pending = undefined; }),
        shareReplay(1),
      );
    }
    return this.pending;
  }

  private remember(response: Login) {
    const session = { ...response, expiresAt: Date.now() + response.expiresIn * 1000 };
    this.state.set(session);
    return session;
  }

  private csrfPost<T>(path: string, body: object) {
    return this.http.get<{ headerName: string; token: string }>('/api/session/csrf').pipe(
      switchMap(({ headerName, token }) => this.http.post<T>(path, body, {
        headers: { [headerName]: token },
      })),
    );
  }

  login(username: string, password: string) {
    return this.csrfPost<Login>('/api/session/login', { username, password }).pipe(tap(response => {
      this.remember(response);
      this.channel?.postMessage('changed');
    }));
  }

  logout() {
    return this.csrfPost<void>('/api/session/logout', {}).pipe(tap(() => {
      this.state.set(null);
      this.channel?.postMessage('changed');
    }));
  }

  clear() {
    this.state.set(null);
  }
}

const anonymous = new HttpContextToken(() => false);

export const bearerInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/') || request.url.startsWith('/api/session')
      || request.url === '/api/auth/login' || request.context.get(anonymous)) {
    return next(request);
  }
  const auth = inject(SessionService);
  const router = inject(Router);
  return auth.ensure().pipe(switchMap(session => {
    const outgoing = session
      ? request.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } })
      : request;
    return next(outgoing).pipe(catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401 && auth.identity() === session) {
        auth.clear();
        void router.navigate(['/acceso'], { queryParams: { sesion: 'vencida' } });
      }
      return throwError(() => error);
    }));
  }));
};

function protectRoute(adminOnly = false) {
  const auth = inject(SessionService);
  const router = inject(Router);
  return auth.ensure().pipe(
    map(session => {
      if (!session) return router.createUrlTree(['/acceso']);
      if (adminOnly && !auth.admin()) return router.createUrlTree(['/sin-permiso']);
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/acceso'], { queryParams: { sesion: 'sin-conexion' } }))),
  );
}

export const sessionGuard: CanActivateFn = () => protectRoute();
export const adminGuard: CanActivateFn = () => protectRoute(true);
export const guestGuard: CanActivateFn = () => {
  const auth = inject(SessionService);
  const router = inject(Router);
  return auth.ensure().pipe(
    map(session => session ? router.createUrlTree(['/catalogo']) : true),
    catchError(() => of(true)),
  );
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
