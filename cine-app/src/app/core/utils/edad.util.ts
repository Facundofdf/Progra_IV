/**
 * Utilidades de edad. Las sacamos a una función pura y compartida en vez
 * de repetir la cuenta en cada componente (mapa de butacas, pago, etc.)
 * para que la regla de negocio viva en un solo lugar.
 */

/** Calcula la edad en años a partir de una fecha de nacimiento (string ISO o Date). */
export function calcularEdad(fechaNacimiento: string | Date | null | undefined): number | null {
  if (!fechaNacimiento) return null;

  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();

  const todaviaNoCumplioEsteAno =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());

  if (todaviaNoCumplioEsteAno) edad--;

  return edad;
}

/**
 * Convierte el texto de restricción que guarda la película ('ATP', '+13', '+18')
 * en la edad mínima numérica que hace falta tener para comprar sin acompañante.
 * Devuelve 0 si es ATP (sin restricción).
 */
export function edadMinimaRequerida(restriccionEdad: string | null | undefined): number {
  if (!restriccionEdad) return 0;
  const match = restriccionEdad.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}
