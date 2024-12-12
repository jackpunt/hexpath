import { RC, stime } from "@thegraid/common-lib";
import { ScenarioParser as SPLib, SetupElt as SetupEltLib, type LogWriter } from "@thegraid/hexlib";
import {type GamePlay, } from "./game-play";
import type { PathCard } from "./path-card";
import { Player } from "./player";


export interface SetupElt extends SetupEltLib {
  // Aname?: string,        // {orig-scene}@{turn}
  // turn?: number;         // default to 0; (or 1...)
  // coins?: number[],      // 1
  // gameState?: any[];     // GameState contribution

  time?: string,         // stime.fs() when state was saved.
  racks?: string[][],    // Tile->string[] per player
  cards?: string[][],  // OR: index of PathCard
  rules?: PathCard[],    // OR: index of PathCard
}

export class ScenarioParser extends SPLib {
  declare gamePlay: GamePlay;
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

  /** add the elements are are not in SetupEltLib */
  override addStateElements(setupElt: SetupElt): void {
    const table = this.gamePlay.table;
    const gameState = this.gamePlay.gameState.saveState();
    const racks = Player.allPlayers.map(p => p.tileRack.map(tile => tile.Aname)); // string[][]
    const cards = Player.allPlayers.map(p => p.hand.map(card => card.Aname)); // string[][]
    setupElt.gameState = gameState;
    setupElt.cards = cards;
    setupElt.racks = racks;
    const rules = table.cardPanel.cardRack.map(hex => hex.tile as any as PathCard)
    setupElt.rules = rules;
  }

}
