"use strict";

const tf = require('@tensorflow/tfjs');
const _ = require('underscore');

const hints = require('./forced');
const utils = require('./utils');

const SIZE = 11;
const URL = 'https://games.dtco.ru/hex-' + SIZE + '/model.json';

let model = null;
let board = null;

function getSize() {
    return SIZE;
}

async function InitModel() {
    if (model === null) {
        model = await tf.loadLayersModel(URL);
        console.log(tf.getBackend());
    }
}

async function predict(board) {
    const t0 = Date.now();
    await InitModel();
    const t1 = Date.now();
    console.log('Load time: ' + (t1 - t0));

    const shape = [1, 1, SIZE, SIZE];
    const xs = tf.tensor4d(board, shape, 'float32');
    const ys = await model.predict(xs);
    const moves = await ys.data();

    xs.dispose();
    ys.dispose();

    const t2 = Date.now();
    console.log('Predict time: ' + (t2 - t1));

    return moves;
}

async function advise(sid, fen, player, coeff, callback) {
    board = new Float32Array(SIZE * SIZE);

    const t0 = Date.now();
    await InitModel();
    const t1 = Date.now();
    console.log('Load time: ' + (t1 - t0));

    utils.InitializeFromFen(fen, board, SIZE, player);

    const shape = [1, 1, SIZE, SIZE];
    const xs = tf.tensor4d(board, shape, 'float32');
    const ys = await model.predict(xs);
    const moves = await ys.data();

    xs.dispose();
    ys.dispose();

    const t2 = Date.now();
    console.log('Predict time: ' + (t2 - t1));

    hints.analyze(board, player, SIZE, moves);
    utils.dump(board, SIZE, 0, moves);

    let r = [];
    for (let i = 0; i < moves.length; i++) {
        r.push({
            pos: i,
            weight: moves[i] * moves[i] * moves[i]
        });
    }

    r = _.chain(r).filter(function (x) {
        return Math.abs(board[x.pos]) <= 0.01;
    }).sortBy(function(x) {
        return -Math.abs(x.weight);
    }).value();

    let result = [];
    let sz = 0;
    while (sz < r.length - 1) {
        if ((sz > 0) && (Math.abs(r[sz].weight) * coeff < Math.abs(r[sz - 1].weight))) break;
        result.push({
            sid: sid,
            move: utils.FormatMove(r[sz].pos, SIZE),
            weight: r[sz].weight * 1000
        });
        sz++;
    }

    callback(result, t2 - t0);
}

module.exports.getSize = getSize;
module.exports.predict = predict;
module.exports.advise = advise;
