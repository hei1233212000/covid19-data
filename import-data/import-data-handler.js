'use strict';

const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const dateFormat = require('dateformat');

const s3 = new AWS.S3();
const MAX_FILES_ALLOWED = process.env.MAX_FILES_ALLOWED;

module.exports.importCovid19Data = async (event, context, callback) => {
    const response = await fetchData();
    if (response.ok) {
        const buffer = await response.buffer();
        const bucket = process.env.BUCKET;
        const putObjectOutput = await saveFile(bucket, buffer);
        console.log(`new created file: ${putObjectOutput.ETag}`);
        console.log('the file is uploaded successfully');
        console.log('going to check if there is any file needed to be deleted...')
        const listObjectsOutput = await listFiles(bucket);
        // oldest file at head
        const fileInfo = listObjectsOutput.Contents.sort((a, b) => (a.LastModified > b.LastModified) ? 1 : -11);
        const fileCount = fileInfo.length;
        console.log(`${fileCount} files found`)
        if (fileCount > MAX_FILES_ALLOWED) {
            const numberOfFilesToDelete = fileCount - MAX_FILES_ALLOWED;
            console.log(`there are ${fileCount} files which is more than the limit[${MAX_FILES_ALLOWED}] that we would need to delete ${numberOfFilesToDelete} files`)
            const objectKeysNeededToBeDeleted = fileInfo.slice(0, numberOfFilesToDelete).map(f => f.Key);
            console.log(`files to be deleted: [${objectKeysNeededToBeDeleted}]`);

            const deleteObjectsOutput = await deleteFiles(objectKeysNeededToBeDeleted, bucket);
            console.log(`${deleteObjectsOutput.Deleted.length} files are deleted`)
        } else {
            console.log(`there are just ${fileCount} files, we would not delete any file`);
        }
        console.log('data import is done')
    } else {
        throw new Error(`Failed to fetch ${response.url}: ${response.status} ${response.statusText}`);
    }
};

const fetchData = async () => {
    const url = process.env.DATA_URL;
    const opts = {
        headers: {
            'Origin': 'null',
            'Accept': 'application/json'
        }
    }

    console.log(`going to fetch the data from [${url}]...`)
    return await fetch(url, opts);
}

const generateFileName = () => {
    const localNow = new Date();
    const utcNow = new Date(localNow.getTime() + localNow.getTimezoneOffset() * 60000);
    const filenameSuffix = dateFormat(utcNow, 'yyyy-mmm-dd-HH-MM-ss');
    return `data-${filenameSuffix}.json`;
}

const saveFile = async (bucket, buffer) => {
    const filename = generateFileName();
    console.log(`going to save file[${filename}] to S3 bucket[${bucket}]...`);
    return s3.putObject({
        Bucket: bucket,
        Key: filename,
        Body: buffer,
    }).promise();
}

const listFiles = async (bucket) => {
    return s3.listObjectsV2({Bucket: bucket}).promise();
}

const deleteFiles = async (objectKeysNeededToBeDeleted, bucket) => {
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
