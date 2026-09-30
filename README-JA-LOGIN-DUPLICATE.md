# JA Login Duplicate Test

Based on the uploaded Diggerz-Reblasted-Build-23.7-NO-DONATE-GUI.zip.

Added exactly one extra native JA button above the existing right-side menu buttons.
It uses the game's existing native `z`, `ob`, `xa`, `ja`, and `D55` login path.
No DOM login button or DOM login menu was added.

The button label is `Login`, with `Sign in with Google` as its native JA subtitle.
Clicking it calls the existing native login handler `D55`.
