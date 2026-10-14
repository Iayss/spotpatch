# Spotpatch 

> **Ultra-lightweight, zero-overhead Spotify Desktop theme engine & CEF patcher.**  
> Native in-app customization palette, live color presets, Google Fonts switcher, Cinema Lyrics, and GPU-accelerated visual effects.

---

##  Features

- ** Zero-CPU Runtime Overhead:**
  - No background polling or animation loops (`requestAnimationFrame` / `setInterval` free).
  - Pure CSS variables (`--custom-*`) and hardware-composited transitions (`transform`, `opacity`, `filter`).
- ** Native Topbar Integration:**
  - Customization palette button docked rigidly in the top navigation bar right next to the search input.
  - Fully CEF window-drag safe (`-webkit-app-region: no-drag`, `user-select: none`).
  - Non-floating, zero-drift flexbox anchoring.
- ** In-App Customization Panel (Topbar Palette / `Ctrl+Shift+Y`):**
  - **Color Palettes & Presets:** GitHub Dark, Catppuccin, Dracula, Nord, Gruvbox, Tokyo Night, Ros Pine, Spotify Default, plus real-time hex color pickers.
  - **Typography (Font Switcher):** Dynamic Google Fonts loader (Inter, JetBrains Mono, Fira Code, Poppins, Space Grotesk, Playfair Display, System UI) with font-weight and letter-spacing controls.
  - **Cinema Lyrics & Karaoke Mode:** Enlarged centered lyrics with dynamic blur and glow on active singing verses.
  - **GPU Effects:** Vinyl spin (rotating vinyl record cover art), neon glowing progress & volume bars (`drop-shadow`), smooth card hover elevations.
  - **Deep UI Customization:** Glassmorphism / Acrylic backdrop-filter blurring, custom border-radius slider (0px brutalist to 24px smooth curve), and Clean UI toggles (hide Premium upsell, install app prompt, right sidebar, sponsored banners).
- ** Clean Architecture & Safe Patching:**
  - Fast, offline atomic stream patching of Spotify's `xpui.spa` archive.
  - Automatic pristine backup (`xpui.spa.spotpatch.bak`).
  - Safe, idempotent restores without leaving dangling files or patch stacking.

---

##  Requirements

1. **Operating System:** Windows 10 / 11 (64-bit).
2. **Spotify Desktop:** Standalone official client from [spotify.com/download](https://www.spotify.com/download) *(Microsoft Store builds are protected by WindowsApps filesystem permissions and cannot be modified)*.
3. **Python:** Python 3.11 or newer (make sure *"Add python.exe to PATH"* is checked during installation).

---

##  Installation

### Option A: One-Liner (PowerShell)

Open PowerShell and paste:

```powershell
irm https://raw.githubusercontent.com/Iayss/spotpatch/main/install.ps1 | iex
```

### Option B: One-Click (ZIP Download)

1. [Download the latest repository ZIP](https://github.com/Iayss/spotpatch/archive/refs/heads/main.zip) and extract it.
2. Double-click **`install.bat`**.
3. Spotify will close, apply the patch, and relaunch automatically with the theme enabled.

### Option C: Manual CLI (Git)

```bash
git clone https://github.com/Iayss/spotpatch.git
cd spotpatch
python patcher.py apply --restart
```

---

##  How to Use

1. Click the **Palette icon** in Spotify's top bar (next to the search input) or press **`Ctrl + Shift + Y`** anywhere inside Spotify.
2. Choose a preset or customize colors, fonts, and GPU effects in real-time.
3. All preferences are instantly applied and saved to local storage.
4. Export your custom palette anytime using the **"Kopiuj theme.toml"** button.

---

##  Uninstallation (Restore Original Spotify)

To cleanly restore Spotify back to its stock, unpatched state:

- **Double-click:** **`uninstall.bat`**
- **Or via PowerShell:**
  ```powershell
  .\install.ps1 -Uninstall
  ```
- **Or via Python CLI:**
  ```bash
  python patcher.py restore --restart
  ```

---

##  