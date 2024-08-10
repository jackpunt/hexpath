import { CGF, CircleShape, HexShape, MapTile, PaintableShape, Player, Tile } from "@thegraid/hexlib";
import { AfHex } from "./af-hex";
import { Graphics } from "@thegraid/easeljs-module";
import { C } from "@thegraid/common-lib";

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
  readonly plyrDisk = new CircleShape(C.white);
  constructor (Aname: string, player: Player, affn = PathTile.affn++) {
    super(Aname, player);
    this.afhex = AfHex.getAfHex(affn);
    this.addChild(this.afhex);
    this.addChild(this.plyrDisk);
    this.plyrDisk.paint(player.colorn, true); // paint it once.
    this.super_cgf = this.baseShape.cgf;
    this.setPlayerAndPaint(player);
  }

  ptcgf(colorn: string, g = this.baseShape.cgfGraphics?.clone() ?? new Graphics()) {
    this.super_cgf.call(this, C.white); // the white hexagon
    return g;
  }

  super_cgf: CGF;
  override makeShape(): PaintableShape {
    const rv = new HexShape();
    rv.cgf = this.ptcgf;
    return rv;
  }

  static makeAllTiles() {
    // GameSetup.initialize -> AfHex.makeAllAfHex()
    // make a bunch of Tiles, marked for each player:
    Player.allPlayers.forEach((plyr, p) => {
      for (let n = 0; n < AfHex.allAfHex.length; n++) {
        const tile = new PathTile(`tile{n}`, plyr, n);
        Tile.allTiles.push(tile);
      }
    })
  }
}
