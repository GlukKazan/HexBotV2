"use strict";

const tf = require('@tensorflow/tfjs');
const _ = require('underscore');

const SIZE = 11;
const URL = 'https://games.dtco.ru/hex-' + SIZE + '/model.json';

const LETTERS = 'ABCDEFGHIJKLMNabcdefghijklmn';

let model = null;
let board = null;

function dump(board, size, offset, moves) {
    for (let y = 0; y < size; y++) {
        let s = '';
        for (let i = 0; i <= y; i++) {
            s = s + ' ';
        }
        for (let x = 0; x < size; x++) {
            const pos = y * size + x;
            if (board[offset + pos] > 0) {
                s = s + '* ';
            } else if (board[offset + pos] < 0) {
                s = s + 'o ';
            }  else if (!_.isUndefined(moves) && (moves[offset + pos] > 1 / (size * size))) {
                s = s + '+ ';
            }  else if (!_.isUndefined(moves) && (moves[offset + pos] < -1 / (size * size))) {
                s = s + 'X ';
            }  else {
                s = s + '. ';
            }
        }
        console.log(s);
    }
    console.log('');
}

function FormatMove(move) {
    const col = move % SIZE;
    const row = (move / SIZE) | 0;
    return LETTERS[col] + (row + 1);
}

function InitializeFromFen(fen, board, player) {
    let pos = 0;
    for (let i = 0; i < fen.length; i++) {
        const c = fen[i];
        if (c != '/') {
            if ((c >= '0') && (c <= '9')) {
                pos += +c;
            } else {
                let ix = _.indexOf(LETTERS, c);
                if (ix >= 0) {
                    let p = 1;
                    if (ix >= 14) {
                        p = -p;
                        ix -= 14;
                    }
                    ix++;
                    for (; ix > 0; ix--) {
                        board[pos] = p * player;
                        pos++;
                    }
                }
            }
            if (pos >= SIZE * SIZE) break;
        } 
    }
}

async function InitModel() {
    if (model === null) {
        model = await tf.loadLayersModel(URL);
        console.log(tf.getBackend());
    }
}

async function Advisor(sid, fen, player, coeff, callback) {
    board = new Float32Array(SIZE * SIZE);

    const t0 = Date.now();
    await InitModel();
    const t1 = Date.now();
    console.log('Load time: ' + (t1 - t0));

    InitializeFromFen(fen, board, player);

    const shape = [1, 1, SIZE, SIZE];
    const xs = tf.tensor4d(board, shape, 'float32');
    const ys = await model.predict(xs);
    const y = await ys.data();

    xs.dispose();
    ys.dispose();

    const t2 = Date.now();
    console.log('Predict time: ' + (t2 - t1));

    dump(board, SIZE, 0, y);

    let r = [];
    for (let i = 0; i < y.length; i++) {
        r.push({
            pos: i,
            weight: y[i] * y[i] * y[i]
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
            move: FormatMove(r[sz].pos).toLowerCase(),
            weight: r[sz].weight * 1000
        });
        sz++;
    }

    callback(result, t2 - t0);
}

module.exports.Advisor = Advisor;
