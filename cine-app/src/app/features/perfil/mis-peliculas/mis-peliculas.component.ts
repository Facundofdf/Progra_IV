import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
    selector: 'app-mis-peliculas',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './mis-peliculas.component.html',
    styleUrls: ['./mis-peliculas.component.css']
})
export class MisPeliculasComponent implements OnInit {
    private supabase = inject(SupabaseService);

    comprasFuturas = signal<any[]>([]);
    comprasPasadas = signal<any[]>([]);

    // Estado para el modal de reseñas
    peliculaAResenar = signal<any>(null);
    resenaPuntuacion = signal(5);
    resenaComentario = signal('');

    async ngOnInit() {
        await this.cargarHistorial();
    }

    async cargarHistorial() {
        const user = await this.supabase.getUsuarioActual();
        if (!user) return;

        try {
            const data = await this.supabase.obtenerMisCompras(user.id);
            this.procesarCompras(data);
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    }

    procesarCompras(compras: any[]) {
        const futuras: any[] = [];
        const pasadas: any[] = [];
        const ahora = new Date().getTime();

        compras.forEach(compra => {
            if (!compra.entradas || compra.entradas.length === 0) return;

            // Tomamos los datos de la primera entrada (todas las entradas de una compra son para la misma función)
            const funcion = compra.entradas[0].funciones;
            const peli = funcion.peliculas;
            const fechaFuncion = new Date(funcion.fecha_hora).getTime();

            const item = {
                compraId: compra.id,
                totalPagado: compra.total_pagado,
                fechaFuncion: funcion.fecha_hora,
                peliculaId: peli.id,
                titulo: peli.titulo,
                poster: peli.imagen_poster,
                entradasCant: compra.entradas.length
            };

            if (fechaFuncion > ahora) {
                futuras.push(item);
            } else {
                pasadas.push(item);
            }
        });

        this.comprasFuturas.set(futuras);
        this.comprasPasadas.set(pasadas);
    }

    async cancelarCompra(compra: any) {
        // REGLA DEL TP: Cancelar hasta 2 horas antes
        const fechaFuncion = new Date(compra.fechaFuncion).getTime();
        const ahora = new Date().getTime();
        const limiteCancelacion = fechaFuncion - (2 * 60 * 60 * 1000);

        if (ahora > limiteCancelacion) {
            alert('⚠️ Ya pasaron las 2 horas límite antes de la función. No podés cancelar esta compra.');
            return;
        }

        if (confirm(`¿Querés cancelar la compra y recibir $${compra.totalPagado} como crédito a tu favor?`)) {
            const user = await this.supabase.getUsuarioActual();
            try {
                await this.supabase.cancelarCompra(compra.compraId, user!.id, compra.totalPagado);
                alert('Compra cancelada. Se acreditó el saldo en tu cuenta.');
                await this.cargarHistorial();
            } catch (error) {
                alert('Hubo un error al cancelar.');
            }
        }
    }

    abrirResena(compra: any) {
        this.peliculaAResenar.set(compra);
        this.resenaPuntuacion.set(5);
        this.resenaComentario.set('');
    }

    async guardarResena() {
        const user = await this.supabase.getUsuarioActual();
        const peli = this.peliculaAResenar();

        if (user && peli) {
            try {
                await this.supabase.agregarResena(peli.peliculaId, user.id, this.resenaPuntuacion(), this.resenaComentario());
                alert('¡Reseña guardada con éxito!');
                this.peliculaAResenar.set(null); // Cierra modal
            } catch (error) {
                alert('Error al guardar la reseña.');
            }
        }
    }
}