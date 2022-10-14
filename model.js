"use strict";

const tf = require('@tensorflow/tfjs');
const _ = require('underscore');

const hints = require('./forced');
const utils = require('./utils');

const SIZE = 11;
const URL = 'http://127.0.0.1:3000/hex-11/model.json';
const PLANE_COUNT = 1;

let model = null;
let board = null;

async function init() {
    await tf.ready();
    console.log(tf.getBackend());
}

async function LoadModel() {
    if (model === null) {
        await init();
        model = await tf.loadLayersModel(URL);
    }
}

async function predict(board) {
    const t0 = Date.now();
    await LoadModel();
    const t1 = Date.now();
    console.log('Load time: ' + (t1 - t0));

    const shape = [1, 1, SIZE, SIZE];
    const xs = tf.tensor4d(board, shape, 'float32');
    const ys = await model.predict(xs);
    let m = null;

    if (_.isArray(ys)) {
        m = await ys[0].data();
        ys[0].dispose();
        ys[1].dispose();
    } else {
        m = await ys.data();
        ys.dispose();
    }

    xs.dispose();

    const t2 = Date.now();
    console.log('Predict time: ' + (t2 - t1));

    return {
        moves: m,
        estimate: [0]
    };
}

async function predictEx(board) {
    const t0 = Date.now();
    await LoadModel();
    const t1 = Date.now();
    console.log('Load time: ' + (t1 - t0));

    const shape = [1, PLANE_COUNT, SIZE, SIZE];
    const xs = tf.tensor4d(board, shape, 'float32');
    const ys = await model.predict(xs);

    let m = null;
    let e = [0];
    if (_.isArray(ys)) {
        m = await ys[0].data();
        e = await ys[1].data();
        ys[0].dispose();
        ys[1].dispose();
    } else {
        m = await ys.data();
        ys.dispose();
    }

    xs.dispose();

    const t2 = Date.now();
    console.log('Predict time: ' + (t2 - t1));

    return {
        moves: m,
        estimate: e
    };
}

async function advise(sid, fen, player, coeff, callback) {
    board = new Float32Array(SIZE * SIZE);

    const t0 = Date.now();
    await LoadModel();
    const t1 = Date.now();
    console.log('Load time: ' + (t1 - t0));

    utils.InitializeFromFen(fen, board, SIZE, player);
    let b = new Float32Array(SIZE * SIZE * PLANE_COUNT);
    utils.encode(board, SIZE, PLANE_COUNT, b);

    const shape = [1, PLANE_COUNT, SIZE, SIZE];
    const xs = tf.tensor4d(b, shape, 'float32');
    const ys = await model.predict(xs);
    let moves = null;

    if (_.isArray(ys)) {
        moves = await ys[0].data();
        ys[0].dispose();
        ys[1].dispose();
    } else {
        moves = await ys.data();
        ys.dispose();
    }

    xs.dispose();

    const t2 = Date.now();
    console.log('Predict time: ' + (t2 - t1));

    hints.analyze(board, player, SIZE, moves);
    utils.dump(board, SIZE, moves);

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

module.exports.PLANE_COUNT = PLANE_COUNT;
module.exports.SIZE = SIZE;

module.exports.predictEx = predictEx;
module.exports.predict = predict;
module.exports.advise = advise;
