import { C, stime } from "@thegraid/common-lib"
import { GamePlay as GamePlayLib, Hex1 as Hex1Lib, HexMap as HexMapLib, newPlanner, NumCounterBox, Player as PlayerLib } from "@thegraid/hexlib"
import { GamePlay } from "./game-play"
import { TP } from "./table-params"

const playerColors = ['red', 'lightblue', 'green', 'violet', 'gold'] as const;
export type PlayerColor = typeof playerColors[number];
export class Player extends PlayerLib {
  static initialCoins = 400;
  // set our multi-player colors (concept from Ankh?); we don't use the TP.colorScheme
  static { PlayerLib.colorScheme = playerColors.concat() }
  static override colorScheme: PlayerColor[];
  override get color(): PlayerColor {
    return super.color as PlayerColor;
  }
  override set color(c:  PlayerColor) {
    super.color = c;
  }

  override gamePlay!: GamePlay;

  constructor(index: number, gamePlay: GamePlay) {
    super(index, gamePlay);
  }

  static override allPlayers: Player[];

  /**
   * Before start each new game.
   *
   * [make newPlanner for this Player]
   */
  override newGame(gamePlay: GamePlayLib, url = TP.networkUrl) {
    super.newGame(gamePlay, url);
    this.planner = newPlanner(gamePlay.hexMap as any as HexMapLib<Hex1Lib>, this.index)
  }
  // only invoked on the newly curPlayer!
  override newTurn() {
    // nothing to do... until 'Move' action.
    // this.ships.forEach(ship => ship.newTurn());
    // return;
  }

  /** if Planner is not running, maybe start it; else wait for GUI */ // TODO: move Table.dragger to HumanPlanner
  override playerMove(useRobo = this.useRobo, incb = 0) {
    let running = this.plannerRunning
    // feedback for KeyMove:

    TP.log > 0 && console.log(stime(this, `(${this.plyrId}).playerMove(${useRobo}): useRobo=${this.useRobo}, running=${running}`))
    if (running) return
    if (useRobo || this.useRobo) {
      // continue any semi-auto moves
    }
    return      // robo or GUI will invoke gamePlay.doPlayerMove(...)
  }

  // Test/demo EditNumber
  override makePlayerBits(): void {
    super.makePlayerBits()
    // TODO:
    // make TileSource for each plane size
    // make places for acquired cards (hand & in-play policies/events)
    // display current coins.
    // Pro-tem hack for Coins counter/display:
    const k = TP.hexRad / 2;
    const cc = this.coinCounter = new NumCounterBox('coins', TP.initialCoins);
    this.panel.addChild(cc); cc.x = this.panel.metrics.wide - k; cc.y = k
  }
}
