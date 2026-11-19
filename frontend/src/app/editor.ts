import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { errorMessage, ProductData, Products } from './products';

const fields = {
  nombre: { label: 'Nombre', max: 100 },
  descripcion: { label: 'Descripción', max: 255 },
  categoria: { label: 'Categoría', max: 50 },
  imagen: { label: 'Imagen', max: 255 },
};

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './editor.html',
})
export class Editor {
  private readonly api = inject(Products);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly cancel = this.id === null ? ['/productos'] : ['/productos', this.id];
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly serverErrors = signal<string[]>([]);
  readonly categories = signal<string[]>([]);
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(fields.nombre.max)]],
    descripcion: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(fields.descripcion.max)]],
    categoria: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(fields.categoria.max)]],
    precio: this.fb.control<number | null>(null, [
      Validators.required, Validators.min(0.01), Validators.pattern(/^(?:\d+)(?:\.\d{1,2})?$/),
    ]),
    imagen: ['', [
      Validators.required, Validators.maxLength(fields.imagen.max),
      Validators.pattern(/^(?:\/images\/|https:\/\/)\S+$/),
    ]],
  });

  constructor() {
    this.loadProduct();
    this.api.categories().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: categories => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
  }

  loadProduct() {
    if (this.id === null) return;
    this.loading.set(true);
    this.loadError.set('');
    this.api.get(this.id).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false))).subscribe({
      next: product => this.form.patchValue(product),
      error: error => this.loadError.set(errorMessage(error, 'No pudimos cargar el producto para editar.')),
    });
  }

  feedback(field: keyof ProductData) {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return '';

    if (field === 'precio') {
      return control.hasError('required') ? 'Ingresa el precio.' : 'Ingresa un precio mayor a cero con hasta dos decimales.';
    }
    if (control.hasError('maxlength')) return 'Usa hasta ' + fields[field].max + ' caracteres.';
    if (field === 'imagen' && control.hasError('pattern')) return 'Usa una URL HTTPS o una ruta que empiece con /images/.';
    return 'Completa el campo ' + fields[field].label.toLocaleLowerCase('es') + '.';
  }

  save() {
    if (this.saving() || this.loading() || this.loadError()) return;
    this.form.markAllAsTouched();
    this.saveError.set('');
    this.serverErrors.set([]);

    const values = this.form.getRawValue();
    if (this.form.invalid || values.precio === null) {
      this.saveError.set('Revisa los campos marcados para guardar el producto.');
      return;
    }

    const payload: ProductData = {
      nombre: values.nombre.trim(),
      descripcion: values.descripcion.trim(),
      categoria: values.categoria.trim(),
      imagen: values.imagen.trim(),
      precio: values.precio,
    };
    this.saving.set(true);
    const request = this.id === null ? this.api.create(payload) : this.api.update(this.id, payload);
    request.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.saving.set(false))).subscribe({
      next: product => void this.router.navigate(['/productos', product.id], {
        queryParams: { resultado: this.id === null ? 'creado' : 'editado' },
      }),
      error: error => {
        this.saveError.set(errorMessage(error, 'No pudimos guardar el producto.'));
        if (error instanceof HttpErrorResponse && Array.isArray(error.error?.errors)) {
          this.serverErrors.set(error.error.errors.filter((entry: unknown) => typeof entry === 'string'));
        }
      },
    });
  }
}
