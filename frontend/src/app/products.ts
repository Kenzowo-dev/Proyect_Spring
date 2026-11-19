import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

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
export class Products {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/productos';

  list() {
    return this.http.get<Product[]>(this.endpoint);
  }

  get(id: string) {
    return this.http.get<Product>(this.endpoint + '/' + encodeURIComponent(id));
  }

  categories() {
    return this.http.get<string[]>('/api/categorias');
  }

  create(data: ProductData) {
    return this.http.post<Product>(this.endpoint, data);
  }

  update(id: string, data: ProductData) {
    return this.http.put<Product>(this.endpoint + '/' + encodeURIComponent(id), data);
  }

  delete(id: number) {
    return this.http.delete<void>(this.endpoint + '/' + id);
  }
}

export function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof HttpErrorResponse)) return fallback;

  switch (error.status) {
    case 0: return 'No pudimos conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
    case 401: return 'Tu sesión ha terminado. Vuelve a iniciar sesión.';
    case 403: return 'Tu cuenta no tiene permisos para realizar esta acción.';
    case 404: return 'El producto no existe o ya fue eliminado.';
    default: return typeof error.error?.detail === 'string' ? error.error.detail
      : typeof error.error?.message === 'string' ? error.error.message : fallback;
  }
}
