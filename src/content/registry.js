/** Module registry — loaded right after core.js so feature files can register themselves. */
(() => {
  const GT = globalThis.GlassTube;
  GT.modules = [];
  /**
   * @param {{ name: string, active: (settings: object, route: string) => boolean,
   *           mount: (route: string) => void, unmount: () => void, update?: (route: string) => void }} mod
   */
  GT.register = (mod) => GT.modules.push(mod);
})();
