const { TranscribeStreamingClient, StartStreamTranscriptionCommand } = require('@aws-sdk/client-transcribe-streaming');
const { randomUUID } = require('node:crypto');
const { PassThrough, Readable, pipeline, Transform } = require('node:stream');
const { createFfmpeg } = require('./ffmpeg');
const { Upload } = require('@aws-sdk/lib-storage');
const { uploadRecording } = require('./s3');

const startTranscribing = async (listenFrom, { userId, sessionId }) => {
    const audioPayloadStream = new PassThrough({ highWaterMark: 1024 });

    const audioStream = async function* () {
        for await (const chunk of audioPayloadStream) {
            yield {AudioEvent: {AudioChunk: chunk}};
        }
    }

    const ffmpeg = createFfmpeg(listenFrom);

    ffmpeg.stdout.pipe(audioPayloadStream);

    const command = new StartStreamTranscriptionCommand({
        // The language code for the input audio. Valid values are en-GB, en-US, es-US, fr-CA, and fr-FR
        LanguageCode: 'en-US',
        // The encoding used of the input audio. The only valid value is pcm.
        MediaEncoding: 'pcm',
        // Enables speaker partitioning (diarization) in your transcription output. Speaker partitioning labels the speech from individual speakers in your media file.
        ShowSpeakerLabel: true,
        // The sample rate of the input audio in Hertz. We suggest that you use 8000 Hz for low-quality audio and 16000 Hz for high-quality audio.
        // The sample rate must match the sample rate in the audio file.
        MediaSampleRateHertz: process.env.TRANSCRIBING_SAMPLE_RATE,
        // Set input read stream
        AudioStream: audioStream(),
        SessionId: sessionId,
    });

    const transcribeClient = new TranscribeStreamingClient({
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_KEY,
        },
        region: process.env.AWS_REGION,
    });

    const result = await transcribeClient.send(command);

    ffmpeg.on('close', (code) => {
        transcribeClient.destroy();
        
        if (result) {
            Readable.from(result.TranscriptResultStream).destroy()
        }
    });

    return result.TranscriptResultStream;
}

module.exports = {
    startTranscribing,
}
