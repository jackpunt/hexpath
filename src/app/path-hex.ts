import { C } from "@thegraid/common-lib";
import { CenterText, CircleShape } from "@thegraid/easeljs-lib";
import { Hex1 as Hex1Lib, Hex2Mixin, HexMap, LegalMark as LegalMarkLib } from "@thegraid/hexlib";
import type { PathMeep, PathTile } from "./path-tile";


// Hex1 has get/set tile/meep -> _tile/_meep
// Hex2Mixin.Hex2Impl has get/set -> setUnit(unit, isMeep)
export class PathHex extends Hex1Lib {

  // maybe unnecessary to override, if we never use PathHex (as Hex1)
  override get tile() { return super.tile as PathTile; }
  override set tile(tile: PathTile | undefined) { super.tile = tile; } // setUnit(tile, false)

  override get meep() { return super.meep as PathMeep; }
  override set meep(meep: PathMeep | undefined) { super.meep = meep; } // setUnit(meep, true)

}

class PathHex2Lib extends Hex2Mixin(PathHex) {};

export class PathHex2 extends PathHex2Lib {
  override tile: PathTile | undefined; // uses get/set from Hex2Mixin(PathHex)
  override meep: PathMeep | undefined;
  override makeLegalMark(): LegalMark {
    return new LegalMark();
  }
  declare legalMark: LegalMark;
}

export class HexMap2 extends HexMap<PathHex2> {

}

export class LegalMark extends LegalMarkLib {
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

  override doGraphics(): void {
    this.removeAllChildren();
    this.addChild(new CircleShape(C.legalGreen, this.hex2.radius / 2, '')); // @(0,0)
    this.addChild(this.label)
  }
}
