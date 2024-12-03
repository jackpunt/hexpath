import { Params } from '@angular/router';
import { Constructor, permute, Random } from '@thegraid/common-lib';
import { GameSetup as GameSetupLib, Hex, Hex2, HexMap, MapCont, Player, Scenario as Scenario0, TP, Table, type Hex1 } from '@thegraid/hexlib';
import { GamePlay } from './game-play';
import { PathHex2 } from './path-hex';
import { PathTable } from './path-table';
import { PathTile } from './path-tile';

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

  /** demo for bringup visualization */
  placeTilesOnMap() {
    PathTile.makeAllTiles();      // populate PathTile.allTiles
    const allTiles = PathTile.allTiles as PathTile[], ntiles = allTiles.length, allPlayers = Player.allPlayers;
    let nth = 0;
    permute(allTiles)
    this.hexMap.forEachHex(hex => {
      const tile = allTiles[(nth++ % ntiles)]
      const plyr = allPlayers[Math.floor(Random.random() * 4)]
      if (!plyr) return;
      tile.afhex.rotate(Math.floor(Random.random() * 6))
      tile.setPlayerAndPaint(plyr);
      tile.placeTile(hex as Hex1);
      return;
    })
    this.update()
    return;
  }
  update() {
    const hexCont = this.hexMap.mapCont?.hexCont;
    hexCont?.cacheID && hexCont.updateCache()  // when toggleText: hexInspector
    hexCont?.stage?.update();
  }
  override makeHexMap() {
    const hexMap = new HexMap<PathHex2>(TP.hexRad, true, Hex2 as Constructor<Hex>);
    const cNames = MapCont.cNames.concat() as string[]; // for example
    hexMap.addToMapCont(PathHex2, cNames);       // addToMapCont(hexC, cNames)
    hexMap.makeAllDistricts();               // determines size for this.bgRect
    return hexMap;
  }

  override makeTable(): Table {
    return new PathTable(this.stage);
  }

  override makeGamePlay(scenario: Scenario): GamePlay {
    return new GamePlay(this, scenario);
  }

  override startScenario(scenario: Scenario0): GamePlay {
    return super.startScenario(scenario)
  }
}
