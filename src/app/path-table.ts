import { Stage } from "@thegraid/easeljs-module";
import { GamePlay, Hex2, Table } from "@thegraid/hexlib";

export class PathTable extends Table {
  constructor(stage: Stage) {
    super(stage);
    this.initialVis = true;
  }

  override makeRecycleHex(row?: number | undefined, col?: number | undefined): Hex2 {
    return undefined as any as Hex2;
  }

  override layoutTable(gamePlay: GamePlay): void {
    const { table, hexMap, gameSetup } = gamePlay;
    super.layoutTable(gamePlay);
  }
}
