import { C, S, stime } from "@thegraid/common-lib";
import { CenterText, NamedContainer, RectShape, RectWithDisp, type DragInfo, type NamedObject, type Paintable } from "@thegraid/easeljs-lib";
import type { Container, DisplayObject, MouseEvent } from "@thegraid/easeljs-module";
import { H, Tile, TileSource, type DragContext, type HexDir, type IHex2 } from "@thegraid/hexlib";
import { type GamePlay } from "./game-play";
import { PathHex2 as Hex2, type HexMap2, type PathHex as Hex1 } from "./path-hex";
import { type PathTable as Table } from "./path-table";
import type { PathTile } from "./path-tile";
import { TP } from "./table-params";


// TODO: define rectange 'Tiles' to hold the Rule/Constraint/Bonus items.
/** @return value of placement [-1 if proscribed]  */
type Vfunc = (tile: PathTile, hex: Hex1) => number;
/** @return value of edge in placement [-1 if proscribed]  */
type Efunc = (tile: PathTile, hex: Hex1, dir: HexDir) => number;
/** id:ident, d:descript, c: cost, vf: value, ef: edge */
type RuleSpec = {id: string, d?: string, c: number, vf?: Vfunc, ef?: Efunc}
const Hdirs = TP.useEwTopo ? H.ewDirs : H.nsDirs;
/**
 * A rule/constraint: determine isLegal & value of a placement (tile, rotation, location)
 *
 */
export class PathRule implements NamedObject {
  Aname?: string | undefined;
  text = '';
  cost = 0; // purchase or placement cost, also base value

  constructor(ps: RuleSpec) {
    this.Aname = ps.id;
    this.text = ps.d ?? ps.id;
    this.cost = ps.c;
    if (ps.vf) this.valuef = ps.vf;
    if (ps.ef) this.edgef = ps.ef;
  }

  /** apply ef to edge/join in each dir; return [ef(NE), ef(E),...,ef(NW)] */
  edgeMap(tile: PathTile, hex: Hex1, ef: Efunc) {
    return Hdirs.map(dir => ef(tile, hex, dir))
  }

  /** replace with some EFunc... */
  edgef: Efunc = (tile: PathTile, hex: Hex1) => 0;

  /**
   * base template: Hdirs.map(edgef(dir));
   * @return -1 if any edge fails, else map(edgef).reduce(sum);
   */
  valuef: Vfunc = (tile: PathTile, hex: Hex1) => {
    const ev = this.edgeMap(tile, hex, this.edgef) // [ef(NE), ef[E], ef[SE], ef[SW], ef[W], ef[NW]]
    return ev.find(v => v < 0) ? -1 : ev.reduce((pv, cv) => pv + cv, 0);
  }

  /**
   * invoked to see if this Rule is satisfied, and if so to what value.
   * @return \<0 if bad placement, else (valuef * cost) >= 0
   */
  value(tile: PathTile, hex: Hex1) {
    return this.valuef(tile, hex) * this.cost;
  }
}

class PRgen {
  // @return number of matching facets [0..3] on join of given dir (OR 0 if no join)
  efunc_match_sum = (tile: PathTile, hex: Hex1, dir: HexDir) => {
    const sdf0 = tile.afhex.scf(dir)
    const join = (hex.links[dir] as Hex1)?.tile;
    const rdir = H.dirRev[dir];
    // count number of matching sdf facets: [0..3] OR (0 if no join)
    const sdf1 = join?.afhex.scf(rdir);
    const nf = sdf1?.filter((v, ndx) => (v == sdf0[ndx]));
    const nm = nf?.length ?? 0;
    return nm;
  }
  /** @return -1: bad | 0: no join | 1: n+ factors match on this edge */
  efunc_matches_n = (n: number, tile: PathTile, hex: Hex1, dir: HexDir) => {
    const sdf0 = tile.afhex.scf(dir)
    const join = (hex.links[dir] as Hex1)?.tile;
    const nm = join?.afhex.scf(H.dirRev[dir]).filter((v, ndx) => (v == sdf0[ndx])).length ?? 0;
    return join ? ((nm < n) ? -1 : 1) : 0;
  }

  vfunc_matches_n(n: number, tile: PathTile, hex: Hex1) {
    // all joins match on N+ factors (from AfKey = ['aShapes', 'aColors', 'aFills'])
    // fail if any join matches on 0 or 1 factor
    const ev = Hdirs.map(dir => this.efunc_matches_n(n, tile, hex, dir)) as number[];
    return ev.find(v => v < 0) ? -1 : ev.reduce((pv, cv) => pv + cv, 0);
  }

  vfunc_match_sum(n: number, tile: PathTile, hex: Hex1) {
    const ev = Hdirs.map(dir => this.efunc_match_sum(tile, hex, dir)); // [ef(NE), ef(E)...ef(NW)]
    const sum = ev.reduce((pv, cv) => pv + cv, 0); // an edge may be 0, but never -1;
    return sum < 0 ? -1 : sum;
  }

  ruleSpecs: RuleSpec[] = [
    // each edge matches 2 (of the 3) factors:
    { id: 'matches2', c: 1, vf: (t, h) => this.vfunc_matches_n(2, t, h), d: 'all joins 2+ matches' },
    // at least 5 total matches:
    { id: 'match5', c: 1, vf: (t, h) => this.vfunc_match_sum(5, t, h), d: '5+ total matches' },

    {id: 'rule1', c: 1, vf: (tile: PathTile, hex: Hex1) => 1},
    {id: 'rule2', c: 2, vf: (tile: PathTile, hex: Hex1) => 2},
    {id: 'rule3', c: 3, vf: (tile: PathTile, hex: Hex1) => 3},

  ]
}

export class PathCard extends Tile {
  declare baseShape: RectWithDisp;
  declare gamePlay: GamePlay;
  rule!: PathRule
  descr: CenterText

  // Tile { baseShape: RectShape , nameText, descr }
  constructor(rs: RuleSpec) {
    let id = rs.id, n = 1;
    while (PathCard.cardByName.has(id)) { id = `${rs.id}#${++n}` }
    super(id)           // Note: may need to tweak cache/reCache algo
    this.rule = new PathRule(rs)
    this.descr = this.addDescr(rs.d ?? rs.id)
    this.addChild(this.descr);
    PathCard.cardByName.set(id, this);
    this.homeHex = PathCard.discard.hex; // unitCollision will stack if necessary.
  }

  addDescr(text: string) {
    const size = TP.hexRad * .35, descr = new CenterText(text, size)
    const { x, y, width, height } = this.getBounds()
    descr.y = y + size;
    // descr.textBaseline = 'top'
    descr.lineWidth = width * .9
    return descr
  }

  override makeShape(): Paintable {
    const w = TP.hexRad * H.sqrt3 * 59 / 60 - 5, h = w * 1.5;
    const disp = new RectShape({ x: -w / 2, y: -h / 2, w, h })
    disp.paint('lavender')
    return disp;
  }
  override reCache(scale?: number): void {
    super.reCache(0); // no cache?
  }
  override markLegal(table: Table, setLegal = (hex: Hex2) => { hex.isLegal = false; }, ctx?: DragContext): void {
    CardHex.allCardHex.forEach(setLegal);
  }
  override isLegalTarget(toHex: Hex2, ctx?: DragContext): boolean {
    if (toHex === PathCard.source.hex) return false;
    return true; // (toHex instanceof CardHex)
  }
  override dragStart(ctx: DragContext): void {
    super.dragStart(ctx);
    if (this.fromHex === PathCard.source.hex)
      this.fromHex = PathCard.discard.hex as Hex2;
  }

  override dropFunc(targetHex: IHex2, ctx: DragContext): void {
    if (targetHex?.tile) targetHex.tile.sendHome();
    super.dropFunc(targetHex ?? PathCard.discard.hex, ctx);
    if (!PathCard.discard.sourceHexUnit) PathCard.discard.nextUnit(); // reveal discard
    PathCard.discard.updateCounter();
    PathCard.source.updateCounter();
  }

  static cardByName: Map<string,PathCard> = new Map();
  static makeAllCards(table: Table, ...prgs: PRgen[]) {
    CardHex.allCardHex.length = 0; // clear before we make all the new ones.

    table.makeSourceAtRowCol(PathCard.makeSource, 'discards', 3.5, 1, .3, CardHex)
    PathCard.discard = PathCard.source;
    ;(PathCard.discard as any as NamedContainer).Aname = 'PathCardDiscard';
    table.makeSourceAtRowCol(PathCard.makeSource, 'cardDeck', 1.0, 1, .3, CardHex)

    if (prgs.length === 0) prgs = [new PRgen()];
    PathCard.cardByName.clear();
    prgs.forEach(prg => {
      prg.ruleSpecs.map(ps => new PathCard(ps))
      prg.ruleSpecs.map(ps => new PathCard(ps))
    })
    PathCard.cardByName.forEach(card => PathCard.discard.availUnit(card));
    this.reshuffle()

    const cardback = new CardBack(table); // it a Button, mostly.
    cardback.moveTo(PathCard.source.hex); // set position above source.hex
    cardback.moveTo(undefined);
    cardback.on(S.click, (evt) => cardback.clicked(evt), cardback )
  }

  static reshuffle() {
    // assert: src.sourceHexUnit === undefined [else we would not be shuffling...]
    const disc = PathCard.discard, src = PathCard.source;
    const discarded = disc.filterUnits() // extract all available units
    disc.deleteAll();
    discarded.forEach(card => src.availUnit(card));
    src.permuteAvailable()
  }

  /** sendHome (or drop card) on discard to accumulate for later reshuffle. */
  static discard: TileSource<PathCard>;
  static source: TileSource<PathCard>;

  static makeSource(hex: IHex2) {
    const src = PathCard.makeSource0(TileSource<PathCard>, PathCard, hex);
    ;(src as any as NamedContainer).Aname = `${src.hex.Aname}Source`;
    return src;
  }
}

/** special PathCard with no rule, never gets picked/placed,
 * just sits on PathCard.source.hex; acts as a button
 */
export class CardBack extends PathCard {
  constructor(public table: Table) {
    super({ id: 'cardback', c: 0, d: 'click\nto\ndraw' })
    this.baseShape.paint('lightgreen')
  }
  // makeDragable(), but do not let it actually drag:
  override isDragable(ctx?: DragContext): boolean {
    return false;
  }
  override dropFunc(targetHex: IHex2, ctx: DragContext): void {
    // do not move or place this card...
  }
  clicked(evt?: MouseEvent) {
    this.table.dragger.clickToDrag(this, false);
    if (PathCard.source.numAvailable === 0) PathCard.reshuffle();
    const card = PathCard.source.nextUnit();  // card.moveTo(srchex)
    if (!card) return;
    const pt = { x: evt?.localX ?? 0, y: evt?.localY ?? 0 }
    this.dragNextCard(card, pt)
    return;
  }

  dragNextCard(card: PathCard, dxy = { x: 10, y: 10 }) {
    // this.table.dragger.clickToDrag(card);
    this.table.dragTarget(card, dxy)
  }
}

/** marker for pseudo Hex placements of CardPanel */
export class CardHex extends Hex2 {
  /** record all CardHex for PathCard.markLegal() */
  static allCardHex = [] as CardHex[];
  constructor(map: HexMap2, row = 0, col = 0, Aname = '') {
    super(map, row, col, Aname)
    CardHex.allCardHex.push(this);
  }

  get card() { return this.tile as any as PathCard }

  // when sendHome() hits top of discard:
  override unitCollision(hexUnit: PathCard, unit: PathCard, isMeep?: boolean): void {
    const disc = PathCard.discard;
    if (this === disc.hex) {   // sendHome preempts to do this path:
      disc.availUnit(hexUnit); // stack previous card; hexUnit.visible = false;
      disc.availUnit(unit);    // push new card
      disc.nextUnit(unit);     // pop into sourceHexUnit [unit.source = PC.discard]
    } else {
      hexUnit.moveTo(disc.hex);// discard previous card === hexUnit.sendHome()
    }
  }
}

export class CardPanel extends NamedContainer {
  /**
   *
   * @param table
   * @param high rows high
   * @param wide columns wide
   * @param row place panel at [row, col]
   * @param col
   */
  constructor(public table: Table, public high: number, public wide: number, row = 0, col = 0) {
    super(`CardPanel`)
    const { dxdc, dydr } = table.hexMap.xywh
    const w = dxdc * wide, h = dydr * high;
    const disp = new RectShape({ w, h }, C.grey224, '');
    this.addChild(disp)
    table.hexMap.mapCont.hexCont.addChild(this);
    this.table.setToRowCol(this, row, col);
  }

  /** fill rack0 with ncols of CardHex */
  fillCardRack0(table: Table, panel: Container, rack0: IHex2[], row = 0, ncols = 4) {
    const rack = table.hexesOnPanel(panel, row, ncols, CardHex);
    rack.forEach((hex, n) => { hex.Aname = `C${n}`})
    rack0.splice(0, rack0.length, ...rack);
  }

  readonly cardRack: CardHex[] = [];
  makeCardRack(table: Table, ncols = 3) {
    this.fillCardRack0(table, this, this.cardRack, 1, ncols)
    table.dragger.makeDragable(this, this, undefined, this.dropFunc)
  }

  isCardHex(hex: Hex2) {
    return (hex instanceof CardHex)
  }

  /**
   * cardRack hexes are not children of this CardPanel.
   * Move them to realign when panel is dragged & dropped
   */
  dropFunc(dobj: DisplayObject, ctx?: DragInfo) {
    if (!ctx) return
    const orig = this.table.scaleCont.localToLocal(ctx.objx, ctx.objy, dobj.parent)
    const dx = dobj.x - orig.x, dy = dobj.y - orig.y;
    this.cardRack.forEach(hex => {
      hex.legalMark.x += dx;
      hex.legalMark.y += dy;
      hex.x += dx;
      hex.y += dy;
      hex.tile?.moveTo(hex); // trigger repaint/update?
    })
  }

  get rules() {
    return this.cardRack.map(hex => hex.card).filter(card => !!card).map(card=>card.rule)
  }
}
