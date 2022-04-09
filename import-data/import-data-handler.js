'use strict';

const fetch = require('node-fetch');
const zlib = require('zlib');
const {saveJsonGzipToS3} = require("../common/aws-s3");

const DATA_FILE_NAME = process.env.DATA_FILE_NAME;

module.exports.importCovid19Data = async (event, context, callback) => {
    console.log(`process.env: ${process.env}`)

    const covid19Data = await fetchCovid19Data()
    const vaccinationData = await fetchVaccinationData()
    const data = {
        covid19Data: covid19Data,
        vaccinationData: vaccinationData
    }
    const buffer = Buffer.from(JSON.stringify(data), "utf-8");
    const gzippedBuffer = zlib.gzipSync(buffer)
    const bucket = process.env.BUCKET;
    const putObjectOutput = await saveJsonGzipToS3(bucket, DATA_FILE_NAME, gzippedBuffer);
    console.log(`new created file ETag: ${putObjectOutput.ETag}`);
    console.log('the file is uploaded successfully');
};

const fetchCovid19Data = async () => {
    return await fetchDataAndConvertIntoJson(process.env.COVID19_DATA_URL, convertToCovid19Data)
}

const fetchVaccinationData = async () => {
    return await fetchDataAndConvertIntoJson(process.env.VACCiNATION_DATA_URL, convertToVaccinationData)
}

const fetchDataAndConvertIntoJson = async (url, convertFunction) => {
    const response = await fetchData(url)
    if (response.ok) {
        const content = await response.text();
        const lines = content.split('\n')
            .filter(l => l);
        const headerLines = lines.shift()
            .split(',')
            .map(l => l.trim());
        return convertFunction(headerLines, lines);
    } else {
        throw new Error(`Failed to fetch ${response.url}: ${response.status} ${response.statusText}`);
    }
}

const fetchData = async (url) => {
    const opts = {
        headers: {
            'Origin': 'null'
        }
    }

    console.log(`going to fetch the data from [${url}]...`)
    return await fetch(url, opts);
}

const convertToCovid19Data = (headerLines, contentLines) => {
    const dateIndex = headerLines.indexOf('Date_reported')
    const countryCodeIndex = headerLines.indexOf('Country_code')
    const regionIndex = headerLines.indexOf('WHO_region')
    const newCasesIndex = headerLines.indexOf('New_cases')
    const cumulativeCasesIndex = headerLines.indexOf('Cumulative_cases')
    const newDeathsIndex = headerLines.indexOf('New_deaths')
    const cumulativeDeathsIndex = headerLines.indexOf('Cumulative_deaths')
    const data = contentLines.map(line => {
        const tokens = line.split(',');
        return [
            getStringValue(tokens, regionIndex),
            getStringValue(tokens, countryCodeIndex),
            new Date(getStringValue(tokens, dateIndex)).getTime(),
            getIntegerValue(tokens, newDeathsIndex),
            getIntegerValue(tokens, cumulativeDeathsIndex),
            getIntegerValue(tokens, newCasesIndex),
            getIntegerValue(tokens, cumulativeCasesIndex)
        ]
    })

    return {
        headers: ['region', 'countryCode', 'timestampInMs', 'newDeaths', 'cumulativeDeaths', 'newCases', 'cumulativeCases'],
        data: data
    }
}

const convertToVaccinationData = (headerLines, contentLines) => {
    const regionIndex = headerLines.indexOf('WHO_REGION')
    const countryCodeIndex = headerLines.indexOf('ISO3')
    const totalVaccinationsIndex = headerLines.indexOf('TOTAL_VACCINATIONS')
    const personsVaccinatedOnePlusDoseIndex = headerLines.indexOf('PERSONS_VACCINATED_1PLUS_DOSE')
    const personsFullyVaccinatedIndex = headerLines.indexOf('PERSONS_FULLY_VACCINATED')
    const totalVaccinationsPerHundredIndex = headerLines.indexOf('TOTAL_VACCINATIONS_PER100')
    const personsVaccinatedOnePlusDosePerHundredIndex = headerLines.indexOf('PERSONS_VACCINATED_1PLUS_DOSE_PER100')
    const personsFullyVaccinatedPerHundredIndex = headerLines.indexOf('PERSONS_FULLY_VACCINATED_PER100')
    const data = contentLines.map(line => {
        const tokens = line.split(',');
        return [
            getStringValue(tokens, regionIndex),
            getStringValue(tokens, countryCodeIndex),
            getIntegerValue(tokens, totalVaccinationsIndex),
            getIntegerValue(tokens, personsVaccinatedOnePlusDoseIndex),
            getIntegerValue(tokens, personsFullyVaccinatedIndex),
            getFloatValue(tokens, totalVaccinationsPerHundredIndex),
            getFloatValue(tokens, personsVaccinatedOnePlusDosePerHundredIndex),
            getFloatValue(tokens, personsFullyVaccinatedPerHundredIndex)
        ]
    })
    return {
        headers: ['region', 'countryCode', 'totalVaccinations', 'personsVaccinatedOnePlusDose', 'personsFullyVaccinated', 'totalVaccinationsPerHundred', 'personsVaccinatedOnePlusDosePerHundred', 'personsFullyVaccinatedPerHundred'],
        data: data
    }
}

const getStringValue = (array, index) => array[index].trim()
const getIntegerValue = (array, index) => parseInt(getStringValue(array, index), 10)
const getFloatValue = (array, index) => parseFloat(getStringValue(array, index))
