import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

type ResultadoValidacion =
  | { tipo: 'ok'; compra: any }
  | { tipo: 'ya_usado'; compra: any }
  | { tipo: 'no_encontrado' }
  | null;

/**
 * Pantalla de Empleados: valida el código QR (o el código manual de
 * respaldo) de una compra, tanto para dejar entrar a la sala como para
 * retirar el Candy Bar.
 *
 * Como se decidió no complicar el proyecto con una librería real de
 * lectura de cámara, la "cámara" es una SIMULACIÓN: muestra un overlay
 * como si estuviera escaneando y, al cabo de un segundo y medio, avisa
 * si no detectó nada (siempre, porque no hay cámara real conectada) para
 * que el empleado complete el código a mano. En un cine real, ahí es
 * donde se conectaría una librería tipo ngx-scanner-qrcode leyendo la
 * cámara de verdad.
 */
@Component({
  selector: 'app-validador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './validador.component.html',
  styleUrl: './validador.component.css',
})
export class ValidadorComponent {
  private supabase = inject(SupabaseService);

  codigoIngresado = signal('');
  escaneando = signal(false);
  validando = signal(false);
  resultado = signal<ResultadoValidacion>(null);
  error = signal('');

  /** Simula el escaneo por cámara: muestra el overlay y luego pide el código manual. */
  simularEscaneoCamara() {
    this.escaneando.set(true);
    this.resultado.set(null);
    this.error.set('');

    setTimeout(() => {
      this.escaneando.set(false);
      if (!this.codigoIngresado().trim()) {
        this.error.set('No se detectó ningún código (simulación de cámara). Pedile al cliente el código manual de su ticket y escribilo abajo.');
      }
    }, 1500);
  }

  async validar() {
    if (!this.codigoIngresado().trim()) return;

    this.validando.set(true);
    this.error.set('');
    this.resultado.set(null);

    try {
      const empleado = await this.supabase.getUsuarioActual();
      const respuesta = await this.supabase.validarEntradaPorCodigo(this.codigoIngresado(), empleado?.id ?? null);

      if (!respuesta.ok) {
        if (respuesta.motivo === 'no_encontrado') {
          this.resultado.set({ tipo: 'no_encontrado' });
        } else {
          this.resultado.set({ tipo: 'ya_usado', compra: respuesta.compra });
        }
      } else {
        this.resultado.set({ tipo: 'ok', compra: respuesta.compra });
      }
    } catch (err: any) {
      this.error.set('Error al validar: ' + err.message);
    } finally {
      this.validando.set(false);
    }
  }

  limpiar() {
    this.codigoIngresado.set('');
    this.resultado.set(null);
    this.error.set('');
  }
}
