import { C, Random, rotateAry, stime, type Constructor, type XY } from "@thegraid/common-lib"
import { NamedContainer, type NamedObject } from "@thegraid/easeljs-lib"
import { Graphics, Point, Shape } from "@thegraid/easeljs-module"
import { H, Hex, HexDir, type EwDir, type NsDir } from "@thegraid/hexlib"
import { TP } from "./table-params"


/** affinity in three dimensions: Shape(A,T,S), Color(R,G,B), Fill(LINE, FILL) */
export namespace AF {
  export const A = 'a' // Arc (semi-circle)
  export const T = 't' // Triangle
  export const S = 's' // Square (rectangle)
  export const R = 'r' // red
  export const G = 'g' // green
  export const B = 'b' // blue
  export const L = 'l' // LINE (hollow)
  export const F = 'f' // FILL (solid)

  export type Colors = Record<AF.Color, string>;
  export const colorn: Colors = { r: C.RED, g: C.GREEN, b: C.BLUE }
  export function setColors(colors: Partial<Colors>) {
    // Object.keys.forEach loses track that each key that is present IS present.
    // So we have to reassure typescript that colors[k] IS defined:
    (Object.keys(colors) as AF.Color[]).forEach(k => (AF.colorn[k] = (colors as Colors)[k]))
  }

  const ATSaC = [AF.S, AF.T, AF.A] as const
  export type Shape = typeof ATSaC[number];

  const RGBaC = [AF.R, AF.G, AF.B] as const
  export type Color = typeof RGBaC[number];

  const FLaC = [AF.F, AF.L] as const
  export type Fill = typeof FLaC[number];

  /** Array with each AF.Shape */
  export const ShapeA = ATSaC.concat();
  /** Array with each AF.Color */
  export const ColorA = RGBaC.concat();
  /** Array with each AF.Fill */
  export const FillA = FLaC.concat();
}

type SCF = [AF.Shape, AF.Color, AF.Fill];

/** a Mark (one of six) on the edge of Hex2 to indicate affinity */
class AfMark extends Shape implements NamedObject {
  Aname: string;
  /** draw AfMark on North edge;
   * - TP.hexRad [60] size of hex: find edge & cache
   * - TP.afSize: [.5] width of outer edge
   * - TP.afWide: [3] pixels of line width when AF.L (per TP.hexRad/60)
   * - TP.afSquare: [false] true to shrink depth to be afSize / 2
   */
  drawAfMark(afs: AF.Shape, afc: AF.Color, aff: AF.Fill) {
    const color = AF.colorn[afc], isf = (aff == AF.F);
    const wl = TP.afWide * TP.hexRad / 60, wl2 = wl / 2; // line thickness (StrokeStyle)
    const wm = TP.afSize * TP.hexRad - wl2, w2 = wm / 2; // size of mark (esp: width)
    // ~eccentricity: multiply w2
    const ec = (typeof TP.afSquare === 'number') ? TP.afSquare : (TP.afSquare ? .87 : 1.35);
    const k = 0, y0 = k - TP.hexRad * H.sqrt3_2;  // offset to top edge
    const y1 = ec * w2 + (isf ? wl2 : 0) + y0; // make solids a bit larger b/c lack of line thickness
    const ar = (1 + (ec - 1) * .6) * w2 + wl2; // make arc a bit larger b/c arc doesn't use y1
    const g = this.graphics
    // ss(wl) = setStrokeStyle(width, caps, joints, miterlimit, ignoreScale)
    // g.s(afc) == beginStroke; g.f(afc) == beginFill
    if (isf) { g.f(color) } else { g.ss(wl,1).s(color) }
    g.mt(w2, y0);
    (afs == AF.A) ?
      g.de(-w2, y0 - ar - k, wm, ar * 2) :
      (afs == AF.T) ?
        g.lt(0, y1).lt(-w2, y0) : // two Lines
        (afs == AF.S) ?
          g.lt(w2, y1).lt(-w2, y1).lt(-w2, y0) : // three Lines
          undefined;
          // endStroke() or endFill()
    if (isf) { g.ef() } else { g.es() }
    return [afs, afc, aff] as SCF;
  }
  // draw in N orientation, then rotate to dir;
  constructor(dir: HexDir, shape: AF.Shape, color: AF.Color, fill: AF.Fill) {
    super();
    this.scf = this.drawAfMark(shape, color, fill);
    this.Aname = this.name = `AfMark:${this.scf_id}`;  // for debug, not production
    this.mouseEnabled = false;
    this.rotation = H.dirRot[dir];
  }
  scf!: SCF;
  get scf_id() { return this.scf.join('') }
}
/** Affinity keys in AfHex */
export type AfKey = typeof AfHex.afKeys[number];

/** Container of AfMark Shapes;
 *
 * Each AfHex instance[AfKey] indicates the AfMark(SCF) in each topoDir,
 * the arrays are rotated as the AfHex is rotated.
 */
export class AfHex extends NamedContainer implements Record<AfKey, string[]> {
  /** which AfMark constructor to use (so you can subclass AfMark & inject here) */
  static afMark: Constructor<AfMark> = AfMark;
  static afKeys = ['aShapes', 'aColors', 'aFills'] as const;
  /** @deprecated advisory - for debug/analysis */
  get rot() { return Math.round(this.rotation / 60) }
  /**
   * return a cached Container with 6 AfMark children
   * @param aShapes 6 shapes from AF.Shape
   * @param aColors 6 colors from AF.Color
   * @param aFills  6 fills from AF.Fill
   * @param Aname
   */
  constructor(
    public aShapes: AF.Shape[],
    public aColors: AF.Color[],
    public aFills: AF.Fill[],
    Aname = ``,
  ) {
    super(Aname)
    const edgeDirs = TP.useEwTopo ? H.ewDirs : H.nsDirs;
    // make AfMark(shape,color,fill0 for each of six sides
    this.afMarks = edgeDirs.map((dir, ndx) => {
      const scf = AfHex.afKeys.map(key => this[key][ndx]) as SCF;
      const afm = new AfHex.afMark(dir, ...scf);
      return this.addChild(afm)
    })
    this._scf = this.afMarks.map(m => m.scf);
    this.mouseEnabled = false;
    this.mask = this.makeMask();
    this.reCache()
  }
  afMarks!: AfMark[];
  _scf!: SCF[]

  makeMask(rad = TP.hexRad) {
    const cornerDirs = TP.useEwTopo ? H.nsDirs : H.ewDirs;
    const cornerXY = (dir: HexDir, rad = TP.hexRad) => {
      const deg = H.dirRot[dir], point = new Point(0, 0);
      const a = deg * H.degToRadians
      point.x += Math.sin(a) * rad;
      point.y -= Math.cos(a) * rad;
      return point;
    }
    const lt = (g: Graphics, dir: HexDir, rad = TP.hexRad) => {
      const p = cornerXY(dir, rad)
      return g.lt(p.x, p.y)
    }
    const p0 = cornerXY(cornerDirs[5])
    const g = new Graphics().mt(p0.x, p0.y) // vs ending with closePath()
    cornerDirs.forEach(dir => lt(g, dir, rad))
    g.closePath(); // may be redundant...?
    return new Shape(g);
  }

  /** could be called from Tile.reCache() if that were necessary... */
  reCache(scale = TP.cacheTiles) {
    if (this.cacheID) this.uncache();
    const { w, h } = Hex.xywh(); // with TP.useEwTopo
    this.cache(-w / 2, -h / 2, w, h, scale)
  }

  override clone() {
    // copy reference instance so it can be freely reused, rotated:
    return new AfHex(this.aShapes, this.aColors, this.aFills, this.Aname);
  }

  _rotated = 0; // [0..6)
  /** cummulative sum of rotate() % 6 */
  get rotated() { return this._rotated; }
  set rotated(rot) {
    const rotn = ((rot % 6) + 6) % 6; // in range: [0..6)
    this.rotate((rotn - this.rotated) % 6); // arg in range: (-6..6)
  }

  /** increase rotation by rot;
   * @param rotn +1 --> +60 degrees CW
   * @return this.rotated
   */
  rotate(rot = 1) {
    const rotn = ((rot % 6) + 6) % 6; // in range: [0..6)
    this._rotated = (this._rotated + rotn) % 6;
    this.rotation = 60 * this._rotated; // degrees, not radians
    this._scf = rotateAry(this._scf, rotn)
    return this._rotated;
  }

  /** return [shape, color, fill] of indicated edge */
  scf(dir: HexDir) {
    const ndx = (TP.useEwTopo ? H.ewDirs : H.nsDirs).indexOf(dir as EwDir & NsDir);
    return this._scf[ndx];
  }

  static allAfHexMap: Map<string, AfHex> = new Map();
  static allAfHex: AfHex[] = [];

  /**
   * make all the allAfHex.
   *
   * affinity defined by permutation of each shape[a,s,t] & color[r,g,b] & fill[l,s]
   *
   * Each "AfHex" is a [cached] Container of 6 AfMark Shapes (on each edge of Hex)
   * annotated with an SCF - shape[6]: [a,s,t] and color[6]: [r,g,b] and fill[6]: [l,f]
   *
   * When the AfMark is rotated, the SCF[] is also rotated to stay aligned.
   *
   * Each element of nSCF should be a factor of 6, <= length of the supplied shapes, colors, fills respectively.
   *
   * @param nSCF number of Shapes, Colors, Fills to use: [TP.afSCF]
   * @param shapes [ShapeA] = [AF.S, AF.A, AF.T]
   * @param colors [ColorA] = [AF.R, AF.G, AF.B]
   * @param fills  [FillA]  = [AF.F, AF.L]
   */
  static makeAllAfHex(nSCF = TP.afSCF,
    shapes = AF.ShapeA,   // [AF.S, AF.T, AF.A],
    colors = AF.ColorA,   // [AF.R, AF.G, AF.B]
    fills = AF.FillA,     // [AF.F, AF.L]
  ) {
    // number of Shapes, Colors, Fills to use: (expect: 1 or 2 or 3)
    const [ns, nc, nf] = nSCF; // ASSERT: shapes.length >= ns, etc
    const nOfEach = (nt: number) => 6 / nt; // assert: (6 % nt === 0)
    const build = (nt: number, ...elts: any[]) => {
      const rv = new Array(6), ne = nOfEach(nt);
      for (let ndx = 0, eltn= 0; ndx < 6; ndx += ne, eltn++) {
        rv.fill(elts[eltn], ndx, ndx + ne)
      }
      return rv;
    }
    const atsIn = build(ns, ...shapes);
    const afcIn = build(nc, ...colors);
    const affIn = build(nf, ...fills);
    const atsPerm = AfHex.findPermutations(atsIn);
    const afcPerm = AfHex.findPermutations(afcIn);
    const affPerm = AfHex.findPermutations(affIn);
    console.log(stime(`AfHex`, `.makeAllAfHex: atsPerm`), { atsPerm })
    console.log(stime(`AfHex`, `.makeAllAfHex: afcPerm`), { afcPerm })
    console.log(stime(`AfHex`, `.makeAllAfHex: affPerm`), { affPerm })

    AfHex.allAfHex.length = 0;
    AfHex.allAfHexMap.clear();
    // pick a random rotation of each factor:
    // expect 16 x 16 x 4 = 1024 generated.
    for (let ats of atsPerm) {
      let atsr = ats;// rotateAry(ats, Random.random(ats.length))
      // rotated when placed on Hex2
      let atss = atsr.join('');
      for (let afc of afcPerm) {
        let afcr = rotateAry(afc, Random.random(afcPerm.length))
        let afcs = afcr.join('')
        for (let aff of affPerm) {
          let affr = rotateAry(aff, Random.random(affPerm.length))
          let affs = affr.join('')
          let afhex = new AfHex(atsr, afcr, affr, `${atss}:${afcs}:${affs}`);
          afhex.Aname = `${atss}:${afcs}:${affs}`;
          AfHex.allAfHexMap.set(afhex.Aname, afhex);
          AfHex.allAfHex.push(afhex);
        }
      }
    }
    console.log(stime(`AfHex`, `.makeAllAfHex: allAfHex`), { allAfHex: AfHex.allAfHex });
  }
  static findPermutations(ary: any[]) {
    return AfHex.chooseNext(ary)
  }
  /**
   * choose next item (when distinct from previous choice) append to choosen
   * when all items have been chosen, push 'chosen' to found.
   *
   * @param items items to choose (sorted)
   * @param found permutations already found (push new perms to this array)
   * @param chosen items already chosen (in order)
   * @returns
   */
  static chooseNext(items: any[], found: any[][] = [], chosen: any[] = []) {
    // assert: items is sorted [identical values are adjacent]
    // done: 0012 items: 12 --> 001212, 001221
    // append lowest(item) to done, then chooseNext
    for (let ndx = 0; ndx < items.length; ndx++) {
      let next = items[ndx]
      if (next === items[ndx - 1]) continue // because 'sorted': skip all identical elements
      let ritems = items.slice() // copy of remaining items
      ritems.splice(ndx, 1)      // remove 'next' item from remaining items
      let nchosen = chosen.slice()
      nchosen.push(next)         // append 'next' item to chosen
      if (ritems.length === 0) {
        if (AfHex.newFound(nchosen, found)) found.push(nchosen);
        return found
      }
      AfHex.chooseNext(ritems, found, nchosen)
    }
    return found
  }
  static newFound(target: any[], exists: any[][]) {
    let rt = target.slice()
    for (let r = 0; r < rt.length; r++) {
      if (exists.find(exary => !exary.find((v, ndx) => rt[ndx] !== v))) return false;
      rt = rotateAry(rt, 1)
    }
    return true // no rotation of target matches an existing array element.
  }


  /** select from allAfHex and apply a [random] rotation */
  static getAfHex(affn = Random.random(AfHex.allAfHex.length), rot = Random.random(6)) {
    affn = affn % AfHex.allAfHex.length;   // safety hack
    const afhex2 = AfHex.allAfHex[affn].clone();
    afhex2.rotate(rot);
    return afhex2;
  }
}
