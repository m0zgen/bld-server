const fs = require('fs');
const sh = require('shelljs')
var dateTime = require('node-datetime');
const yaml_config = require("node-yaml-config");

function checkFolder(folder) {
    !fs.existsSync(`./${folder}/`) && fs.mkdirSync(`./${folder}/`, { recursive: true })
}

function clearFile(file) {
    fs.truncate(file, 0, function(){console.log(`Truncate ${file} done`)})
}

function appendFile(file, appendFile) {
    fs.readFile(appendFile, function (err, data) {
        if (err) {
            console.error(err)
            return
        }
        // console.log(data)

        fs.appendFile(file, data, (err) => {
            if (err) throw err;
            console.log(`Data to file ${file} is appended!`)
        })
    })
}

// http://sstut.com/javascript/convert-hours-minutes-seconds-to-milliseconds.php
function msToHMS( ms ) {
    var seconds = ms / 1000;
    var hours = parseInt( seconds / 3600 ); // 3,600 seconds in 1 hour
    seconds = seconds % 3600; // seconds remaining after extracting hours
    var minutes = parseInt( seconds / 60 ); // 60 seconds in 1 minute
    seconds = seconds % 60;
    console.log( hours+" hours and "+minutes+" minutes and "+seconds+" seconds!" );
    return minutes
}

function getDateTime() {
    var dt = dateTime.create();
    var formatted = dt.format('Y-m-d H:M:S');
    return formatted
}

// function

module.exports = {
    checkFolder,
    clearFile,
    appendFile,
    msToHMS,
    getDateTime,
}