import { C } from "@thegraid/common-lib";
import { CircleShape, PaintableShape } from "@thegraid/easeljs-lib";
import { HexShape, MapTile, Meeple, Player, TileSource, type Hex2 } from "@thegraid/hexlib";
import { AfHex } from "./af-hex";


// TODO: make a TileSource (bag of tile)
// specialize Player & PlayerPanel, also GameState (see hexmarket)
// dispense several PathTiles to each Player; to slots (see acquire)
// Create RuleCard: -- (see hexcity?) with Source, and Panel for placement (Pos or Neg slots)
// make a place on PlayerPanel for 'hand' of Rules
//
// may also have a deck of 'bonus' or 'goal' cards;
// dispense 2 or 3 as public;
// each player may acquire 1..3? private until reveal to claim points (& discard?)
// 'group of tiles sum to X', 'group of tiles in tri/hex/line'
// public bonus scored when tile is played
// private can be delayed until player is ready to reveal
// (risk that configuration may be broken)
//
// per turn:
// -- choose action: Tile or Rule
// DrawTile or PlaceTile (updating gameState) drag tile to map, rotate to satisfy Rules
// DrawRule or PlaceRule

/** MapTile with AfHex & plyrDisk overlays.
 *
 * apply AfHex at creation.
 *
 * show player/owner by plyrDisk color.
 */
export class PathTile extends MapTile {

  declare static allTiles: PathTile[];

  static source: TileSource<PathTile>;

  // make a source for the given AcqTile[]
  static makeSource(hex: Hex2, tiles = PathTile.allTiles) {
    const source = PathTile.makeSource0(TileSource<PathTile>, PathTile, hex);
    tiles.forEach(unit => source.availUnit(unit));
    source.nextUnit();  // unit.moveTo(source.hex)
    return source;
  }

  static affn = 0;
  readonly afhex;
  readonly plyrDisk = new CircleShape(C.white, PaintableShape.defaultRadius / 3, '');
  constructor(Aname: string, player: Player | undefined, afhex: AfHex) {
    super(Aname, player);
    this.afhex = afhex;
    this.addChild(this.afhex);
    this.addChild(this.plyrDisk);
    this.setPlayerAndPaint(player);
  }

  override paint(colorn = C.transparent): void {
    this.plyrDisk.paint(colorn);
    this.nameText.color = C.WHITE;
    super.paint(C.BLACK);
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
