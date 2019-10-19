const fs = require('fs');
const ini = require('ini');
const glob = require('glob');

const ZM_CONFIG = "/etc/zm/zm.conf"; // Path to the ZoneMinder config file
const ZM_CONFIG_SUBDIR = "/etc/zm/conf.d"; // Path to the ZoneMinder config subfolder

var config = processConfigFile(ZM_CONFIG, config);

config.COS_SOCKET = "/var/run/oncam/oncam.sock";
config.DRIVER_DIR = __dirname + "/drivers";
// This should be -5 for production so no
// console logging interferes with php exec()
// see log.ts for values
config.CONSOLE_LOG_LEVEL = -5; 
// Time until zmcontrol server will shut down due to inactivity
config.SERVER_SHUTDOWN_TIME = 3 * 60 * 1000;

if(fs.lstatSync(ZM_CONFIG_SUBDIR).isDirectory()) {
    let files = glob.sync(ZM_CONFIG_SUBDIR +  "/*.conf");
    files.forEach((file)=>{
        let c = processConfigFile(file, config);
        config = Object.assign(config, c);
    });
}

// https://www.npmjs.com/package/ini
function processConfigFile(fName) {
    let c = ini.parse(fs.readFileSync(fName, 'utf-8'));
    return c;
}

//console.log(config);
module.exports = config;