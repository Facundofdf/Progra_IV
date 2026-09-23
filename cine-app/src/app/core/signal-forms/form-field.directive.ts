import { Directive, ElementRef, HostListener, Input, inject } from '@angular/core';
import { SignalField } from './signal-forms';

/**
 * Directiva [formField] — el binding que pide el tema 12.c de la
 * consigna. Vincula un <input>/<select> con un SignalField: lo inicializa
 * con el valor del campo, y cada vez que el usuario tipea/cambia el
 * valor, actualiza el signal (que dispara automáticamente valid()/
 * invalid()/errors() porque son computed()).
 *
 * Uso:  <input [formField]="cuponForm.campos.codigo">
 */
@Directive({
  selector: '[formField]',
  standalone: true,
})
export class FormFieldDirective {
  private elemento = inject(ElementRef<HTMLInputElement>);

  @Input({ required: true, alias: 'formField' }) campo!: SignalField<any>;

  @HostListener('input', ['$event.target'])
  onInput(target: HTMLInputElement) {
    if (target.type === 'number') {
      // Un input number vacío da NaN en valueAsNumber; lo tratamos como
      // "sin valor" (útil para campos opcionales como edad_minima).
      const numero = target.valueAsNumber;
      this.campo.setValue((isNaN(numero) ? null : numero) as any);
    } else {
      this.campo.setValue(target.value as any);
    }
  }

  @HostListener('blur')
  onBlur() {
    this.campo.marcarTocado();
  }

  ngDoCheck() {
    // Mantenemos el DOM sincronizado si el signal cambia desde afuera
    // (por ejemplo, un reset() del formulario).
    const valorActual = this.campo.value();
    if (this.elemento.nativeElement.value !== String(valorActual ?? '')) {
      this.elemento.nativeElement.value = valorActual ?? '';
    }
  }
}
