'use strict';

const fetch = require('node-fetch');
const {saveFile} = require("../common/aws-s3");

module.exports.importCovid19Data = async (event, context, callback) => {
    const response = await fetchData();
    if (response.ok) {
        const buffer = await response.buffer();
        const bucket = process.env.BUCKET;
        const filename = 'covid19-data.json';
        const putObjectOutput = await saveFile(bucket, filename, buffer);
        console.log(`new created file ETag: ${putObjectOutput.ETag}`);
        console.log('the file is uploaded successfully');
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
