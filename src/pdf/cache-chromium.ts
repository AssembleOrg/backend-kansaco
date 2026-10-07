import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Cada PDF arranca Chromium, que lee del disco su binario, recursos y
 * librerías (~400MB). Esas páginas quedan en la caché del kernel después de
 * cerrar el navegador: Railway las cuenta como RAM del servicio y, como el
 * contenedor no tiene presión de memoria, no se liberan nunca.
 *
 * `dd iflag=nocache count=0` le pide al kernel que suelte la caché de un
 * archivo (posix_fadvise DONTNEED): no lee ni escribe datos y no afecta a
 * ningún proceso. Lo único que cambia es que el próximo PDF vuelve a leer
 * Chromium del disco.
 */

/** PPID según /proc/<pid>/stat (el nombre del proceso puede tener espacios y paréntesis). */
export function ppidDesdeStat(stat: string): number | undefined {
  const campos = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
  const ppid = Number(campos[1]);
  return Number.isInteger(ppid) ? ppid : undefined;
}

// Lo que vive acá es temporal (el perfil de Chromium se borra al cerrarlo, y
// al borrarse un archivo su caché se va sola) o no es un archivo de disco.
const SIN_CACHE_PROPIA = ['/dev/', '/proc/', '/sys/', `${os.tmpdir()}/`];

/** Archivos que aparecen en /proc/<pid>/maps, sin memoria anónima ni archivos temporales. */
export function rutasDesdeMaps(maps: string): string[] {
  const rutas = new Set<string>();
  for (const linea of maps.split('\n')) {
    const inicio = linea.indexOf(' /');
    if (inicio === -1 || linea.endsWith(' (deleted)')) continue;
    const ruta = linea.slice(inicio + 1);
    if (SIN_CACHE_PROPIA.some((prefijo) => ruta.startsWith(prefijo))) continue;
    rutas.add(ruta);
  }
  return [...rutas];
}

/**
 * Archivos que tienen mapeados Chromium y sus procesos hijos (renderer, gpu,
 * zygote). Hay que leerlos antes de cerrar el navegador.
 */
export function archivosDeChromium(pidRaiz: number | undefined): string[] {
  if (!pidRaiz || process.platform !== 'linux') return [];

  const pids = new Set([pidRaiz]);
  try {
    const padres = new Map<number, number>();
    for (const entrada of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(entrada)) continue;
      try {
        const ppid = ppidDesdeStat(
          fs.readFileSync(`/proc/${entrada}/stat`, 'utf8'),
        );
        if (ppid !== undefined) padres.set(Number(entrada), ppid);
      } catch {
        // El proceso terminó mientras lo leíamos.
      }
    }
    let agregados = true;
    while (agregados) {
      agregados = false;
      for (const [pid, ppid] of padres) {
        if (!pids.has(pid) && pids.has(ppid)) {
          pids.add(pid);
          agregados = true;
        }
      }
    }
  } catch {
    // Sin /proc: alcanza con el directorio de Chromium.
  }

  const rutas = new Set<string>();
  for (const pid of pids) {
    try {
      const maps = fs.readFileSync(`/proc/${pid}/maps`, 'utf8');
      for (const ruta of rutasDesdeMaps(maps)) rutas.add(ruta);
    } catch {
      // Idem: el proceso ya no existe.
    }
  }
  return [...rutas];
}

/** Pide al kernel que suelte la caché de esos archivos y directorios. Nunca tira. */
export function soltarCache(
  rutas: string[],
  alFallar: (mensaje: string) => void,
): void {
  if (process.platform !== 'linux' || rutas.length === 0) return;
  execFile(
    'find',
    [
      ...rutas,
      '-type',
      'f',
      '-exec',
      'dd',
      'if={}',
      'iflag=nocache',
      'count=0',
      'status=none',
      ';',
    ],
    { timeout: 60_000 },
    (error) => {
      // El mensaje trae todo el stderr de find; con la primera línea alcanza.
      if (error) alFallar(error.message.split('\n')[0]);
    },
  );
}
