# Build 25 Lime integration - staging checkpoint

This branch was created from main to protect Railway's live build.

## Source
Lime's `2kxkhv (1).zip`:
- `petfixed/diggerz_new/index.html`
- `petfixed/diggerz_new/tiles.png` (2048 x 2048 RGBA)
- `petfixed/diggerz_new/CT_ITEM_ID_MAP.json` (134 mappings)
- `petfixed/CT-PET-FIX-NOTES.txt`

**Do not replace** live `index.html` or `tiles.png` in isolation.

## Integration rules
1. Preserve existing 2048x2048 sprite coordinates and art.
2. Port the 1-coin test items with names, IDs, atlas entries, skins, rigs, and equip paths together.
3. Use pet appearance slot 10 from Lime's notes.
4. Verify legacy item rendering and all new items on a separate test deployment.
5. Keep Foxy intro assets and server integration unchanged.
6. Never merge into main without an actual graphics smoke test.

Status: reference/verification checkpoint only. Item port **not** yet committed.
