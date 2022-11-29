const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { randomUUID } = require('crypto');

const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});

const uploadRecording = async (ffmpeg) => {
    try {
        const s3Root = `${randomUUID()}/${randomUUID()}`
        const uploadS3 = new Upload({
            client: s3,
            params: {
                Bucket: `over-quota-stream-${process.env.NODE_ENV}`,
                Key: `${s3Root}/recording.mp3`,
                Body: ffmpeg.stdio[3]
            }
        });
        uploadS3.done().catch(console.error);

        uploadS3.on('httpUploadProgress', (progress) => {
            console.log('progress', progress);
        })
        console.log('S3 uploading started');
    } catch (e) {
        console.log(e);
    }
}

module.exports = {
    uploadRecording,
}
