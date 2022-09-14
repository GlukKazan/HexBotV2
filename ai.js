"use strict";

const _ = require('underscore');

const model = require('./model');
const hints = require('./forced');
const utils = require('./utils');

const C = 1.5;
const D = 2.5;

const DO_TOTAL = 1000;
const EPS = 0.001;

let edges = null;

function uct(parent, node) {
    return (node.w / node.n) + C * Math.sqrt(Math.log(parent.n) / node.n) + D * (node.p / node.n);
}

function node(avail) {
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

node.prototype.getUCT = function(board, size, probs) {
    const m = getAvail(this);
    if (m !== null) {
        const moves = getMoves(board, size, m);
        const h = hints.analyze(board, -1, size);
        const r = new child(m, moves, h, probs[m]);
        this.childs.push(r);
        return r;
    }
    if (this.childs.length == 0) return null;
    return _.max(this.childs, function(node) {
        return uct(this, node);
    }, this);
}

function child(move, prior, avail, p) {
    this.prior = prior;
    this.move  = move;
    this.avail = avail;
    this.n = 1;
    this.w = 0;
    this.p = p;
    this.moves = [];
}

child.prototype.getRandom = function(board, size) {
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

function checkGoal(board, player, size) {
    if (edges === null) {
        let e = [];
        for (let i = 0; i < size; i++) e.push(i);
        edges.push(e);
        e = [];
        for (let i = 0; i < size; i++) e.push(size * (size - 1) + i);
        edges.push(e);
        e = [];
        for (let i = 0; i < size; i++) e.push(size * i);
        edges.push(e);
        e = [];
        for (let i = 0; i < size; i++) e.push(size * i + (size - 1));
        edges.push(e);
    }
    let ix = 0;
    let group = [];
    _.each(edges[ix], function(p) {
        if (board[p] * player < EPS) return;
        group.push(p);
    });
    let f = false;
    for (let i = 0; i < group.length; i++) {
        if (f) break;
        _.each([-size, -size + 1, 1, size, size - 1, -1], function(dir) {
            const p = utils.navigate(group[i], dir, size);
            if (p === null) return;
            if (_.indexOf(group, p) >= 0) return;
            if (board[p] * player < EPS) return;
            if (_.indexOf(edges[ix + 1], p) >= 0) f = true;
            group.push(p);
        });
    }
    if (f) return player;
    ix += 2;
    group = [];
    _.each(edges[ix], function(p) {
        if (board[p] * player > -EPS) return;
        group.push(p);
    });
    f = false;
    for (let i = 0; i < group.length; i++) {
        if (f) break;
        _.each([-size, -size + 1, 1, size, size - 1, -1], function(dir) {
            const p = utils.navigate(group[i], dir, size);
            if (p === null) return;
            if (_.indexOf(group, p) >= 0) return;
            if (board[p] * player > -EPS) return;
            if (_.indexOf(edges[ix + 1], p) >= 0) f = true;
            group.push(p);
        });
    }
    if (f) return -player;
    return null;
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
            undo.push(move);
            board[move] = p;
            p = -p;
        }
    }
    const g = checkGoal(board, player, size);
    _.each(undo, function(p) {
        board[p] = 0;
    });
    return g;
}

async function FindMove(fen, player, callback, done, logger) {
    const t0 = Date.now();
    const size = model.getSize();
    let board = new Float32Array(size * size);
    InitializeFromFen(fen, board, player);

    const probs = await model.predict(board);
    utils.dump(board, size, 0, probs);

    hints.analyze(board, player, size, probs);
    utils.dump(board, size, 0, probs);

    let moves = getMoves(board, size);
    const root = new node(moves);

    for (let i = 0; i < DO_TOTAL; i++) {
        const node = root.getUCT(board, size, probs);
        if (node === null) break;
        board[node.move] = 1;
        const move = node.getRandom(board, size);
        if (simulate(board, size, move) > 0) {
            node.w++;
        }
        node.n++;
        root.n++;
        board[node.move] = 0;
    }

    const r = _.max(root.childs, function(node) {
        return node.n;
    });

    board[r.move] = 1;
    const goal = checkGoal(board, player);
    if (goal !== null) {
        done(goal);
        return;
    }

    const setup = utils.getFen(board, player);
    const t1 = Date.now();
    callback(r.move, setup, (r.w / r.n) * 1000, t1 - t0);
}

module.exports.FindMove = FindMove;
