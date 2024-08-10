import { RC, stime } from "@thegraid/common-lib";
import { ScenarioParser as SPLib, SetupElt as SetupEltLib } from "@thegraid/hexlib";


export interface SetupElt extends SetupEltLib {

}

export class ScenarioParser extends SPLib {
  override parseScenario(setup: SetupElt) {
    console.log(stime(this, `.parseScenario: newState =`), setup);

    const { gameState, turn } = setup;
    const map = this.map, gamePlay = this.gamePlay, allPlayers = gamePlay.allPlayers, table = gamePlay.table;
    const turnSet = (turn !== undefined); // indicates a Saved Scenario: assign & place everything
    if (turnSet) {
      gamePlay.turnNumber = turn;
      table.logText(`turn = ${turn}`, `parseScenario`);
      this.gamePlay.allTiles.forEach(tile => tile.hex?.isOnMap ? tile.sendHome() : undefined); // clear existing map
    }
    if (gameState) {
      this.gamePlay.gameState.parseState(gameState);
    }
    this.gamePlay.hexMap.update();
  }
}
