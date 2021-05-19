'use strict';

const fetch = require('node-fetch');
const dateFormat = require('dateformat');
const {saveFile} = require("../common/aws-s3");
const {deleteObjects} = require("../common/aws-s3");
const {allObjectKeys} = require("../common/aws-s3");

const MAX_FILES_ALLOWED = process.env.MAX_FILES_ALLOWED;

module.exports.importCovid19Data = async (event, context, callback) => {
    const response = await fetchData();
    if (response.ok) {
        const buffer = await response.buffer();
        const bucket = process.env.BUCKET;
        const filename = generateFileName();
        const putObjectOutput = await saveFile(bucket, filename, buffer);
        console.log(`new created file ETag: ${putObjectOutput.ETag}`);
        console.log('the file is uploaded successfully');
        console.log('going to check if there is any file needed to be deleted...')
        const objectKeys = await allObjectKeys(bucket);
        const fileCount = objectKeys.length;
        console.log(`${fileCount} files found`)
        if (fileCount > MAX_FILES_ALLOWED) {
            const numberOfFilesToDelete = fileCount - MAX_FILES_ALLOWED;
            console.log(`there are ${fileCount} files which is more than the limit[${MAX_FILES_ALLOWED}] that we would need to delete ${numberOfFilesToDelete} files`)
            const objectKeysNeededToBeDeleted = objectKeys.slice(0, numberOfFilesToDelete);
            console.log(`files to be deleted: [${objectKeysNeededToBeDeleted}]`);

            const deleteObjectsOutput = await deleteObjects(objectKeysNeededToBeDeleted, bucket);
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
