import { resolve } from "url";
import { IControlCommand } from "./IControlCommand";

export interface IControlledCameraDriver {
	camUrl : URL;

	open():Promise<any>;
	close():void;
	commandHandler(msg:IControlCommand):void;

	// moveConUp(autoStopSec:number):void;
	// moveConDown(autoStopSec:number):void;
	// moveConLeft():void;
	// moveConRight():void;
	// moveConUpRight():void;
	// moveConUpLeft():void;
	// moveConDownRight():void;
	// moveConDownLeft():void;
	// moveStop():void;

	// zoomConTele():void;
	// zoomConWide():void;

	// focusConNear():void;
	// focusConFar():void;
	// focusStop():void;

	// presetGoto():void;
	// presetHome():void;
	// presetSet():void;

	/*
	wake():void;
	sleep():void;
	reset():void;
	reboot():void;
	zoomCon():void;
	zoomRel():void;
	zoomAbs():void;
	zoomStop():void;
	zoomAuto():void;
	zoomMan():void;
	focusCon():void;
	focusRel():void;
	focusAbs():void;
	focusStop():void;
	focusAuto():void;
	focusMan():void;
	irisCon():void;
	irisRel():void;
	irisAbs():void;
	irisStop():void;
	irisAuto():void;
	irisMan():void;
	whiteCon():void;
	whiteRel():void;
	whiteAbs():void;
	whiteAuto():void;
	whiteMan():void;
	gainCon():void;
	gainRel():void;
	gainAbs():void;
	gainAuto():void;
	gainMan():void;
	moveCon():void;
	moveStop():void;
	moveRel():void;
	moveAbs():void;
	*/
}

// function unhandled(m:string) {
// 	throw new Error('This camera does not support the function ' + m);
// }

export  class ControlledCameraDriver implements IControlledCameraDriver {
	camUrl : URL;
	dbEntry : any;
	constructor(camUrl:URL, dbEntry:any) {
		this.camUrl = camUrl;
		this.dbEntry = dbEntry;
	}

	open():Promise<any> { return new Promise((resolve) => { resolve();})}
	close():void {}
	commandHandler(msg:IControlCommand):void {}


	// moveConUp(autoStopSec:number=0):void { unhandled("moveConUp"); }
	// moveConDown(autoStopSec:number=0):void { unhandled("moveConDown"); }
	// moveConLeft():void { unhandled("moveConLeft"); }
	// moveConRight():void { unhandled("moveConRight"); }
	// moveConUpRight():void { unhandled("moveConUpRight"); }
	// moveConUpLeft():void { unhandled("moveConUpLeft"); }
	// moveConDownRight():void { unhandled("moveConDownRight"); }
	// moveConDownLeft():void { unhandled("moveConDownLeft"); }
	// moveStop():void { unhandled("moveStop"); }

	// zoomConTele():void { unhandled("zoomConTele"); }
	// zoomConWide():void { unhandled("zoomConWide"); }

	// focusConNear():void { unhandled("focusConNear"); }
	// focusConFar():void { unhandled("focusConFar"); }
	// focusStop():void { unhandled("focusStop"); }


	// presetGoto():void { unhandled("presetGoto"); }
	// presetHome():void { unhandled("presetHome"); }
	// presetSet():void { unhandled("presetSet"); }
}
