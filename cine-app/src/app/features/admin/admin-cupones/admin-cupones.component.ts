import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
    selector: 'app-admin-cupones',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './admin-cupones.component.html',
    styleUrls: ['./admin-cupones.component.css']
})
export class AdminCuponesComponent implements OnInit {
    private supabase = inject(SupabaseService);
    private fb = inject(FormBuilder);

    cupones = signal<any[]>([]);
    mensaje = signal({ texto: '', tipo: '' });

    cuponForm = this.fb.group({
        codigo: ['', [Validators.required, Validators.minLength(3)]],
        porcentaje_descuento: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
        edad_minima: [null as number | null] // Opcional
    });

    async ngOnInit() {
        await this.cargarCupones();
    }

    async cargarCupones() {
        try {
            const data = await this.supabase.obtenerCupones();
            this.cupones.set(data || []);
        } catch (error) {
            console.error('Error al cargar cupones:', error);
        }
    }

    async guardarCupon() {
        if (this.cuponForm.invalid) {
            this.mostrarMensaje('Completá los campos correctamente (Max 100%).', 'error');
            return;
        }

        try {
            await this.supabase.crearCupon(this.cuponForm.value);
            this.mostrarMensaje('Cupón creado con éxito', 'exito');
            this.cuponForm.reset({ porcentaje_descuento: 10, edad_minima: null });
            await this.cargarCupones();
        } catch (error: any) {
            // El código es UNIQUE en la base de datos, si se repite tira error
            if (error.code === '23505') {
                this.mostrarMensaje('Ese código de cupón ya existe.', 'error');
            } else {
                this.mostrarMensaje('Error al crear el cupón.', 'error');
            }
        }
    }

    async eliminarCupon(id: string) {
        if (confirm('¿Desactivar y eliminar este cupón?')) {
            try {
                await this.supabase.eliminarCupon(id);
                this.mostrarMensaje('Cupón eliminado', 'exito');
                await this.cargarCupones();
            } catch (error) {
                this.mostrarMensaje('Error al eliminar', 'error');
            }
        }
    }

    mostrarMensaje(texto: string, tipo: string) {
        this.mensaje.set({ texto, tipo });
        setTimeout(() => this.mensaje.set({ texto: '', tipo: '' }), 4000);
    }
}