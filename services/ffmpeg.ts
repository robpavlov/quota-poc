import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";


export function createFfmpeg(listenFrom: string): ChildProcessWithoutNullStreams {
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
        'test.mp3'
    ],
    {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    return child;
}
