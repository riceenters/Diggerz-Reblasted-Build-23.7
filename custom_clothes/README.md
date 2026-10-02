# Custom wearables (server + client)

Create **real** dig wearables (hats, pants, shirts, shoes, face, hair, back) with your own PNGs.

## IDs
**9000–9999** only (stock items stay 1–2047).

## Workflow
1. Open `/clothing-editor` (Wearable Studio)
2. **Import PNG** (drag-drop)
3. Set name, id, **slot**, offsets, optional T48 (shows skin)
4. Optional recolor / extra layer PNGs
5. **Publish to server** (needs `DIGGERZ_ALLOW_CUSTOM_PUBLISH=1`)  
   or save `item_XXXX.json` into this folder and `GET /api/custom-clothes/reload`

## Slots
| slot | piece |
|------|--------|
| 0 | hair |
| 1 | hat |
| 2 | shirt |
| 3 | shoes |
| 5 | back |
| 6 | face |
| 7 | pants |
| 9 | face alt |

## How it works in-game
- Server stores the item and allows the id in inventory + appearance
- Client loads catalog → `DiggerzApplyCustomWearable` runs inside `h.n7` so **m38 equip** uses your sprite like stock clothes
- Appearance is relayed room-wide so others see the custom id

## Run
```bash
DIGGERZ_ALLOW_CUSTOM_PUBLISH=1 node diggerz-server.js
```
