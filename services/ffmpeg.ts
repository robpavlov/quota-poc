import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";

export function buildLocalRecordingName({ sessionId }: {
    sessionId: string;
}): string {
    return `${sessionId}.mp3`;
}

export function createFfmpeg(listenFrom: string, recordingName: string): ChildProcessWithoutNullStreams {
    console.log('listen to stream', { listenFrom, recordingName });
    const child = spawn('ffmpeg', [
        '-re',
        '-y',
        '-listen', `1`,
        '-i', listenFrom,
        '-vn',
        '-f', `wav`,
        '-acodec', `pcm_s16le`,
        '-ar', process.env.TRANSCRIBING_SAMPLE_RATE!,
        '-fflags', `nobuffer`,
        '-flags', `low_delay`,
        '-rtmp_buffer', `100`,
        '-rtmp_live', `live`,
        '-tcp_nodelay', `1`,
        '-ac', '1',
        'pipe:1',
        '-f', `mp3`,
        recordingName,
    ],
    {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    return child;
}
