import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
import { PassThrough, Readable, Transform } from "node:stream";
import { PayloadByEvent, emitEvent, TranscribeEvent } from "./emitters";
import { createFfmpeg, buildLocalRecordingName } from '../ffmpeg';
import { buildS3RecordingName, uploadRecordingToS3 } from "../s3";

export function onStartSession({ userId, sessionId, streamLink }: PayloadByEvent<TranscribeEvent.START_SESSION>): void {
    const audioPayloadStream = new PassThrough({ highWaterMark: 1024 });

    const ffmpeg = createFfmpeg(streamLink, buildLocalRecordingName({ sessionId }));

    ffmpeg.stdout.pipe(audioPayloadStream);

    audioPayloadStream.once('data', () => {
        console.log('stream started');

        emitEvent(TranscribeEvent.START_TRANSCRIBE_CLIENT, {
            audioPayloadStream,
            ffmpeg,
            userId,
            sessionId,
        });
    });
};

export async function onStartTranscribeClient({
    audioPayloadStream,
    ffmpeg,
    userId,
    sessionId
}: PayloadByEvent<TranscribeEvent.START_TRANSCRIBE_CLIENT>) {
    const audioStream = async function* () {
        for await (const chunk of audioPayloadStream) {
            yield {AudioEvent: {AudioChunk: chunk}};
        }
    }

    const transcribeClient = new TranscribeStreamingClient({
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY!,
            secretAccessKey: process.env.AWS_SECRET_KEY!,
        },
        region: process.env.AWS_REGION,
    });

    const result = await transcribeClient.send(new StartStreamTranscriptionCommand({
        LanguageCode: 'en-US',
        MediaEncoding: 'pcm',
        ShowSpeakerLabel: true,
        MediaSampleRateHertz: +process.env.TRANSCRIBING_SAMPLE_RATE!,
        AudioStream: audioStream(),
        SessionId: sessionId,
    }));

    ffmpeg.on('close', (code) => {
        transcribeClient.destroy();
        
        if (result) {
            Readable.from(result.TranscriptResultStream!).destroy()
        }

        emitEvent(TranscribeEvent.STOP_SESSION, { userId, sessionId });
    });

    emitEvent(TranscribeEvent.PROCESS_TRANSCRIPTION, { transcriptStream: result.TranscriptResultStream!, userId, sessionId });
}

export function onProcessTranscription({ transcriptStream, sessionId }: PayloadByEvent<TranscribeEvent.PROCESS_TRANSCRIPTION>): void {
    console.log('TRANSCRIPTING: ', sessionId);

    Readable.from(transcriptStream).pipe(
        new Transform({
            objectMode: true,
            transform(chunk, encoding, cb) {
                console.log(JSON.stringify(chunk));

                cb();
            }
        })
    )
}

export async function onStopSession(payload: PayloadByEvent<TranscribeEvent.STOP_SESSION>): Promise<void> {
    console.log('stopped transcribing');
    console.log('uploading recording to s3...');

    await uploadRecordingToS3(buildLocalRecordingName(payload));

    console.log('recording uploaded');
}
