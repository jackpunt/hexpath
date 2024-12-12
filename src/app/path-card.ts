import { C } from "@thegraid/common-lib";
import { CenterText, NamedContainer, RectShape, RectWithDisp, type DragInfo, type Paintable } from "@thegraid/easeljs-lib";
import type { DisplayObject } from "@thegraid/easeljs-module";
import { H, Tile, TileSource, type Hex2 as Hex2Lib, type HexDir } from "@thegraid/hexlib";
import { PathHex2 as Hex2 } from "./path-hex";
import { type PathTable as Table } from "./path-table";
import type { PathTile } from "./path-tile";
import { TP } from "./table-params";


// TODO: define rectange 'Tiles' to hold the Rule/Constraint/Bonus items.
/** @return value of placement [-1 if proscribed]  */
type Vfunc = (tile: PathTile, hex: Hex2) => number;
/** @return value of edge in placement [-1 if proscribed]  */
type Efunc = (tile: PathTile, hex: Hex2, dir: HexDir) => number;
/** t:ident, d:descript, c: cost, vf: value, ef: edge */
type RuleSpec = {t: string, d?: string, c: number, vf?: Vfunc, ef?: Efunc}
const Hdirs = TP.useEwTopo ? H.ewDirs : H.nsDirs;
/**
 * A rule/constraint: determine isLegal & value of a placement (tile, rotation, location)
 *
 */
class PathRule {
  text = '';
  cost = 0; // purchase or placement cost, also base value
  edgeMap(tile: PathTile, hex: Hex2, ef: Efunc) {
    return Hdirs.map(dir => ef(tile, hex, dir))
  }

  /** replace with some EFunc... */
  edgef: Efunc = (tile: PathTile, hex: Hex2) => 0;

  /**
   * base template: map/reduce over edgef;
   *
   * suitable for efunc_match_sum()
   */
  valuef: Vfunc = (tile: PathTile, hex: Hex2) => {
    const ev = this.edgeMap(tile, hex, this.edgef)
    return ev.find(v => v < 0) ? -1 : ev.reduce((pv, cv) => pv + cv, 0);
  }

  /**
   * invoked to see if this Rule is satisfied, and if so to what value.
   * @return \<0 if bad placement, else [0..N] as value (valuef * cost)
   */
  value(tile: PathTile, hex: Hex2) {
    return this.valuef(tile, hex) * this.cost;
  }

  constructor(ps: RuleSpec) {
    this.text = ps.d ?? ps.t;
    if (ps.vf) this.valuef = ps.vf;
    if (ps.ef) this.edgef = ps.ef;
  }
}

class PRgen {
  // @return sum of matching facets on all joins OR -1 if sum < n
  efunc_match_sum = (n: number, tile: PathTile, hex: Hex2, dir: HexDir) => {
    const sdf0 = tile.afhex.scf(dir)
    const join = (hex.links[dir] as Hex2)?.tile;
    // count number of matching facets: (0 if no join)
    const nm = join?.afhex.scf(H.dirRev[dir]).filter((v, ndx) => (v == sdf0[ndx])).length ?? 0;
    return ((nm < n) ? -1 : nm);
  }
  /** @return -1: bad | 0: no join | 1: n+ factors match on this edge */
  efunc_matches_n = (n: number, tile: PathTile, hex: Hex2, dir: HexDir) => {
    const sdf0 = tile.afhex.scf(dir)
    const join = (hex.links[dir] as Hex2)?.tile;
    const nm = join?.afhex.scf(H.dirRev[dir]).filter((v, ndx) => (v == sdf0[ndx])).length ?? 0;
    return join ? ((nm < n) ? -1 : 1) : 0;
  }

  vfunc_matches_n(n: number, tile: PathTile, hex: Hex2) {
    // all joins match on N+ factors (from AfKey = ['aShapes', 'aColors', 'aFills'])
    // fail if any join matches on 0 or 1 factor
    const ev = Hdirs.map(dir => this.efunc_matches_n(n, tile, hex, dir)) as number[];
    return ev.find(v => v < 0) ? -1 : ev.reduce((pv, cv) => pv + cv, 0);
  }

  vfunc_match_sum(tile: PathTile, hex: Hex2) {
    const ev = Hdirs.map(dir => this.efunc_match_sum(2, tile, hex, dir));
    return ev.find(v => v < 0) ? -1 : ev.reduce((pv, cv) => pv + cv, 0);
  }

  ruleSpecs: RuleSpec[] = [
    // each edge matches 2 (of the 3) factors:
    { t: 'matches2', c: 1, vf: (t, h) => this.vfunc_matches_n(2, t, h), d: 'all joins 2+ matches' },
    // at least 5 total matches:
    { t: 'match5', c: 1, ef: (t, h, d) => this.efunc_match_sum(5, t, h, d), d: '5+ total matches' },

    {t: 'rule1', c: 1, vf: (tile: PathTile, hex: Hex2) => -1},
    {t: 'rule2', c: 2, vf: (tile: PathTile, hex: Hex2) => -1},
    {t: 'rule3', c: 3, vf: (tile: PathTile, hex: Hex2) => -1},

  ]
}

export class PathCard extends Tile {
  rule!: PathRule
  declare baseShape: RectWithDisp;
  descr: CenterText

  // Tile { baseShape: RectShape , nameText, descr }
  constructor(rs: RuleSpec) {
    super(rs.t)           // Note: may need to tweak cache/reCache algo
    this.rule = new PathRule(rs)
    this.descr = this.addDescr(rs.d ?? rs.t)
    this.addChild(this.descr);
    PathCard.cardByName.set(rs.t, this);
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
    return disp;
  }
  override reCache(scale?: number): void {
    super.reCache(0);
  }

  // static allCards: PathCard[] = [];
  static cardByName: Map<string,PathCard> = new Map();
  static makeAllCards(...prgs: PRgen[]) {
    if (prgs.length === 0) prgs = [new PRgen()];
    PathCard.cardByName.clear();
    prgs.forEach(prg => {
      const cards = prg.ruleSpecs.map(ps => new PathCard(ps))
    })
  }

  static source: TileSource<PathCard>;

  static makeSource(hex: Hex2Lib, cards = PathCard.cardByName) {
    const source = PathCard.makeSource0(TileSource<PathCard>, PathCard, hex);
    cards.forEach(unit => source.availUnit(unit));
    source.nextUnit();  // unit.moveTo(source.hex)
    return source;
  }
}

export class CardPanel extends NamedContainer {
  constructor(public table: Table, public high: number, public wide: number, row = 0, col = 0) {
    super(`CardPanel`)
    const { dxdc, dydr } = table.hexMap.xywh
    const w = dxdc * wide, h = dydr * high;
    const disp = new RectShape({ w, h }, C.grey224, '');
    this.addChild(disp)
    table.hexMap.mapCont.hexCont.addChild(this);
    this.table.setToRowCol(this, row, col);
  }

  readonly cardRack: Hex2[] = [];
  makeCardRack(table: Table, n = 4) {
    const rack = table.hexesOnPanel(this, 1, n);
    rack.forEach((hex, n) => hex.Aname = `C${n}`)
    this.cardRack.splice(0, this.cardRack.length, ...rack);
    table.dragger.makeDragable(this, this, undefined, this.dropFunc)
    this.showCards()
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
      hex.x += dx;
      hex.y += dy;
      hex.tile?.moveTo(hex); // trigger repaint/update?
    })
  }

  showCards() {
    const source = PathCard.source
    this.cardRack.forEach((hex, n) => {
      const card = source.takeUnit()
      card.placeTile(hex);
    })
  }

}
