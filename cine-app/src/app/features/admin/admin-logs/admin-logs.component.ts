import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
    selector: 'app-admin-logs',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './admin-logs.component.html',
    styleUrls: ['./admin-logs.component.css']
})
export class AdminLogsComponent implements OnInit {
    private supabase = inject(SupabaseService);

    logsCargados = signal<any[]>([]);
    cargando = signal(true);

    async ngOnInit() {
        await this.cargarLogs();
    }

    async cargarLogs() {
        try {
            this.cargando.set(true);
            const data = await this.supabase.obtenerLogs();
            this.logsCargados.set(data || []);
        } catch (error: any) {
            console.error('Error al cargar logs:', error.message);
        } finally {
            this.cargando.set(false);
        }
    }
}