import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { CompraService } from '../../../core/services/compra.service';

@Component({
    selector: 'app-seleccion-candy',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './seleccion-candy.component.html',
    styleUrls: ['./seleccion-candy.component.css']
})
export class SeleccionCandyComponent implements OnInit {
    private supabase = inject(SupabaseService);
    public compraService = inject(CompraService); // Público para usarlo en el HTML
    private router = inject(Router);

    productos = signal<any[]>([]);
    combos = signal<any[]>([]);

    // Array para guardar lo que va eligiendo: { producto, cantidad }
    carritoCandy = signal<any[]>([]);
    cargando = signal(true);

    async ngOnInit() {
        // Si entró acá sin elegir butacas primero, lo pateamos al home
        if (this.compraService.reserva().butacas.length === 0) {
            this.router.navigate(['/']);
            return;
        }

        try {
            this.cargando.set(true);
            const data = await this.supabase.obtenerProductosCandy();

            // El TP pide destacar los Combos
            if (data) {
                this.combos.set(data.filter(p => p.categoria.toLowerCase() === 'combos'));
                this.productos.set(data.filter(p => p.categoria.toLowerCase() !== 'combos'));
            }
        } catch (error) {
            console.error('Error al cargar Candy:', error);
        } finally {
            this.cargando.set(false);
        }
    }

    modificarCantidad(producto: any, delta: number) {
        const carritoActual = this.carritoCandy();
        const index = carritoActual.findIndex(item => item.producto.id === producto.id);

        if (index > -1) {
            carritoActual[index].cantidad += delta;
            if (carritoActual[index].cantidad <= 0) {
                carritoActual.splice(index, 1); // Si llega a 0, lo borramos
            }
        } else if (delta > 0) {
            carritoActual.push({ producto, cantidad: 1 });
        }

        this.carritoCandy.set([...carritoActual]);
    }

    obtenerCantidad(productoId: string) {
        const item = this.carritoCandy().find(i => i.producto.id === productoId);
        return item ? item.cantidad : 0;
    }

    calcularTotalCandy() {
        return this.carritoCandy().reduce((acc, item) => acc + (item.producto.precio_pesos * item.cantidad), 0);
    }

    continuarAlPago() {
        this.compraService.guardarCandy(this.carritoCandy(), this.calcularTotalCandy());
        this.router.navigate(['/comprar/pago']); // Próximo paso: la pasarela de pago!
    }

    volverButacas() {
        this.router.navigate(['/comprar'], { queryParams: { funcion: this.compraService.reserva().funcion.id } });
    }
}