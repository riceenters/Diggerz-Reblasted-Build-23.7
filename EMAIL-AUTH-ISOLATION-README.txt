Diggerz Firebase Email/Auth Isolation Test

Purpose:
This build keeps Firebase Authentication and email login enabled, but disables the automatic
post-auth account-data pull that runs when Firebase restores an existing session after page load.

Manual Settings -> Load from Account remains available.
Multiplayer and Build 24.0 remain enabled.

Test:
1. Enter the game.
2. Open Clothing and leave it open.
3. Open Shop and leave it open.
4. Open Trade and leave it open.
5. If the contents stay, the automatic Firebase session restore/load path is implicated.

The console should NOT show:
[Diggerz Cloud] post-auth pull got items

It may still show Firebase authentication messages.
