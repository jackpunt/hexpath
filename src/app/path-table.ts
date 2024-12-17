import { Stage, type Container } from "@thegraid/easeljs-module";
import { Hex2, Table, Tile, TileSource, TP, type DragContext, type IHex2 } from "@thegraid/hexlib";
import type { GamePlay } from "./game-play";
import type { Scenario } from "./game-setup";
import { CardPanel, PathCard } from "./path-card";
import { type HexMap2 } from "./path-hex";
import { PathTile } from "./path-tile";

export class PathTable extends Table {
  constructor(stage: Stage) {
    super(stage);
    this.initialVis = true;
  }
  declare gamePlay: GamePlay;
  declare hexMap: HexMap2

  override makeRecycleHex(row?: number | undefined, col?: number | undefined): Hex2 {
    return undefined as any as Hex2;
  }

  override layoutTable(gamePlay: GamePlay): void {
    const { table, hexMap, gameSetup } = gamePlay;
    super.layoutTable(gamePlay);
  }
  override makePerPlayer(): void {
    super.makePerPlayer();
  }

  makeSourceAtRowCol<T extends Tile>(ms: (hex: Hex2) => TileSource<T>,
    name = 'tileSource', row = 1, col = 1, dy = 0,
    hexC = this.hexC,
  ) {
    const hex = this.newHex2(row, col, name, hexC) as IHex2;
    const source = ms(hex);
    source.permuteAvailable();
    source.counter.y += TP.hexRad * dy;
    hex.distText.y = 0;
    return source;
  }

  override layoutTable2() {
    this.initialVis = true;
    super.layoutTable2();
    PathTile.makeAllTiles();      // populate PathTile.allTiles
    this.makeSourceAtRowCol(PathTile.makeSource, 'tileBag', 1, 2.3, -.6);

    PathCard.makeAllCards(this);      // populate PathCard.cardByName
  // TODO: reshuffle discard into source when draw from empty source

    this.addDoneButton();
    this.addCardPanel();
    return;
  }

  // TODO: promote to hexlib:
  /**
   *
   * @param panel offset new Hexes to appear above given Container
   * @param row0 [.73] offset in y direction
   * @param colN number of Hex to create
   * @param hexC Constructor<IHex2>
   * @returns hexC[] with each hex.cont.xy offset to appear over panel
   */
  hexesOnPanel(panel: Container, row0 = .75, colN = 4, hexC = this.hexC) {
    const rv = [] as IHex2[], map = this.hexMap;
    const { x: x0, y: y0 } = map.xyFromMap(panel, 0, 0); // offset from hexCont to panel
    const { width: panelw } = panel.getBounds()
    const { x: xn, dydr } = Hex2.xywh(undefined, undefined, 0, colN - 1); // x of last cell
    const dx = (panelw - xn) / 2, dy = row0 * dydr; // allocate any extra space (wide-xn) to either side
    for (let col = 0; col < colN; col++) {
      // not using newHex2() b/c that inserts the half-row offset
      const hex = new hexC(map, 0, col, `C${col}`) // in map.mapCont.hexCont
      rv.push(hex as IHex2 );
      hex.cont.x += (dx - x0);
      hex.cont.y += (dy - y0);
      hex.cont.visible = false;
      hex.legalMark.setOnHex(hex)
      // panel.addChild(hex.cont)
    }
    return rv;
  }

  cardPanel!: CardPanel;
  addCardPanel() {
    const np = 6, pindex = np; // in slot 1 (left-center)
    const [row, col, dir] = this.panelLoc(pindex, np);
    const high = 4.133, wide = 4.5;
    const panel = this.cardPanel = new CardPanel(this, high, wide, row - high / 2, col - wide / 2)
    this.hexMap.mapCont.backCont.addChild(panel);
    // this.setToRowCol(panel, row - high / 2, col - wide / 2);
    panel.makeCardRack(this);
  }

  /**
   * last action of curPlayer is to draw their next tile.
   */
  override addDoneButton() {
    const rv = super.addDoneButton(undefined, 500, 250); // table.doneButton('Done')
    this.doneClick0 = this.doneClicked; // override
    this.doneClicked = (ev) => {
      this.playerDone(ev);
    };
    this.doneButton.activate(true)
    return rv;
  }
  doneClick0 = this.doneClicked;
  playerDone(evt: any) {
    this.gamePlay.playerDone();
    this.doneClick0(evt);          // this.gamePlay.phaseDone();
  }

  override panelLocsForNp(np: number): number[] {
    return [[], [0], [0, 2], [0, 3, 2], [0, 3, 5, 2], [0, 3, 4, 5, 2], [0, 3, 4, 5, 2, 1]][np];
  }

  /** identify dragTile so it can be rotated by keybinding */
  get dragTile(): PathTile | undefined {
    const dragging = this.isDragging;
    return (dragging instanceof PathTile) ? dragging : undefined;
  }

  override startGame(scenario: Scenario) {
    super.startGame(scenario);         // allTiles.makeDragable(); setNextPlayer()
    this.gamePlay.gameState.start();   // gamePlay.phase(startPhase); enable GUI to drive game
  }

  override markLegalHexes(tile: Tile, ctx: DragContext): number {
    ctx.gameState = this.gamePlay.gameState;
    return super.markLegalHexes(tile, ctx);
  }
}
