import { Random, rotateAry, stime } from "@thegraid/common-lib"
import { NamedContainer, type NamedObject } from "@thegraid/easeljs-lib"
import { Shape } from "@thegraid/easeljs-module"
import { H, HexDir, type EwDir, type NsDir } from "@thegraid/hexlib"
import { TP } from "./table-params"


/** affinity in three dimensions: Shape(A,T,S), Color(R,G,B=orange), Fill(LINE, FILL) */
export namespace AF {
  export const A = 'a' // Arc
  export const T = 't' // Triangle
  export const S = 's' // Square (rectangle)
  export const R = 'r' // red
  export const G = 'g' // green
  export const B = 'b' // blue
  export const L = 'l' // LINE (hollow)
  export const F = 'f' // FILL (solid)
  // set color name for each AfColor. sadly, we can't use: C.RED, C.GREEN, C.BLUE
  export const colorn: Record<AfColor, string> = { r: 'RED', g: 'GREEN', b: 'ORANGE' } as const;
}
const ATSaC = [AF.S, AF.T, AF.A] as const
export type AfShape = typeof ATSaC[number];

const RGBaC = [AF.R, AF.G, AF.B] as const
export type AfColor = typeof RGBaC[number];

const FLaC = [AF.F, AF.L] as const
export type AfFill = typeof FLaC[number];

type SCF = [AfShape, AfColor, AfFill];

export const ShapeA = ATSaC.concat();
export const ColorA = RGBaC.concat();
export const FillA = FLaC.concat();

/** a Mark (one of six) on the edge of Hex2 to indicate affinity */
class AfMark extends Shape implements NamedObject {
  Aname: string;
  /** draw AfMark on North edge. */
  drawAfMark(afs: AfShape, afc: AfColor, aff: AfFill) {
    const color = AF.colorn[afc];
    const wm = (TP.hexRad * TP.afSize), w2 = wm / 2; // size of mark
    const wl = TP.afWide; // line thickness (StrokeStyle)
    const k = -1, y0 = k + TP.hexRad * H.sqrt3 / 2, y1 = w2 * .87 - y0
    const arc0 = 0 * (Math.PI / 2), arclen = Math.PI
    const g = this.graphics
    // ss(wl) = setStrokeStyle(width, caps, joints, miterlimit, ignoreScale)
    // g.s(afc) == beginStroke; g.f(afc) == beginFill
    if (aff == AF.L) { g.ss(wl).s(color) } else { g.f(color) }
    g.mt(-w2, 0 - y0);
    (afs == AF.A) ?
      //g.at(0, y1, w2, 0 - y0, w2) : // one Arc
      g.arc(0, 0 - y0, w2, arc0, arc0 + arclen, false) :
      (afs == AF.T) ?
        g.lt(0, y1).lt(w2, 0 - y0) : // two Lines
        (afs == AF.S) ?
          g.lt(-w2, y1).lt(w2, y1).lt(w2, 0 - y0) : // three Lines
          undefined;
          // endStroke() or endFill()
    if (aff == AF.L) { g.es() } else { g.ef() }
    return g
  }
  // draw in N orientation, rotate to dir;
  constructor(dir: HexDir, shape: AfShape, color: AfColor, fill: AfFill) {
    super();
    this.Aname = this.name = `AfMark:${shape},${color},${fill}`;  // for debug, not production
    this.drawAfMark(shape, color, fill);
    this.mouseEnabled = false;
    this.rotation = H.dirRot[dir];
  }
}
/** Affinity keys in AfHex */
export type AfKey = keyof Pick<AfHex, 'aShapes' | 'aColors' | 'aFills'>
/** Container of AfMark Shapes */
export class AfHex extends NamedContainer {
  static afKeys: AfKey[] = ['aShapes', 'aColors', 'aFills'];
  /** @deprecated advisory - for debug/analysis */
  get rot() { return Math.round(this.rotation / 60) }
  /**
   * return a cached Container with 6 AfMark children
   * @param aShapes 6 shapes from AfShape
   * @param aColors 6 colors from AfColor
   * @param aFills  6 fills from AfFill
   * @param Aname
   */
  constructor(
    public aShapes: AfShape[],
    public aColors: AfColor[],
    public aFills: AfFill[],
    Aname = ``,
  ) {
    super(Aname)
    const hexdirs = TP.useEwTopo ? H.ewDirs : H.nsDirs;
    // make AfMark(shape,color,fill0 for each of six sides
    hexdirs.forEach((dir, ndx) => {
      const scf = AfHex.afKeys.map(key => this[key][ndx]) as SCF;
      const afm = new AfMark(dir, ...scf);
      this.addChild(afm)
    })
    this.mouseEnabled = false;
    this.reCache()
  }

  /** could be called from Tile.reCache() if that were necessary... */
  reCache(scale = TP.cacheTiles) {
    if (this.cacheID) this.uncache();
    const w = TP.hexRad * H.sqrt3, h = TP.hexRad * 2 // see also: Hex2.cache()
    this.cache(-w / 2, -h / 2, w, h, scale)
  }

  override clone() {
    return new AfHex(this.aShapes, this.aColors, this.aFills, this.Aname);
  }

  /** increase rotation by rot;
   * @param rot +1 --> 60 degrees
   */
  rotate(rot: number) {
    this.rotation += 60 * rot; // degrees, not radians
    this.aColors = rotateAry(this.aColors, rot)
    this.aShapes = rotateAry(this.aShapes, rot)
    this.aFills = rotateAry(this.aFills, rot)
  }

  /** return [shape, color, fill] of indicated edge */
  scf(dir: HexDir) {
    const ndx = TP.useEwTopo ? H.ewDirs.indexOf(dir as EwDir) : H.nsDirs.indexOf(dir as NsDir)
    return [this.aShapes[ndx], this.aColors[ndx], this.aFills[ndx]] as SCF;
  }

  static allAfHexMap: Map<string, AfHex> = new Map();
  static allAfHex: AfHex[] = [];

  /**
   * make all the allAfHex.
   *
   * affinity defined by (2x3x2) permutation of each of shape[c,s,t] & color[r,g,b] & fill[line|solid]
   *
   * each "AfHex" is a [cached] Container of 6 AfMark Shapes (on each edge of Hex)
   * annotated with shape[6]: [a,s,t] and color[6]: [r,g,b] and fill[6]: [l,f]
   * each annotation rotated to align with ewDirs
   *
   * @param nSCF number of Shapes, Color, Fill: [TP.afSCF] up to size of shapes, colors, fills
   * @param shapes ShapeA [AF.S, AF.A, AF.T]
   * @param colors ColorA [AF.R, AF.G, AF.B]
   * @param fills  FillA [AF.F, AF.L]
   */
  static makeAllAfHex(scf = TP.afSCF,
    shapes = ShapeA,   // [AF.S, AF.T, AF.A],
    colors = ColorA,   // [AF.R, AF.G, AF.B]
    fills = FillA,     // [AF.F, AF.L]
  ) {
    // make all Square, RGB, Filled
    const [ns, nc, nf] = scf;
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
      let atsr = ats;// rotateAry(ats, Math.round(Random.random() * ats.length))
      // rotated when placed on Hex2
      let atss = atsr.join('');
      for (let afc of afcPerm) {
        let afcr = rotateAry(afc, Math.round(Random.random() * afcPerm.length))
        let afcs = afcr.join('')
        for (let aff of affPerm) {
          let affr = rotateAry(aff, Math.round(Random.random() * affPerm.length))
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
  static getAfHex(affn = Math.floor(Math.random() * AfHex.allAfHex.length), rot = Math.floor(Math.random() * 6)) {
    affn = affn % AfHex.allAfHex.length;   // safety hack
    const afhex2 = AfHex.allAfHex[affn].clone();
    afhex2.rotate(rot);
    return afhex2;
  }
}
