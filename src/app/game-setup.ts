import { stime } from '@thegraid/common-lib';
import { GameSetup as GameSetupLib, MapCont, Scenario as Scenario0, Table, TP } from '@thegraid/hexlib';
import { GamePlay } from './game-play';
import { CardHex } from './path-card';
import { PathHex as Hex1, PathHex2 as Hex2, HexMap2 } from './path-hex';
import { PathTable } from './path-table';
import { PathTile } from './path-tile';
import { Player } from './player';

// type Params = {[key: string]: any;}; // until hexlib supplies
export interface Scenario extends Scenario0 {

};

/** initialize & reset & startup the application/game. */
export class GameSetup extends GameSetupLib {
  declare table: PathTable;

  // allow qParams as opt arg:
  override initialize(canvasId: string, qParams = this.qParams): void {
    window.addEventListener('contextmenu', (evt: MouseEvent) => evt.preventDefault())
    ;(Date as any)['stime'] = stime;  // entry point to find Date.stime
    // useEwTopo, size 7.
    const { host, port, file, nH } = qParams;
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
    const hexMap = new HexMap2(TP.hexRad, true, Hex2);
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
    const gp = super.startScenario(scenario)
    const cmh = this.table.hexMap.cardMarkHexes;
    cmh.splice(0, cmh.length, ...CardHex.allCardHex)
    return gp
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
