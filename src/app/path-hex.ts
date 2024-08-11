import { Hex1 as Hex1Lib, Hex2Mixin } from "@thegraid/hexlib";
import { PathMeep, PathTile } from "./path-tile";

export class PathHex extends Hex1Lib {
  pathLength = 5;
}

class PathHex2Lib extends Hex2Mixin(PathHex) {};

export class PathHex2 extends PathHex2Lib {

  get ship() { return super.meep as PathMeep; }
  set ship(ship: PathMeep) { super.meep = ship; }

  get planet() { return super.tile as PathTile; }
  set planet(planet: PathTile) { super.tile = planet; }

}
