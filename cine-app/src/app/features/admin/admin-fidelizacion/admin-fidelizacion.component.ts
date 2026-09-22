import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
    selector: 'app-admin-fidelizacion',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './admin-fidelizacion.component.html',
    styleUrls: ['./admin-fidelizacion.component.css']
})
export class AdminFidelizacionComponent implements OnInit {
    private supabase = inject(SupabaseService);
    private fb = inject(FormBuilder);

    productosCandy = signal<any[]>([]);
    mensaje = signal({ texto: '', tipo: '' });

    configForm = this.fb.group({
        puntos_por_entrada: [500, [Validators.required, Validators.min(1)]],
        puntos_por_peso: [1, [Validators.required, Validators.min(0.1)]]
    });

    async ngOnInit() {
        await this.cargarDatos();
    }

    async cargarDatos() {
        try {
            // 1. Cargamos configuración general
            const config = await this.supabase.obtenerConfigFidelizacion();
            if (config) {
                this.configForm.patchValue({
                    puntos_por_entrada: config.puntos_por_entrada,
                    puntos_por_peso: config.puntos_por_peso
                });
            }

            // 2. Cargamos el catálogo del candy bar para ver los costos en puntos
            const candy = await this.supabase.obtenerProductosCandy();
            this.productosCandy.set(candy || []);

        } catch (error) {
            console.error('Error al cargar datos de fidelización', error);
        }
    }

    async guardarConfiguracion() {
        if (this.configForm.invalid) return;

        try {
            await this.supabase.actualizarConfigFidelizacion(this.configForm.value);
            this.mostrarMensaje('Configuración actualizada con éxito.', 'exito');
        } catch (error) {
            this.mostrarMensaje('Error al actualizar la configuración.', 'error');
        }
    }

    mostrarMensaje(texto: string, tipo: string) {
        this.mensaje.set({ texto, tipo });
        setTimeout(() => this.mensaje.set({ texto: '', tipo: '' }), 4000);
    }
}