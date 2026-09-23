import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ButacaDTO {
  codigo: string;
  tipo: 'normal' | 'vip' | 'accesible';
  ocupada: boolean;
  precioAdicional: number;
}

/**
 * Componente hijo "tonto" (presentacional): no sabe nada de Supabase, ni
 * de precios finales, ni de la reserva. Solo recibe una butaca por
 * @Input() y avisa por @Output() cuando el usuario la toca.
 *
 * Esto es el tema "Input()/Output()" del programa: antes,
 * MapaButacasComponent dibujaba y manejaba el click de cada botón
 * directamente en su propio template, sin ningún componente hijo.
 */
@Component({
  selector: 'app-butaca',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="butaca"
      [class.ocupada]="butaca.ocupada"
      [class.seleccionada]="seleccionada"
      [class.vip]="butaca.tipo === 'vip'"
      [class.accesible]="butaca.tipo === 'accesible'"
      [disabled]="butaca.ocupada"
      (click)="click.emit(butaca)"
    >
      {{ butaca.codigo }}
    </button>
  `,
  styleUrls: ['./butaca.component.css'],
})
export class ButacaComponent {
  @Input({ required: true }) butaca!: ButacaDTO;
  @Input() seleccionada = false;

  // Emitimos la butaca completa: el padre decide qué hacer (togglear
  // selección, validar cupo máximo, etc.) — el hijo no toma esa decisión.
  @Output() click = new EventEmitter<ButacaDTO>();
}
