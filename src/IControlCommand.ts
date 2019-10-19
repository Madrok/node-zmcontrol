type contolCmd = 'wake'|'sleep'|'reset'|'quit'|
	'moveConUp'|'moveConUpRight'|'moveConRight'|
	'moveConDownRight'|'moveConDown'|'moveConDownLeft'|
	'moveConLeft'|'moveConUpLeft'|'moveStop'|
	'zoomConTele'|'zoomConWide'|'zoomStop'|
	'presetSet'|'presetGoto'|'presetHome'|
	'focusStop'|'focusConNear'|'focusConFar';

export interface IControlCommand {
	id: number,
	command: contolCmd,
	autostop?: number,
	speed?:number,
	panspeed?:number,
	tiltspeed?:number,
	zoomspeed?:number,
	preset?:string|number
}