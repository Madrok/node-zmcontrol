/**
 * All drivers need to export a class named "driver"
 * 
 * This is the onvif driver that connects to 
 */
import net from 'net';
import config from '../config';
import log from '../log';
import { ControlledCameraDriver } from '../ControlledCameraDriver';
import { IControlCommand } from '../IControlCommand';

export class driver extends ControlledCameraDriver {
	sock: net.Socket|null;
	reconnectCount : number;
	reconnecting: boolean;
	reconnectTimer: any;
	moveTimer: NodeJS.Timeout|null;

	constructor(camUrl:URL,dbEntry:any) {
		super(camUrl,dbEntry);
		this.sock = null;
		this.reconnectCount = 0;
		this.reconnecting = false;
		this.reconnectTimer = null;
		this.moveTimer = null;
		log.debug("onvif: created for " + this.camUrl.host);
	}

	open():Promise<any> {
		let onConnect = () => {
			log.info("onvif: connected to cam server");
			if(this.reconnectTimer)
				clearTimeout(this.reconnectTimer);
			this.reconnectCount = 0;
			this.reconnecting = false;
			this.send({
				method: "connect",
				params: {
					user: this.camUrl.username,
					pass: this.camUrl.password
				}
			});
		}

		return new Promise((resolve,reject)=> {
			if(this.sock) {
				log.debug("onvif: connect()");
				this.sock.connect(config.COS_SOCKET);
			}
			else {
				log.debug("onvif: open()");
				this.sock = net.createConnection(config.COS_SOCKET, onConnect)
				.on('error', (err:any) => {
					if(err.code == 'ENOENT')
						log.error("onvif: network onvif server not running on " + config.COS_SOCKET);
					else
						log.error("onvif: got error on network onvif server: " + err.message);
				}).on('end', () => {
					log.warn('onvif: network onvif server disconnected');
				}).on('close', (hadError:boolean) => {
					log.warn(`onvif: network onvif server closed: ${hadError}`);
					//this.reconnect();
					throw new Error('onvif: unable to connect');
				});
				this.sock.on('data', (data) => this.networkOnvifLoginHandler(data,resolve,reject));
			}
		});
	}

	decodeMessage(data:Buffer|string) : any | null {
		let msg;
		try {
			if(typeof(data) != 'string')
				data = data.toString();
			data = data.trim();
			msg = JSON.parse(data);
		} catch(e) {
			log.error("onvif: unparsable message received: " + data);
			return null;
		}
		return msg;
	}

	networkOnvifLoginHandler(data:Buffer|string,resolve?:()=>void,reject?:(err:Error)=>void) {
		let msg: any = this.decodeMessage(data);
		if(msg.id != 'connect') {
			if(reject) {
				reject(new Error('onvif: did not receive connect response'));
			}
			throw new Error('onvif: unexpected msg.id ' + msg.id + ' while logging in to camera');
		}
		if(msg.error) {
			var e = new Error('onvif: unable to login to camera: ' + msg.error);
			if(reject) 
				return reject(e);
			throw(e); 
		}
		if(this.sock) {
			this.sock.removeAllListeners('data');
			this.sock.on('data', (data) => this.networkOnvifDataHandler(data));
		}
		return (resolve) ? resolve():null;
	}

	networkOnvifDataHandler(data:Buffer|string) {
		log.debug("onvif: data received: " + data.toString().trim());
		let msg: any = this.decodeMessage(data);
		
		if(msg.error) {
			log.error('onvif: CamServer error: cmd ' + msg.id + " error: " + msg.error);
			return;
		}
		log.debug("onvif: received " + JSON.stringify(msg));
	}

	reconnect() {
		if(!this.reconnecting) {
			this.reconnecting = true;
			this.reconnectCount = 0;
			let f = () => {
				if(this.reconnectCount++ > 10)
					throw new Error('onvif: unable to reconnect');
				log.info('onvif: reconnecting');
				this.open();
				this.reconnectTimer = setTimeout(f, 3000);
			}
			this.reconnectTimer = setTimeout(f, 3000);
		}
	}

	close():void {
		if(this.sock)
			this.sock.destroy();
	}

	send(msg:any) {
		if(!this.sock) {
			log.error('onvif: socket not connected');
			return;
		}
		if(this.sock.destroyed) {
			log.error('onvif: socket is destroyed');
			return;
		}
		if(this.sock.connecting) {
			log.error('onvif: socket is still connecting');
			return;
		}
		if(!msg.params)
			msg.params = {};
		msg.params.address = this.camUrl.host;
		log.debug("onvif: sending",JSON.stringify(msg));
		if(this.sock)
			this.sock.write(JSON.stringify(msg));
	}

	/**
	 * 
	 * @param pan Speed of pan (in the range of -1.0 to 1.0)
	 * @param tilt Speed of tilt (in the range of -1.0 to 1.0)
	 * @param zoom Speed of zoom (in the range of -1.0 to 1.0)
	 * @param timeout in seconds
	 */
	sendMove(pan:number,tilt:number,zoom:number,timeout:number=0) {
		if(this.moveTimer) {
			clearTimeout(this.moveTimer);
		}
		this.send({ 
			method: 'ptzMove', 
			params: {
				speed: {
					x:pan, y:tilt, z:zoom // pan, tilt, zoom
				},
				//timeout: timeout,
			}
		});
		if(typeof timeout=='number' && timeout>0) {
			this.moveTimer = setTimeout(()=>this.moveStop(), Math.floor(timeout*1000));
		}
	}

	sendPtzHome() {
		if(this.moveTimer) {
			clearTimeout(this.moveTimer);
		}
		this.send({ 
			method: 'ptzHome', 
			params: {
				speed: 1.0,
			}
		});
	}

	sendPtzSetHome() {
		
	}

	// moveConUp(autoStopSec:number=0):void { this.sendMove(0,1,0,autoStopSec); }
	// moveConDown(autoStopSec:number=0):void { this.sendMove(0,-1,0,autoStopSec); }
	moveStop():void { this.send({ method: 'ptzStop' }); }

	scaleMove(msg:IControlCommand) {
		let rv = {
			pan: msg.panspeed?msg.panspeed:(msg.speed?msg.speed:100),
			tilt:msg.tiltspeed?msg.tiltspeed:(msg.speed?msg.speed:100),
			zoom:msg.zoomspeed?msg.zoomspeed:(msg.speed?msg.speed:100),
		}
		if(!this.dbEntry) {
			if(Math.abs(rv.pan) > 1) rv.pan /= 100;
			if(Math.abs(rv.tilt) > 100) rv.tilt /= 100;
			if(Math.abs(rv.zoom) > 100) rv.zoom /= 100;
			return rv;
		}
		//log.Debug('onvif: incoming speeds are',rv);
		//log.Debug(msg);
		let f = (name:string, value:number) => {
			let typeSpeed = name+'Speed';
			if(this.dbEntry['Has'+ typeSpeed]) {
				let min = this.dbEntry['Min'+typeSpeed];
				let max = this.dbEntry['Max'+typeSpeed];
				return value/(max-min);
			} else {
				return value;
			}
		}
		rv.pan = f("Pan", rv.pan);
		rv.tilt = f("Tilt", rv.tilt);
		rv.zoom = f("Zoom", rv.zoom);
		return rv;
	}

	unknownCommand(msg:IControlCommand, txt?:string) {
		if(!txt) txt = "";
		else txt = " " + txt;
		log.error("onvif: unknown command " + msg.command + txt, msg);
	}
	badCommand(msg:IControlCommand, txt?:string) {
		log.error("onvif: bad command" + txt, msg);
	}

	commandHandler(msg:IControlCommand) {
		if(!msg.command) throw new Error('onvif: no command field');
		if(msg.command == 'reset') {
			this.send({ method: 'reboot' });
		}
		else if(msg.command == 'moveStop') {
			this.send({ method: 'ptzStop' });
		} // end moveStop
		else if(msg.command.substr(0,7) == 'moveCon') {
			let dir = msg.command.substr(7);
			let speeds = this.scaleMove(msg);
			log.debug('onvif: move direction is ' + dir + " speeds are ",speeds);
			switch(dir) {
				case 'Up':
					this.sendMove(0,speeds.tilt,0,msg.autostop);
					break;
				case 'UpRight':
					this.sendMove(speeds.pan,speeds.tilt,0,msg.autostop);
					break;
				case 'Right':
					this.sendMove(speeds.pan,0,0,msg.autostop);
					break;
				case 'DownRight':
					this.sendMove(speeds.pan,-speeds.tilt,0,msg.autostop);
					break;
				case 'Down':
					this.sendMove(0,-speeds.tilt,0,msg.autostop);
					break;
				case 'DownLeft':
					this.sendMove(-speeds.pan,-speeds.tilt,0,msg.autostop);
					break;
				case 'Left':
					this.sendMove(-speeds.pan,0,0,msg.autostop);
					break;
				case 'UpLeft':
					this.sendMove(-speeds.pan,speeds.tilt,0,msg.autostop);
					break;
				default:
					this.unknownCommand(msg);
			}
		} // end moveCon
		else if(msg.command.substr(0,7) == "zoomCon") {
			let cmd = msg.command.substr(7);
			let speeds = this.scaleMove(msg);
			switch(cmd) {
				case "Wide":
					this.sendMove(0,0,-speeds.zoom,msg.autostop);
					break;
				case "Tele":
					this.sendMove(0,0,speeds.zoom,msg.autostop);
					break;
				default:
					this.unknownCommand(msg);
			}
		} // end zoomCon
		else if(msg.command == 'focusStop') {
			//this.send({ method: 'ptzStop' });
			return;
		} // end focusStop
		else if(msg.command.substr(0,8) == "focusCon") {
			let cmd = msg.command.substr(8);
			switch(cmd) {
				case "Near":
				case "Far":
				default:
					this.unknownCommand(msg);
			}
		}
		else if(msg.command.substr(0,6) == "preset") {
			let cmd = msg.command.substr(6);
			let v;
			switch(cmd) {
				case "Set":
					v = Number(msg.preset);
					if(isNaN(v)) {
						this.badCommand(msg,"msg.preset is not a number " + String(msg.preset));
					} else {
						this.send({ 
							method: 'setPreset', 
							params: {
								PresetName: String(v),
							}
						});
					}
					break;
				case "Goto":
					v = Number(msg.preset);
					if(isNaN(v)) {
						this.badCommand(msg,"msg.preset is not a number " + String(msg.preset));
					} else {
						this.send({ 
							method: 'gotoPreset', 
							params: {
								PresetToken: String(v),
							}
						});
					}
					break;
				case "Home":
						this.send({ 
							method: 'gotoHome', 
							params: {
							}
						});
						break;
				default:
					this.unknownCommand(msg,"from preset");
			}
		} // end preset
		else {
			this.unknownCommand(msg,"at end");
		}
	} 

}

// this.send({ 
// 	method: 'setHome', 
// 	params: {
// 		speed: 1.0,
// 	}
// });