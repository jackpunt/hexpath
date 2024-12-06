import { GameState as GameStateLib, Phase } from "@thegraid/hexlib";
import type { GamePlay } from "./game-play";
import { PathTable as Table } from "./path-table";
import { Player } from "./player";

export type ActionIdent = 'Act0' | 'Act2';

export class GameState extends GameStateLib {
  declare gamePlay: GamePlay;

  constructor(gamePlay: GamePlay) {
    super(gamePlay)
    this.defineStates(this.states, false);
  }

   // this.gamePlay.curPlayer
  override get curPlayer() { return super.curPlayer as Player }
  override get table() { return super.table as Table }

  override parseState(gameState: any[]): void {
    return;
  }

  selectedAction?: ActionIdent; // set when click on action panel or whatever. read by ActionPhase;
  readonly selectedActions: ActionIdent[] = [];
  get actionsDone() { return this.selectedActions.length};

  get panel() { return this.curPlayer.panel; }

  /** from Acquire, for reference; using base GameState for now */
  readonly states2: { [index: string]: Phase } = {
    BeginTurn: {
      start: () => {
        this.selectedAction = undefined;
        this.selectedActions.length = 0;
        this.saveGame();
        this.table.doneButton.activate()
        this.phase('ChooseAction');
      },
      done: () => {
        this.phase('ChooseAction');
      }
    },
    // ChooseAction:
    // if (2 action done) phase(EndTurn)
    // else { phase(actionName) }
    ChooseAction: {
      start: () => {
        const maxActs = 2;
        if (this.actionsDone >= maxActs) this.phase('EndTurn');
        const n = this.selectedActions.length + 1;
        this.selectedAction = undefined;
        this.doneButton(`Choice ${n} Done`); // ???
      },
      done: (ok?: boolean) => {
        const action = this.selectedAction; // set by dropFunc() --> state.done()
        if (!ok && !action) {
          this.panel.areYouSure('You have an unused action.', () => {
            setTimeout(() => this.done(true), 50);
          }, () => {
            setTimeout(() => this.state.start(), 50);
          });
          return;
        }
        this.selectedActions.unshift(action as ActionIdent); // may unshift(undefined)
        this.phase(action ?? 'EndTurn');
      }
    },
    EndAction: {
      nextPhase: 'ChooseAction',
      start: () => {
        const nextPhase = this.state.nextPhase = (this.actionsDone >= 2) ? 'EndTurn' : 'ChooseAction';
        this.phase(nextPhase);     // directly -> nextPhase
      },
      done: () => {
        this.phase(this.state.nextPhase ?? 'Start'); // TS want defined...
      }
    },
    EndTurn: {
      start: () => {
        this.selectedAction = undefined;
        this.selectedActions.length = 0;
        this.gamePlay.endTurn();
        this.phase('BeginTurn');
      },
    },
  }
}
