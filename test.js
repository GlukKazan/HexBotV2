"use strict";

const ai = require('./ai');
const utils = require('./utils');

const SIZE   = 11;
const FEN    = '92/92/4a5A/6A1a2/3A2a2a1/3B3C/2bAaAd/3AaAaA3/2DaA3/Ae5/2A8';
const PLAYER = -1;

function DoneCallback(goal) {
    if (goal > 0) {
        console.log('WON !!!');
    } else {
        console.log('LOSE !!!');
    }
}

function FinishTurnCallback(bestMove, fen, value, time) {
    const move = utils.FormatMove(bestMove, SIZE);
    console.log('move = ' + move + ', value=' + value + ', time = ' + time);
    let board = new Float32Array(SIZE * SIZE);
    utils.InitializeFromFen(fen, board, SIZE, PLAYER);
    let moves = new Float32Array(SIZE * SIZE);
    moves[bestMove] = 1;
    board[bestMove] = 0;
    utils.dump(board, SIZE, 0, moves);
}

async function run() {
//  console.log(FEN);
    let board = new Float32Array(SIZE * SIZE);
    utils.InitializeFromFen(FEN, board, SIZE, PLAYER);
    const fen = utils.getFen(board, SIZE, -PLAYER);
    console.log(fen);

//  utils.dump(board, SIZE, 0);
    let goal = ai.checkGoal(board, PLAYER, SIZE);
    if (goal !== null) {
        console.log('Goal = ' + goal);
        return;
    }

/*  board[110] = 1;
    utils.dump(board, SIZE, 0);

    goal = ai.checkGoal(board, PLAYER, SIZE);
    if (goal !== null) {
        console.log('Goal = ' + goal);
        return;
    }*/

    await ai.FindMove(FEN, PLAYER, FinishTurnCallback, DoneCallback);
}

(async () => { await run(); })();
