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

get-Tile: draw from bag (discard below hand-limit: ~3)

play-Tile: per placement rules; 
- Tile placed is *generally* permenant; 
- some rules allow|require to remove a Tile before placement.
- placement must satisfy all edge & location rules
- score (value of edge rule(s) X number of edge joints) + (value of location rules)

get-Rule: top of deck [maybe one face-up? pay its cost; maybe one face-up per player?]
- pay 1 to get top of deck
- never exceed hand-limit [3]; if at hand-limit then reduce hand *before* drawing.
- reduce hand: play-Rule or expose-Bonus or discard

play-Rule: [number of rules in play increases to number of players, does not decrease]
- pay cost to invert existing rule
- pay cost to assert new rule (playing from hand) if there is empty slot
- pay cost to remove existing rule & pay cost to assert new rule (playing from hand)


## Rule instances

adjacent-to-color(red,green,orange)
adjacent-to-shape(square, triangle, arc)
adjacent-to-fill(fill, line)
color-match, shape-match, fill-match,
self-adjacent, other-adjacent
two-adjacent, fill-gap (oppo-adjacent), three-adjacent ?
three-in-line

two types of rules: 
  - constraint on edge joins (eg matching attributes)
  - constraint on tile location (eq in rows, cluster, triangle, ...)

quantify number of edges: n = all(*) any(?) exact([ 0..6 ]) lt(<n) !lt(!<n) gt(>n) !gt(!>n)

|Rule          |cost| n |notes[value]|invert[value]|
|--------------|----|---|-----|------|
|all other red | 1  | * | (o.color == red) | (o.color != red) |
|all self red  | 1  | * | (s.color == red) | (s.color != red) |
|all joins red | 2  | * | (s.color == red && o.color == red) | 
| no joins red | 1  | * | (s.color != red && o.color != red) [0] |
|2 color match | 1  | 2 | (s.color == o.color) | (s.color != o.color) [0] |
|5+ factor match| 1 | ? | count(s.? == o.?) ge 5 | count(s.? == o.?) le 5 |
|--------------|----|---|-----|------|
|**loc rules**:|cost| n |notes[value]|invert[value]|
|center of 3   | 1 | ? | count(adj(dir) && adj(dir.rev)) |
|center of my 3| 1 | ? | count(adj(dir,plyr) && adj(dir.rev,plyr)) |
|a line of mine| 2 | ? | max(line(dir3,plyr)) | bonus vs constraint? |
|fill gap      | 1 | ? | gap() |
|fill gap mine | 1 | ? | gap(plyr) |
|solo          | 1 | 0 | count(adj(dir,plyr)) | as constraint | 
|cluster       | 2 | ? | count(adj(dir,plyr)) | as bonus |
|cluster       | 3 | 3+| count(adj(dir,plyr)) | as constraint | 
|network       | 3 | 5+| size(paths(plyr)) | bonus? |

gap(plyr?) { 
  count(dir3: adj(dir,plyr) && adj(dir.rev,plyr)) eq 1 
  && count(adj(dir,plyr)) eq 2
}

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
