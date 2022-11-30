import { PassThrough } from "stream"
import { ChildProcessWithoutNullStreams } from 'node:child_process';
import { getTranscribeHandler } from ".";
import { TranscriptResultStream } from "@aws-sdk/client-transcribe-streaming";

export const enum TranscribeEvent {
    START_SESSION = 'START_SESSION',
    START_TRANSCRIBE_CLIENT = 'START_TRANSCRIBE_CLIENT',
    STOP_SESSION = 'STOP_SESSION',
    PROCESS_TRANSCRIPTION = 'PROCESS_TRANSCRIPTION',
};

type EmitPayloadTypeMap = {
    [TranscribeEvent.START_SESSION]: {
        userId: string;
        sessionId: string;
        streamLink: string;
    },
    [TranscribeEvent.START_TRANSCRIBE_CLIENT]: {
        userId: string;
        sessionId: string;
        audioPayloadStream: PassThrough;
        ffmpeg: ChildProcessWithoutNullStreams;
    },
    [TranscribeEvent.STOP_SESSION]: {
        userId: string;
        sessionId: string;
    },
    [TranscribeEvent.PROCESS_TRANSCRIPTION]: {
        userId: string;
        sessionId: string;
        transcriptStream: AsyncIterable<TranscriptResultStream>;
    },
}

export type PayloadByEvent<Event extends TranscribeEvent> = TranscribeEvent extends keyof EmitPayloadTypeMap ? EmitPayloadTypeMap[Event] : never;

export function emitEvent<T extends TranscribeEvent>(event: T, payload: PayloadByEvent<T>) {
    console.log(event, payload);
    getTranscribeHandler().emit(event, payload);
}
