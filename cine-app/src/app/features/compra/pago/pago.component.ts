import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { CompraService } from '../../../core/services/compra.service';
import { calcularEdad } from '../../../core/utils/edad.util';

@Component({
    selector: 'app-pago',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './pago.component.html',
    styleUrls: ['./pago.component.css']
})
export class PagoComponent implements OnInit {
    public compraService = inject(CompraService);
    private supabase = inject(SupabaseService);
    private router = inject(Router);

    paso = signal<'checkout' | 'procesando' | 'exito'>('checkout');
    codigoTicketFinal = signal('');

    // Perfil e Historial
    perfilUsuario = signal<any>(null);
    esPrimeraCompra = signal(false);
    configFidelizacion = signal<any>(null);

    // Cupones manuales
    codigoCupon = signal('');
    cuponAplicado = signal<any>(null);
    mensajeCupon = signal({ texto: '', error: false });

    // Método de pago elegido por el cliente (requisito puntual del TP:
    // el resumen debe mostrar "el método de pago que desea utilizar")
    metodoPago = signal<'tarjeta' | 'efectivo' | 'mercadopago'>('tarjeta');

    // Puntos y Crédito
    usarCredito = signal(false);
    puntosAGastar = signal(0);
    descuentoPorPuntos = signal(0);
    recompensaTexto = signal('');

    async ngOnInit() {
        if (this.compraService.reserva().butacas.length === 0) {
            this.router.navigate(['/']);
            return;
        }

        const usuario = this.supabase.usuarioActual();
        if (usuario) {
            // Cargamos su billetera
            const perfil = await this.supabase.obtenerPerfil(usuario.id);
            this.perfilUsuario.set(perfil);

            // Verificamos si es primera compra (TP: 20% de descuento)
            const misCompras = await this.supabase.obtenerMisCompras(usuario.id);
            if (misCompras.length === 0) {
                this.esPrimeraCompra.set(true);
            }

            // Traemos las reglas de puntos
            const config = await this.supabase.obtenerConfigFidelizacion();
            this.configFidelizacion.set(config);
        }
    }

    calcularSubtotal() {
        return this.compraService.obtenerTotalFinal();
    }

    calcularTotalPagar() {
        let total = this.calcularSubtotal();

        // 1. Aplicar Descuento de Bienvenida o Cupón Manual
        if (this.esPrimeraCompra()) {
            total = total * 0.8; // 20% descuento
        } else if (this.cuponAplicado()) {
            total = total * (1 - (this.cuponAplicado().porcentaje_descuento / 100));
        }

        // 2. Restar canje de puntos (Entrada gratis)
        total -= this.descuentoPorPuntos();
        if (total < 0) total = 0;

        // 3. Restar crédito a favor si lo activó
        if (this.usarCredito() && this.perfilUsuario()) {
            total -= this.perfilUsuario().credito;
        }

        return total < 0 ? 0 : total; // Nunca cobramos en negativo
    }

    async aplicarCupon() {
        if (!this.codigoCupon().trim()) return;
        const cuponDB = await this.supabase.validarCupon(this.codigoCupon());

        if (!cuponDB) {
            this.cuponAplicado.set(null);
            this.mensajeCupon.set({ texto: 'Cupón inválido.', error: true });
            return;
        }

        // Antes NO se comprobaba la edad mínima del cupón (ej: "solo +50")
        // contra la edad real del comprador: cualquiera podía aplicarlo.
        if (cuponDB.edad_minima) {
            const edadUsuario = calcularEdad(this.perfilUsuario()?.fecha_nacimiento);

            if (edadUsuario === null) {
                this.cuponAplicado.set(null);
                this.mensajeCupon.set({ texto: `Este cupón es solo para mayores de ${cuponDB.edad_minima} años. Iniciá sesión con tu fecha de nacimiento cargada para poder validarlo.`, error: true });
                return;
            }

            if (edadUsuario < cuponDB.edad_minima) {
                this.cuponAplicado.set(null);
                this.mensajeCupon.set({ texto: `Este cupón es solo para mayores de ${cuponDB.edad_minima} años.`, error: true });
                return;
            }
        }

        this.cuponAplicado.set(cuponDB);
        this.mensajeCupon.set({ texto: `¡Cupón de ${cuponDB.porcentaje_descuento}% aplicado!`, error: false });
    }

    canjearEntradaConPuntos() {
        const costoPuntos = this.configFidelizacion()?.puntos_por_entrada || 500;

        if (this.perfilUsuario() && this.perfilUsuario().puntos >= costoPuntos) {
            // Le descontamos el valor de 1 entrada base
            const precioEntrada = this.compraService.reserva().funcion.peliculas.precio_base;
            this.descuentoPorPuntos.set(precioEntrada);
            this.puntosAGastar.set(costoPuntos);
            this.recompensaTexto.set('1 Entrada Gratis');
        } else {
            alert(`Necesitás al menos ${costoPuntos} puntos para canjear una entrada.`);
        }
    }

    async confirmarPago() {
        this.paso.set('procesando');

        try {
            const usuario = this.supabase.usuarioActual();
            const idUsuario = usuario ? usuario.id : null;

            // Calculamos cuánto crédito exacto gasta (para no vaciarle la cuenta si la compra es menor a su saldo)
            let creditoGastadoExacto = 0;
            if (this.usarCredito() && this.perfilUsuario()) {
                let totalPrevioCredito = this.calcularSubtotal();
                if (this.esPrimeraCompra()) totalPrevioCredito *= 0.8;
                else if (this.cuponAplicado()) totalPrevioCredito *= (1 - (this.cuponAplicado().porcentaje_descuento / 100));

                totalPrevioCredito -= this.descuentoPorPuntos();
                if (totalPrevioCredito < 0) totalPrevioCredito = 0;

                // Gasta lo que cubra la compra o todo su saldo
                creditoGastadoExacto = Math.min(this.perfilUsuario().credito, totalPrevioCredito);
            }

            const codigoGenerado = await this.supabase.procesarCompra(
                this.compraService.reserva(),
                this.calcularTotalPagar(),
                idUsuario,
                this.puntosAGastar(),
                creditoGastadoExacto,
                this.recompensaTexto(),
                this.metodoPago()
            );

            this.codigoTicketFinal.set(codigoGenerado);
            this.paso.set('exito');
            this.compraService.limpiarReserva();

        } catch (error) {
            console.error('Error procesando pago:', error);
            alert('Hubo un error procesando el pago.');
            this.paso.set('checkout');
        }
    }

    descargarPDF() { window.print(); }
    volverAlInicio() { this.router.navigate(['/']); }
}