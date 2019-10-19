// import { CamCtrlServer } from "./CamCtrlServer";
import log from './log';
import config from "./config";
import process from 'process';

import net from 'net';
import fs from 'fs';
import db from './db';
import { ControlledCameraDriver } from './ControlledCameraDriver';
import { IControlCommand } from './IControlCommand';
const ON_DEATH = require('death')({uncaughtException: true});
var args = require('yargs').argv;

/**
 * A server that listens on a unix  socket for camera commands.
 * Shuts down automatically if no commands have been sent to it 
 * in config.SERVER_SHUTDOWN_TIME
 */
class Server {
	id:number;
	sockFile:string;
	camSql:any; // mysql data
	//var url : URL // for user/pass etc from ControlAddress field in ZM
	driver: ControlledCameraDriver|null;
	url: URL|null;
	shutdownTimer:NodeJS.Timeout|null;

	constructor(id:number, sockFile:string) {
		this.id = id;
		this.sockFile = sockFile;
		this.camSql = null;
		this.driver = null;
		this.url = null;
		this.shutdownTimer = null;
	}

	async start(cb:(v:net.Server)=>void) {
		await log.initialize(config.CONSOLE_LOG_LEVEL);
		log.info("server: process id: " +  process.pid);

		if(typeof args.id != "number" || args.id <=0 ) {
			log.error("server: Please give a valid monitor id");
			this.shutdown(1);
		}

		log.debug("server: sockfile is " + this.sockFile);

		try {
			process.setegid(config.ZM_WEB_GROUP);
		} catch(e) {
			log.fatal("Unable to change to unpriviledged group "+ config.ZM_WEB_GROUP);
			this.shutdown(1);
		}
		try {
			process.setuid(config.ZM_WEB_USER);
		} catch(e) {
			log.fatal("Unable to change to unpriviledged user "+ config.ZM_WEB_USER);
			this.shutdown(1);
		}
		await this.reloadRecord();
		const server = net.createServer(
			(sock) => {
				// 'connection' listener.
				log.debug('server: client connected');
				sock.on('end', () => {
					log.debug('server: client disconnected');
				});
				sock.on('data', (data) => {
					log.debug("server: received:", data.toString().trimRight());
					this.resetShutdownTimer();
					let obj;
					try {
						obj = JSON.parse(data.toString());
						//this.handlePacket(obj);
					} catch(e) {
						log.warn("server: bad data, not json");
						sock.end();
						return;
					}
					try {
						this.handlePacket(obj);
					} catch(e) {
						log.error("server: driver threw error " + e.message);
					}
					sock.end();
				})
			}
		);
		server.on('error', (err) => {
			log.fatal("server: caught error:", err);
			this.shutdown();
		});
		server.on('close', () => {
			this.shutdown();
		});
		server.on('listening', () => {
			// start the shutdown timer
			this.resetShutdownTimer();
			if(typeof cb == 'function')
				cb(server);
		});
		server.listen(this.sockFile, () => {
			log.info('server: bound to ' + this.sockFile);
		});
		
		ON_DEATH((signal:any, err:any) => {
			log.warn("server: caught:",signal,err);
			this.shutdown();
		})
		process.on('SIGHUP', () => {
			log.info("server: SIGHUP");
			if(this.driver) {
				this.driver.close();
				this.driver = null;
			}
			this.reloadRecord();
		});
	}

	resetShutdownTimer() {
		config.SERVER_SHUTDOWN_TIME
		if(this.shutdownTimer) {
			clearTimeout(this.shutdownTimer);
		}
		this.shutdownTimer = setTimeout(()=>{
			log.warn("No activity on server. Shutting down.");
			this.shutdown();
		}, config.SERVER_SHUTDOWN_TIME);
	}

	/*
	requireDir(dir:string, callback:function) {
		var aret = Array();
		fs.readdirSync(dir).forEach(function (library) {
			var isLibrary = library.split(".").length > 0 && library.split(".")[1] === 'js',
			libName = library.split(".")[0].toLowerCase();
			if (isLibrary) {
				aret[libName] = require(path.join(dir, library));
			}
		});
		if(callback) process.nextTick(function() {
			callback(null, aret);
		});
		return aret;
	}
	*/

	async reloadRecord() {
		let c = await db.connect();
		//return;
		//var res = await db.getMonitorAndControl(1);
		log.debug("server: loading camera info for id "+ this.id);
		try {
			var res = await db.getMonitorAndControl(this.id);
			if(res == null) {
				log.info("server: camera " + this.id + " has no control record. Control server needs to terminate.");
				this.shutdown();
				return;
			}
			//log.Debug(res);
			// xxx the drivers need a way to update the camUrl
			this.camSql = res;
			this.url = new URL(this.camSql.ControlAddress);

			//xxx the protocol require is an exploit hole. Fix it with a switch
			//or clean the Protocol field
			// switch(res.Protocol) {
			// 	case "onvif":
					
			// }
			//if(this.driver == null) {
				let cl = require('./drivers/' + res.Protocol + '.js');
				this.driver = new cl.driver(this.url,res);
				if(!this.driver)
					throw new Error('server: unable to open driver ' + res.Protocol);
				await this.driver.open();
			//}
		} catch(e) {
			log.error("server: reload error :",e);
			this.shutdown();
			return;
		}
		db.close();
	}

	handlePacket(obj:IControlCommand) {
		log.debug("server: handling packet ", JSON.stringify(obj).replace(/\s\s+/g, ' '));
		switch(obj.command) {
			case 'quit':
				try {
					if(this.driver)
						this.driver.close();
				} catch(e) {}
				this.shutdown();
				break;
			default:
				if(this.driver)
					this.driver.commandHandler(obj);
		}
	}

	shutdown(errCode:number=0) {
		log.info("server: shutdown");
		try {
			db.close();
		} catch(e) {};
		if(fs.existsSync(this.sockFile)) {
			try {
				fs.unlinkSync(this.sockFile);
			} catch(e) {
				log.error("server: shutdown failed removing " + this.sockFile, e);
			}
		}
		process.exit(errCode);
	}

}

async function main() {
	let sockFile = config.ZM_PATH_SOCKS + '/zmcontrol-'+args.id+'.sock';

	var s = new Server(args.id, sockFile);
	s.start((server) => {
		// logging is initialized by now
		log.debug("server: CamCtrlServer started");

		// send message to main.js that we have forked
		if(process.send)
			process.send("server started");
	});
}

main();