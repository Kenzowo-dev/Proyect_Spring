import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from './auth';
import { errorMessage, Product, Products } from './products';

interface CartLine extends Pick<Product, 'id' | 'nombre' | 'imagen' | 'precio'> {
  cantidad: number;
  disponible: boolean;
}

interface Contact {
  nombre: string;
  telefono: string;
}

interface OrderRequest extends Contact {
  solicitudId: string;
  items: { productoId: number; cantidad: number; precioUnitario: number }[];
}

interface PendingOrder {
  request: OrderRequest;
  lines: CartLine[];
  cartVersion: number;
}

interface Receipt {
  id: number;
  total: number;
  estado: 'RECIBIDO' | 'ENTREGADO' | 'CANCELADO';
  items: { productoId: number; nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
}

interface AccountCheckout {
  username: string;
  pending: PendingOrder | null;
  receipt: Receipt | null;
}

interface CartSession {
  lines: CartLine[];
  version: number;
  accounts: AccountCheckout[];
}

const storageKey = 'panda-carta.carrito.v2';
const guestStorageKey = 'panda-carta.carrito.v1';
const maxProducts = 50;
export const maxQuantity = 99;

function restore(): CartSession {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as CartSession | null;
    if (Array.isArray(saved?.lines) && Number.isInteger(saved.version) && Array.isArray(saved.accounts)) {
      return saved;
    }
    const guest = JSON.parse(sessionStorage.getItem(guestStorageKey) ?? 'null') as Pick<CartSession, 'lines'> | null;
    if (Array.isArray(guest?.lines)) return { lines: guest.lines, version: 0, accounts: [] };
  } catch {
    // The cart still works when browser storage is unavailable.
  }
  return { lines: [], version: 0, accounts: [] };
}

function requestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

@Injectable({ providedIn: 'root' })
export class Cart {
  private readonly http = inject(HttpClient);
  private readonly products = inject(Products);
  private readonly auth = inject(AuthService);
  private readonly state = signal(restore());
  private readonly reviewed = signal(false);
  private readonly submitting = signal<string[]>([]);
  private readonly orderFailure = signal<{ username: string; message: string } | null>(null);
  private readonly username = computed(() => this.auth.session()?.username);
  private readonly checkout = computed(() => this.state().accounts.find(account => account.username === this.username()));
  private readonly pendingOrder = computed(() => this.checkout()?.pending ?? null);
  readonly pending = computed(() => this.pendingOrder()?.request ?? null);
  readonly receipt = computed(() => this.state().lines.length === 0 && !this.pendingOrder()
    ? this.checkout()?.receipt ?? null : null);
  readonly lines = computed(() => this.pendingOrder()?.lines ?? this.state().lines);
  readonly count = computed(() => this.lines().reduce((sum, line) => sum + line.cantidad, 0));
  readonly total = computed(() => this.lines().reduce((sum, line) =>
    sum + Math.round(line.precio * 100) * line.cantidad, 0) / 100);
  readonly busy = computed(() => this.submitting().some(username => username === this.username()));
  readonly refreshing = signal(false);
  readonly refreshError = signal('');
  readonly notice = signal('');
  readonly orderError = computed(() => {
    const failure = this.orderFailure();
    return failure && failure.username === this.username() ? failure.message : '';
  });
  readonly canSubmit = computed(() => Boolean(this.username()) && this.reviewed() && !this.busy()
    && !this.pendingOrder() && this.lines().length > 0 && this.lines().every(line => line.disponible));

  quantity(id: number) {
    return this.lines().find(line => line.id === id)?.cantidad ?? 0;
  }

  add(product: Product) {
    const existing = this.quantity(product.id);
    if (this.pendingOrder() || existing >= maxQuantity
        || (!existing && this.lines().length >= maxProducts)) return false;

    const { id, nombre, imagen, precio } = product;
    const line = { id, nombre, imagen, precio, cantidad: existing + 1, disponible: true };
    const lines = existing ? this.lines().map(item => item.id === id ? line : item) : [...this.lines(), line];
    this.reviewed.set(false);
    this.orderFailure.set(null);
    this.notice.set('');
    this.updateLines(lines);
    this.dismissReceipt();
    return true;
  }

  setQuantity(id: number, amount: number) {
    if (this.pendingOrder() || !Number.isInteger(amount) || amount < 0 || amount > maxQuantity) return;
    const lines = amount === 0
      ? this.lines().filter(line => line.id !== id)
      : this.lines().map(line => line.id === id ? { ...line, cantidad: amount } : line);
    this.updateLines(lines);
    this.dismissReceipt();
    if (lines.length === 0) this.orderFailure.set(null);
  }

  dismissReceipt() {
    const account = this.checkout();
    if (account?.receipt) this.updateCheckout({ ...account, receipt: null });
  }

  refresh() {
    if (this.pendingOrder() || this.refreshing() || this.state().lines.length === 0) return;
    this.reviewed.set(false);
    this.refreshing.set(true);
    this.notice.set('');
    this.refreshError.set('');
    this.products.list(true).pipe(finalize(() => this.refreshing.set(false))).subscribe({
      next: products => {
        const byId = new Map(products.map(product => [product.id, product]));
        let priceChanged = false;
        let availabilityChanged = false;
        const lines = this.state().lines.map(line => {
          const product = byId.get(line.id);
          if (Boolean(product) !== line.disponible) availabilityChanged = true;
          if (!product) return { ...line, disponible: false };
          const { nombre, imagen, precio } = product;
          if (line.precio !== precio) priceChanged = true;
          return { ...line, nombre, imagen, precio, disponible: true };
        });
        this.updateLines(lines, priceChanged || availabilityChanged);
        if (priceChanged && !this.orderError()) {
          this.notice.set('Actualizamos los precios. Revisa el total antes de confirmar.');
        }
        this.reviewed.set(true);
      },
      error: error => this.refreshError.set(errorMessage(error, 'No pudimos verificar los productos de tu carrito.')),
    });
  }

  submit(contact?: Contact) {
    const session = this.auth.activeSession();
    if (!session || this.busy()) return;

    const pending = this.pendingOrder() ?? this.prepareOrder(contact);
    if (!pending) return;

    const { username } = session;
    this.submitting.update(users => [...users, username]);
    this.orderFailure.set(null);
    this.notice.set('');
    this.updateCheckout({ username, pending, receipt: null });
    this.http.post<Receipt>('/api/pedidos', pending.request, { timeout: 20_000 }).pipe(
      finalize(() => this.submitting.update(users => users.filter(user => user !== username))),
    ).subscribe({
      next: ({ id, total, estado, items }) => {
        this.updateCheckout({ username, pending: null, receipt: { id, total, estado, items } }, pending.cartVersion);
      },
      error: (error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        // Reuse the original request when the customer signs back in, even after a reload.
        if (status === 401) return;

        const rejected = status >= 400 && status < 500 && ![408, 425, 429].includes(status);
        if (rejected) {
          this.updateCheckout({ username, pending: null, receipt: null });
          this.orderFailure.set({
            username,
            message: errorMessage(error, 'No pudimos registrar el pedido. Revisa los datos e inténtalo nuevamente.'),
          });
          if (status === 409 && username === this.username()) this.refresh();
        } else {
          this.orderFailure.set({
            username,
            message: 'No pudimos confirmar si se registró tu pedido. Reintenta la confirmación para recuperar el resultado.',
          });
        }
      },
    });
  }

  private prepareOrder(contact?: Contact): PendingOrder | null {
    if (!contact || !this.canSubmit()) return null;
    return {
      lines: this.lines(),
      cartVersion: this.state().version,
      request: {
        solicitudId: requestId(),
        nombre: contact.nombre.trim(),
        telefono: contact.telefono.trim(),
        items: this.lines().map(line => ({
          productoId: line.id, cantidad: line.cantidad, precioUnitario: line.precio,
        })),
      },
    };
  }

  private updateLines(lines: CartLine[], changed = true) {
    const state = this.state();
    this.save({ ...state, lines, version: state.version + Number(changed) });
  }

  private updateCheckout(account: AccountCheckout, completedVersion?: number) {
    const state = this.state();
    const accounts = state.accounts.filter(existing => existing.username !== account.username);
    if (account.receipt || account.pending) accounts.push(account);
    const completed = completedVersion === state.version;
    this.save({
      accounts,
      lines: completed ? [] : state.lines,
      version: state.version + Number(completed),
    });
  }

  private save(state: CartSession) {
    this.state.set(state);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
      sessionStorage.removeItem(guestStorageKey);
    } catch {
      // Continue with the in-memory cart.
    }
  }
}
