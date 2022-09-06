"use strict";

const axios = require('axios');
const _ = require('underscore');

const ai = require('./model');

const VARIANT  = 225;
const SERVICE  = 'https://games.dtco.ru';
const USERNAME = 'HexBot';
const PASSWORD = 'HexBot';

const STATE = {
    INIT: 1,
    STOP: 2,
    WAIT: 3,
    RQST: 4
};

let TOKEN   = null;

var winston = require('winston');
require('winston-daily-rotate-file');

const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(
        info => `${info.level}: ${info.timestamp} - ${info.message}`
    )
);

var transport = new winston.transports.DailyRotateFile({
    dirname: '',
    filename: 'hexbot-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

var logger = winston.createLogger({
    format: logFormat,
    transports: [
      transport
    ]
});

function App() {
    this.state  = STATE.INIT;
    this.states = [];
}

let app = new App();

let init = function(app) {
    console.log('INIT');
    logger.info('INIT');
    app.state = STATE.WAIT;
    axios.post(SERVICE + '/api/auth/login', {
        username: USERNAME,
        password: PASSWORD
    })
    .then(function (response) {
      TOKEN = response.data.access_token;
      app.state = STATE.RQST;
    })
    .catch(function (error) {
      console.log('INIT ERROR: ' + error);
      logger.error('INIT ERROR: ' + error);
      app.state  = STATE.STOP;
    });
    return true;
}

function AdvisorCallback(moves, time) {
    _.each(moves, function(m) {
        console.log('move = ' + m.move + ', value=' + m.weight + ', time = ' + time);
        logger.info('move = ' + m.move + ', value=' + m.weight + ', time = ' + time);
    });
    app.state  = STATE.WAIT;
    axios.post(SERVICE + '/api/ai', moves , {
        headers: { Authorization: `Bearer ${TOKEN}` }
    })
    .then(function (response) {
        app.state  = STATE.RQST;
    })
    .catch(function (error) {
        console.log('RQST ERROR: ' + error);
        logger.error('RQST ERROR: ' + error);
        app.state  = STATE.INIT;
    });
}

let request = function(app) {
//  console.log('RQST');
    app.state = STATE.WAIT;
    axios.get(SERVICE + '/api/ai/' + VARIANT, {
        headers: { Authorization: `Bearer ${TOKEN}` }
    })
    .then(function (response) {
        if (response.data.length > 0) {
            const sid = response.data[0].sid;
            const setup = response.data[0].setup;
            let coeff = response.data[0].coeff;
            if (!coeff) coeff = 5;
            const result = setup.match(/\?turn=(\d+);\&setup=([^-]*)/);
            if (result) {
                const player = (result[0] == '0') ? 1 : -1;
                const fen = result[2];
                console.log('[' + sid + '] fen = ' + fen + ', coeff = ' + coeff);
                logger.info('[' + sid + '] fen = ' + fen);
                ai.Advisor(sid, fen, player, coeff, AdvisorCallback);
            } else {
                app.state = STATE.RQST;
            }
        } else {
            app.state = STATE.RQST;
        }
    })
    .catch(function (error) {
        console.log('RQST ERROR: ' + error);
        logger.error('RQST ERROR: ' + error);
        app.state  = STATE.INIT;
    });
    return true;
}

let wait = function(app) {
    //  console.log('WAIT');
        return true;
}
        
let stop = function(app) {
    console.log('STOP');
    return false;
}
        
App.prototype.exec = function() {
    if (_.isUndefined(this.states[this.state])) return true;
    return this.states[this.state](this);
}
    
app.states[STATE.INIT] = init;
app.states[STATE.WAIT] = wait;
app.states[STATE.STOP] = stop;
app.states[STATE.RQST] = request;

let run = function() {
    if (app.exec()) {
        setTimeout(run, 1000);
    }
}
run();
