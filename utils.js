"use strict";

const _ = require('underscore');

const LETTERS = 'ABCDEFGHIJKabcdefghijk';

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

function navigate(pos, dir, size) {
    const x = pos % size;
    const y = (pos / size) | 0;
    if (dir < 0) {
        if (dir >= -1) {
            if (x == 0) return null;
        } else {
            if (y == 0) return null;
        }
    }
    if (dir > 0) {
        if (dir <= 1) {
            if (x == size - 1) return null;
        } else {
            if (y == size - 1) return null;
        }
    }
    return pos + dir;
}

function FormatMove(move, size) {
    const col = move % size;
    const row = (move / size) | 0;
    return (LETTERS[col] + (row + 1)).toLowerCase();
}

function InitializeFromFen(fen, board, size, player) {
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
                    if (ix >= size) {
                        p = -p;
                        ix -= size;
                    }
                    ix++;
                    for (; ix > 0; ix--) {
                        board[pos] = p * player;
                        pos++;
                    }
                }
            }
            if (pos >= size * size) break;
        } 
    }
}

function pieceNotation(c, p, size) {
    if (p == 0) return '' + c;
    c--;
    if (p > 0.01) c += size;
    return LETTERS[c];
}

function getFen(board, size, player) {
    let str = '';
    let k = 0; let c = 0; let p = 0;
    for (let pos = 0; pos < size * size; pos++) {
        if (k >= size) {
            if (c > 0) {
                str += pieceNotation(c, p, size);
            }
            str += "/";
            k = 0;
            c = 0;
            p = 0;
        }
        k++;
        const v = board[pos];
        if (Math.abs(v) < 0.01) {
            if ((p != 0) || ((c > 8) && (p == 0))) {
                str += pieceNotation(c, p, size);
                c = 0;
            }
            c++;
            p = 0;
        } else {
            if (v * player < -0.01) {
                if (c > 0) {
                    str += pieceNotation(c, p, size);
                    c = 0;
                }
                p = v;
                c = 1;
            } else {
                c++;
            }
        }
    }
    if (c > 0) {
        str += pieceNotation(c, p, size);
    }
    return str;
}

module.exports.dump = dump;
module.exports.navigate = navigate;
module.exports.FormatMove = FormatMove;
module.exports.InitializeFromFen = InitializeFromFen;
module.exports.getFen = getFen;
