import { C, Constructor, stime } from "@thegraid/common-lib";
import { CircleShape, PaintableShape } from "@thegraid/easeljs-lib";
import { Container, DisplayObject } from "@thegraid/easeljs-module";
import { H, HexShape, TileShape } from "@thegraid/hexlib";
import { ImageGrid, PageSpec } from "./image-grid";
import { Player } from "./player";
import { PathCard } from "./path-card";
// end imports

interface Tile extends DisplayObject {
  baseShape: DisplayObject;
  radius: number;
  setPlayerAndPaint(player?: Player): void;
}

interface Claz extends Constructor<Tile> {
  /** 0 => flip-on-horiz-axiz, 180 => flip-on-vert-axis, undefined => blank */
  rotateBack?: number | undefined;
}

/** [number of copies, Constructor, ... constructor args] */
export type CountClaz = [count: number, claz: Claz, ...args: any];
export class TileExporter {

  imageGrid = new ImageGrid(() => { return this.makeImagePages() });

  makeImagePages() {
    const u = undefined, p0 = Player.allPlayers[0], p1 = Player.allPlayers[1];
    const hexSingle = [ // [count, claz, ...constructorArgs]
    ] as CountClaz[];
    const hexDouble = [ // [count, claz, ...constructorArgs]
    ] as CountClaz[];
    const circDouble = [ // [count, class],
    ] as CountClaz[];
    const ruleFront = PathCard.countClaz() as CountClaz[];

    const pageSpecs: PageSpec[] = [];
    this.clazToTemplate(circDouble, ImageGrid.circDouble_0_79, pageSpecs);
    this.clazToTemplate(ruleFront, ImageGrid.cardSingle_3_5, pageSpecs);
    this.clazToTemplate(hexDouble, ImageGrid.hexDouble_1_19, pageSpecs);
    this.clazToTemplate(hexDouble, ImageGrid.hexSingle_1_19, pageSpecs);
    return pageSpecs;
  }

  /** compose bleed, background and Tile (Tile may be transparent, so white background over bleed) */
  composeTile(claz: Constructor<Tile>, args: any[], player?: Player, edge: 'L' | 'R' | 'C' = 'C', addBleed = 28) {
    const cont = new Container();
    if (claz) {
      const tile = new claz(...args), base = tile.baseShape as PaintableShape;
      tile.setPlayerAndPaint(player);
      const backRad = (base instanceof TileShape) ? tile.radius * H.sqrt3_2 * (55 / 60) : 0;
      const back = new CircleShape(C.WHITE, backRad);
      const bleed = new HexShape(tile.radius + addBleed); // .09 inch + 1px
      {
        bleed.paint(base.colorn ?? C.grey, true);
        // bleed.paint(C.lightpink, true);
        // trim to fit template, allow extra on first/last column of row:
        const dx0 = (edge === 'L') ? 30 : 0, dw = (edge === 'R') ? 30 : 0;
        const { x, y, width, height } = base.getBounds(), d = -3;
        bleed.setBounds(x, y, width, height);
        bleed.cache(x - dx0, y - d, width + dx0 + dw, height + 2 * d);
      }
      cont.addChild(bleed, back, tile);
    }
    return cont;
  }

  /** each PageSpec will identify the canvas that contains the Tile-Images */
  clazToTemplate(countClaz: CountClaz[], gridSpec = ImageGrid.hexDouble_1_19, pageSpecs: PageSpec[] = []) {
    const both = true, double = gridSpec.double ?? true;
    const frontAry = [] as DisplayObject[][];
    const backAry = [] as (DisplayObject[] | undefined)[];
    const page = pageSpecs.length;
    const { nrow, ncol } = gridSpec, perPage = nrow * ncol;
    let nt = page * perPage;
    countClaz.forEach(([count, claz, ...args]) => {
      const frontPlayer = both ? Player.allPlayers[0] : undefined;
      const backPlayer = both ? Player.allPlayers[1] : undefined;
      const nreps = Math.abs(count);
      for (let i = 0; i < nreps; i++) {
        const n = nt % perPage, pagen = Math.floor(nt++ / perPage);
        const addBleed = (true || n > 3 && n < 32) ? undefined : -10; // for DEBUG: no bleed to see template positioning
        if (!frontAry[pagen]) frontAry[pagen] = [];
        const col = n % ncol, edge = (col === 0) ? 'L' : (col === ncol - 1) ? 'R' : 'C';
        const frontTile = this.composeTile(claz, args, frontPlayer, edge, addBleed);
        frontAry[pagen].push(frontTile);
        if (double) {
          const backAryPagen = backAry[pagen] ?? (backAry[pagen] = []) as (DisplayObject | undefined)[];
          let backTile = undefined;
          if (claz.rotateBack !== undefined) {
            backTile = this.composeTile(claz, args, backPlayer, edge, addBleed);
            const tile = backTile.getChildAt(2); // [bleed, back, tile]
            tile.rotation = claz.rotateBack;
          }
          backAryPagen.push(backTile);
        }
      }
    });
    frontAry.forEach((ary, pagen) => {
      const frontObjs = frontAry[pagen], backObjs = double ? backAry[pagen] : undefined;
      const canvasId = `canvas_P${pagen}`;
      const pageSpec = { gridSpec, frontObjs, backObjs };
      pageSpecs[pagen] = pageSpec;
      console.log(stime(this, `.makePage: canvasId=${canvasId}, pageSpec=`), pageSpec);
      this.imageGrid.makePage(pageSpec, canvasId);  // make canvas with images, but do not download [yet]
    })
    return pageSpecs;
  }

}