import { C, type Constructor } from "@thegraid/common-lib";
import { CenterText, CircleShape, type Paintable } from "@thegraid/easeljs-lib";
import { Hex1 as Hex1Lib, Hex2Mixin, HexMap, LegalMark, type Hex } from "@thegraid/hexlib";
import { CardShape } from "./card-shape";
import type { PathCard } from "./path-card";
import type { PathTile } from "./path-tile";


// Hex1 has get/set tile/meep -> _tile/_meep
// Hex2Mixin.Hex2Impl has get/set -> setUnit(unit, isMeep)
export class PathHex extends Hex1Lib {

  // maybe unnecessary to override, if we never use PathHex (as Hex1)
  override get tile() { return super.tile as PathTile; }
  override set tile(tile: PathTile | undefined) { super.tile = tile; } // setUnit(tile, false)

  override get meep() { return super.meep }
  override set meep(meep) { super.meep = meep; } // setUnit(meep, true)

  get card() { return super.meep as PathCard | undefined }
  set card(card) { super.meep = card; }
}

class PathHex2Lib extends Hex2Mixin(PathHex) {};

export class PathHex2 extends PathHex2Lib {
  override tile: PathTile | undefined; // uses get/set from Hex2Mixin(PathHex)
  override meep: PathCard | undefined;
  override makeLegalMark(): PathLegalMark {
    return new PathLegalMark();
  }
  declare legalMark: PathLegalMark;
}

export class HexMap2 extends HexMap<PathHex2> {
  constructor(radius?: number, addToMapCont?: boolean, hexC: Constructor<PathHex2> = PathHex2, Aname?: string) {
    super(radius, addToMapCont, hexC, Aname)
    this.cardMark = new CardShape(C.nameToRgbaString(C.grey128, .3), '');
    this.cardMark.mouseEnabled = false; // prevent objectUnderPoint!
  }
  /** the Mark to display on cardMarkhexes */
  cardMark: Paintable
  /** Hexes for which we show the CardMark */
  cardMarkHexes: Hex[] = []
  override showMark(hex?: Hex): void {
    const isCardHex = (hex && this.cardMarkHexes.includes(hex))
    super.showMark(hex, isCardHex ? this.cardMark : this.mark);
    if (!hex) this.cardMark.visible = false;
  }
}


/** LegalMark agumented to hold: label, maxV, valuesAtRot */
class PathLegalMark extends LegalMark {
  label = new CenterText('0');
  maxV!: number;
  // set by markLegal() -> PathTile.isLegalTarget()
  _valuesAtRot = [0,0,0,0,0,0,] as number[];
  get valuesAtRot() { return this._valuesAtRot}
  set valuesAtRot(values: number[]) {
    this._valuesAtRot = values;
    this.maxV = Math.max(...values);
    const n = values.filter(v => v == this.maxV).length;
    this.label.text = (n <= 1 || n == 6) ? `${this.maxV}` : `${this.maxV}:${n}`
  }

  override doGraphics(color = C.legalGreen): void {
    this.removeAllChildren();
    this.addChild(new CircleShape(color, this.hex2.radius / 2, '')); // @(0,0)
    this.addChild(this.label)
  }
}
