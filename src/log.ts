// import config from './config';
import db from './db';

// zoneminder log levels
enum ZMLOGLEVEL {
	None = -5,
	Panic, // -4
	Fatal, // -3
	Error, // -2
	Warning, // -1
	Info, // 0
	Debug // 1
}
type LogLevelStr = 'DBG'|'INF'|'WAR'|'ERR'|'FAT'|'PNC';

let consoleLogLevel = ZMLOGLEVEL.Debug;
let mysqlLogLevel = ZMLOGLEVEL.Info;

export default class Log {

	static setLevel(lvl:ZMLOGLEVEL) {
		if(lvl >= ZMLOGLEVEL.None && lvl <= ZMLOGLEVEL.Debug)
			consoleLogLevel = lvl;
	}

	static debug(...args: any[]):void {
		if(consoleLogLevel >= ZMLOGLEVEL.Debug)
			console.log.apply(console, ["DBG:",...args]);
		if(mysqlLogLevel >= ZMLOGLEVEL.Debug)
			insert(ZMLOGLEVEL.Debug,buildMsg(args));
	}

	static info(...args: any[]):void {
		if(consoleLogLevel >= ZMLOGLEVEL.Info)
			console.log.apply(console, ["INF:",...args]);
		insert(ZMLOGLEVEL.Info,buildMsg(args));
	}

	static warn(...args: any[]):void {
		if(consoleLogLevel >= ZMLOGLEVEL.Warning)
			console.log.apply(console, ["WRN:",...args]);
		insert(ZMLOGLEVEL.Warning,buildMsg(args));
	}

	static error(...args: any[]):void {
		if(consoleLogLevel >= ZMLOGLEVEL.Error)
			console.error.apply(console, ["ERR:",...args]);
		insert(ZMLOGLEVEL.Error,buildMsg(args));
	}

	static fatal(...args: any[]):void {
		if(consoleLogLevel >= ZMLOGLEVEL.Fatal)
			console.log.apply(console, ["FAT:",...args]);
		insert(ZMLOGLEVEL.Fatal,buildMsg(args));
	}

	static async initialize(consoleLevel?:number) {
		await db.connect();
		// let sql = 'SELECT * FROM `Config` WHERE `Name`="ZM_LOG_LEVEL_DATABASE" LIMIT 1';
		let sql = 'SELECT * FROM `Config` WHERE `Name`="ZM_LOG_LEVEL_DATABASE" or `Name`= "ZM_LOG_LEVEL_FILE"';
		let results = await db.query(sql);
		for(let i=0;i<results.length;i++) {
			let res = results[i];
			let v = Number(res['Value']);
			if(!isNaN(v)) {
				//console.log("**** setting log level to " + v + " " + process.argv[1]);
				if(res["Name"] == "ZM_LOG_LEVEL_DATABASE")
					mysqlLogLevel = v;
				else
					consoleLogLevel = (typeof consoleLevel!='undefined') ? consoleLevel : v;
				//console.log("*** set " + res['Name'] + ' to ' + v + "("+consoleLogLevel+")");
			} else {
				console.error("Bad log level ", results);
			}
		}	
	}
}

function buildMsg(theArgs:any[]) :string {
	var s = "";
	for(let i=0; i<theArgs.length;i++) {
		s += (i == 0 ? "" : " ");
		s += String(theArgs[i]);
	}
	return s;
}

function levelToLetters(level:ZMLOGLEVEL) : LogLevelStr {
	switch(level) {
		case ZMLOGLEVEL.Debug: return 'DBG';
		case ZMLOGLEVEL.Info: return 'INF';
		case ZMLOGLEVEL.Warning: return 'WAR';
		case ZMLOGLEVEL.Error: return 'ERR';
		case ZMLOGLEVEL.Fatal: return 'FAT';
		case ZMLOGLEVEL.Panic: return 'PNC';
	}
	throw new Error('bad level code');
}

function insert(level:ZMLOGLEVEL, message:string) {
	if(mysqlLogLevel < level) return;

	// var hrTime = process.hrtime(); // returns [seconds,nanoseconds] from arbitrary point in history
	// so we fake it well enough here
	var timeStmp = '' + Math.floor(new Date().getTime() / 1000) + '.' + Math.floor(process.hrtime()[1]/1000);
	var component = 'zmcontrol';
	var serverId = 0;
	var pid = process.pid;
	var code : LogLevelStr  = levelToLetters(level);
	var file = 'zmcontrol.pl';
	message = db.escape(message);
	

	let sql = `INSERT INTO Logs ( TimeKey, Component, ServerId, Pid, Level, Code, Message, File, Line ) 
		VALUES ( ${timeStmp}, "${component}", ${serverId}, ${pid}, 0, "${code}", ${message}, "${file}", NULL )`;
	db.queryCb(sql,() => {} );
	// if(level == ZMLOGLEVEL.Warning)
	// 	console.log(sql);
}



//checkCurrentSqlLogLevel();

// let log = {
// 	debug: debug,
// 	info: info,
// 	warn: warn,
// 	error: error,
// 	fatal: fatal,
// };

// export default log;

/*
ZM_LOG_DEBUG
ZM_LOG_DEBUG_FILE // Requires ZM_LOG_DEBUG=1
ZM_LOG_DEBUG_LEVEL // Requires ZM_LOG_DEBUG=1
ZM_LOG_DEBUG_TARGET // Requires ZM_LOG_DEBUG=1
ZM_LOG_LEVEL_DATABASE
ZM_LOG_LEVEL_FILE
ZM_LOG_LEVEL_SYSLOG
ZM_LOG_LEVEL_WEBLOG

SELECT * FROM `Config` WHERE `Category`='logging'

SELECT * FROM `Config` WHERE `Name`="ZM_LOG_LEVEL_DATABASE"
Debug 1
Info 0
Warning -1
Error -2
Fatal -3
Panic -4
None -5



use Time::HiRes qw/gettimeofday/;

my ($seconds, $microseconds) = gettimeofday();


FROM scripts/ZoneMinder/lib/ZoneMinder/Logger.pm
(couldn't find a syslog version. hmmm.... whatever... with the amount of logging ZM does, it's better we don't use syslog)

if ( $level <= $this->{fileLevel} or $level <= $this->{termLevel} ) {
      my $message = sprintf(
          '%s.%06d %s[%d].%s [%s:%d] [%s]'
          , POSIX::strftime('%x %H:%M:%S', localtime($seconds))
          , $microseconds
          , $this->{id}
          , $$
          , $codes{$level}
          , $caller
          , $line
          , $string
          );
      if ( $this->{trace} ) {
        $message = Carp::shortmess($message);
      } else {
        $message = $message."\n";
      }

	  print($LOGFILE $message) if $level <= $this->{fileLevel};
      print(STDERR $message) if $level <= $this->{termLevel};
    }

	Same goes here for database logging

my $sql = 'INSERT INTO Logs ( TimeKey, Component, ServerId, Pid, Level, Code, Message, File, Line ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, NULL )';
      $this->{sth} = $ZoneMinder::Database::dbh->prepare_cached($sql) if ! $this->{sth};
      if ( !$this->{sth} ) {
        $this->{databaseLevel} = NOLOG;
        Error("Can't prepare log entry '$sql': ".$ZoneMinder::Database::dbh->errstr());
        return;
      }

      my $res = $this->{sth}->execute(
        $seconds+($microseconds/1000000.0),
           $this->{id},
           ($ZoneMinder::Config::Config{ZM_SERVER_ID} ? $ZoneMinder::Config::Config{ZM_SERVER_ID} : undef),
           $$,
           $level,
           $codes{$level},
           $string,
           $this->{fileName},
          );
*/