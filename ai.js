"use strict";

const _ = require('underscore');

const model = require('./model');
const hints = require('./forced');
const graph = require('./graph');
const utils = require('./utils');

const C = 1.5;
const D = 30.5;

const MAX_TIME = 5000;
const DO_TOTAL = 10000;
const EPS = 0.001;

function uct(parent, node) {
    return (node.w / node.n) + C * Math.sqrt(Math.log(parent.n) / node.n) + D * (node.p / node.n);
}

function Node(avail) {
    this.avail = avail;
    this.n = 0;
    this.childs = [];
}

function getMoves(board, size, move) {
    return _.filter(_.range(size * size), function(pos) {
        if (move == pos) return false;
        return Math.abs(board[pos]) < EPS;
    });
}

Node.prototype.getUCT = function(board, size, probs) {
    const m = getAvail(this);
    if (m !== null) {
        const moves = getMoves(board, size, m);
        const h = hints.analyze(board, -1, size);
        const r = new Child(m, moves, h, probs[m]);
        this.childs.push(r);
        return r;
    }
    if (this.childs.length == 0) return null;
    return _.max(this.childs, function(node) {
        return uct(this, node);
    }, this);
}

function Child(move, prior, avail, p) {
    this.prior = prior;
    this.move  = move;
    this.avail = avail;
    this.n = 1;
    this.w = 0;
    this.p = p;
    this.moves = [];
}

Child.prototype.getRandom = function(board, size) {
    let m = null;
    if (this.prior.length > 0) {
        m = this.prior.pop();
    } else {
        m = getAvail(this);
    }
    if (m !== null) {
        this.moves.push(m);
        return m;
    }
    if (this.moves.length == 0) return null;
    if (this.moves.length == 1) return this.moves[0];
    const ix = _.random(0, this.moves.length - 1);
    return this.moves[ix];
}

function getAvail(node) {
    if (node.avail.length == 0) return null;
    if (node.avail.length == 1) {
        const r = node.avail[0];
        node.avail = [];
        return r;
    }
    const ix = _.random(0, node.avail.length - 1);
    const r = node.avail[ix];
    node.avail = _.without(node.avail, r);
    return r;
}

function simulate(board, player, size, move) {
    let undo = [];
    if (move !== null) {
        undo.push(move);
        board[move] = -1;
        let p = player;
        for (let i = 0; i < size * size; i++) {
            let moves = hints.analyze(board, p, size);
            if (moves.length == 0) {
                moves = getMoves(board, size);
            }
            if (moves.length == 0) break;
            let ix = 0;
            if (moves.length > 1) ix = _.random(0, moves.length - 1);
            const m = moves[ix];
            undo.push(m);
            board[m] = p;
//          utils.dump(board, size, 0);
            p = -p;
        }
    }
    const won = graph.isLose(board, -player);
    _.each(undo, function(p) {
        board[p] = 0;
    });
    return won;
}

async function FindMove(fen, player, callback, done, logger) {
    const t0 = Date.now();
    const size = model.getSize();
    let board = new Float32Array(size * size);
    utils.InitializeFromFen(fen, board, size, player);

    if (graph.isLose(board, player)) {
        done(-1);
        return;
    }
    if (graph.isLose(board, -player)) {
        done(1);
        return;
    }

    const w = await model.predict(board);
//  utils.dump(board, size, 0, probs);
    hints.analyze(board, player, size, w);
    utils.dump(board, size, 0, w);

    let moves = getMoves(board, size);
    const root = new Node(moves);

    for (let i = 0; i < DO_TOTAL; i++) {
        const c = root.getUCT(board, size, w);
        if (c === null) break;
        board[c.move] = 1;
        const move = c.getRandom(board, size);
        if (simulate(board, player, size, move) > 0) {
            c.w++;
        }
        c.n++;
        root.n++;
        board[c.move] = 0;
        if (i % 100 == 0) {
            if (Date.now() - t0 > MAX_TIME) break;
        }
    }

    const r = _.sortBy(root.childs, function(c) {
        return -c.n;
    });
    const t1 = Date.now();

    for (let i = 0; i < r.length; i++) {
        console.log(utils.FormatMove(r[i].move, size) + ': n = ' + r[i].n + ', w = ' + r[i].w + ', p = ' + r[i].p);
        if (logger) {
            logger.info(utils.FormatMove(r[i].move, size) + ': n = ' + r[i].n + ', w = ' + r[i].w + ', p = ' + r[i].p);
        }
        if (i >= 9) break;
    }

    board[r[0].move] = 1;
    const setup = utils.getFen(board, size, -player);
    callback(r[0].move, setup, (r[0].n / root.n) * 1000, t1 - t0);
}

module.exports.FindMove = FindMove;
