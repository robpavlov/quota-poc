const { TranscribeStreamingClient, StartStreamTranscriptionCommand } = require('@aws-sdk/client-transcribe-streaming');
const { randomUUID } = require('node:crypto');
const { PassThrough, Readable, pipeline, Transform, EventEmitter } = require('node:stream');
const { createFfmpeg } = require('./ffmpeg');

const eventEmitter = new EventEmitter();

const waitForStreamToStartTranscribe = (stream, ffmpeg, transcribeData) => {
    const func =  function (chunk) {
        console.log('stream started');
        stream.removeListener('data', func);

        eventEmitter.emit('startTranscribe', { stream, ffmpeg, transcribeData });
    }

    return func;
}

const onTranscribe = ({ userId, sessionId, listenFrom }) => {
    const audioPayloadStream = new PassThrough({ highWaterMark: 1024 });

    const audioStream = async function* () {
        for await (const chunk of audioPayloadStream) {
            yield {AudioEvent: {AudioChunk: chunk}};
        }
    }

    const ffmpeg = createFfmpeg(listenFrom);

    ffmpeg.stdout.pipe(audioPayloadStream);

    audioPayloadStream.on('data', waitForStreamToStartTranscribe(audioPayloadStream, ffmpeg, { userId, sessionId }));
};

const onStartTranscribe = async ({ stream, ffmpeg, transcribeData: { userId, sessionId } }) => {
    const audioStream = async function* () {
        for await (const chunk of stream) {
            yield {AudioEvent: {AudioChunk: chunk}};
        }
    }

    const transcribeClient = new TranscribeStreamingClient({
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_KEY,
        },
        region: process.env.AWS_REGION,
    });

    const result = await transcribeClient.send(new StartStreamTranscriptionCommand({
        LanguageCode: 'en-US',
        MediaEncoding: 'pcm',
        ShowSpeakerLabel: true,
        MediaSampleRateHertz: process.env.TRANSCRIBING_SAMPLE_RATE,
        AudioStream: audioStream(),
        SessionId: sessionId,
    }));

    ffmpeg.on('close', (code) => {
        transcribeClient.destroy();
        
        if (result) {
            Readable.from(result.TranscriptResultStream).destroy()
        }

        eventEmitter.emit('stopTranscribing');
    });

    eventEmitter.emit('transcripting', {
        transcripts: result.TranscriptResultStream,
        sessionId,
    });
}

const onTranscripting = ({ transcripts, sessionId }) => {
    console.log('TRANSCRIPTING: ', sessionId);

    Readable.from(transcripts).pipe(
        new Transform({
            objectMode: true,
            transform(chunk, encoding, cb) {
                console.log(JSON.stringify(chunk));

                cb();
            }
        })
    )
}

const onStopTranscripting = () => {
    console.log('stopped transcribing');
    console.log('uploading recording to s3...');
    console.log('recording uploaded');
}

eventEmitter.on('transcribe', onTranscribe);
eventEmitter.on('startTranscribe', onStartTranscribe);
eventEmitter.on('transcripting', onTranscripting);
eventEmitter.on('stopTranscribing', onStopTranscripting)

module.exports = {
    eventEmitter,
}
