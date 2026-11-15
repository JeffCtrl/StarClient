# StarClient

StarClient Launcher

A fresh, editable UI-first starter for a premium Minecraft Java launcher.

## Requirements
- Node.js LTS (includes npm)
- Visual Studio Code

## Run it
1. Extract the ZIP.
2. Open the `StarClient` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run:

   ```powershell
   npm install
   npm run dev
   ```

5. Open the local URL shown in the terminal (normally `http://127.0.0.1:5173`).

## Build
```powershell
npm run build
```

## Create a Windows installer
```powershell
npm run pack
```

The StarClient installer is created in `dist-electron\StarClient.exe`.

## Current status
The Electron launcher supports Fabric profiles. Offline (cracked) accounts are currently the only available login option. Microsoft login is shown as Coming Soon until the client ID is configured; previously saved Microsoft profiles are migrated to offline profiles using their usernames. Minecraft can launch without internet after the selected game version and its required files have been installed and cached; downloading Minecraft, installing Java or mods, and browsing Modrinth still require internet.

The Home screen includes an optional 3D player skin preview, controlled in **Settings → Game Options → Show 3D Skin View**. Skin textures are looked up by username; if no matching skin is available, the preview falls back to Steve.

## Mod and content installs
- Mods are installed into the same profile `mods` directory used by the game launcher, with required Modrinth dependencies.
- Modrinth modpacks are imported from their manifests into the selected Fabric profile.
- Resource packs go into `resourcepacks`, shaders into `shaderpacks` (Iris is installed for shader support), and downloaded worlds are extracted into `saves`.
- Data packs require a target world; choose that world's folder when prompted. Resource packs are selected for the next launch; choose a downloaded shader pack in Iris's in-game shader settings.
- Browse results have pagination at the top and bottom. Drag supported files onto Browse to install into the active profile: Fabric `.jar` mods, `.zip` resource packs, shader packs, data packs, and worlds, or `.mrpack`/Modrinth `.zip` modpacks. Data packs prompt for a world; local modpacks create isolated Fabric profiles. Unsupported or invalid file types are rejected.
- Dropped content opens its destination folder after installation. Installed content cards also have a **Show in folder** action.
- The configured game directory is used consistently for installs and launches. If it is blank, profiles use the launcher's per-version directory under Electron's user-data folder.
- Newly created profiles and imported modpacks use separate profile directories. Existing profiles keep using their prior per-version directory to avoid losing access to already installed content.
- Profiles can export/import ZIP backups and repair their Fabric loader metadata and bundled performance mods.
- Saved servers can use Minecraft Quick Play. Java 8, 17, 21, or 25 runtimes can be downloaded from Adoptium and selected in settings; the runtime required by the chosen Minecraft version must be selected.
- Crash-report files can be listed from a profile and opened from the launcher.
- New profile setup downloads its compatible performance mods. Minecraft and Fabric runtime files are downloaded the first time that profile is launched.

## Supported features and limitations
- Fabric is the only supported mod loader. Forge, NeoForge, and Quilt profiles are not advertised as supported.
- Mod downloads and modpacks use Modrinth. CurseForge browsing is not available because it requires a configured CurseForge API key.

## Structure
- `src/App.tsx` — main application and interactions
- `src/styles.css` — visual design system and responsive layout
- `src/main.tsx` — React entry point
- `src/data.ts` — demo versions and activity

## GitHub repository and releases

The project is configured for `https://github.com/JeffCtrl/StarClient`. `npm run pack` only builds the Windows installer; it does not publish a release. The `npm run release` command asks electron-builder to upload a **draft** GitHub Release. Review the draft and publish it on GitHub when ready. The generated release includes the installer, its blockmap, and `latest.yml`.

Before each release:
1. Update `version` in `package.json` to a version newer than the latest release, then update the lockfile with `npm install --package-lock-only`.
2. Commit and push the source changes to `main`.
3. Set `GH_TOKEN` in the current shell or a secure CI secret store. It needs permission to write contents/releases in `JeffCtrl/StarClient`. Never commit the token.
4. Run `npm run release`, then review and publish the resulting draft on GitHub.

The GitHub repository's original StarClient title is preserved above. In-app update checks and UI wiring remain deferred.
