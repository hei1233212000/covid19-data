'use strict';

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const client = new S3Client({});

module.exports.saveJsonGzipToS3 = async (bucket, filename, buffer) => {
    console.log(`going to save file[${filename}] to S3 bucket[${bucket}]...`);
    const putObjectCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: buffer,
        ContentType: 'application/json',
        ContentEncoding: 'gzip'
    });
    return client.send(putObjectCommand);
}
