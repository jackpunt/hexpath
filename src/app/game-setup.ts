import { Params } from '@angular/router';
import { Constructor } from '@thegraid/common-lib';
import { GamePlay, GameSetup as GameSetupLib, Hex, Hex2, HexMap, Meeple, Player, Scenario as Scenario0, TP, Tile, buildURL } from '@thegraid/hexlib';
import { PathTable } from './path-table';
import { AfHex } from './af-hex';

// type Params = {[key: string]: any;}; // until hexlib supplies
export interface Scenario extends Scenario0 {

};

/** initialize & reset & startup the application/game. */
export class GameSetup extends GameSetupLib {

  override initialize(canvasId: string, qParams: Params = {}): void {
    // use NsTopo, size 7.
    let { host, port, file, nH } = qParams;
    TP.useEwTopo = true;
    TP.nHexes = nH || 7;
    TP.ghost = host || TP.ghost
    TP.gport = Number.parseInt(port || TP.gport.toString(10), 10)
    TP.networkGroup = 'hexpath:game1';
    TP.networkUrl = buildURL(undefined);
    super.initialize(canvasId);
    let rfn = document.getElementById('readFileName') as HTMLInputElement;
    rfn.value = file ?? 'setup@0';

    AfHex.makeAllAfHex();  // make them all once... ?
    return;
  }

  get pageLabel() {
    const { n, file } = this.qParams;
    const sep = (n !== undefined && file !== undefined) ? '&' : '';
    return `${n ? ` n=${n}` : ''}${sep}${file ? `file=${file}` : ''}`;
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
