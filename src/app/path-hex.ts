import { Hex1 as Hex1Lib, Hex2Mixin, HexMap } from "@thegraid/hexlib";
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
}

export class HexMap2 extends HexMap<PathHex2> {

}
