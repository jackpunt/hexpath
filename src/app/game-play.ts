import { KeyBinder } from "@thegraid/easeljs-lib";
import { GamePlay as GamePlayLib, Scenario, type HexMap, TP as TPLib } from "@thegraid/hexlib";
import { GameSetup } from "./game-setup";
import { GameState } from "./game-state";
import type { PathHex } from "./path-hex";
import type { PathTable } from "./path-table";
import type { Player } from "./player";
import { TP } from "./table-params";


export class GamePlay extends GamePlayLib {
  constructor (gameSetup: GameSetup, scenario: Scenario) {
    super(gameSetup, scenario);
  }
  override readonly gameState: GameState = new GameState(this);
  declare gameSetup: GameSetup;
  declare hexMap: HexMap<PathHex>
  declare table: PathTable;

  declare curPlayer: Player;
  override startTurn() {
  }

  // Demo from Acquire to draw some tiles:
  playerDone() {
    const plyr = this.curPlayer;
    plyr.gamePlay.hexMap.update(); // TODO: this.playerDone(ev)
  }

  override bindKeys(): void {
    super.bindKeys();
    const table = this.table;
    KeyBinder.keyBinder.setKey('q', () => table.dragTile?.rotateToMax())
    KeyBinder.keyBinder.setKey('w', () => table.dragTile?.rotateNext(-1))
    KeyBinder.keyBinder.setKey('e', () => table.dragTile?.rotateNext( 1))
    KeyBinder.keyBinder.setKey('C', () => {
      const tp=TP, tpl=TPLib
      const scale = TP.cacheTiles
      table.reCacheTiles()}
    )   // TODO: also recache afhex!
    KeyBinder.keyBinder.setKey('p', () => table.gamePlay.gameSetup.placeTilesOnMap())   // TODO: also recache afhex!
    KeyBinder.keyBinder.setKey('P', () => table.gamePlay.gameSetup.placeTilesOnMap())   // TODO: also recache afhex!
  }
}
