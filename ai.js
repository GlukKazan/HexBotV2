"use strict";

const _ = require('underscore');

const model = require('./model');
const hints = require('./forced');
const pie = require('./pie');
const utils = require('./utils');

const C = 1.5;
const D = 30.5;

const MAX_TIME = 7000;
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
        const h = hints.analyze(board, -1, size, new Float32Array(size * size));
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

Child.prototype.getRandom = function() {
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
            let moves = hints.analyze(board, p, size, new Float32Array(size * size));
            if (moves.length == 0) {
                moves = getMoves(board, size);
            }
            if (moves.length == 0) break;
            let ix = 0;
            if (moves.length > 1) ix = _.random(0, moves.length - 1);
            const m = moves[ix];
            undo.push(m);
            board[m] = p;
//          utils.dump(board, size);
            p = -p;
        }
    }
    const g = utils.checkGoal(board, size);
    _.each(undo, function(p) {
        board[p] = 0;
    });
    return g;
}

async function FindMove(sid, fen, player, callback, done, logger) {
    const t0 = Date.now();
    let board = new Float32Array(model.SIZE * model.SIZE);
    utils.InitializeFromFen(fen, board, model.SIZE, player);

    if (done) {
        let goal = utils.checkGoal(board, model.SIZE);
        if (goal !== null) {
            done(goal);
            return;
        }
    }

    const m = pie.FindMove(board, model.SIZE);
    if (m !== null) {
        const t1 = Date.now();
        board = new Float32Array(model.SIZE * model.SIZE);
        board[utils.flip(Math.abs(m), model.SIZE, player)] = 1;
        const setup = utils.getFen(board, model.SIZE, -player);
        callback(sid, utils.FormatMove(m, model.SIZE), m, setup, 1000, t1 - t0);
        return;
    }

    let b = new Float32Array(model.SIZE * model.SIZE * model.PLANE_COUNT);
    utils.encode(board, model.SIZE, model.PLANE_COUNT, b);

    const w = await model.predictEx(b);
    hints.analyze(board, 1, model.SIZE, w.moves);
    utils.dump(board, model.SIZE, w.moves, player);

    let moves = getMoves(board, model.SIZE);
    const root = new Node(moves);

    let cnt = 0;
    for (let i = 0; i < DO_TOTAL; i++) {
        const c = root.getUCT(board, model.SIZE, w.moves);
        if (c === null) break;
        board[c.move] = 1;
        const move = c.getRandom(board, model.SIZE);
        if (simulate(board, player, model.SIZE, move) > 0) {
            c.w++;
        }
        c.n++;
        root.n++;
        board[c.move] = 0;
        if (i % 100 == 0) {
            if (Date.now() - t0 > MAX_TIME) break;
        }
        cnt++;
    }

    const r = _.sortBy(root.childs, function(c) {
        return -c.n;
    });
    const t1 = Date.now();

    let mx = r[0].w; let ix = 0;
    for (let i = 0; i < r.length; i++) {
        const m = utils.flip(r[i].move, model.SIZE, player);
        console.log(utils.FormatMove(m, model.SIZE) + ': n = ' + r[i].n + ', w = ' + r[i].w + ', p = ' + r[i].p + ', e = ' + w.estimate);
        if (logger) {
            logger.info(utils.FormatMove(m, model.SIZE) + ': n = ' + r[i].n + ', w = ' + r[i].w + ', p = ' + r[i].p+ ', e = ' + w.estimate);
        }
        if (r[i].w > mx) {
            mx = r[i].w;
            ix = i;
        }
        if (i >= 9) break;
    }
    console.log('Time = ' + (t1 - t0) + ', N = ' + cnt);
    if (logger) {
        logger.info('Time = ' + (t1 - t0) + ', N = ' + cnt);
    }

    board[r[ix].move] = 1;
    const setup = utils.getFen(board, model.SIZE, -player);
    const result = utils.flip(r[ix].move, model.SIZE, player);
    callback(sid, utils.FormatMove(result, model.SIZE), result, setup, (r[ix].n / root.n) * 1000, t1 - t0);
}

module.exports.FindMove = FindMove;
