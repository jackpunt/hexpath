import { Stage } from "@thegraid/easeljs-module";
import { Hex2, Table } from "@thegraid/hexlib";

export class PathTable extends Table {
  constructor(stage: Stage) {
    super(stage);
    this.initialVis = true;
  }

  override makeRecycleHex(row?: number | undefined, col?: number | undefined): Hex2 {
    return undefined as any as Hex2;
  }

}
