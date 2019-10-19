// const { fork, spawn } = require('child_process');
import * as child_process from 'child_process';

/**
 * Forks a process. By default the child will inherit
 * the stdio of the parent process. If you want them piped
 * to the parent, set pipStd to 'true', then the stdin/stdout/stderr
 * members of the returned child process will be set.
 * 
 * Remember to call .detach on the child either immediately or 
 * in the child.on('message') handler in the parent.
 * 
 * @param file The javascript file to run
 * @param args Array of extra arguments to pass to child process
 * @param pipeStd set to true to get stdio pipes on child process
 * @returns A ChildProcess instance
 */
export function processFork(file:string,args:Array<any>,pipeStd:Boolean=false) : child_process.ChildProcess {
	if(!Array.isArray(args)) 
		args = [];
	const options = {
		silent:true,
		detached:true,
		stdio: ["inherit", "inherit", "inherit", 'ipc']
	};
	if(pipeStd)
		options.stdio = ['pipe', 'pipe', 'pipe', 'ipc'];
	// @ts-ignore
	var child = child_process.spawn(process.argv[0], [file,...args], options);
	//child.unref();

	return child;
}

export function detach(child:child_process.ChildProcess) {
	child.unref();
}