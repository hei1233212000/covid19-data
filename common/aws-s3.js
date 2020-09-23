'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

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
