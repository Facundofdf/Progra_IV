import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-candy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-candy.component.html',
  styleUrl: './admin-candy.component.css',
})
export class AdminCandyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);

  productosCargados = signal<any[]>([]);
  productoEditandoId = signal<string | null>(null);

  // Formulario con los datos exigidos: Categoría, Pesos y Puntos
  candyForm = this.fb.group({
    nombre: ['', Validators.required],
    categoria: ['pochoclos', Validators.required],
    precio_pesos: [0, [Validators.required, Validators.min(0)]],
    precio_puntos: [0, [Validators.required, Validators.min(0)]] // Puntos de fidelización
  });

  async ngOnInit() {
    await this.cargarProductos();
  }

  async cargarProductos() {
    try {
      const data = await this.supabase.obtenerProductosCandy();
      this.productosCargados.set(data || []);
    } catch (error) {
      console.error('Error al cargar el Candy Bar', error);
    }
  }

  async guardarProducto() {
    if (this.candyForm.invalid) {
      this.candyForm.markAllAsTouched();
      alert('⚠️ Por favor, completá todos los campos correctamente.');
      return;
    }

    const datos = this.candyForm.value;
    const editId = this.productoEditandoId();

    try {
      if (editId) {
        await this.supabase.actualizarProductoCandy(editId, datos);
      } else {
        await this.supabase.crearProductoCandy(datos);
      }
      this.cancelarEdicion();
      await this.cargarProductos();
    } catch (error: any) {
      alert('Error al guardar: ' + error.message);
    }
  }

  editarProducto(prod: any) {
    this.productoEditandoId.set(prod.id);
    this.candyForm.patchValue({
      nombre: prod.nombre,
      categoria: prod.categoria,
      precio_pesos: prod.precio_pesos,
      precio_puntos: prod.precio_puntos
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async eliminarProducto(id: string) {
    if (confirm('¿Seguro que querés eliminar este producto?')) {
      try {
        await this.supabase.eliminarProductoCandy(id);
        await this.cargarProductos();
      } catch (error: any) {
        alert('Error al eliminar: ' + error.message);
      }
    }
  }

  cancelarEdicion() {
    this.productoEditandoId.set(null);
    this.candyForm.reset({ 
      categoria: 'pochoclos', 
      precio_pesos: 0, 
      precio_puntos: 0 
    });
  }
}
