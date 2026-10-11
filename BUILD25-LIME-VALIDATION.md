# Build 25 Lime source integration — validated staging candidate

**Main branch remains untouched. This is NOT release approval.**

The staging package is built locally from Lime's `petfixed/index.html` and the **2048×2048** `petfixed/diggerz_new/tiles.png`. Both the standalone atlas and HTML's embedded `assets/tiles.png` have been synchronized so browsers cannot render two inconsistent atlases.

Validated:
- Original and replacement atlas dimensions both 2048×2048.
- Atlas pixel changes confined to bounding box x=1101..1209, y=1721..1774 in the compared sources.
- 134 entries in `CT_ITEM_ID_MAP.json` match 134 1-coin test shop entries by ID and name.
- Verified names: Elf Hat 918, Bengal Tiger 929, White Tiger 930, Unloved Dog 931, Turkey 981.

**Still required:** Transfer this candidate into the actual repository as a tested integration, review existing server-side pet atlas injection for conflicts, run browser-based equip/rendering checks and verify Railway's preview deployment. Do not merge this checkpoint into main or overwrite live index.html/tiles.png.

The full staging package is prepared as `diggerz-build25-lime-staging-candidate.zip` in this conversation; GitHub connector cannot upload these large local files directly.
