
const os = require('os');
const fs = require('fs');
const path = require('path');

// console.log(`Current uid : ${process.getuid()}`);
// console.log(`Current euid: ${process.geteuid()}`);

if(process.getuid() != 0) {
	console.error('This program must be run as root user.');
	process.exit(1);
}

if(process.argv.length < 3) {
	//console.log(process.argv[1] + " [path to zmcontrol.pl] user group");
	console.error('Must include path to perl (or updated nodejs version) of zmcontrol.pl');
	process.exit(1);
}

let arch = os.platform + "-" + os.arch();
let targetDir = path.dirname(process.argv[2]);
let targetFile = targetDir + "/zmcontrol.pl";
let sourceFile;

try {
	if(!fs.lstatSync(targetFile).isFile()) {
		console.error('zmcontrol.pl is not a regular file at ' + targetFile);
		process.exit(1);
	}
} catch(e) {
	console.error('zmcontrol.pl does not exist at ' + targetFile);
	process.exit(1);
}

switch(arch) {
	case "linux-x64":
		sourceFile = "./dist/zmcontrol-linux";
		break;
	case "darwin-x64":
		sourceFile = "./dist/zmcontrol-macos";
		break;
	default:
		console.error(arch + " is not supported");
		process.exit(1);
}

try {
	if(!fs.lstatSync(sourceFile).isFile()) {
		console.error(sourceFile + ' is not a regular file');
		process.exit(1);
	}
} catch(e) {
	console.error(sourceFile + ' does not exist');
	process.exit(1);
}

console.log("Copying " + sourceFile + " to " + targetFile);
fs.copyFileSync(sourceFile, targetFile);
console.log("chmod " + targetFile);
fs.chmodSync(targetFile, 0o755);
console.log("chown " + targetFile);
fs.chownSync(targetFile,0,0);

console.log("Installation complete.");
