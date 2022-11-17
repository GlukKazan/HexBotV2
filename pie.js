"use strict";

const _ = require('underscore');

const utils = require('./utils');

const FIRST = [59, 61, 49, 50, 70, 71, 39, 81];
const SECOND = [60];

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
