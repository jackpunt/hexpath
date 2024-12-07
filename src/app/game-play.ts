import { GamePlay as GamePlayLib, Scenario } from "@thegraid/hexlib";
import { GameSetup } from "./game-setup";
import type { Player } from "./player";
import { GameState } from "./game-state";
import { KeyBinder } from "@thegraid/easeljs-lib";
import type { PathTable } from "./path-table";
import { TP } from "./table-params";


export class GamePlay extends GamePlayLib {
  constructor (gameSetup: GameSetup, scenario: Scenario) {
    super(gameSetup, scenario);
  }
  override readonly gameState: GameState = new GameState(this);
  declare gameSetup: GameSetup;

  declare curPlayer: Player;
  override startTurn() {
  }

  // Demo from Acquire to draw some tiles:
  playerDone() {
    const plyr = this.curPlayer;
    while (plyr.tileRack.find(hex => !hex.tile) && plyr.drawTile()) {
    }
    plyr.gamePlay.hexMap.update(); // TODO: this.playerDone(ev)
  }

  declare table: PathTable;
  override bindKeys(): void {
    super.bindKeys();
    const table = this.table;
    KeyBinder.keyBinder.setKey('w', () => table.dragTile?.rotate(-1))
    KeyBinder.keyBinder.setKey('e', () => table.dragTile?.rotate(1))
    KeyBinder.keyBinder.setKey('C', () => {
      const scale = TP.cacheTiles
      table.reCacheTiles()}
    )   // TODO: also recache afhex!
    KeyBinder.keyBinder.setKey('p', () => table.gamePlay.gameSetup.placeTilesOnMap())   // TODO: also recache afhex!
    KeyBinder.keyBinder.setKey('P', () => table.gamePlay.gameSetup.placeTilesOnMap())   // TODO: also recache afhex!
  }
}
