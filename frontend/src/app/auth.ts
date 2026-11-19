import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';

interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  username: string;
  roles: string[];
}

interface Session extends Omit<LoginResponse, 'expiresIn'> {
  expiresAt: number;
}

const SESSION_KEY = 'panda-catalogo.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly current = signal<Session | null>(this.restore());
  readonly session = this.current.asReadonly();

  login(username: string, password: string) {
    return this.http.post<LoginResponse>('/api/auth/login', { username, password }).pipe(
      tap(({ accessToken, expiresIn, username, roles }) => {
        const session = { accessToken, expiresAt: Date.now() + expiresIn * 1000, username, roles };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        this.current.set(session);
      }),
    );
  }

  activeSession() {
    const session = this.current();
    if (session && session.expiresAt <= Date.now()) {
      this.logout();
      return null;
    }
    return session;
  }

  logout() {
    this.current.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  private restore(): Session | null {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      const data = JSON.parse(stored);
      if (typeof data?.accessToken === 'string' && typeof data.username === 'string'
          && typeof data.expiresAt === 'number' && Array.isArray(data.roles)
          && data.expiresAt > Date.now()) return data;
    } catch {
      // An invalid stored session can be discarded.
    }
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export const signedIn: CanActivateFn = (_, state) => inject(AuthService).activeSession()
  ? true
  : inject(Router).createUrlTree(['/acceso'], { queryParams: { volver: state.url } });

export const administrator: CanActivateFn = () => inject(AuthService).activeSession()?.roles.includes('ROLE_ADMIN')
  ? true
  : inject(Router).createUrlTree(['/sin-permiso']);

export const apiAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/') || request.url === '/api/auth/login') return next(request);

  const auth = inject(AuthService);
  const router = inject(Router);
  const session = auth.activeSession();
  return next(session ? request.clone({ setHeaders: { Authorization: 'Bearer ' + session.accessToken } }) : request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && auth.session() === session
          && !router.url.startsWith('/acceso')) {
        auth.logout();
        void router.navigate(['/acceso'], { queryParams: { motivo: 'sesion', volver: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
