/**
 * Helper functions for image processing
 */

/**
 * Limpia el nombre de una imagen eliminando extensiones intermedias duplicadas
 * Ejemplo: "imagen.jpg.webp" -> "imagen.webp"
 * Ejemplo: "imagen.jpeg.webp" -> "imagen.webp"
 * Ejemplo: "imagen.png.webp" -> "imagen.webp"
 * 
 * @param imageName Nombre de la imagen (puede incluir path)
 * @returns Nombre de la imagen limpio
 */
export function cleanImageName(imageName: string): string {
  if (!imageName) return imageName;

  // Extensiones intermedias comunes que deben eliminarse antes de .webp
  const intermediateExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif'];
  
  // Separar path y nombre del archivo
  const pathParts = imageName.split('/');
  const fileName = pathParts.pop() || '';
  const path = pathParts.length > 0 ? pathParts.join('/') + '/' : '';

  // Eliminar extensiones intermedias antes de .webp
  let cleanedName = fileName;
  for (const ext of intermediateExtensions) {
    // Buscar patrones como ".jpg.webp", ".jpeg.webp", etc.
    const pattern = new RegExp(`\\${ext}\\.webp$`, 'i');
    if (pattern.test(cleanedName)) {
      cleanedName = cleanedName.replace(pattern, '.webp');
      break; // Solo eliminar una extensión intermedia
    }
  }

  return path + cleanedName;
}

/**
 * Limpia un imageKey (puede incluir path completo)
 * @param imageKey Key de la imagen en el bucket
 * @returns Key limpio sin extensiones intermedias
 */
export function cleanImageKey(imageKey: string): string {
  return cleanImageName(imageKey);
}



