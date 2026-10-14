// Exposes top-level route as <html data-route="..."> so CSS can target pages.
// Costs one attribute write per navigation; uses neither polling nor a MutationObserver.
(() => {
  "use strict";
  const root = document.documentElement;
  const sync = () => {
    const route = location.pathname.split("/")[1] || "home";
    if (root.dataset.route !== route) root.dataset.route = route;
  };

  if ("navigation" in window) {
    // Navigation API fires for pushState/replaceState/popstate alike.
    navigation.addEventListener("currententrychange", sync);
  } else {
    for (const fn of ["pushState", "replaceState"]) {
      const orig = history[fn];
      history[fn] = function (...args) {
        const ret = orig.apply(this, args);
        sync();
        return ret;
      };
    }
    addEventListener("popstate", sync);
  }
  sync();
})();
