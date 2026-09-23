import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

/**
 * Directiva de atributo personalizada (Tema 15 del programa).
 * Le da foco automáticamente al elemento donde se la ponga, apenas
 * termina de dibujarse la vista (por eso usamos AfterViewInit, y no
 * ngOnInit: el elemento nativo recién existe en el DOM en este hook).
 *
 * Uso:  <input type="email" appAutoFocus>
 */
@Directive({
  selector: '[appAutoFocus]',
  standalone: true,
})
export class AutoFocusDirective implements AfterViewInit {
  private elemento = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    // setTimeout(0) para asegurarnos de correr esto después de que
    // Angular termine el ciclo de detección de cambios actual.
    setTimeout(() => this.elemento.nativeElement.focus());
  }
}
