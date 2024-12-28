import { RectShape } from "@thegraid/easeljs-lib";
import { H } from "@thegraid/hexlib";
import { TP } from "./table-params";
import { C } from "@thegraid/common-lib";


export class CardShape extends RectShape {
  constructor(fillc = 'lavender', strokec = C.grey64, hexw = TP.hexRad * H.sqrt3) {
    const w = hexw, h = w * 3.5 / 2.5; // 2.5 X 3.5
    super({ x: -w / 2, y: -h / 2, w, h, r: h * .05, s: 0 }, fillc, strokec);
  }
}
