"use strict";

const ai = require('./ai');
const utils = require('./utils');

const SIZE   = 11;
const FEN    = '7A3/4AbA2A/3bAaCa/2aA2Ab2/cC1Aa2/BcA1Aa2/aDc3/eB4/2A1D3/2Bd3/1Ab1A5';
const PLAYER = 1;

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

    utils.dump(board, SIZE, 0);
    let goal = utils.checkGoal(board, PLAYER, SIZE);
    if (goal !== null) {
        console.log('Goal = ' + goal);
        return;
    }

    await ai.FindMove(FEN, PLAYER, FinishTurnCallback, DoneCallback);
}

(async () => { await run(); })();
