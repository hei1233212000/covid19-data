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

/**
 * List of object keys under the bucket. The result would be sorted where oldest file at head
 *
 * @return {Promise<Object[]|Buffer|Uint8Array|Blob|string>}
 */
module.exports.allObjectKeys = async (bucket) => {
    const listObjectsOutput = await s3.listObjectsV2({Bucket: bucket}).promise();
    // oldest file at head
    return listObjectsOutput.Contents
        .sort((a, b) => (a.LastModified > b.LastModified) ? 1 : -11)
        .map(o => o.Key);
}

module.exports.deleteObjects = async (objectKeysNeededToBeDeleted, bucket) => {
    const objects = objectKeysNeededToBeDeleted.map(key => {
        return {Key: key}
    });

    return await s3.deleteObjects({
        Bucket: bucket,
        Delete: {
            Objects: objects,
            Quiet: false
        }
    }).promise();
}
