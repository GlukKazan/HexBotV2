"use strict";

const _ = require('underscore');

const utils = require('./utils');

const FIRST = [27, 28, 29, 30, 37, 41, 79, 83, 90, 91, 92, 93];
const SECOND = [38, 39, 40, 48, 49, 50, 51, 58, 59, 60, 61, 62, 69, 70, 71, 72, 80, 81, 82];

function FindMove(board, size) {
    let cnt = 0; let pos = null;
    for (let p = 0; p < size * size; p++) {
        if (Math.abs(board[p]) > 0.01) {
            pos = p;
            cnt++;
        }
    }
    if (cnt == 0) {
        const ix = _.random(0, FIRST.length - 1);
        return FIRST[ix];
    }
    if (cnt == 1) {
        if (_.indexOf(SECOND, pos) < 0) return null;
        return -pos;
    }
    return null;
}

module.exports.FindMove = FindMove;
