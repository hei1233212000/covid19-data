'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports.saveFile = async (bucket, filename, buffer) => {
    console.log(`going to save file[${filename}] to S3 bucket[${bucket}]...`);
    return s3.putObject({
        Bucket: bucket,
        Key: filename,
        Body: buffer,
    }).promise();
}
