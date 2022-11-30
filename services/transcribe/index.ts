import once from "lodash.once";
import EventEmitter from "node:stream";
import { TranscribeEvent } from './emitters';
import { onProcessTranscription, onStartSession, onStartTranscribeClient, onStopSession } from "./listeners";

const EventHandlerMap = {
    [TranscribeEvent.START_SESSION]: onStartSession,
    [TranscribeEvent.START_TRANSCRIBE_CLIENT]: onStartTranscribeClient,
    [TranscribeEvent.PROCESS_TRANSCRIPTION]: onProcessTranscription,
    [TranscribeEvent.STOP_SESSION]: onStopSession,
}


export const getTranscribeHandler = once(() => {
    const emitter = new EventEmitter();

    for (const [event, handler] of Object.entries(EventHandlerMap)) {
        emitter.on(event, handler);
    }

    return emitter;
})
