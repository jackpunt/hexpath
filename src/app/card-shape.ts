import { RectShape } from "@thegraid/easeljs-lib";
import { H } from "@thegraid/hexlib";
import { TP } from "./table-params";
import { C } from "@thegraid/common-lib";


export class CardShape extends RectShape {
  constructor(fillc = 'lavender', strokec = C.grey64) {
    const hexw = TP.hexRad * H.sqrt3;
    const w = hexw * 1.75 / 1.75, h = w * 2.5 / 1.75;
    super({ x: -w / 2, y: -h / 2, w, h, r: h * .05, s: 0 }, fillc, strokec);
    console.log(`CardShape = `, this)

  }
}
