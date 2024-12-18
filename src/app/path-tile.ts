import { C } from "@thegraid/common-lib";
import { CenterText, CircleShape, PaintableShape } from "@thegraid/easeljs-lib";
import { type DragContext, H, Hex2 as Hex2Lib, HexShape, type IHex2, MapTile, Meeple, Player, TileSource, TP } from "@thegraid/hexlib";
import { AfHex } from "./af-hex";
import type { GameState } from "./game-state";
import type { PathRule } from "./path-card";
import { type PathHex as Hex1, type PathHex2 as Hex2 } from "./path-hex";

const Hdirs = TP.useEwTopo ? H.ewDirs : H.nsDirs;

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
  readonly _valueText = new CenterText('0', undefined, C.WHITE);
  get valueText() { return this._valueText.text }
  set valueText(value: string) {
    this._valueText.text = value;
    this.reCache()
  }

  constructor(Aname: string, player: Player | undefined, afhex: AfHex) {
    super(Aname, player);
    this.afhex = afhex;
    this.addChild(this.afhex);
    this.addChild(this.plyrDisk);
    this.addChild(this._valueText);
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

  /** afhex.rotate() */
  rotate(rot = 1) {
    this.afhex.rotate(rot)
  }

  /**
   * Evaluate rules for this tile at given Hex, for each value of rotation = 0..5;
   * @param toHex
   * @param rules rules that can/must be satisfied; each giving a value
   * @return total_value[] for each rotation. (a value is -1 if toHex w/rotation is prohibited)
   */
  ruleValuesOnHex(toHex: Hex1, ...rules: PathRule[]) {
    const rotated = this.rotated;
    const valueAtRotation = Hdirs.map((dir, n) => {
      return this.ruleValueAtRotation(n, toHex, ...rules)
    })
    this.rotated = rotated;
    return valueAtRotation;
  }

  /** rules.map --> [-1 | sum(rule.value)] */
  ruleValueAtRotation(n: number, toHex: Hex1, ...rules: PathRule[]) {
    this.rotated = n; // set ABSOLUTE rotation of afhex relative to ORGINAL spec
    const values = rules.map(rule => rule.value(this, toHex)); // [rv(0), rv(1),rv(3)] for each rule
    const fails = values.filter(v => v < 0).length > 0; // if any rule failed
    const rv = fails ? -1 : values.filter(v => v >= 0).reduce((pv, cv) => pv + cv, 0);
    return rv; // rules=[] --> rv = 0;
  }

  /** max of maxV found during markLegal->isLegalTarget */
  maxV = 0;
  // TODO: consider RuleCards & rotation.
  override isLegalTarget(toHex: Hex1, ctx?: DragContext): boolean {
    const hex2 = toHex as Hex2;
    if (!(toHex as IHex2).isOnMap) return false; // until we have a discard bag
    if (!!toHex.tile) return false;
    if ((this.hex as IHex2)?.isOnMap && ctx?.lastShift) return true; // re-place tile
    const maxV = this.maxValueOnHex(hex2, ctx)
    this.maxV = Math.max(maxV, this.maxV);
    return (maxV >= 0)
  }

  rulesFromCtx (ctx?: DragContext) {
    return (ctx?.gameState as GameState | undefined)?.table?.cardPanel.rules ?? [];
  }

  maxValueOnHex(toHex: Hex1, ctx?: DragContext) {
    const rules = this.rulesFromCtx(ctx); // may be []
    const values = this.ruleValuesOnHex(toHex, ...rules); // [v(r=0), v(r=1), ..., v(r=5)]
    const mark = (toHex as Hex2).legalMark;
    mark.valuesAtRot = values; // sets maxV & label.text
    return mark.maxV;
  }

  rotateNext(rot = 0, hex = this.targetHex) {
    this.rotate(rot)
    this.updateCache();
    this.valueText = `${hex.legalMark?.valuesAtRot[this.rotated]}`; // if (value === '-1') drop --> fromHex
    this.stage?.update()
  }

  rotateToMax(hex = this.targetHex) {
    const maxV = hex.legalMark.maxV, rot = this.rotated;
    const values = hex.legalMark.valuesAtRot;
    if (!values) return; // back to bag...
    const values2 = values.concat(values); // ndx in range: [0..12)
    const ndx = values2.findIndex((v, n) => (n > rot) && (v == maxV)); // next rotated that matches maxV
    this.rotated = ndx;
    this.valueText = `${maxV}`;
    this.stage?.update()
    return
  }

  override dragStart(ctx: DragContext): void {
    super.dragStart(ctx)
    this.maxV = -1;  // dragStart is before markLegal()
    this.targetHex = this.fromHex as Hex2;
  }

  setLegalColors(maxV = this.maxV, C_max = 'rgba(0,100,200,.3)') {
    this.fromHex.map.forEachHex(hex => {
      const lm = (hex as Hex2).legalMark, mv = lm.maxV;
      if (hex.isLegal) lm.doGraphics(mv == maxV ? C_max : undefined)
    })

  }
  targetHex!: Hex2; // latest targetHex from dragFunc -> ctx.targetHex;

  // dragStart->markLegal; dragFunc
  override dragFunc(hex: IHex2 | undefined, ctx: DragContext): void {
    const hex2 = hex as Hex2;
    if (ctx.info.first) this.setLegalColors();
    if (ctx.targetHex === this.targetHex) return;
    this.targetHex = ctx.targetHex as Hex2;
    if (this.targetHex.isLegal) {
      this.rotateToMax(hex2)
    }
    this.valueText = hex2?.legalMark?.label.text;
    super.dragFunc(hex, ctx);
  }

  override dropFunc(targetHex: IHex2, ctx: DragContext): void {
    if (targetHex.tile && targetHex !== this.source.hex) targetHex.tile.sendHome();
    if (this.valueText === '-1') {
      targetHex = this.fromHex; // bad rotation: return to sender
    }
    const vt = this.valueText, cln = vt?.indexOf(':');
    if (cln >= 0) this.valueText = vt.slice(0, cln);
    super.dropFunc(targetHex, ctx); // this.placeTile(targetHex)
    if (!this.source?.sourceHexUnit) this.source.nextUnit();
    this.targetHex = this.source.hex as Hex2;
  }

}
export class PathMeep extends Meeple {
  loc = [1,2];
}
