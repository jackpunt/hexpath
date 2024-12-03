import { C } from "@thegraid/common-lib";
import { CircleShape, PaintableShape } from "@thegraid/easeljs-lib";
import { HexShape, MapTile, Meeple, Player } from "@thegraid/hexlib";
import { AfHex } from "./af-hex";

/** MapTile with AfHex & plyrDisk overlays.
 *
 * apply AfHex and disk color at creation.
 *
 * show player/owner by adding a cube icon over disk
 * (pro'ly visible only if placed by opposing Player)
 */
export class PathTile extends MapTile {
  static affn = 0;
  readonly afhex;
  readonly plyrDisk = new CircleShape(C.white, PaintableShape.defaultRadius / 5, '');
  constructor(Aname: string, player: Player | undefined, afhex: AfHex) {
    super(Aname, player);
    this.afhex = afhex; AfHex.getAfHex
    this.addChild(this.afhex);
    this.addChild(this.plyrDisk);
    this.plyrDisk.paint(player?.color, true); // paint it once.
    this.setPlayerAndPaint(undefined);
  }
  override setPlayerAndPaint(player: Player | undefined): this {
    if (!this.afhex) return this; // abort when called by Tile.constructor:
    return super.setPlayerAndPaint(player)
  }

  override paint(colorn?: string): void {
    super.paint(C.grey)
    this.plyrDisk.paint(colorn ?? 'rgba(0,0,0,0)');
  }

  override makeShape(): PaintableShape {
    return new HexShape(); // basic HexShape, not the TileShape
  }

  static makeAllTiles() {
    AfHex.makeAllAfHex(3, 2, 2);  // make them all once: (3,2,1) => 64 Tiles
    // GameSetup.initialize() -> AfHex.makeAllAfHex()
    // GameSetup.startScenario() -> layoutTable() -> makeAllPlayers()
    // make a Tile for each AfHex.
    AfHex.allAfHex.forEach((afhex, n) => {
      const tile = new PathTile(`T${n}`, undefined, afhex);
    })
  }
}
export class PathMeep extends Meeple {
  loc = [1,2];
}
