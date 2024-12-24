import { C, S } from "@thegraid/common-lib";
import { CenterText, NamedContainer, RectShape, RectWithDisp, type DragInfo, type NamedObject, type Paintable } from "@thegraid/easeljs-lib";
import type { Container, DisplayObject, MouseEvent } from "@thegraid/easeljs-module";
import { H, Tile, TileSource, type DragContext, type HexDir, type IHex2 } from "@thegraid/hexlib";
import { CardShape } from "./card-shape";
import { type GamePlay } from "./game-play";
import { PathHex2 as Hex2, type PathHex as Hex1, type HexMap2 } from "./path-hex";
import { type PathTable as Table } from "./path-table";
import type { PathTile } from "./path-tile";
import { TP } from "./table-params";


// TODO: define rectange 'Tiles' to hold the Rule/Constraint/Bonus items.
/** @return value of placement [-1 if proscribed]  */
type Vfunc = (tile: PathTile, hex: Hex1) => number;
/** @return value of edge in placement [-1 if proscribed]  */
type Efunc = (tile: PathTile, hex: Hex1, dir: HexDir) => number;
/** id: ident, c: cost, t: type, d: description, vf: value, ef: edge */
type RuleSpec = {
  id: string, c: number, t?: string, d?: string, vf?: Vfunc, ef?: Efunc
}
const Hdirs = TP.useEwTopo ? H.ewDirs : H.nsDirs;
const Hdir2 = Hdirs.slice(0, 3); // half of Hdirs
/**
 * A rule/constraint: determine isLegal & value of a placement (tile, rotation, location)
 *
 */
export class PathRule implements NamedObject {
  Aname?: string | undefined;
  text = '';
  cost = 0; // purchase or placement cost, also base value
  type = 'edge';

  constructor(ps: RuleSpec) {
    this.Aname = ps.id;
    this.text = ps.d ?? ps.id;
    this.cost = ps.c;
    if (ps.t) this.type = ps.t;    // edge | own
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

type SCF = (0 | 1 | 2);
class PRgen {
  vfunc_matches_n(n: number, tile: PathTile, hex: Hex1) {
    // all joins match on N+ factors (from AfKey = ['aShapes', 'aColors', 'aFills'])
    // fail if any join matches on 0 or 1 factor
    const ev = Hdirs.map(dir => this.efunc_matches_n(n, tile, hex, dir)) as number[];
    return ev.find(v => v < 0) ? -1 : ev.reduce((pv, cv) => pv + cv, 0);
  }
  /** @return -1: bad OR 0: no join OR nm: nm >= n factors match on this edge */
  efunc_matches_n = (n: number, tile: PathTile, hex: Hex1, dir: HexDir) => {
    const scf0 = tile.afhex.scf(dir)
    const join = (hex.links[dir] as Hex1)?.tile;
    const nm = join?.afhex.scf(H.dirRev[dir]).filter((v, ndx) => (v == scf0[ndx])).length ?? 0;
    return join ? ((nm < n) ? -1 : nm) : 0;
  }

  vfunc_match_sum(n: number, tile: PathTile, hex: Hex1) {
    const ev = Hdirs.map(dir => this.efunc_match_sum(tile, hex, dir)); // [ef(NE), ef(E)...ef(NW)]
    const sum = ev.reduce((pv, cv) => pv + cv, 0); // an edge may be 0, but never -1;
    return sum < n ? -1 : sum;
  }
  // @return number of matching facets [0..3] on join of given dir (OR 0 if no join)
  efunc_match_sum = (tile: PathTile, hex: Hex1, dir: HexDir) => {
    const scf0 = tile.afhex.scf(dir)
    const join = (hex.links[dir] as Hex1)?.tile;
    const nf = join?.afhex.scf(H.dirRev[dir]).filter((v, ndx) => (v == scf0[ndx]));
    return nf?.length ?? 0;  // num of matches: [0..3] OR (0 if no join)
  }

  // the indicated factor must match:
  vfunc_match_scf(n: SCF, tile: PathTile, hex: Hex1) {
    const ev = Hdirs.map(dir => this.efunc_match_scf(n, tile, hex, dir)); // [ef(NE), ef(E)...ef(NW)]
    const fail = ev.find(v => v < 0);
    if (fail) return -1;
    const sum = ev.reduce((pv, cv) => pv + cv, 0); // an edge may be 0, but never -1;
    const nm = ev.filter(v => v > 0).length;
    return sum;
  }
  /** each join matches on scf[ndx] (shape,color,fill); return nm */
  efunc_match_scf = (ndx: SCF, tile: PathTile, hex: Hex1, dir: HexDir): number => {
    const scf0 = tile.afhex.scf(dir)
    const join = (hex.links[dir] as Hex1)?.tile;
    const nm = join?.afhex.scf(H.dirRev[dir]).filter((v, ndx) => (v == scf0[ndx])).length ?? 0;
    const m = join?.afhex.scf(H.dirRev[dir])[ndx] == scf0[ndx];
    return join ? (m ? nm : -1) : 0;
  }

  // make a line-of-3 in at least one dir; score line length in each dir (if len > 3)
  vfunc_make_line(n: number, tile: PathTile, hex: Hex1) {
    const ev = Hdirs.map(dir => this.efunc_line_len(tile, hex, dir)); // [ef(NE), ef(E)...ef(NW)]
    const evN = ev.filter(v => v >= n)
    const sum = evN.reduce((pv, cv) => pv + cv, 0); // an edge may be 0, but never -1;
    return sum > 0 ? sum : -1;
  }
  /** line_len >= n, in given dir; given hex + 2 others */
  efunc_line_len = (tile: PathTile, hex: Hex1, dir: HexDir) => {
    let len = 1, hexN = hex.nextHex(dir), join = hexN?.tile, plyr = tile?.player;
    for (; plyr && hexN?.tile?.player === plyr; len++, hexN = hexN?.nextHex(dir)) { }
    return join ? len : 0;
  }

  // efunc_fill_in(tile: PathTile, hex: Hex1, dir: HexDir) {
  //   let len = 1, hexN = hex.nextHex(dir), join = hexN?.tile, plyr = tile?.player;
  //   for (; plyr && hexN?.tile?.player === plyr; len++, hexN = hexN?.nextHex(dir)) { }
  //   return join ? len : 0;
  // }
  vfunc_fill_in(n: number, tile: PathTile, hex: Hex1) {
    const ev = Hdirs.map(dir => this.efunc_line_len(tile, hex, dir)); // [ef(NE), ef(E)...ef(NW)]
    const evN = Hdir2.map((dir, n) => (ev[n] > 1 && ev[(n + 3) % 6] > 1) ? (ev[n] + ev[(n + 3) % 6] - 1) : 0)
    const sum = evN.reduce((pv, cv) => pv + cv, 0); // an edge may be 0, but never -1;
    return sum > 0 ? sum : -1;
  }

  ruleSpecs: RuleSpec[] = [
    // each edge matches 2 (of the 3) factors:
    { id: 'matches2', c: 1, vf: (t, h) => this.vfunc_matches_n(2, t, h), d: 'all joins 2+ matches' },
    // at least 5 total matches:
    { id: 'match5', c: 1, vf: (t, h) => this.vfunc_match_sum(5, t, h), d: '5+ total matches' },

    { id: 'shapes', c: 1, vf: (t, h) => this.vfunc_match_scf(0, t, h), d: 'all shapes match' },
    { id: 'colors', c: 1, vf: (t, h) => this.vfunc_match_scf(1, t, h), d: 'all colors match' },
    { id: 'fills', c: 1, vf: (t, h) => this.vfunc_match_scf(2, t, h), d: 'all fills match' },
    // own
    { id: 'line3', c: 1, vf: (t, h) => this.vfunc_make_line(3, t, h), d: 'line of 3' },
    { id: 'fill-in', c: 1, vf: (t, h) => this.vfunc_fill_in(2, t, h), d: 'fill-in gap' },
  ]
  // edge rules:
  // 3 shapes, 2-3 colors, 2 fills
  // match all colors; match all shapes; match all fills

  // owner rules:
  // line-of-3: line-length; fill-in-line: line-length;
  // diamond-4: 2-connected-cluster-size; 2-connected: network size
  // adj-to-opp: num-opp-edges;

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
    return new CardShape('lavender');
  }
  override reCache(scale?: number): void {
    super.reCache(0); // no cache?
  }
  override markLegal(table: Table, setLegal = (hex: Hex2) => { hex.isLegal = false; }, ctx?: DragContext): void {
    table.gamePlay.curPlayer.cardRack.forEach(setLegal)
    table.cardPanel.cardRack.forEach(setLegal);
    setLegal(PathCard.discard.hex as Hex2)
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
    ctx.targetHex?.map.showMark(undefined); // if (this.fromHex === undefined)
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

/** CardShape'd "Hex" for placement of PathCard */
export class CardHex extends Hex2 {
  /** record all CardHex for PathCard.markLegal() */
  static allCardHex = [] as CardHex[];
  constructor(map: HexMap2, row = 0, col = 0, Aname = '') {
    super(map, row, col, Aname)
    CardHex.allCardHex.push(this);
  }

  override makeHexShape(colorn = C.grey224): Paintable {
    return new CardShape(colorn);
  }

  get card() { return this.tile as any as PathCard | undefined }

  // when sendHome() hits top of discard:
  override unitCollision(hexUnit: Tile, unit: Tile, isMeep?: boolean): void {
    const disc = PathCard.discard;
    if (this === disc.hex) {   // sendHome preempts to do this path:
      disc.availUnit(hexUnit as PathCard); // stack previous card; hexUnit.visible = false;
      disc.availUnit(unit as PathCard);    // push new card
      disc.nextUnit(unit as PathCard);     // pop into sourceHexUnit [unit.source = PC.discard]
    } else {
      hexUnit.moveTo(disc.hex);// discard previous card === hexUnit.sendHome()
    }
  }
}


/** auxillary Panel to position a cardRack on the Table (or PlayerPanel). */
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

  /** fill hexAry with row of CardHex above panel */
  fillAryWithCardHex(table: Table, panel: Container, hexAry: IHex2[], row = 0, ncols = 4) {
    const hexes = table.hexesOnPanel(panel, row, ncols, CardHex, { gap: .1 });
    hexes.forEach((hex, n) => { hex.Aname = `C${n}`})
    hexAry.splice(0, hexAry.length, ...hexes);
  }

  isCardHex(hex: Hex2): hex is CardHex {
    return (hex instanceof CardHex)
  }

  readonly cardRack: CardHex[] = [];
  makeDragable(table: Table) {
    table.dragger.makeDragable(this, this, undefined, this.dropFunc);
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

  addCard(card?: PathCard) {
    const hex = this.cardRack.find(hex => !hex.tile)
    card?.placeTile(hex);
  }

  get rules() {
    return (this.cardRack.map(hex => hex.card).filter(card => !!card) as PathCard[]).map(card => card.rule)
  }
}
