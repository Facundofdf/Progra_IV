import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe personalizado (Tema 14 del programa).
 * Transforma una duración en minutos (número plano que viene de la base,
 * ej: 128) en un texto legible "2h 8min".
 *
 * Uso en template:  {{ pelicula.duracion_minutos | duracionAmigable }}
 * Con parámetro:    {{ pelicula.duracion_minutos | duracionAmigable:'corto' }}
 *   -> formato 'corto' devuelve "2h 8m" en vez de "2h 8min"
 *
 * Es "pure" (por defecto en Angular): Angular solo vuelve a ejecutar
 * transform() si cambia la referencia del valor de entrada, no hace
 * falta que nosotros nos preocupemos por mutar nada (immutabilidad).
 */
@Pipe({
  name: 'duracionAmigable',
  standalone: true,
})
export class DuracionPipe implements PipeTransform {
  transform(minutosTotales: number | null | undefined, formato: 'largo' | 'corto' = 'largo'): string {
    if (minutosTotales === null || minutosTotales === undefined || isNaN(minutosTotales)) {
      return '-';
    }

    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;

    const etiquetaMin = formato === 'corto' ? 'm' : 'min';

    if (horas === 0) return `${minutos}${etiquetaMin}`;
    if (minutos === 0) return `${horas}h`;
    return `${horas}h ${minutos}${etiquetaMin}`;
  }
}
