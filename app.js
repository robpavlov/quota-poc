var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { EventEmitter, Transform, pipeline } = require('stream');
const { startTranscribing } = require('./services/transcribe');
const { randomUUID } = require('crypto');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const eventEmitter = new EventEmitter();

eventEmitter.on('transcribe', async ({ userId, sessionId }) => {
    const responseStream = await startTranscribing('rtmp://0.0.0.0/live', { userId, sessionId });

    pipeline(
        responseStream,
        new Transform({
            objectMode: true,
            transform(chunk, encoding, cb) {
                console.log(chunk.TranscriptEvent.Transcript.Results.map((result) => result.Alternatives));
                cb();
            }
        }),
        (err) => {
            if (err) {
                console.error(err);
            }
        }
    );
})

app.post('/start', (req, res) => {
    const userId = randomUUID();
    const sessionId = randomUUID();
    

    eventEmitter.emit('transcribe', {
        userId,
        sessionId,
    });

    res
        .send({
            status: 'ok'
        })
        .end();
});

module.exports = app;
