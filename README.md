# Hexpath

Uses Tiles with AfHex, intention is to match edges to build a path from corner in to center.

with placements to block opponent.

evolved towards hexrules: vanilla Tiles, but edit the placement rules.

## Rules

Rules may be played (asserted) as Positive or Negative.

Legal placements must satisfy ONE of the Positive rules and NONE of the Negative rules.

Number of rule in play:
|Players|2|3|4|5|6|
|-------|-|-|-|-|-|
|  Pos  | 1|   2|   2|   3|  3|
|  Neg  | 1|   1|   2|   2|  3|

On turn: (A) get|play-Tile and (B) get|play-Rule, in either order.

play-Tile: per placement rules; 
- Tile placed is *generally* permenant; 
- some rules allow|require to remove a Tile before placement.

get-Tile: draw from bag (or from Auction? paying with other tiles)

get-Rule: top of deck  (or from Auction? paying with tiles)

## Rule instances

adjacent-to-color(red,green,orange)
adjacent-to-shape(square, triangle, arc)
adjacent-to-fill(fill, line)
color-match, shape-match, fill-match,
self-adjacent, other-adjacent
two-adjacent, fill-gap (oppo-adjacent), three-adjacent ?
three-in-line



## Angular
This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.2.10.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
