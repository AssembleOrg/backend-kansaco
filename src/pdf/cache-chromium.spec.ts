import { ppidDesdeStat, rutasDesdeMaps } from './cache-chromium';

describe('cache-chromium', () => {
  it('lee el PPID aunque el nombre del proceso tenga espacios y paréntesis', () => {
    expect(ppidDesdeStat('27 (chrome) S 1 27 27 0 -1 4194560')).toBe(1);
    expect(
      ppidDesdeStat('31 (Chrome_ChildIOT (x)) S 27 27 27 0 -1 4194624'),
    ).toBe(27);
    expect(ppidDesdeStat('basura')).toBeUndefined();
  });

  it('saca los archivos de /proc/<pid>/maps sin repetidos ni memoria anónima', () => {
    const maps = [
      '55d0c0000000-55d0c2000000 r--p 00000000 00:2e 1234   /root/.cache/puppeteer/chrome/linux-142/chrome-linux64/chrome',
      '55d0c2000000-55d0d0000000 r-xp 02000000 00:2e 1234   /root/.cache/puppeteer/chrome/linux-142/chrome-linux64/chrome',
      '7f1e2c000000-7f1e2c021000 rw-p 00000000 00:00 0 ',
      '7f1e2d000000-7f1e2d200000 r-xp 00000000 08:01 99     /usr/lib/x86_64-linux-gnu/libnss3.so',
      '7f1e2e000000-7f1e2e100000 rw-s 00000000 00:05 77     /dev/shm/.org.chromium.Chromium.abc (deleted)',
      '7f1e2f000000-7f1e2f010000 r--s 00000000 08:01 55     /tmp/puppeteer_dev_chrome_profile-AbC/Default/Cookies',
      '7f1e30000000-7f1e30010000 r--p 00000000 08:01 56     /dev/dri/renderD128',
      '7ffd1e000000-7ffd1e021000 rw-p 00000000 00:00 0      [stack]',
      '',
    ].join('\n');

    expect(rutasDesdeMaps(maps)).toEqual([
      '/root/.cache/puppeteer/chrome/linux-142/chrome-linux64/chrome',
      '/usr/lib/x86_64-linux-gnu/libnss3.so',
    ]);
  });
});
