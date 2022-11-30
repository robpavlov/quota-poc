import { S3 } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "fs";

const s3 = new S3({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_KEY!,
    },
    region: process.env.AWS_REGION,
});

export function buildS3RecordingName({ userId, sessionId }: {
    sessionId: string;
    userId: string;
}): string {
    return `${userId}/${sessionId}.mp3`;
}

export async function uploadRecordingToS3(recordingName: string): Promise<void> {
    const readStream = createReadStream(recordingName);

    const upload = new Upload({
        client: s3,
        params: {
            Bucket: `over-quota-stream-${process.env.NODE_ENV!}`,
            Key: recordingName,
            Body: readStream
        }
    })

    await upload.done();
}
