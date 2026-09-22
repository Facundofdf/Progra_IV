import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
    selector: 'app-admin-funciones',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './admin-funciones.component.html',
    styleUrls: ['./admin-funciones.component.css']
})
export class AdminFuncionesComponent implements OnInit {
    private supabase = inject(SupabaseService);
    private fb = inject(FormBuilder);

    peliculas = signal<any[]>([]);
    funciones = signal<any[]>([]);
    mensaje = signal({ texto: '', tipo: '' });

    funcionForm = this.fb.group({
        pelicula_id: ['', Validators.required],
        fecha_hora: ['', Validators.required], // Selector nativo limpio
        formato: ['2D', Validators.required],  // 2d, 3d, 4d, 5d
        idioma: ['Castellano', Validators.required] // Castellano o Subtitulada
    });

    async ngOnInit() {
        await this.cargarDatos();
    }

    async cargarDatos() {
        // 1. Cargamos películas (Aislado para que no falle si lo demás falla)
        try {
            const pelis = await this.supabase.obtenerPeliculas();
            this.peliculas.set(pelis || []);
        } catch (error) {
            console.error('Error al cargar películas:', error);
        }

        // 2. Cargamos funciones (Aislado)
        try {
            const funcs = await this.supabase.obtenerFunciones();
            this.funciones.set(funcs || []);
        } catch (error: any) {
            console.error('Error al cargar las funciones:', error.message);
            this.mostrarMensaje('Error de Base de Datos al cargar funciones. Revisá la consola (F12).', 'error');
        }
    }

    async guardarFuncion() {
        if (this.funcionForm.invalid) {
            this.mostrarMensaje('Completá todos los campos.', 'error');
            return;
        }

        try {
            // Intentamos crear. El servicio decidirá a qué sala va.
            await this.supabase.crearFuncionAutomaticamente(this.funcionForm.value);
            this.mostrarMensaje('Función creada. Sala asignada automáticamente.', 'exito');
            this.funcionForm.reset({ formato: '2D', idioma: 'Castellano' });
            await this.cargarDatos();
        } catch (error: any) {
            // Si tira error, es porque no hay salas (el choque de horarios que pide el TP)
            this.mostrarMensaje(error.message, 'error');
        }
    }

    async eliminarFuncion(id: string) {
        if (confirm('¿Eliminar esta función? Las entradas vendidas quedarán huérfanas.')) {
            try {
                await this.supabase.eliminarFuncion(id);
                this.mostrarMensaje('Función eliminada', 'exito');
                await this.cargarDatos();
            } catch (error: any) {
                this.mostrarMensaje('Error al eliminar', 'error');
            }
        }
    }

    mostrarMensaje(texto: string, tipo: string) {
        this.mensaje.set({ texto, tipo });
        setTimeout(() => this.mensaje.set({ texto: '', tipo: '' }), 5000);
    }
}