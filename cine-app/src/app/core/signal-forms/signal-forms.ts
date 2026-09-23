import { Signal, WritableSignal, computed, signal } from '@angular/core';

/**
 * MINI-IMPLEMENTACIÓN DE "SIGNAL FORMS" (Tema 11.c / 12 del programa)
 * ======================================================================
 * Angular tiene una propuesta EXPERIMENTAL de formularios basados en
 * Signals (paquete `@angular/forms/signals`), todavía en desarrollo y
 * que cambia de una versión menor a otra. Para no atar la entrega a una
 * API que puede romper con la próxima actualización de Angular, acá
 * construimos una versión reducida y estable que respeta EXACTAMENTE
 * los mismos conceptos que pide la consigna:
 *
 *   - signal(): estado reactivo de cada campo.
 *   - form(): arma la estructura del formulario a partir de esos signals.
 *   - [formField]: directiva que vincula un <input> con un campo del form.
 *   - value(): valor actual de un campo.
 *   - valid() / invalid(): estado de validación.
 *   - errors(): lista de errores de validación.
 *
 * En un proyecto real, una vez que `@angular/forms/signals` salga de
 * modo experimental, este archivo se reemplazaría por esa librería
 * oficial sin cambiar el resto del código (misma superficie de API).
 */

export type ValidadorCampo<T> = (valor: T) => string | null;

export interface SignalField<T> {
  /** Señal editable con el valor crudo del campo (la usa la directiva [formField]) */
  readonly signal: WritableSignal<T>;
  /** Devuelve el valor actual (tema: value()) */
  value: Signal<T>;
  /** true si pasa todas las validaciones (tema: valid()) */
  valid: Signal<boolean>;
  /** true si falla alguna validación (tema: invalid()) */
  invalid: Signal<boolean>;
  /** Lista de mensajes de error activos (tema: errors()) */
  errors: Signal<string[]>;
  /** Si el usuario ya interactuó con el campo (para no mostrar errores antes de tiempo) */
  touched: WritableSignal<boolean>;
  setValue(v: T): void;
  marcarTocado(): void;
  reset(v: T): void;
}

/** Crea un campo reactivo individual. Equivale al "signal()" de la consigna. */
export function signalField<T>(valorInicial: T, validadores: ValidadorCampo<T>[] = []): SignalField<T> {
  const valorSignal = signal(valorInicial);
  const touched = signal(false);

  const errors = computed(() =>
    validadores
      .map(validar => validar(valorSignal()))
      .filter((mensaje): mensaje is string => mensaje !== null)
  );

  const valid = computed(() => errors().length === 0);
  const invalid = computed(() => !valid());

  return {
    signal: valorSignal,
    value: valorSignal.asReadonly(),
    valid,
    invalid,
    errors,
    touched,
    setValue: (v: T) => valorSignal.set(v),
    marcarTocado: () => touched.set(true),
    reset: (v: T) => {
      valorSignal.set(v);
      touched.set(false);
    },
  };
}

export type SignalFormShape = Record<string, SignalField<any>>;

export interface SignalFormGroup<T extends SignalFormShape> {
  campos: T;
  /** true si TODOS los campos son válidos (equivale a form.valid()) */
  valid: Signal<boolean>;
  invalid: Signal<boolean>;
  /** Objeto plano con los valores actuales de cada campo (equivale a form.value()) */
  value: Signal<{ [K in keyof T]: T[K] extends SignalField<infer V> ? V : never }>;
  marcarTodoTocado(): void;
  reset(): void;
}

/** Arma el formulario completo a partir de los campos. Equivale al "form()" de la consigna. */
export function signalForm<T extends SignalFormShape>(campos: T): SignalFormGroup<T> {
  const claves = Object.keys(campos) as (keyof T)[];

  const valid = computed(() => claves.every(clave => campos[clave].valid()));
  const invalid = computed(() => !valid());

  const value = computed(() => {
    const resultado = {} as any;
    for (const clave of claves) {
      resultado[clave] = campos[clave].value();
    }
    return resultado;
  });

  return {
    campos,
    valid,
    invalid,
    value,
    marcarTodoTocado: () => claves.forEach(clave => campos[clave].marcarTocado()),
    reset: () => claves.forEach(clave => campos[clave].reset(campos[clave].value())),
  };
}

// --- Validadores reutilizables, en el mismo espíritu que Validators de Reactive Forms ---
export const validadoresSignal = {
  requerido: (mensaje = 'Este campo es obligatorio'): ValidadorCampo<any> => (v) =>
    v === null || v === undefined || v === '' ? mensaje : null,

  minLongitud: (min: number, mensaje?: string): ValidadorCampo<string> => (v) =>
    (v?.length ?? 0) < min ? (mensaje ?? `Debe tener al menos ${min} caracteres`) : null,

  rango: (min: number, max: number, mensaje?: string): ValidadorCampo<number> => (v) =>
    v < min || v > max ? (mensaje ?? `Debe estar entre ${min} y ${max}`) : null,
};
