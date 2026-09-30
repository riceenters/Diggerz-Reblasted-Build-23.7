Diggerz 23.7 - No Donate GUI Isolation Test

Based on the uploaded Diggerz-Reblasted-Build-23.7.zip.

Changed only:
- Removed the standalone diggerz-support239-ui script from index.html.
- Disabled the Build 23.9 support/donation GUI initializer.
- Disabled the Build 23.9 admin verified-donations GUI initializer.

Not changed:
- Core game/UI
- Multiplayer
- Firebase
- Reblasted logo
- Native Donate menu button itself

Purpose: isolate whether the Donate GUI code contributes to the UI disappearance.
