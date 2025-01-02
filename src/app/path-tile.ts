import { C } from "@thegraid/common-lib";
import { CenterText, CircleShape, PaintableShape } from "@thegraid/easeljs-lib";
import { type DragContext, H, Hex2 as Hex2Lib, HexShape, type IHex2, MapTile, Meeple, Player as PlayerLib, type Table, TileSource, TP } from "@thegraid/hexlib";
import { AfHex } from "./af-hex";
import type { GameState } from "./game-state";
import { CardHex, type PathRule } from "./path-card";
import { type PathHex as Hex1, type PathHex2 as Hex2 } from "./path-hex";
import { type PathTable } from "./path-table";
import type { Player } from "./player";

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

  static curTable: PathTable;
  static source: TileSource<PathTile>;

  // make a source for the given PathTile[]
  static makeSource(hex: Hex2Lib, tiles = PathTile.allPathTiles) {
    const source = PathTile.makeSource0(TileSource<PathTile>, PathTile, hex);
    tiles.forEach(unit => source.availUnit(unit));
    return source;
  }

  readonly afhex;
  readonly plyrDisk = new CircleShape(C.white, TP.hexRad * .5, '');
  readonly _valueText = new CenterText('0', TP.hexRad * .5, C.WHITE);
  get valueText() { return this._valueText.text }
  set valueText(value: string) {
    this._valueText.text = value;
    this.reCache()
  }
  _placeValue = 0;
  /** last computed value from table rules this tile@rot on targetHex (as pulled from legalMark.valuesAtRot) */
  get placeValue() { return this._placeValue }
  set placeValue(v) {
    this._placeValue = v;
    this.valueText = (v < 0) ? '' :`${v}`;
  }

  constructor(Aname: string, player: PlayerLib | undefined, afhex: AfHex) {
    super(Aname, player);
    this.afhex = afhex;
    this.addChild(this.afhex);
    this.nameText.y = this.radius * .66;
    this.addChild(this.nameText);        // re-add above afHex
    this.addChild(this.plyrDisk);
    this.addChild(this._valueText);
    this.setPlayerAndPaint(player);
    PathTile.allPathTiles.push(this);
  }

  // paint the [player] color onto the plyrDisk; for baseShape use paintBase()
  override paint(colorn = C.transparent, force?: boolean): void {
    if (force || colorn !== this.plyrDisk.colorn) {
      this._valueText.color = C.pickTextColor(colorn)
      this.plyrDisk.paint(colorn, force);
      this.updateCache();
    }
  }

  // invoked by ParamGUI:
  paintBase(colorn = C.black, tColor = C.pickTextColor(colorn)) {
    this.nameText.color = tColor;
    this.baseShape.paint(colorn)
    this.updateCache();
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
    return this.afhex.rotate(rot)
  }

  /**
   * Evaluate rules for this tile at given Hex, for each value of rotation = 0..5;
   *
   * For each rotation: rules.map --> fails ? -1 : sum(rule.value)
   *
   * Note: original rotation is restored after evaluation
   * @param toHex
   * @param rules rules that can/must be satisfied; each giving a value
   * @return total_value[] for each rotation. (a value is -1 if toHex w/rotation is prohibited)
   */
  ruleValuesOnHex(toHex: Hex1, commit = false, rules: PathRule[] = this.rulesFromTable()) {
    const rotated = this.rotated;
    const valueAtRotation = Hdirs.map((dir, n) => {
      const values = this.ruleValueAtRotation(n, toHex, commit, rules)
      const fails = values.filter(v => v < 0).length > 0; // if any rule failed
      return fails ? -1 : Math.sum(...values.filter(v => v >= 0));
    })
    this.rotated = rotated;
    return valueAtRotation;
  }

  /** rule.value() at given rotation, for each rule */
  ruleValueAtRotation(rot: number, toHex: Hex1, commit = false, rules: PathRule[] = this.rulesFromTable()) {
    this.rotated = rot; // set ABSOLUTE rotation of afhex relative to ORGINAL spec
    let veto_n = -1;
    return rules.map((rule, n) => {
      if (rule.Aname?.startsWith('veto')) { veto_n = n + 1 }
      return (n == veto_n) ? 0 : rule.value(this, toHex, commit)
    }); // [rv(0), rv(1),rv(3)] for each rule
  }

  rulesFromCtx (ctx: DragContext) {
    // retain curTable for later calls where ctx is not available
    PathTile.curTable = (ctx.gameState as GameState).table; // retain to find rules
    return this.rulesFromTable(PathTile.curTable)
  }
  rulesFromTable(table = PathTile.curTable) {
    return table.cardPanel.rules ?? [];
  }

  /** re-evaluate all rules for this tile on hex w/rotation.
   *
   * compute each rule's contribution and set into rule.card.value for display
   * @param hex
   * @param rot [this.rotated]
   */
  showRuleValues(hex: Hex2, rot = this.rotated) {
    const rules = this.rulesFromTable()
    const rvar = this.ruleValueAtRotation(rot, hex, false, rules);  // setting card.ruleValueAtRot
    rules.map((rule, n) => rule.card.value = rvar[n])
  }

  maxValueOnHex(toHex: Hex1, ctx: DragContext) {
    const rules = this.rulesFromCtx(ctx); // may be []
    const values = this.ruleValuesOnHex(toHex, false, rules); // [v(r=0), v(r=1), ..., v(r=5)]
    if (toHex.isOnMap && ctx.lastShift == true) {
      values.splice(0, values.length, ...values.map(v => Math.max(v, 0))) // c/-1/0/g
    } else if (!toHex.isOnMap) { // tileRack always legal, maxV = 0
      values.splice(0, values.length, ...values.map(v => 0)) // c/*/0/g
    }
    const mark = (toHex as Hex2).legalMark;
    mark.valuesAtRot = values; // sets maxV & label.text
    rules.map(rule => rule.card.ruleValueAtRot[this.rotated])
    return mark.maxV;
  }

  /** keybinder rotation during drag; set placeValue & show valueAtRot[] */
  rotateNext(drot = 0, hex = this.targetHex) {
    if (this.hex) return; // this tile not being dragged
    const rot = this.rotate(drot)
    this.placeValue = hex.legalMark.valuesAtRot[rot]; // if (placeValue === '-1') drop --> fromHex
    this.showRuleValues(hex, rot);
    this.stage?.update(); // tile is not cached?
  }

  /** auto-rotate during drag; valueAtRot[] == maxV */
  rotateToMax(hex = this.targetHex) {
    if (this.hex) return;
    const maxV = hex.legalMark.maxV, rot = this.rotated;
    const values = hex.legalMark.valuesAtRot;
    if (!values) return; // back to bag...
    const values12 = values.concat(values); // ndx in range: [0..12)
    this.rotated = values12.findIndex((v, n) => (n > rot) && (v == maxV)); // next rotated that matches maxV
    this.placeValue = hex.legalMark.valuesAtRot[this.rotated];
    this.showRuleValues(hex, this.rotated)
    this.stage?.update()
    return maxV;
  }

  override cantBeMovedBy(player: PlayerLib, ctx: DragContext): string | boolean | undefined {
    // if ((ctx.gameState as GameState).notDoneTile(this)) return 'cardDone';
    if (this.hex?.isOnMap && !ctx.lastShift) return 'tile on map';
    return super.cantBeMovedBy(player, ctx);
  }

  override dragStart(ctx: DragContext): void {
    super.dragStart(ctx); // --> cantBeMovedBy()
    this.targetHex = this.fromHex as Hex2; // for keybinder rotation
  }

  // dragStart -> markLegal; dragFunc(ctx.info.first) -> setLegalColors
  override markLegal(table: Table, setLegal = (hex: IHex2) => { hex.isLegal = false; }, ctx = table.dragContext) {
    this.maxV = -1;  // dragStart is before markLegal()
    ;(table as PathTable).gamePlay.curPlayer.tileRack.forEach(setLegal)
    table.hexMap.forEachHex(setLegal);
  }

  /** max of maxV found during markLegal->isLegalTarget */
  maxV = 0;

  override isLegalTarget(toHex: Hex1, ctx: DragContext): boolean {
    const plyr = (ctx.gameState as GameState).curPlayer;
    if (plyr.tileRack.includes(toHex as Hex2)) return true;

    if (toHex.isOnMap && !!toHex.tile) return false; // isOnMap redundant...
    const maxV = this.maxValueOnHex(toHex, ctx)
    this.maxV = Math.max(maxV, this.maxV);
    if (ctx.lastCtrl) return true;
    return (maxV >= 0)
  }

  targetHex!: Hex2; // latest targetHex from dragFunc -> ctx.targetHex;

  // dragStart->markLegal; dragFunc
  override dragFunc(hex: IHex2 | undefined, ctx: DragContext): void {
    const hex2 = hex as Hex2 | undefined, table = ctx.gameState.table as PathTable; // hex2 is LEGAL hexUnder
    const hexAny = table.hexUnderObj(this, false);
    const hex3 = ((!hexAny || CardHex.allCardHex.includes(hexAny)) ? this.fromHex as Hex2 : hexAny);
    if (ctx.info.first) this.setLegalColors();
    if (hex3 === this.targetHex) return;
    this.targetHex = hex3 as Hex2;
    if (hex3 === this.fromHex) {
      const rules = this.rulesFromCtx(ctx); // setting PathTile.curTable; [always the first drag]
      rules.forEach((rule, n) => rule.card.value = undefined)
    } else if (this.targetHex.isLegal) {
      if (this.targetHex.legalMark.maxV > 0)
        this.rotateToMax(hex2); // placeValue = maxV
      else
        this.rotateNext(0, hex2); // placeValue @ current rotation
    } else {
      this.rotateNext(0, hex3); // placeValue @ current rotation
      this.placeValue = -1;
    }
    super.dragFunc(hex, ctx);
  }

  setLegalColors(maxV = this.maxV, C_max = 'rgba(0,100,200,.3)', C_zero='rgba(200,200,0,.3)') {
    this.fromHex.map.forEachHex(hex => {
      const lm = (hex as Hex2).legalMark, mv = lm.maxV;
      if (hex.isLegal) lm.doGraphics(mv == maxV ? C_max : mv == 0 ? C_zero : undefined)
    })

  }
  override dropFunc(targetHex: IHex2, ctx: DragContext): void {
    const plyr = this.player as Player
    if (targetHex.tile && targetHex !== this.source.hex) {
      // collision on playerPanel:
      const otile = targetHex.tile;
      const ndx = plyr.tileRack.findIndex(hex => !hex.tile)
      if (ndx < 0) {
        otile.sendHome();  // discard to make slot empty
      } else {
        otile.moveTo(plyr.tileRack[ndx]) // move otile to open slot
      }
    }
    if (this.placeValue == -1) {
      targetHex = this.fromHex; // bad rotation: return to sender
    }
    super.dropFunc(targetHex, ctx); // this.placeTile(targetHex)

    // maybe set gameState.tileDone;
    const selfDrop = (this.hex == this.fromHex)
    const rackSwap = plyr.rackSwap(this.fromHex, targetHex, plyr.tileRack)
    if (selfDrop || rackSwap) return;
    {
      setTimeout(() => {
        (ctx.gameState as GameState).tileDone = this; // return & markLegal() before setNextPlayer
      }, 1);
    }
  }

  /** when tile is placed on map, credit player with value of placement. */
  override placeTile(toHex?: Hex1, payCost = true): void {
    if (toHex) {
      const rotValues = (toHex as Hex2).legalMark.valuesAtRot; // for debugging -> placeValue
      const value = this.placeValue;
      if (value > 0 && this.player) {
        this.player.coins += value;
        // if atk rule succeeds, set player of captured tile:
        const rules = this.rulesFromTable().filter(r => r.type === 'atk')
        if (rules.length > 0)
          this.ruleValueAtRotation(this.rotated, toHex, payCost, rules); // true, mostly
      }
    }
    super.placeTile(toHex, payCost);
    ;(this.player as Player).adjustNetwork(this);
  }
}
export class PathMeep extends Meeple {
  loc = [1,2];
}
