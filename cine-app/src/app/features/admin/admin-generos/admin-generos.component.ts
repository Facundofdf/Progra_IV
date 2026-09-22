import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
    selector: 'app-admin-generos',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './admin-generos.component.html',
    styleUrls: ['./admin-generos.component.css']
})
export class AdminGenerosComponent implements OnInit {
    private fb = inject(FormBuilder);
    private supabase = inject(SupabaseService);

    generosCargados = signal<any[]>([]);

    generoForm = this.fb.group({
        nombre: ['', Validators.required]
    });

    async ngOnInit() {
        await this.cargarGeneros();
    }

    async cargarGeneros() {
        try {
            const data = await this.supabase.obtenerGeneros();
            this.generosCargados.set(data || []);
        } catch (error) {
            console.error('Error al cargar géneros:', error);
        }
    }

    async guardarGenero() {
        if (this.generoForm.invalid) return;

        try {
            await this.supabase.crearGenero(this.generoForm.value.nombre!);
            this.generoForm.reset();
            await this.cargarGeneros();
        } catch (error: any) {
            alert('Error al guardar género: ' + error.message);
        }
    }

    async eliminarGenero(id: string) {
        if (confirm('¿Seguro que querés eliminar este género? Puede afectar a películas existentes.')) {
            try {
                await this.supabase.eliminarGenero(id);
                await this.cargarGeneros();
            } catch (error: any) {
                alert('Error al eliminar: ' + error.message);
            }
        }
    }
}