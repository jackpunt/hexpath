import { stime } from "@thegraid/common-lib";
import { newPlanner, NumCounterBox, Player as PlayerLib } from "@thegraid/hexlib";
import { GamePlay } from "./game-play";
import { CardPanel, PathCard } from "./path-card";
import { PathHex2 as Hex2 } from "./path-hex";
import { type PathTable as Table } from "./path-table";
import { PathTile } from "./path-tile";
import { TP } from "./table-params";

// do not conflict with AF.Colors
const playerColors = ['gold', 'lightblue', 'violet', 'blue', 'orange', ] as const;

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

  declare gamePlay: GamePlay;

  constructor(index: number, gamePlay: GamePlay) {
    super(index, gamePlay);
  }

  static override allPlayers: Player[];

  /**
   * Before start each new game.
   *
   * [make newPlanner for this Player]
   */
  override newGame(gamePlay: GamePlay, url = TP.networkUrl) {
    super.newGame(gamePlay, url);
    this.planner = newPlanner(gamePlay.hexMap, this.index)
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
    this.makeTileRack(this.gamePlay.table, .75, 3);
    this.makeCardRack(this.gamePlay.table, 2.5, 3); // Player's cards on playerPanel
    // display coin counter:
    const { wide, gap } = this.panel.metrics;
    const fs = TP.hexRad * .7;
    const ic = this.coins;
    const cc = this.coinCounter = new NumCounterBox('coins', ic, undefined, fs);
    cc.x = wide - 2 * gap; cc.y = cc.high / 2 + 2 * gap;
    cc.boxAlign('right');
    this.panel.addChild(cc);
  }

  readonly tileRack: Hex2[] = [];
  makeTileRack(table: Table, row = 0, ncols = 4) {
    const rack = table.hexesOnPanel(this.panel, row, ncols) as Hex2[];
    rack.forEach((hex, n) => hex.Aname = `${this.index}R${n}`)
    this.tileRack.splice(0, this.tileRack.length, ...rack); // replace all elements
  }
  get tiles() { return this.cardRack.map(hex => hex.tile) }

  /** placeTile on Player's panel, in empty hex. */
  addTile(tile?: PathTile ) {
    const hex2 = this.tileRack.find(hex => !hex.tile) as Hex2;
    if (!hex2) return;
    if (!tile) tile = PathTile.source.takeUnit();
    tile?.placeTile(hex2);
    return tile;
  }

  /** Draw tiles into tileRack until it is full. */
  fillTileRack() {
    while (this.tileRack.find(hex => !hex.tile) && this.addTile()) { }
  }

  readonly cardRack: Hex2[] = [];
  makeCardRack(table: Table, row = 0, ncols = 4) {
    const cardPanel = new CardPanel(table, 0, 0); // infintessimal 'panel'; just for XY.
    this.panel.addChild(cardPanel);
    cardPanel.fillAryWithCardHex(table, this.panel, this.cardRack, row, ncols)
  }

  addCard(card?: PathCard) {
    const hex2 = this.cardRack.find(hex => !hex.tile) as Hex2;
    if (!hex2) return;
    if (!card) card = PathCard.source.takeUnit();
    card?.placeTile(hex2);
    return card;

  }
  /** for ScenarioParser.saveState() */ // TODO: code cards with index, or string->card
  get cards() { return this.cardRack.map(hex => hex.tile) }


}
