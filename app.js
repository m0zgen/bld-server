// Globals
// ---------------------------------------------------\
const os = require("os");
const fs = require('fs');
const path = require('path')
const cluster = require("cluster");

const express = require("express")
const replacer = require('replace-in-file')

// URL Parser and HTTP detector
const urlParser = require('url');
const supportedLibraries = {
    "http:": require('http'),
    "https:": require('https')
};

// As sh or shell
const sh = require('shelljs')
require('shelljs/global');

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
const bl_list_plain = config.lists.bl_plain;
const wl_list = config.lists.wl;
const wl_list_plain = config.lists.wl_plain;

const download_dir = `./${config.download_dir}`;
const public_dir = `${config.public_dir}`
const min = config.server.update_interval;
const waitTime = min * 60 * 1000; // = minutes

// Web server and system
const clusterWorkerSize = os.cpus().length;
const PORT = process.env.PORT || config.server.port
const app = express()

// Colors
const colorRed='\x1b[31m%s\x1b[0m'
const colorGreen='\x1b[32m%s\x1b[0m'
const colorYellow='\x1b[33m%s\x1b[0m'
const colorBlue='\x1b[34m%s\x1b[0m'
const colorMagents='\x1b[35m%s\x1b[0m'
const colorCyan='\x1b[36m%s\x1b[0m'

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

        // Automatically detect input protocol
        var parsed = urlParser.parse(url);
        var lib = supportedLibraries[parsed.protocol || "http:"];

        if (lib) {
            lib.get(url, function (response) {
                if (response.statusCode === 200) {
                    response.pipe(file).on('close', resolve)
                } else {
                    reject(response.statusCode)
                }
            });
        } else {
            console.log(`ERROR loG`)
        }

        // https.get(url, res => {
        //     if (res.statusCode === 200) {
        //         res.pipe(file).on('close', resolve)
        //     } else {
        //         reject(res.statusCode)
        //     }
        // })
    }).catch(error => {
        console.log(colorRed, `Can't download file from ${url} please check this url`)
    })

}

// Clear file content
function runReplacer(file, plain, target) {
    const options = {
        files: file,
        from: [
            /(^(^127.0.0.1. |^0.0.0.\d.|^# 0.0.0.\d.|^# 127.0.0.\d|^ |^255.255.255.255.*$))/gim,
            /^\s/g,
            /^$/gm,
            / #[a-aA-Z].*$/gm,
            /.*:.*$/gm,
            /^[!@#\\$%\\^\\&*\\\s\\)\\(+=._-].+$/gm,
            /^[!@#\$%\^\&*\)\(+=._-].+$/gm,
            /.*#$/gm,
            /(^[ \t]*\n)/gm,
            /[!@#$%^&*()_+\=\[\]{};':"\\|,<>\/?].+$/gm,
            /(^[a-z]$|^[a-z][a-z]$|^[a-z][a-z][a-z]$)/gm,
            /^.*(\.$|-$|-\.$)/gm
        ],
        to: '',
    };

    const plain_options = {
        files: file,
        from: [
            / #[a-aA-Z].*$/gm,
            /^#.*$/gm
        ],
        to: '',
    };

    try {
        if (!plain) {
            const results = replacer.sync(options);
            console.log('Replacement results:', results);
        } else {
            const results = replacer.sync(plain_options);
            console.log('Replacement results:', results);
        }
    }
    catch (error) {
        console.error('Error occurred:', error);
    }
}

function copy(from, to, _prefix) {
    fs.copyFile(from, `${to}${_prefix}`, (err) => {
        if (err){
            console.log(`Can't copy file from ${from} to ${to}${_prefix}`)
        }
    })
}

function sort() {
    return new Promise((resolve, reject) => {
        sh.exec(`sort -u ${download_dir}/wl/tmp.txt -o ${public_dir}/wl.txt`)
        sh.exec(`sort -u ${download_dir}/bl/tmp.txt -o ${public_dir}/bl.txt`)
        resolve(`Files is published!`)
    })
}

let downloadedFiles = 0
function getList(list, dir, plain) {
    checkFolder(dir)
    clearFile(`${dir}/tmp.txt`)

    let type = dir.split('/')
    let publicFile = type[type.length - 1]
    // clearFile(`${public_dir}/${publicFile}.txt`)

    list.forEach( async (url, index) => {
        await downloadFile(url, dir)

        let splitUrl = url.split('/')
        let filename = splitUrl[splitUrl.length - 1]
        let downloadedFile = `${dir}/${filename}`
        let type = dir.split('/')
        let publicFile = type[type.length - 1]

        if (fs.existsSync(`${downloadedFile}_prev`)) {
            var {size: prevSize} = fs.statSync(`${downloadedFile}_prev`);
            var {size: nowSize} = fs.statSync(downloadedFile);
            console.log(colorBlue, `File ${downloadedFile}_prev 1: ${prevSize} and File ${downloadedFile} 2: ${nowSize}`)
        } else {
            // Move existing file for comparing in future
            copy(downloadedFile, downloadedFile, '_prev')
            // if (!plain){
                runReplacer(downloadedFile, plain)
            // }
            copy(downloadedFile, downloadedFile, '_sorted')
        }

        if (prevSize === nowSize) {
            console.log(colorGreen, `Files is the same`)

        } else {
            console.log(colorYellow, `Files is different, run replacer...`)
            // Move existing file for comparing in future
            copy(downloadedFile, downloadedFile, '_prev')
            // if (!plain){
                runReplacer(downloadedFile, plain)
            // }
            copy(downloadedFile, downloadedFile, '_sorted')
        }

        sh.exec(`echo '\n' >> ${dir}/tmp.txt`)
        sh.exec(`cat ${downloadedFile}_sorted >> ${dir}/tmp.txt`)
        sh.exec(`echo '\n' >> ${dir}/tmp.txt`)

        sh.exec(`sort -u ${dir}/tmp.txt -o ${public_dir}/${publicFile}.txt`)

        downloadedFiles++
        console.log(`${downloadedFiles}. ${downloadedFile} - downloaded (${getDateTime()})\n=====================================`)
    })
}

// Download urls
function download() {
    getList(wl_list, `${download_dir}/wl`, false)
    getList(bl_list, `${download_dir}/bl`, false)
    getList(wl_list_plain, `${download_dir}/wl_plain`, true)
    getList(bl_list_plain, `${download_dir}/bl_plain`, true)
    console.log(`Run timer: ${min} min (${getDateTime()})`)
}

function run_updater() {
    download()
};

function replace() {
    return new Promise((resolve, reject) => {
        runReplacer(`${download_dir}/wl/tmp.txt`)
        runReplacer(`${download_dir}/bl/tmp.txt`)
        resolve(`File files is processed!`)
    })
}

function downloader() {
    return new Promise((resolve, reject) => {
        getList(wl_list, `${download_dir}/wl`, false)
        getList(bl_list, `${download_dir}/bl`, false)
        getList(wl_list_plain, `${download_dir}/wl_plain`, true)
        getList(bl_list_plain, `${download_dir}/bl_plain`, true)
        resolve("Downloader done!")
    })
}

async function updater() {
    console.log(colorRed, `Worker started. Run downloader.`)
    const result = await downloader()
    console.log(colorYellow, 'Promise DOWNLOAD resolved: ' + result)
    console.log(colorCyan, `Next step 2. Run replacer.`)
    const proccess = await replace()
    console.log(colorYellow, 'Promise PROCCESS resolved: ' + proccess)
    console.log(colorCyan, `Next step 3. Run publisher.`)
    const sorted = await sort()
    console.log(colorYellow, 'Promise SORT resolved: ' + sorted)
    console.log(colorMagents, `Run timer: ${min} min (${getDateTime()})`)
    console.log(colorCyan, `Next loop...`)
}

function always_run() {
    // setInterval(run_updater, waitTime);
    setInterval(updater, waitTime);
};

// WEB Server
// ---------------------------------------------------\
app.set("view engine", "pug");
app.use(express.static('public'));
app.get('/', function(req, res) {

    var time = getDateTime();
    var wl_count = sh.exec(`cat ${public_dir}/wl.txt | wc -l`)
    var bl_count = sh.exec(`cat ${public_dir}/bl.txt | wc -l`)

    var bl_plain_count = sh.exec(`cat ${public_dir}/bl_plain.txt | wc -l`)
    var wl_plain_count = sh.exec(`cat ${public_dir}/wl_plain.txt | wc -l`)


    res.render("index", {
        title: "BLD Server",
        message: "BLD Server is UP!",
        time: time,
        bl_count: bl_count,
        wl_count: wl_count,
        bl_plain_count: bl_plain_count,
        wl_plain_count: wl_plain_count
    });

});
const start = async () => {
  try {
      await app.listen(PORT, function () {
          console.log(colorMagents, `BLD Server server listening on port ${PORT}`)
      })
  } catch (err) {
      app.log.error(err)
      process.exit(1)
  }
}

// Go
// ---------------------------------------------------\
helper.checkFolder(download_dir)
helper.checkFolder(`${download_dir}/wl`)
helper.checkFolder(`${download_dir}/bl`)
helper.checkFolder(public_dir)

// First downloads
download()
// Fetch lists from interval
always_run();
// Start web server
start()

// TODO: Multithreading
// if (clusterWorkerSize > 1) {
//     if (cluster.isMaster) {
//         for (let i=0; i < clusterWorkerSize; i++) {
//             cluster.fork();
//         }
//
//         cluster.on("exit", function(worker) {
//             console.log("Worker", worker.id, " has exited.")
//         })
//     } else {
//         start();
//     }
// } else {
//     start();
// }
