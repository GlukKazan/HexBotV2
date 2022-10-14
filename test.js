"use strict";

const ai = require('./ai');
const utils = require('./utils');

const SIZE   = 11;
const FEN_1  = '92/92/92/92/92/92/92/92/92/92/92';
const FEN_2  = '92/92/92/6A4/92/92/92/92/92/92/92';
const FEN_3  = '92/92/7A3/5A5/92/5a5/92/92/92/92/92';
const FEN_4  = '7A3/4AbA2A/3bAaCa/2aA2AbB/cC1Ac/BcA1Aa2/aDc3/eB4/2A1D3/2Bd3/1Ab1A5';
const FEN_5  = '6aA3/4AbA2A/3bAaCa/2aA1aAbA1/cCaAaA1/BcAaAaA1/aDcA2/eD3/2A1D3/2Bd3/1Ab1A5';

function DoneCallback(goal) {
    if (goal > 0) {
        console.log('WON !!!');
    } else {
        console.log('LOSE !!!');
    }
}

function FinishTurnCallback(sid, move, ix, fen, value, time) {
    console.log('move = ' + move + ', ix = ' + ix + ', value=' + value + ', time = ' + time);
    let board = new Float32Array(SIZE * SIZE);
    console.log('FEN: ' + fen);
    utils.InitializeFromFen(fen, board, SIZE, 1);
    utils.dump(board, SIZE);
    let moves = new Float32Array(SIZE * SIZE);
    moves[ix] = 1;
    board[ix] = 0;
    utils.dump(board, SIZE, moves);
}

async function run() {
//  await ai.FindMove(0, FEN_1, 1, FinishTurnCallback, DoneCallback);
//  await ai.FindMove(0, FEN_2, -1, FinishTurnCallback, DoneCallback);

/*  let board = new Float32Array(SIZE * SIZE);
    utils.InitializeFromFen(FEN_5, board, SIZE, 1);
    utils.dump(board, SIZE);
    let goal = utils.checkGoal(board, SIZE);
    console.log('Goal: ' + goal);

    await ai.FindMove(0, FEN_5, 1, FinishTurnCallback, DoneCallback);*/

    await ai.FindMove(0, FEN_3, -1, FinishTurnCallback, DoneCallback);
}

(async () => { await run(); })();
