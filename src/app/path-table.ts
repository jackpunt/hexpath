import { permute } from "@thegraid/common-lib";
import { Stage } from "@thegraid/easeljs-module";
import { Hex2, Table, TP } from "@thegraid/hexlib";
import type { GamePlay } from "./game-play";
import type { Scenario } from "./game-setup";
import { PathTile } from "./path-tile";

export class PathTable extends Table {
  constructor(stage: Stage) {
    super(stage);
    this.initialVis = true;
  }
  declare gamePlay: GamePlay;

  override makeRecycleHex(row?: number | undefined, col?: number | undefined): Hex2 {
    return undefined as any as Hex2;
  }

  override layoutTable(gamePlay: GamePlay): void {
    const { table, hexMap, gameSetup } = gamePlay;
    super.layoutTable(gamePlay);
  }

  override layoutTable2() {
    this.initialVis = true;
    super.layoutTable2();
    const drawCol = 1.5;
    const drawHex = this.newHex2(1, drawCol, 'drawHex') as Hex2; // map.HexC === AcqHex2
    drawHex.distText.y = 0;
    // drawHex.cont.visible = false;
    PathTile.makeAllTiles();      // populate PathTile.allTiles
    permute(PathTile.allTiles);
    const source = PathTile.makeSource(drawHex, PathTile.allTiles);
    source.counter.y -= TP.hexRad / 2;
    this.addDoneButton();
    return;
  }

  /**
   * last action of curPlayer is to draw their next tile.
   */
  override addDoneButton() {
    const rv = super.addDoneButton(undefined, 250, 550); // table.doneButton('Done')
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
    return [[], [0], [0, 2], [0, 1, 2], [0, 3, 4, 1], [0, 3, 4, 2, 1], [0, 3, 4, 5, 2, 1]][np];
  }

  get dragTile(): PathTile | undefined {
    const dragging = this.isDragging;
    return (dragging instanceof PathTile) ? dragging : undefined;
  }

  override startGame(scenario: Scenario) {
    super.startGame(scenario); // allTiles.makeDragable()
    this.gamePlay.gameState.start();   // enable Table.GUI to drive game state.
  }
}
