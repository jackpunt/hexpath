import { C } from "@thegraid/common-lib";
import { CenterText, CircleShape, PaintableShape } from "@thegraid/easeljs-lib";
import { type DragContext, Hex2 as Hex2Lib, HexShape, type IHex2, MapTile, Meeple, Player, TileSource } from "@thegraid/hexlib";
import { AfHex } from "./af-hex";
import type { PathRule } from "./path-card";
import { type PathHex as Hex1, type PathHex2 as Hex2, } from "./path-hex";
import type { PathTable } from "./path-table";


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

  static readonly allPathTiles: PathTile[] = [];
  static override clearAllTiles(): void {
    super.clearAllTiles();
    PathTile.allPathTiles.length = 0;
  }

  static source: TileSource<PathTile>;

  // make a source for the given PathTile[]
  static makeSource(hex: Hex2Lib, tiles = PathTile.allPathTiles) {
    const source = PathTile.makeSource0(TileSource<PathTile>, PathTile, hex);
    tiles.forEach(unit => source.availUnit(unit));
    source.nextUnit();  // unit.moveTo(source.hex)
    return source;
  }

  readonly afhex;
  readonly plyrDisk = new CircleShape(C.white, PaintableShape.defaultRadius / 3, '');
  readonly valueText = new CenterText('0', undefined, C.WHITE);
  constructor(Aname: string, player: Player | undefined, afhex: AfHex) {
    super(Aname, player);
    this.afhex = afhex;
    this.addChild(this.afhex);
    this.addChild(this.plyrDisk);
    this.addChild(this.valueText);
    this.setPlayerAndPaint(player);
    PathTile.allPathTiles.push(this);
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
    AfHex.makeAllAfHex();  // make them all once: (3,2,1) => 64 Tiles
    // GameSetup.initialize() -> AfHex.makeAllAfHex()
    // GameSetup.startScenario() -> layoutTable() -> makeAllPlayers()
    // make a Tile for each AfHex.
    AfHex.allAfHex.forEach((afhex, n) => {
      const tile = new PathTile(`T${n}`, undefined, afhex);
    })
  }

  get rotated() { return this.afhex.rotated; }
  set rotated(rot) {
    this.afhex.rotated = rot;
  }

  rotate(rot = 1) {
    this.afhex.rotate(rot)
    this.updateCache();
    this.stage.update();
    return;
  }

  /**
   * Try all rotations of this tile at given Hex, return total value from rules.
   * @param toHex
   * @param rules rules that can/must be satisfied; each giving a value
   * @return total_value[] for each rotation. (a value is -1 if toHex w/rotation is prohibited)
   */
  ruleValuesOnHex(toHex: Hex1, ...rules: PathRule[]) {
    const rotated = this.rotated;
    const valueAtRotation =  toHex.linkDirs.map((dir, n) => {
      this.rotated = n;
      // value for each rule (@ this rotation)
      const values = rules.map(rule => rule.value(this, toHex)); // [rv(0), rv(1),rv(3)] for each rule
      const fails = values.filter(v => v < 0).length > 0; // if any rule failed
      const rv = fails ? -1 : values.filter(v => v >= 0).reduce((pv, cv) => pv + cv, 0);
      return rv;
    })
    this.rotated = rotated;
    return valueAtRotation;
  }
  maxRuleValue(toHex: Hex1, rules: PathRule[]) {
    return Math.max(...this.ruleValuesOnHex(toHex, ...rules));
  }

  // TODO: consider RuleCards & rotation.
  override isLegalTarget(toHex: Hex1, ctx?: DragContext): boolean {
    const hex2 = toHex as Hex2;
    if (!(toHex as IHex2).isOnMap) return false; // until we have a discard bag
    if (!!toHex.tile) return false;
    if ((this.hex as IHex2)?.isOnMap && ctx?.lastShift) return true; // re-place tile
    const maxV = this.valueOnHex(hex2, ctx)
    if (maxV < 0) return false;
    hex2.legalMark.label.text = `${maxV}`;
    return true;
  }
  valueOnHex(toHex: Hex1, ctx?: DragContext) {
    const { gameState } = ctx ?? {}, table = gameState?.table as PathTable | undefined;
    const rules = table?.cardPanel.rules;
    const maxV = rules ? this.maxRuleValue(toHex, rules) : 0;
    return maxV;
  }

  override dragFunc(hex: IHex2 | undefined, ctx: DragContext): void {
    const hex2 = hex as Hex2;
    if (hex?.isOnMap) this.showValue(hex2);
    super.dragFunc(hex, ctx);
  }
  showValue(hex: Hex2) {

  }

  override dropFunc(targetHex: IHex2, ctx: DragContext): void {
    if (targetHex.tile && targetHex !== this.source?.hex) targetHex.tile.sendHome();
    super.dropFunc(targetHex, ctx);
    if (!this.source?.sourceHexUnit) this.source?.nextUnit()
  }

}
export class PathMeep extends Meeple {
  loc = [1,2];
}
