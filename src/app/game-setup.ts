import { Params } from '@angular/router';
import { GameSetup as GameSetupLib, Scenario as Scenario0, TP, Table } from '@thegraid/hexlib';
import { AfHex } from './af-hex';
import { PathTable } from './path-table';

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
    TP.networkUrl = TP.buildURL(undefined);
    super.initialize(canvasId);
    let rfn = document.getElementById('readFileName') as HTMLInputElement;
    rfn.value = file ?? 'setup@0';

    AfHex.makeAllAfHex();  // make them all once... ?
    return;
  }

  override makeTable(): Table {
    return new PathTable(this.stage);
  }

}
