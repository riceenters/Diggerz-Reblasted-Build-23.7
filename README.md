# Diggerz.io Reblasted — Build 23.7

Build 23.7 hardens multiplayer performance and moderation on top of Build 23.4. One Render Web Service hosts the game, map editor, audio, moderation API, and WebSocket multiplayer server.

## Build 23.7 — stability, bans, and admin security
- Movement/native relay traffic is rate-limited and encoded once per broadcast instead of once per recipient.
- Slow-client backpressure drops disposable movement/aim updates before they pile up and lag the room.
- Browser WebSocket send buffering is also capped for transient movement packets.
- Admin codes are now verified by the server; the browser receives a temporary 8-hour admin session token.
- The browser no longer contains the admin password verifier hashes.
- Set `DIGGERZ_ADMIN_OWNER_CODE` and `DIGGERZ_ADMIN_LIME_CODE` as private Render environment variables to rotate both admin codes without editing the game files. When either variable is set, that role’s old built-in code is disabled.
- Five failed admin-code attempts in a 10-minute window temporarily blocks further attempts for 15 minutes from that address.
- Admin now supports Kick, timed Ban, Permanent Ban, reason fields, active-ban listing, and Unban.
- Banned players are redirected to `/banned`, which uses the requested black background, red text, live multi-unit timer, reason text, and automatic redirect when a timed ban expires.
- Ban records are written to `DIGGERZ_BANS_FILE` when configured, otherwise `bans.json` beside the server. On Render, point `DIGGERZ_BANS_FILE` at a persistent disk path if bans must survive deploys/restarts.
- Disabling Inspect Element is intentionally not used as a security measure; protected actions require server authorization instead.



## Build 23.4 — Left/Right map orientation
- Map Editor now gives every block four explicit placement orientations: **Upright, Right, Left, Upside Down**.
- **Right** rotates 90° clockwise; **Left** rotates 90° counter-clockwise.
- Left uses a new flag bit (`8`), so legacy mirror-X (`1`), upside-down (`2`), and right-rotation (`4`) data remain compatible.
- The Render map sanitizer now preserves flag values through `15` instead of stripping the new Left flag.
- Build 23.3 music behavior is intentionally unchanged in this update; this build only addresses the requested map-editor orientation addition.

Build 23.3 is a major Build 23 update on top of the 23.2 Reblasted/Lime-barrier release. One Render Web Service hosts the game, map editor, audio, and WebSocket multiplayer server.

### 23.3 stability patch
- Keeps the room cap at **10 players**; automatic matchmaking sends player 11 to a new room.
- Removes duplicate `room-ready` spawn bursts and high-frequency hidden debug logging that became expensive with several players.
- Adds periodic authoritative room rosters plus faster dead-socket cleanup to remove ghost players.
- Throttles JSON position fallback while keeping native movement primary.
- Mouse-follow aim synchronization now applies to **weapons only**, not mining tools.
- Music code is intentionally unchanged in this patch.

## Build 23.3

### Music
- **Dig+Trade music player:** a compact player appears below the in-game Exit button while connected to Dig+Trade.
- Choose **Track 1–4** (`music_theme.ogg` through `music_theme4.ogg`).
- Controls: **Play, Pause, Restart, and -2 sec**.
- **Battle Royale pre-match music:** the server randomly chooses one of the same four tracks for each match.
- The chosen song plays during the build phase, begins fading when the final **3, 2, 1** countdown starts, and stops at **FIGHT**.
- The server sends the selected track and start time so players joining the build phase can synchronize to the current song.

### Map editor
Open `/map-editor` or Admin → Open Map Editor.

Build 23.3 keeps the existing Foreground/Backdrop layers, recovered mirrored slopes, and upside-down support, and adds an easy **90-degree Sideways (Horizontal)** orientation.

The simplest workflow is:
1. Double-click a block in the palette.
2. Choose **Upright**, **Sideways (Horizontal)**, or **Upside Down**.
3. Place the block normally.

The same three choices also appear as shortcut buttons beneath Blocks / Backgrounds. Build 23.3 extends the optional map orientation flags while remaining backward-compatible with existing Build 23 JSON maps.

### Mining rarity / drop overhaul
Build 23.3 applies the rarity information supplied by KaiRotten. The quantities below are **stack sizes when the reward drops**; the established overall mining tier chance bands remain 0.12% Super Rare, 0.30% Rare, and 12% Common bonus rewards.

**Common**
- Wood Panels / Wood ×50
- Lava ×50
- Blue launcher ×1
- Yellow launcher ×1
- other supported launcher weapons ×3; default black Mortar remains infinite-use and is excluded from drops
- Blade / recovered Saw-weapon equivalent ×1
- Shotgun ×3
- Bomb / recovered TNT-equivalent block ×2

**Rare**
- Blue Ray Gun ×2
- Red Ray Gun ×2
- Black, Red, Blue Ball Caps ×1
- Water ×25
- Color Ladder ×50
- Desert / Sand ×25
- Ice Tiles ×50
- Red, Yellow, Blue One-Ways ×25
- additional One-Way colors ×25, allowed as neutral additions
- Musket ×3

**Super Rare**
- The Super Rare board continues to rotate three items every day.
- WC Shirts
- all 16 Lightswords
- non-basic colored Ball Caps
- Army Helmet
- Dalmatian
- Light Gun
- eligible currently-active Shop items
- Beta Gun is excluded from mining drops.
- Decoration blocks and Cart Pusher are excluded from normal player reward pools; staff can still access decorative content through Admin tools.

### Inventory
- Player inventory is expanded from **30 to 50 slots**.
- Existing browser saves are preserved and padded to 50 slots rather than reset.

## Preserved Reblasted systems
- Lime's Build 23.2 Battle Royale barrier/shrink fix is preserved unchanged.
- 10-player automatic multiplayer rooms; player 11 starts the next room.
- Random PvP map rotation from Default Map + valid `/maps/*.json` files.
- `maps/digtrade.json` remains the optional dedicated Dig+Trade base map and is excluded from PvP rotation.
- Foreground + Backdrop map layers and old Build 23 map import compatibility.
- Consumable weapons; default black Mortar retains infinite uses; mining/tool gear remains reusable.
- Dig+Trade blocks normal PvP weapon damage while Excalibur/Lightswords remain usable as tools.
- Two-stage server-authoritative anti-scam trading.
- Kill coins, kill feed, round stats, persistent wins, and current-round kill leaderboard.
- Bluetooth Speaker, Cotton Candy Machine/Candy, Trading Chip, and Swivel Turret systems remain present.
- Admin typed targeting, teleport/kill, this-server/global announcements, PvP override, and map-editor launcher.
- Resurrection browser-local account binding. Historical Diggerz.io accounts still cannot be recovered without the original account backend/database.

## Maps
Keep your existing `/maps/*.json` files in GitHub when applying this build. The package only includes the maps README because maps created separately by HeuFancy/Lime cannot be reconstructed from the release ZIP.

## Audio files
- `levelup.ogg`
- `music_theme.ogg`
- `music_theme2.ogg`
- `music_theme3.ogg`
- `music_theme4.ogg`
- `balloon_pop.ogg`
- `swap.ogg`

## Battle Royale timing
The original post-FIGHT shrink timing was not recovered. Defaults remain configurable through Render environment variables:
- `DIGGERZ_BUILD_MS=40000`
- `DIGGERZ_FIRST_SHRINK_MS=90000`
- `DIGGERZ_SHRINK_INTERVAL_MS=60000`
- `DIGGERZ_SHRINK_WARNING_MS=3000`
- `DIGGERZ_SHRINK_STEP=8`

The second shrink starts elimination, and shrinking continues until one player remains.

## Credits
Diggerz.io and Coaster Town were originally created by **MeanDean**. Diggerz.io Reblasted was rebuilt by **HeuFancy and Lime** with assistance from **ChatGPT 5.5**. Thank you, MeanDean, for creating both games.


## Build 23.7 moderation update

- Admins can ban a username even when that player is not in the admin's current room or is offline.
- The server searches all active rooms, including private rooms, for the exact username and ejects matching live connections immediately.
- The server keeps a bounded recent-player identity ledger containing only username plus hashed installation/IP identifiers. Offline bans can reuse those hashes for stronger enforcement.
- Exact normalized usernames are now also checked when a player connects, so prospective bans take effect on the next join.
- `DIGGERZ_PLAYERS_FILE` can point the recent-player ledger at persistent storage, just like `DIGGERZ_BANS_FILE`.
