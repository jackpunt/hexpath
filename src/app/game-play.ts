import { GamePlay as GamePlayLib, Scenario } from "@thegraid/hexlib";
import { GameSetup } from "./game-setup";


export class GamePlay extends GamePlayLib {
  constructor (gameSetup: GameSetup, scenario: Scenario) {
    super(gameSetup, scenario);

  }
  override startTurn() {
  }
}
