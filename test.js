"use strict";

const hints = require('./forced');
const utils = require('./utils');

const SIZE = 11;

let board = new Float32Array(SIZE * SIZE);
let moves = new Float32Array(SIZE * SIZE);

utils.InitializeFromFen('92/92/92/92/4A6/4a6/3A7/92/92/92/92', board, SIZE, 1);
hints.analyze(board, SIZE, moves);

utils.dump(board, 1, SIZE, 0, moves);
