import { C } from "@thegraid/common-lib";
import { RectShape } from "@thegraid/easeljs-lib";
import { PathCard } from "./path-card";


export class CardShape extends RectShape {
  constructor(fillc = 'lavender', strokec = C.grey64, cardw = PathCard.onScreenRadius) {
    const w = cardw, h = w * 3.5 / 2.5; // 2.5 X 3.5
    super({ x: -w / 2, y: -h / 2, w, h, r: h * .05, s: 0 }, fillc, strokec);
  }
}
