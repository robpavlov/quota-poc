var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { eventEmitter } = require('./services/transcribe');
const { randomUUID } = require('crypto');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.post('/start', (req, res) => {
    const userId = randomUUID();
    const sessionId = randomUUID();
    

    eventEmitter.emit('transcribe', {
        userId,
        sessionId,
        listenFrom: 'rtmp://0.0.0.0:1935/live'
    });

    res
        .send({
            status: 'ok'
        })
        .end();
});

module.exports = app;
