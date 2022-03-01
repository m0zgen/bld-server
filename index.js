// Globals
// ---------------------------------------------------\
const fs = require('fs');
const path = require('path')
const https = require('https');

// As sh or shell
const sh = require('shelljs')
require('shelljs/global');
const express = require("express")
// Load config

require('dotenv-flow').config();
const yaml_config = require('node-yaml-config');
// Load external functions
const helper = require("./modules/helper")
const {checkFolder, getDateTime, clearFile} = require("./modules/helper");

// Config vars init
// ---------------------------------------------------\
console.log(`ENV: ${process.env.CONFIG}`)

const envpath = path.join(__dirname, ".env")

function getConfig() {
    let config;
    if (!fs.existsSync(envpath)) {
        console.log('ERROR. .ENV file does not exist in server catalog, loading default config.yml.')
        return config = yaml_config.load(__dirname + '/config/config.yml');
        // return config
    } else {
        console.log('OK. .ENV file exist in server catalog.')
        return config = yaml_config.load(__dirname + process.env.CONFIG);
        // return config
    }
}

const config = getConfig()
const bl_list = config.lists.bl;
const wl_list = config.lists.wl;

const download_dir = `./${config.download_dir}`;
const public_dir = `${config.public_dir}`
const min = config.server.update_interval;
const waitTime = min * 60 * 1000; // = minutes
// Web server
const PORT = process.env.PORT || config.server.port
const app = express()

// Actions
// ---------------------------------------------------\
const downloadFile = (url, dir) => {

    return new Promise((resolve, reject) => {
        const splitUrl = url.split('/')
        const filename = splitUrl[splitUrl.length - 1]
        const outputPath = `${dir}/${filename}`
        const file = fs.createWriteStream(outputPath)
        const type = dir.split('/')
        const publicFile = type[type.length - 1]

        https.get(url, res => {
            if (res.statusCode === 200) {
                res.pipe(file).on('close', resolve)
            } else {
                reject(res.statusCode)
            }
        })
    })

}

let downloadedFiles = 0
function getList(list, dir) {
    checkFolder(dir)
    clearFile(`${dir}/tmp.txt`)

    let type = dir.split('/')
    let publicFile = type[type.length - 1]
    clearFile(`${public_dir}/${publicFile}.txt`)

    list.forEach( async (url, index) => {
        await downloadFile(url, dir)

        let splitUrl = url.split('/')
        let filename = splitUrl[splitUrl.length - 1]
        let downloadedFile = `${dir}/${filename}`
        let type = dir.split('/')
        let publicFile = type[type.length - 1]

        sh.exec(`sed -i '' '/#/d' ${downloadedFile}`)
        sh.exec(`sed -i '' '/^$/d'  ${downloadedFile}`);
        sh.exec(`sed -i '' -e "s/0.0.0.[[:digit:]]\\ //g" -e "s/.0.0\\ //g" -e "s/0.01\\ //g" ${downloadedFile}`)
        // sh.exec(`sed -i '' -e 's/^[ \\t]*//' -e "s/127.0.0.1\\ //g" -e "s/127.0.0.1\\        //g" -e "s/127.0.0.1\\        //g" ${downloadedFile}`)

        sh.exec(`cat ${downloadedFile} >> ${dir}/tmp.txt`)
        sh.exec(`sort -u ${dir}/tmp.txt -o ${public_dir}/${publicFile}.txt`)

        downloadedFiles++
        console.log(`${downloadedFiles} downloaded`)
    })
}

// Download urls
function download() {
    getList(wl_list, `${download_dir}/wl`)
    getList(bl_list, `${download_dir}/bl`)
    console.log(`Run timer: ${min} min (${getDateTime()})`)
}

function run_updater() {
    download()
};

function always_run() {
    setInterval(run_updater, waitTime);

};

// Go
// ---------------------------------------------------\
helper.checkFolder(download_dir)
helper.checkFolder(public_dir)

// First downloads
download()
// Fetch lists from interval
always_run();

// Server
// ---------------------------------------------------\

app.set("view engine", "pug");

app.use(express.static('public'));

app.get('/', function(req, res) {

    var time = getDateTime();

    var wl_count = sh.exec(`cat ${public_dir}/wl.txt | wc -l`)
    var bl_count = sh.exec(`cat ${public_dir}/bl.txt | wc -l`)

    res.render("index", {
        title: "BLD Server",
        message: "BLD Server is UP!",
        time: time,
        bl_count: bl_count,
        wl_count: wl_count
    });

});

app.listen(PORT, function () {
    console.log(`BLD Server server listening on port ${PORT}`)
})
