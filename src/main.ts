//const why = require('why-is-node-running');
const args = require('yargs').argv;
const config = require("./config");
import fs from 'fs';
import log from './log';
import net from 'net';
import { processFork, detach} from './fork';
// const fork = require('./fork').processFork;
const db = require('./db').default;

function usage(msg:string) {
	console.log(`${msg}
Usage:
     zmcontrol.pl --id {monitor_id} --command={command} [various options]

Options:
     --autostop          - Time in seconds to stop p/t/z
     --xcoord [ arg ]    - X-coord
     --ycoord [ arg ]    - Y-coord
     --speed [ arg ]     - Speed
     --step [ arg ]      -
     --panspeed [ arg ]  -
     --panstep [ arg ]   -
     --tiltspeed [ arg ] -
     --tiltstep [ arg ]  -
     --preset [ arg ]    -
`);
}

async function client(sockFile:string,cb:{():void}) {
	var msg = JSON.stringify(args);
	let sock = net.createConnection(sockFile, ()=> {
		log.debug("client: connected to server");
		log.info("client: sending: ", msg);
		sock.write(msg);
		if(cb) cb();
	});
}

async function main() {
	await log.initialize(config.CONSOLE_LOG_LEVEL);

	if(typeof args.id != "number" || args.id <=0 || typeof args.command != "string") {
		usage("Please give a valid monitor id and command");
		log.fatal("Please give a valid monitor id and command");
		db.close();
		process.exit(1);
	}

	let sockFile = config.ZM_PATH_SOCKS + '/zmcontrol-'+args.id+'.sock';

	try {
		// log.Debug("Checking for socket server at " + sockFile);
		var stat = fs.statSync(sockFile);
		if(stat.isSocket()) {
			log.debug("client: starting");
			client(sockFile,()=>{
				db.close();
				process.exit(0);
			});
			return;
		} else {
			log.error("client: " + sockFile + " is not a valid unix socket file");
			process.exit(1);
		}
	} catch(e) {
		
	}
	// After here is starting up the server

	// When using PKG, // might need to change the processFork path
	log.debug("client: Current path is " + process.cwd());
	
	// start the server
	log.debug("client: launching server on " + sockFile + " process " + process.pid + " from " + __dirname);

	let server = processFork(__dirname + '/server.js',["--id",args.id],false);

	server.on('message', (data) => {
		log.debug("client: received server startup message: " + data);
		detach(server);

		// connect as a client and send commandline args
		client(sockFile,()=> {
			log.debug("client: sent message... exiting");
			db.close();
			process.exit(0);
		});
	}).on('exit', (code,signal) => {
		if(code)
			log.error("ERROR: server did not start. Check stderr");
		server.removeAllListeners('message');
		detach(server);
		db.close();
		process.exit(code?code:0);
	});
	
}

main();
