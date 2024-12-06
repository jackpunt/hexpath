import { Params } from '@angular/router';
import { GameSetup as GameSetupLib, HexMap, MapCont, Scenario as Scenario0, Table, TP, type Hex1 } from '@thegraid/hexlib';
import { GamePlay } from './game-play';
import { PathHex2 as Hex2 } from './path-hex';
import { PathTable } from './path-table';
import { PathTile } from './path-tile';
import { Player } from './player';

// type Params = {[key: string]: any;}; // until hexlib supplies
export interface Scenario extends Scenario0 {

};

/** initialize & reset & startup the application/game. */
export class GameSetup extends GameSetupLib {

  override initialize(canvasId: string, qParams: Params = {}): void {
    // useEwTopo, size 7.
    let { host, port, file, nH } = qParams;
    TP.useEwTopo = true;
    TP.nHexes = nH || 7;
    TP.ghost = host || TP.ghost
    TP.gport = Number.parseInt(port || TP.gport.toString(10), 10)
    TP.networkGroup = 'hexpath:game1';
    TP.networkUrl = TP.buildURL(undefined);
    super.initialize(canvasId);
    let rfn = document.getElementById('readFileName') as HTMLInputElement;
    rfn.value = file ?? 'setup@0';

    return;
  }

  update() {
    const hexCont = this.hexMap.mapCont?.hexCont;
    hexCont?.cacheID && hexCont.updateCache()  // when toggleText: hexInspector
    hexCont?.stage?.update();
  }
  override makeHexMap() {
    const hexMap = new HexMap<Hex2>(TP.hexRad, true, Hex2);
    const cNames = MapCont.cNames.concat() as string[]; // for example
    hexMap.addToMapCont(Hex2, cNames);       // addToMapCont(hexC, cNames)
    hexMap.makeAllDistricts();               // determines size for this.bgRect
    return hexMap;
  }

  override makeTable(): Table {
    return new PathTable(this.stage);
  }

  override makeGamePlay(scenario: Scenario): GamePlay {
    return new GamePlay(this, scenario);
  }

  override makePlayer(ndx: number, gamePlay: GamePlay) {
    return new Player(ndx, gamePlay);
  }

  override startScenario(scenario: Scenario0) {
    return super.startScenario(scenario)
  }
  /** demo for bringup visualization */
  placeTilesOnMap() {
    this.hexMap.forEachHex(hex => {
      const tile = PathTile.source.takeUnit();
      tile.placeTile(hex as Hex1);
      return;
    })
    this.update()
    return;
  }
}
