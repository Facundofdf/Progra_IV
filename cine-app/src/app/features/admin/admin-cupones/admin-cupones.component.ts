import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { signalField, signalForm, validadoresSignal } from '../../../core/signal-forms/signal-forms';
import { FormFieldDirective } from '../../../core/signal-forms/form-field.directive';

/**
 * Este formulario se migró de Reactive Forms a "Signal Forms"
 * (tema 11.c/12 del programa) para poder mostrar en la defensa oral
 * signal(), form(), [formField], value(), valid()/invalid() y errors()
 * funcionando de punta a punta. Ver core/signal-forms/signal-forms.ts
 * para la explicación de por qué es una mini-implementación propia y no
 * el paquete experimental de Angular.
 */
@Component({
    selector: 'app-admin-cupones',
    standalone: true,
    imports: [CommonModule, FormsModule, FormFieldDirective],
    templateUrl: './admin-cupones.component.html',
    styleUrls: ['./admin-cupones.component.css']
})
export class AdminCuponesComponent implements OnInit {
    private supabase = inject(SupabaseService);

    cupones = signal<any[]>([]);
    mensaje = signal({ texto: '', tipo: '' });

    // --- Signal Form del cupón ---
    // 1. signal(): cada campo es un signalField (adentro usa signal()).
    // 2. form(): signalForm() arma la estructura completa.
    cuponForm = signalForm({
        codigo: signalField('', [
            validadoresSignal.requerido('El código es obligatorio'),
            validadoresSignal.minLongitud(3, 'Mínimo 3 caracteres'),
        ]),
        porcentaje_descuento: signalField(10, [
            validadoresSignal.requerido('Ingresá un porcentaje'),
            validadoresSignal.rango(1, 100, 'Debe estar entre 1% y 100%'),
        ]),
        edad_minima: signalField<number | null>(null), // Opcional, sin validadores
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
        // valid() / invalid() del form (agregan el de todos los campos)
        if (this.cuponForm.invalid()) {
            this.cuponForm.marcarTodoTocado(); // para que se vean los errores() en el template
            this.mostrarMensaje('Completá los campos correctamente (Max 100%).', 'error');
            return;
        }

        try {
            // value() del form: objeto plano con los valores actuales
            await this.supabase.crearCupon({ ...this.cuponForm.value() });
            this.mostrarMensaje('Cupón creado con éxito', 'exito');
            this.cuponForm.campos.codigo.reset('');
            this.cuponForm.campos.porcentaje_descuento.reset(10);
            this.cuponForm.campos.edad_minima.reset(null);
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
