// In-app appearance panel. Open via topbar button (docked next to search) or Ctrl+Shift+Y.
// Overrides are layered on top of theme.toml and persisted in Spotify's localStorage;
// "Reset" drops them so theme.toml shows through again.
(() => {
  "use strict";

  const KEY = "spotpatch:settings:v1";
    const HEX = /^#[0-9a-f]{6}$/;
  // Same selectors as spotpatch/theme.py; emitted later in <body> -> wins on equal specificity.
  const BASE_SEL = ":root,.encore-dark-theme,.encore-dark-theme .encore-base-set";
  const ACCENT_SEL = ".encore-dark-theme .encore-bright-accent-set";
  const FAB = 48;
  const GAP_MAX = 24;

  /** @typedef {{accent: string, bg: string, surface: string, text: string, subtext: string}} Palette */
  /**
   * @typedef {{
   *   colors: Palette | null, panelGap: number | null, font: string,
   *   radius: number | null, headingSpacing: number | null, headingWeight: number | null,
   *   accentScrollbar: boolean, accentSelection: boolean, noAnimations: boolean, hideFab: boolean,
   *   cinemaLyrics: boolean, lyricsFocus: boolean, vinylSpin: boolean, glowBars: boolean, hoverCards: boolean,
   *   glass: boolean, hideUpgrade: boolean, hideInstall: boolean, hideNowPlayingView: boolean, hideAds: boolean
   * }} Settings
   */

  /** @type {ReadonlyArray<[keyof Palette, string]>} */
  const COLOR_FIELDS = [
    ["accent", "Akcent"],
    ["bg", "Tło"],
    ["surface", "Panele"],
    ["text", "Tekst"],
    ["subtext", "Tekst drugorzędny"],
  ];
  const COLOR_KEYS = COLOR_FIELDS.map(([k]) => k);

  /** Plain boolean flags handled in buildCss (no body class). */
  /** @type {ReadonlyArray<[keyof Settings, string]>} */
  const FLAGS = [
    ["accentScrollbar", "Scrollbar w kolorze akcentu"],
    ["accentSelection", "Zaznaczenie tekstu w kolorze akcentu"],
    ["noAnimations", "Wyłącz animacje"],
    ["hideFab", "Ukryj przycisk (Ctrl+Shift+Y nadal działa)"],
  ];

  /** Flags that only toggle a class on <body>; the rules live in custom.css. [key, label, class] */
  /** @type {Readonly<Record<string, ReadonlyArray<[keyof Settings, string, string]>>>} */
  const CLASS_FLAGS = {
    lyrics: [
      ["cinemaLyrics", "Cinema Lyrics (większe, wyśrodkowane)", "spx-cinema-lyrics"],
      ["lyricsFocus", "Karaoke: rozmyj nieaktywne wersy", "spx-lyrics-focus"],
    ],
    player: [
      ["vinylSpin", "Vinyl Spin (obracająca się okładka)", "spx-vinyl-spin"],
      ["glowBars", "Neonowy pasek postępu i głośności", "spx-glow-bars"],
      ["hoverCards", "Unoszone kafelki po najechaniu", "spx-hover-cards"],
    ],
    ui: [["glass", "Glassmorphism (rozmyte panele)", "spx-glass"]],
    clean: [
      ["hideUpgrade", "Ukryj „Explore Premium”", "spx-hide-upgrade"],
      ["hideInstall", "Ukryj „Install App”", "spx-hide-install"],
      ["hideNowPlayingView", "Ukryj prawy panel Now Playing", "spx-hide-npv"],
      ["hideAds", "Ukryj banery sponsorowane", "spx-hide-ads"],
    ],
  };
  const ALL_CLASS_FLAGS = Object.values(CLASS_FLAGS).flat();

  const RADIUS_MAX = 24;
  const HS_MIN = -5;
  const HS_MAX = 20;
  const HW_MIN = 400;
  const HW_MAX = 900;


  /** @type {Readonly<Record<string, Palette>>} */
  const PRESETS = {
    "GitHub Dark": { accent: "#58a6ff", bg: "#0d1117", surface: "#161b22", text: "#e6edf3", subtext: "#8b949e" },
    Spotify: { accent: "#1ed760", bg: "#121212", surface: "#1f1f1f", text: "#ffffff", subtext: "#b3b3b3" },
    Dracula: { accent: "#bd93f9", bg: "#282a36", surface: "#343746", text: "#f8f8f2", subtext: "#a4a7c0" },
    Nord: { accent: "#88c0d0", bg: "#2e3440", surface: "#3b4252", text: "#eceff4", subtext: "#a3abbb" },
    Catppuccin: { accent: "#cba6f7", bg: "#1e1e2e", surface: "#313244", text: "#cdd6f4", subtext: "#a6adc8" },
    Gruvbox: { accent: "#fabd2f", bg: "#282828", surface: "#3c3836", text: "#ebdbb2", subtext: "#a89984" },
    "Tokyo Night": { accent: "#7aa2f7", bg: "#1a1b26", surface: "#24283b", text: "#c0caf5", subtext: "#9aa5ce" },
    "Rosé Pine": { accent: "#ebbcba", bg: "#191724", surface: "#1f1d2e", text: "#e0def4", subtext: "#908caa" },
  };

  // Whitelist: font stacks/URLs are inlined, so never accept free-form values from storage.
  // `google` = family spec for a single fonts.googleapis.com stylesheet, loaded only while selected.
  /** @type {ReadonlyMap<string, {label: string, stack: string | null, google?: string}>} */
  const FONTS = new Map([
    ["", { label: "Domyślna (Spotify)", stack: null }],
    ["system", { label: "System UI", stack: "system-ui,sans-serif" }],
    ["segoe", { label: "Segoe UI", stack: '"Segoe UI Variable Text","Segoe UI",sans-serif' }],
    ["inter", { label: "Inter", stack: '"Inter",sans-serif', google: "Inter:wght@400;500;600;700" }],
    ["jetbrains", { label: "JetBrains Mono", stack: '"JetBrains Mono",monospace', google: "JetBrains+Mono:wght@400;500;700" }],
    ["fira", { label: "Fira Code", stack: '"Fira Code",monospace', google: "Fira+Code:wght@400;500;700" }],
    ["poppins", { label: "Poppins", stack: '"Poppins",sans-serif', google: "Poppins:wght@400;500;600;700" }],
    ["space", { label: "Space Grotesk", stack: '"Space Grotesk",sans-serif', google: "Space+Grotesk:wght@400;500;700" }],
    ["playfair", { label: "Playfair Display", stack: '"Playfair Display",serif', google: "Playfair+Display:wght@400;600;700" }],
    ["georgia", { label: "Georgia", stack: "Georgia,serif" }],
    ["mono", { label: "Consolas (mono)", stack: '"Cascadia Code",Consolas,monospace' }],
  ]);

  /** @type {Settings} */
  const DEFAULTS = Object.freeze({
    colors: null,
    panelGap: null,
    font: "",
    radius: null,
    headingSpacing: null,
    headingWeight: null,
    accentScrollbar: false,
    accentSelection: false,
    noAnimations: false,
    hideFab: false,
    cinemaLyrics: false,
    lyricsFocus: false,
    vinylSpin: false,
    glowBars: false,
    hoverCards: false,
    glass: false,
    hideUpgrade: false,
    hideInstall: false,
    hideNowPlayingView: false,
    hideAds: false,
  });


  const root = document.documentElement;
  const clamp = (/** @type {number} */ v, /** @type {number} */ lo, /** @type {number} */ hi) =>
    Math.min(hi, Math.max(lo, v));

  // ---------- color math (sRGB lerp; concrete hex so the same map can be exported to TOML) ----------
  const toRgb = (/** @type {string} */ hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const toHex = (/** @type {number[]} */ rgb) =>
    "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const mix = (/** @type {string} */ a, /** @type {string} */ b, /** @type {number} */ t) => {
    const x = toRgb(a);
    const y = toRgb(b);
    return toHex(x.map((v, i) => v + (y[i] - v) * t));
  };

  /** @param {Palette} p @returns {Record<string, Record<string, string>>} */
  const deriveVars = (p) => ({
    base: {
      "background-base": p.bg,
      "background-highlight": p.surface,
      "background-press": mix(p.surface, p.text, 0.06),
      "background-elevated-base": p.surface,
      "background-elevated-highlight": mix(p.surface, p.text, 0.06),
      "background-elevated-press": mix(p.surface, p.text, 0.1),
      "background-tinted-base": `${p.text}12`,
      "background-tinted-highlight": `${p.text}1f`,
      "text-base": p.text,
      "text-subdued": p.subtext,
      "text-bright-accent": p.accent,
      "essential-base": p.text,
      "essential-subdued": mix(p.subtext, p.bg, 0.25),
      "essential-bright-accent": p.accent,
      "decorative-base": p.text,
      "decorative-subdued": mix(p.bg, p.text, 0.15),
    },
    "bright-accent": {
      "background-base": p.accent,
      "background-highlight": mix(p.accent, "#ffffff", 0.15),
      "background-press": mix(p.accent, "#000000", 0.15),
    },
  });

  const block = (/** @type {string} */ sel, /** @type {Record<string, string>} */ decls) =>
    `${sel}{${Object.entries(decls).map(([k, v]) => `--${k}:${v};`).join("")}}`;

  /** @param {Settings} s */
  const buildCss = (s) => {
    const out = [];
    if (s.colors) {
      const v = deriveVars(s.colors);
      out.push(block(BASE_SEL, v.base), block(ACCENT_SEL, v["bright-accent"]), `:root{--custom-accent:${s.colors.accent}}`);
    }
    if (s.panelGap !== null) out.push(`:root{--panel-gap:${s.panelGap}px}`);
    const stack = FONTS.get(s.font)?.stack;
    if (stack) {
      out.push(
        `:root,.encore-dark-theme{--custom-font:${stack};--font-family:${stack};--encore-body-font-stack:${stack};--encore-title-font-stack:${stack};--encore-variable-font-stack:${stack}}`,
      );
    }
    /** @type {string[]} */
    const vars = [];
    if (s.radius !== null) vars.push(`--custom-radius:${s.radius}px`);
    if (s.headingSpacing !== null) vars.push(`--custom-heading-spacing:${s.headingSpacing / 100}em`);
    if (s.headingWeight !== null) vars.push(`--custom-heading-weight:${s.headingWeight}`);
    if (vars.length) out.push(`:root{${vars.join(";")}}`);
    if (s.accentScrollbar) {
      out.push(
        ".os-scrollbar-handle{background:var(--text-bright-accent)!important}",
        "::-webkit-scrollbar-thumb{background:var(--text-bright-accent)}",
      );
    }
    if (s.accentSelection) out.push("::selection{background:var(--text-bright-accent);color:var(--background-base)}");
    if (s.noAnimations) {
      out.push("*,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important;animation-delay:0s!important}");
    }
    return out.join("\n");
  };

  /** @param {Palette} p */
  const toToml = (p) =>
    Object.entries(deriveVars(p))
      .map(([set, decls]) => `[${set}]\n${Object.entries(decls).map(([k, v]) => `${k} = "${v}"`).join("\n")}`)
      .join("\n\n") + "\n";

  // ---------- persistence ----------
  /** @param {unknown} raw @returns {Settings} */
  const sanitize = (raw) => {
    /** @type {Settings} */
    const s = { ...DEFAULTS };
    if (!raw || typeof raw !== "object") return s;
    const r = /** @type {Record<string, any>} */ (raw);
    const c = r.colors;
    if (c && typeof c === "object" && COLOR_KEYS.every((k) => typeof c[k] === "string" && HEX.test(c[k]))) {
      s.colors = /** @type {Palette} */ (Object.fromEntries(COLOR_KEYS.map((k) => [k, c[k]])));
    }
    if (Number.isFinite(r.panelGap)) s.panelGap = clamp(Math.round(r.panelGap), 0, GAP_MAX);
    if (typeof r.font === "string" && FONTS.has(r.font)) s.font = r.font;
    if (Number.isFinite(r.radius)) s.radius = clamp(Math.round(r.radius), 0, RADIUS_MAX);
    if (Number.isFinite(r.headingSpacing)) s.headingSpacing = clamp(Math.round(r.headingSpacing), HS_MIN, HS_MAX);
    if (Number.isFinite(r.headingWeight)) s.headingWeight = clamp(Math.round(r.headingWeight / 100) * 100, HW_MIN, HW_MAX);
    for (const [k] of [...FLAGS, ...ALL_CLASS_FLAGS]) if (typeof r[k] === "boolean") /** @type {any} */ (s)[k] = r[k];
    return s;
  };

  /** @template T @param {string} key @param {(v: unknown) => T} parse @returns {T} */
  const readJson = (key, parse) => {
    const txt = localStorage.getItem(key);
    if (txt === null) return parse(null);
    try {
      return parse(JSON.parse(txt));
    } catch (err) {
      console.warn(`[spotpatch] corrupt ${key}, using defaults`, err);
      return parse(null);
    }
  };

  const writeJson = (/** @type {string} */ key, /** @type {unknown} */ value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[spotpatch] cannot persist ${key}`, err);
      return false;
    }
  };

  /** @returns {Palette} */
  const readCurrentPalette = () => {
    const cs = getComputedStyle(root);
    const fb = PRESETS["GitHub Dark"];
    const get = (/** @type {string} */ name, /** @type {string} */ dflt) => {
      const v = cs.getPropertyValue(`--${name}`).trim().toLowerCase();
      return HEX.test(v) ? v : dflt;
    };
    return {
      accent: get("text-bright-accent", fb.accent),
      bg: get("background-base", fb.bg),
      surface: get("background-elevated-base", fb.surface),
      text: get("text-base", fb.text),
      subtext: get("text-subdued", fb.subtext),
    };
  };

  const currentGap = () => {
    const v = parseInt(getComputedStyle(root).getPropertyValue("--panel-gap"), 10);
    return Number.isFinite(v) ? clamp(v, 0, GAP_MAX) : 8;
  };

  // Apply synchronously before Spotify's React tree renders -> no flash of the old palette.
  let state = readJson(KEY, sanitize);
  const overrideEl = document.createElement("style");
  overrideEl.setAttribute("data-spotpatch-settings", "");
  document.body.append(overrideEl);

  // Single <link>, present only while a Google font is selected.
  /** @type {HTMLLinkElement | null} */
  let fontLink = null;
  const syncFontLink = () => {
    const spec = FONTS.get(state.font)?.google;
    if (!spec) {
      fontLink?.remove();
      fontLink = null;
      return;
    }
    const href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      document.head.append(fontLink);
    }
    if (fontLink.getAttribute("href") !== href) fontLink.setAttribute("href", href);
  };

  // Pure state -> DOM projection: CSS variables + body classes only; no timers or frame loops.
  const applyState = () => {
    overrideEl.textContent = buildCss(state);
    const cl = document.body.classList;
    for (const [k, , cls] of ALL_CLASS_FLAGS) cl.toggle(cls, Boolean(/** @type {any} */ (state)[k]));
    cl.toggle("spx-font", Boolean(FONTS.get(state.font)?.stack));
    cl.toggle("spx-radius", state.radius !== null);
    cl.toggle("spx-heading-spacing", state.headingSpacing !== null);
    cl.toggle("spx-heading-weight", state.headingWeight !== null);
    syncFontLink();
  };
  applyState();

  // ---------- DOM helpers ----------
  /**
   * @param {string} tag
   * @param {Record<string, any>} [props]
   * @param {...(Node | string)} kids
   */
  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k in el && k !== "style") /** @type {any} */ (el)[k] = v;
      else el.setAttribute(k, String(v));
    }
    el.append(...kids);
    return el;
  };

  const UI_CSS = `
.spx-topbar-row{display:flex !important;flex-direction:row !important;align-items:center !important;flex-wrap:nowrap !important;gap:8px}
#spx-fab{position:static !important;transform:none !important;flex:0 0 ${FAB}px;flex-shrink:0;align-self:center;box-sizing:border-box;width:${FAB}px;min-width:${FAB}px;height:${FAB}px;min-height:${FAB}px;margin:0;padding:0;border:0;border-radius:50%;display:grid;place-items:center;
  cursor:pointer;color:var(--text-subdued,#b3b3b3);background:var(--background-elevated-base,#1f1f1f);
  user-select:none !important;-webkit-user-select:none !important;-webkit-user-drag:none !important;-webkit-app-region:no-drag !important}
#spx-fab:hover{color:var(--text-base,#fff);background:var(--background-elevated-highlight,#2a2a2a)}
#spx-fab svg{display:block;pointer-events:none}
#spx-fab[hidden]{display:none}
#spx-panel{position:fixed;z-index:10000;top:64px;right:16px;width:320px;max-height:calc(100vh - 180px);overflow:auto;
  padding:16px;border-radius:12px;background:var(--background-elevated-base);color:var(--text-base);
  box-shadow:0 16px 48px #000b;font:14px/1.4 var(--encore-body-font-stack,sans-serif);-webkit-app-region:no-drag;
  opacity:0;transform:translateY(-8px) scale(.98);pointer-events:none;transition:opacity .15s ease,transform .15s ease}
#spx-panel.spx-open{opacity:1;transform:none;pointer-events:auto}
#spx-panel h2{margin:0;font-size:18px;font-weight:700}
#spx-panel h3{margin:16px 0 8px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-subdued)}
.spx-head{display:flex;align-items:center;justify-content:space-between}
.spx-x{border:0;background:none;color:var(--text-subdued);font-size:22px;line-height:1;cursor:pointer}
.spx-x:hover{color:var(--text-base)}
.spx-presets{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.spx-preset{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid transparent;border-radius:8px;
  background:var(--background-tinted-base);color:var(--text-base);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.spx-preset:hover{background:var(--background-tinted-highlight)}
.spx-preset.spx-active{border-color:var(--text-bright-accent)}
.spx-dots{display:flex;flex:none}
.spx-dots i{width:12px;height:12px;margin-left:-4px;border-radius:50%;box-shadow:0 0 0 2px var(--background-elevated-base)}
.spx-dots i:first-child{margin-left:0}
.spx-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0;cursor:default}
.spx-color{display:flex;align-items:center;gap:8px}
.spx-color input[type=color]{width:28px;height:28px;padding:0;border:0;background:none;cursor:pointer}
.spx-color input[type=color]::-webkit-color-swatch-wrapper{padding:0}
.spx-color input[type=color]::-webkit-color-swatch{border:2px solid var(--decorative-subdued);border-radius:50%}
.spx-hex,.spx-select{padding:4px 6px;border:1px solid var(--decorative-subdued);border-radius:6px;background:var(--background-base);color:var(--text-base)}
.spx-hex{width:76px;font:12px ui-monospace,Consolas,monospace}
.spx-select{font:inherit;font-size:13px}
.spx-range{flex:1;accent-color:var(--text-bright-accent)}
.spx-out{width:48px;text-align:right;font-variant-numeric:tabular-nums;color:var(--text-subdued)}
.spx-switch{appearance:none;position:relative;flex:none;width:36px;height:20px;margin:0;border-radius:10px;
  background:var(--decorative-subdued);cursor:pointer;transition:background .15s}
.spx-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--text-base);transition:transform .15s}
.spx-switch:checked{background:var(--text-bright-accent)}
.spx-switch:checked::after{transform:translateX(16px)}
.spx-foot{display:flex;gap:8px;margin-top:16px}
.spx-btn{flex:1;padding:8px 12px;border:0;border-radius:999px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;
  background:var(--background-tinted-highlight);color:var(--text-base)}
.spx-btn.spx-primary{background:var(--text-bright-accent);color:var(--background-base)}
.spx-btn:hover{filter:brightness(1.1)}
.spx-status{min-height:16px;margin-top:8px;font-size:12px;text-align:center;color:var(--text-subdued)}`;

  // ---------- UI ----------
  /** @type {{colors: Record<string, {picker: HTMLInputElement, hex: HTMLInputElement}>, flags: Record<string, HTMLInputElement>, presets: {el: HTMLElement, pal: Palette}[]}} */
  const controls = { colors: {}, flags: {}, presets: [] };

  const statusEl = h("div", { class: "spx-status", role: "status" });
  let statusTimer = 0;
  const status = (/** @type {string} */ msg) => {
    statusEl.textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => (statusEl.textContent = ""), 4000);
  };

  // Apply is synchronous (cheap: one <style> text + class toggles); storage write is a one-shot debounce.
  let persistTimer = 0;
  const commit = () => {
    applyState();
    fab.hidden = state.hideFab;
    syncControls();
    clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      if (!writeJson(KEY, state)) status("Nie udało się zapisać ustawień");
    }, 200);
  };

  const setColor = (/** @type {keyof Palette} */ key, /** @type {string} */ value) => {
    state.colors = { ...(state.colors ?? readCurrentPalette()), [key]: value };
    commit();
  };

  const colorRow = (/** @type {[keyof Palette, string]} */ [key, label]) => {
    const picker = /** @type {HTMLInputElement} */ (
      h("input", { type: "color", oninput: (/** @type {Event} */ e) => setColor(key, /** @type {HTMLInputElement} */ (e.target).value) })
    );
    const hex = /** @type {HTMLInputElement} */ (
      h("input", {
        class: "spx-hex",
        type: "text",
        maxLength: 7,
        spellcheck: false,
        onchange: (/** @type {Event} */ e) => {
          const raw = /** @type {HTMLInputElement} */ (e.target).value.trim();
          const v = `#${raw.replace(/^#/, "")}`.toLowerCase();
          if (HEX.test(v)) setColor(key, v);
          else {
            status(`Niepoprawny kolor: ${raw}`);
            syncControls();
          }
        },
      })
    );
    controls.colors[key] = { picker, hex };
    return h("div", { class: "spx-row" }, h("span", {}, label), h("div", { class: "spx-color" }, hex, picker));
  };

  const presetGrid = h(
    "div",
    { class: "spx-presets" },
    ...Object.entries(PRESETS).map(([name, pal]) => {
      const el = h(
        "button",
        { class: "spx-preset", type: "button", onclick: () => ((state.colors = { ...pal }), commit()) },
        h("span", { class: "spx-dots" }, ...[pal.bg, pal.surface, pal.accent].map((c) => h("i", { style: `background:${c}` }))),
        name,
      );
      controls.presets.push({ el, pal });
      return el;
    }),
  );

  const gapInput = /** @type {HTMLInputElement} */ (
    h("input", {
      class: "spx-range",
      type: "range",
      min: 0,
      max: GAP_MAX,
      step: 1,
      oninput: (/** @type {Event} */ e) => {
        state.panelGap = Number(/** @type {HTMLInputElement} */ (e.target).value);
        commit();
      },
    })
  );
  const gapOut = h("span", { class: "spx-out" });

  const fontSelect = /** @type {HTMLSelectElement} */ (
    h(
      "select",
      {
        class: "spx-select",
        onchange: (/** @type {Event} */ e) => {
          state.font = /** @type {HTMLSelectElement} */ (e.target).value;
          commit();
        },
      },
      ...[...FONTS].map(([id, f]) => h("option", { value: id }, f.label)),
    )
  );

  const flagRow = (/** @type {keyof Settings} */ key, /** @type {string} */ label) => {
    const input = /** @type {HTMLInputElement} */ (
      h("input", {
        class: "spx-switch",
        type: "checkbox",
        onchange: (/** @type {Event} */ e) => {
          /** @type {any} */ (state)[key] = /** @type {HTMLInputElement} */ (e.target).checked;
          commit();
        },
      })
    );
    controls.flags[key] = input;
    return h("label", { class: "spx-row" }, h("span", {}, label), input);
  };
  const flagRows = FLAGS.map(([key, label]) => flagRow(key, label));
  const groupRows = (/** @type {string} */ g) => CLASS_FLAGS[g].map(([key, label]) => flagRow(key, label));

  /** Sliders for nullable numeric settings; `null` = untouched (theme/Spotify default shows through). */
  /** @type {Array<() => void>} */
  const rangeSyncers = [];
  const rangeRow = (
    /** @type {"radius" | "headingSpacing" | "headingWeight"} */ key,
    /** @type {string} */ label,
    /** @type {number} */ min,
    /** @type {number} */ max,
    /** @type {number} */ step,
    /** @type {number} */ dflt,
    /** @type {(v: number) => string} */ fmt,
  ) => {
    const out = h("span", { class: "spx-out" });
    const input = /** @type {HTMLInputElement} */ (
      h("input", {
        class: "spx-range",
        type: "range",
        min,
        max,
        step,
        oninput: (/** @type {Event} */ e) => {
          state[key] = Number(/** @type {HTMLInputElement} */ (e.target).value);
          commit();
        },
      })
    );
    rangeSyncers.push(() => {
      const v = state[key] ?? dflt;
      input.value = String(v);
      out.textContent = state[key] === null ? "auto" : fmt(v);
    });
    return h("div", { class: "spx-row" }, h("span", {}, label), input, out);
  };


  const copyText = async (/** @type {string} */ text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("[spotpatch] Clipboard API unavailable, falling back to execCommand", err);
      const ta = /** @type {HTMLTextAreaElement} */ (h("textarea", { value: text, style: "position:fixed;opacity:0" }));
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  };

  const panel = h(
    "div",
    { id: "spx-panel", role: "dialog", "aria-label": "Ustawienia wyglądu" },
    h("div", { class: "spx-head" }, h("h2", {}, "Wygląd"), h("button", { class: "spx-x", type: "button", title: "Zamknij", onclick: () => setOpen(false) }, "×")),
    h("h3", {}, "Motywy"),
    presetGrid,
    h("h3", {}, "Kolory"),
    ...COLOR_FIELDS.map(colorRow),
    h("h3", {}, "Układ"),
    h("div", { class: "spx-row" }, h("span", {}, "Odstęp paneli"), gapInput, gapOut),
    rangeRow("radius", "Zaokrąglenie rogów", 0, RADIUS_MAX, 1, 8, (v) => `${v}px`),
    ...groupRows("ui"),
    h("h3", {}, "Typografia"),
    h("div", { class: "spx-row" }, h("span", {}, "Czcionka"), fontSelect),
    rangeRow("headingWeight", "Grubość nagłówków", HW_MIN, HW_MAX, 100, 700, (v) => String(v)),
    rangeRow("headingSpacing", "Odstęp liter nagłówków", HS_MIN, HS_MAX, 1, 0, (v) => `${v / 100}em`),
    h("h3", {}, "Teksty piosenek"),
    ...groupRows("lyrics"),
    h("h3", {}, "Odtwarzacz i animacje (GPU)"),
    ...groupRows("player"),
    h("h3", {}, "Czysty interfejs"),
    ...groupRows("clean"),
    h("h3", {}, "Efekty"),
    ...flagRows,
    h(
      "div",
      { class: "spx-foot" },
      h(
        "button",
        {
          class: "spx-btn spx-primary",
          type: "button",
          title: "Wygenerowane wartości można wkleić do themes/<theme>/theme.toml",
          onclick: async () =>
            status((await copyText(toToml(state.colors ?? readCurrentPalette()))) ? "Skopiowano, wklej do theme.toml" : "Nie udało się skopiować"),
        },
        "Kopiuj theme.toml",
      ),
      h(
        "button",
        {
          class: "spx-btn",
          type: "button",
          onclick: () => {
            state = { ...DEFAULTS };
            commit();
            status("Przywrócono wartości z theme.toml");
          },
        },
        "Reset",
      ),
    ),
    statusEl,
  );

  function syncControls() {
    const pal = state.colors ?? readCurrentPalette();
    for (const [k, { picker, hex }] of Object.entries(controls.colors)) {
      const v = pal[/** @type {keyof Palette} */ (k)];
      picker.value = v;
      if (document.activeElement !== hex) hex.value = v;
    }
    const gap = state.panelGap ?? currentGap();
    gapInput.value = String(gap);
    gapOut.textContent = `${gap}px`;
    fontSelect.value = state.font;
    for (const sync of rangeSyncers) sync();
    for (const [k, el] of Object.entries(controls.flags)) el.checked = Boolean(/** @type {any} */ (state)[k]);
    const cur = state.colors;
    for (const { el, pal: p } of controls.presets) {
      el.classList.toggle("spx-active", cur !== null && COLOR_KEYS.every((k) => cur[k] === p[k]));
    }
  }

  let isOpen = false;
  function setOpen(/** @type {boolean} */ open) {
    isOpen = open;
    panel.classList.toggle("spx-open", open);
    panel.inert = !open;
    if (open) syncControls();
  }

  // ---------- topbar button (docked, non-draggable) ----------
  const fab = h("button", { id: "spx-fab", type: "button", title: "Wygląd (Ctrl+Shift+Y)", "aria-label": "Ustawienia wyglądu" });
  fab.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 22 9.8C22 6 17.5 3 12 3Zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>';
  fab.hidden = state.hideFab;

  fab.draggable = false;
  fab.addEventListener("click", () => setOpen(!isOpen));
  addEventListener(
    "keydown",
    (e) => {
      if (e.ctrlKey && e.shiftKey && !e.altKey && e.code === "KeyY") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(!isOpen);
      } else if (isOpen && e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    },
    true,
  );
  document.addEventListener(
    "pointerdown",
    (e) => {
      const t = /** @type {Node} */ (e.target);
      if (isOpen && !panel.contains(t) && !fab.contains(t)) setOpen(false);
    },
    true,
  );

  const uiStyle = document.createElement("style");
  uiStyle.textContent = UI_CSS;
  panel.inert = true;
  document.body.append(uiStyle, panel);

  // One-shot mount: React renders the topbar after startup; observer disconnects on first success (or after timeout).
  const findSearch = () =>
    document.querySelector('header [data-testid="search-input"], [data-testid="global-nav-bar"] [data-testid="search-input"], header input[role="combobox"][data-encore-id="formInput"]');
  /** Resolves the node that is a direct child of the Home/Search row and contains the whole search component. */
  const resolveSearchContainer = (/** @type {Element} */ input) => {
    const home = document.querySelector('[data-testid="home-button"]');
    if (home) {
      let lca = home.parentElement;
      while (lca && !lca.contains(input)) lca = lca.parentElement;
      if (lca && lca !== input) {
        let node = /** @type {Element} */ (input);
        while (node.parentElement && node.parentElement !== lca) node = node.parentElement;
        if (node.parentElement === lca && !node.contains(home)) return node;
      }
    }
    // Fallback without Home: climb out of single-child wrappers around [role=search]/form.
    let node = input.closest('[role="search"]') ?? input.closest("form") ?? input;
    while (node.parentElement && node.parentElement.children.length === 1 && node.parentElement.tagName !== "HEADER") node = node.parentElement;
    return node.parentElement ? node : null;
  };
  const mount = () => {
    const input = findSearch();
    if (!input) return false;
    const container = resolveSearchContainer(input);
    if (!container?.parentElement) return false;
    container.parentElement.classList.add("spx-topbar-row");
    container.insertAdjacentElement("afterend", fab);
    return true;
  };
  if (!mount()) {
    const obs = new MutationObserver(() => {
      if (mount()) {
        obs.disconnect();
        clearTimeout(giveUp);
      }
    });
    const giveUp = setTimeout(() => obs.disconnect(), 30000);
    obs.observe(document.body, { childList: true, subtree: true });
  }
})();
