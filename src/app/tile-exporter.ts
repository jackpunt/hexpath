import { C, Constructor, stime } from "@thegraid/common-lib";
import { CircleShape, PaintableShape, type Paintable as PaintableLib } from "@thegraid/easeljs-lib";
import { Container, DisplayObject, type Graphics } from "@thegraid/easeljs-module";
import { H, Tile as TileLib, TileShape } from "@thegraid/hexlib";
import { ImageGrid, PageSpec, type GridSpec } from "./image-grid";
import { PathCard } from "./path-card";
import { Player } from "./player";
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
    const cardSingle = [
      ...PathCard.countClaz()// [count, claz, ...constructorArgs]
    ] as CountClaz[];
    const hexSingle = [
    ] as CountClaz[];
    const hexDouble = [ // [count, claz, ...constructorArgs]
    ] as CountClaz[];
    const circDouble = [ // [count, class],
    ] as CountClaz[];

    const pageSpecs: PageSpec[] = [];
    // this.clazToTemplate(circDouble, ImageGrid.circDouble_0_79, pageSpecs);
    // this.clazToTemplate(ruleFront, ImageGrid.cardSingle_3_5, pageSpecs);
    // this.clazToTemplate(hexDouble, ImageGrid.hexDouble_1_19, pageSpecs);
    this.clazToTemplate(cardSingle, ImageGrid.cardSingle_3_5, pageSpecs);
    this.clazToTemplate(hexSingle, ImageGrid.hexSingle_1_19, pageSpecs);
    return pageSpecs;
  }

  setOrientation(card: Tile, gridSpec: GridSpec) {
    const { width, height } = card.getBounds(), c_land = width > height;
    const t_land = gridSpec.delx > gridSpec.dely;
    if (c_land !== t_land) {
      card.rotation = 90;
      card.updateCache()
    }
  }

  /** compose bleed, background and Tile (Tile may be transparent, so white background over bleed) */
  composeTile(claz: Constructor<Tile>, args: any[], gridSpec: GridSpec, player?: Player, edge: 'L' | 'R' | 'C' = 'C') {
    const cont = new Container();
    if (claz) {
      const tile = new claz(...args) as TileLib, base = tile.baseShape as PaintableShape;
      this.setOrientation(tile, gridSpec);
      // tile.setPlayerAndPaint(player);
      // TileShape indicates a MapTile [mostly?]
      const backRad = (base instanceof TileShape) ? tile.radius * H.sqrt3_2 * (55 / 60) : 0;
      const back = new CircleShape(C.WHITE, backRad);
      // const bleed = new HexShape(tile.radius + addBleed); // .09 inch + 1px
      const bleedShape = tile.makeShape(), bleed = gridSpec.bleed ?? 0;
      bleedShape.rotation = tile.rotation;
      {
        const { x, y, width, height } = bleedShape.getBounds()
        bleedShape.scaleX = (width + 2 * bleed) / width;
        bleedShape.scaleY = (height + 2 * bleed) / height;
        bleedShape.paint(base.colorn ?? C.grey, true);
      }
      {
        const icg = (width: number, x0: number, ncol: number, cardw: number) => {
          return (width - 2 * x0 - cardw * (ncol - 1)) / (ncol - 1)
        };
        const { width, height, x0, y0, ncol, nrow, delx, dely, cardw, cardh } = gridSpec;
        const icgx = icg(width, x0, ncol, cardw ?? delx);  // OR cardw = base.getBounds().w
        const icgy = icg(height, y0, nrow, cardh ?? dely); // but: double-sided is different
      }
      if (gridSpec.trimLCR) { // for hex shapes:
        // trim bleedShape to base.bounds; allow extra on first/last column of row:
        const dx0 = (edge === 'L') ? bleed : 0, dw = (edge === 'R') ? bleed : 0;
        const { x, y, width, height } = base.getBounds(), dy = -3;
        bleedShape.setBounds(x, y, width, height);
        bleedShape.cache(x - dx0, y - dy, width + dx0 + dw, height + 2 * dy);
      }
      cont.addChild(bleedShape, back, tile);
    }
    return cont;
  }

  /** each PageSpec will identify the canvas that contains the Tile-Images */
  clazToTemplate(countClaz: CountClaz[], gridSpec = ImageGrid.hexDouble_1_19, pageSpecs: PageSpec[] = []) {
    const both = false, double = gridSpec.double ?? true;
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
        const col = n % ncol, lcr = (col === 0) ? 'L' : (col === ncol - 1) ? 'R' : 'C';
        const frontTile = this.composeTile(claz, args, gridSpec, frontPlayer, lcr);
        frontAry[pagen].push(frontTile);
        if (double) {
          const backAryPagen = backAry[pagen] ?? (backAry[pagen] = []) as (DisplayObject | undefined)[];
          let backTile = undefined;
          if (claz.rotateBack !== undefined) {
            backTile = this.composeTile(claz, args, gridSpec, backPlayer, lcr);
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
