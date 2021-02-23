'use strict';

const fs = require('fs');
const csv = require('csv-parser');
const ObjectsToCsv  = require('objects-to-csv');
const results = [];


let files = fs.readdirSync('output');

function processFiles()
{
    if(files.length < 1)
    {
        const csv = new ObjectsToCsv(results);
        csv.toDisk('final.csv');
        console.log(results);
        return;
    }

    let file = `output/${files[0]}`
    files.shift();
    fs.createReadStream(file)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            processFiles();
        });
}

processFiles();
