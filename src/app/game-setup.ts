import { Params } from '@angular/router';
import { C, Constructor } from '@thegraid/common-lib';
import { AliasLoader, GamePlay, GameSetup as GameSetupLib, Hex, Hex2, HexMap, Meeple, Player, Scenario as Scenario0, TP, Table, Tile } from '@thegraid/hexlib';
import { PathTable } from './path-table';

// type Params = {[key: string]: any;}; // until hexlib supplies
export interface Scenario extends Scenario0 {

};

/** initialize & reset & startup the application/game. */
export class GameSetup extends GameSetupLib {

  override initialize(canvasId: string, qParams = []): void {
    // use NsTopo, size 7.
    TP.useEwTopo = false;
    TP.nHexes = 7;
    super.initialize(canvasId);
    return;
  }

  override loadImagesThenStartup(qParams: Params = []) {
    super.loadImagesThenStartup(qParams);    // loader.loadImages(() => this.startup(qParams));
  }

  override startup(qParams?: { [key: string]: any; } | undefined): void {
    const hexC = Hex2 as Constructor<Hex2>;
    this.hexMap = new HexMap<Hex & Hex2>(TP.hexRad, true, hexC);
    this.nPlayers = Math.min(TP.maxPlayers, qParams?.['n'] ? Number.parseInt(qParams?.['n']) : 2);
    const scenario = { turn: 0, Aname: 'defaultScenario' };

    Tile.allTiles = [];
    Meeple.allMeeples = [];
    Player.allPlayers = [];
    this.table = new PathTable(this.stage);        // EventDispatcher, ScaleCont, GUI-Player
    // Inject Table into GamePlay & make allPlayers:
    const gamePlay = new GamePlay(this, scenario) // hexMap, players, fillBag, gStats, mouse/keyboard->GamePlay
    this.gamePlay = gamePlay;

    this.startScenario(scenario); // ==> table.layoutTable(gamePlay)
  }

}
