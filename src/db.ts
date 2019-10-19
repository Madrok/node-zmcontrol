import mysql from 'mysql';
import config from "./config";
import util from 'util';
import log from './log'

/**
 * In addition to the mandatory database host, port and credentials, 
 * it is good practice to set the default character set charset 
 * (ideally “utf8mb4”) and time zone timezone (ideally “Z” for UTC). 
 * They will ensure that your data is stored in line with the format 
 * that your application expects.
 */

/*
const pool = mysql.createPool({
	connectionLimit: 10,
	host     : config.ZM_DB_HOST,
	user     : config.ZM_DB_USER,
	password : config.ZM_DB_PASS,
	database : config.ZM_DB_NAME
})

// Ping database to check for common exception errors.
pool.getConnection((err, connection) => {
	if (err) {
		if (err.code === 'PROTOCOL_CONNECTION_LOST') {
			console.error('Database connection was closed.')
		}
		if (err.code === 'ER_CON_COUNT_ERROR') {
			console.error('Database has too many connections.')
		}
		if (err.code === 'ECONNREFUSED') {
			console.error('Database connection was refused.')
		}
	}

	if (connection) connection.release()

	return
});

// Promisify for Node.js async/await.
pool.query = util.promisify(pool.query)
*/
//module.exports = pool

export default class db {
	static con : mysql.Connection|null = null;
	static pquery : any; // promisified con.query

	static async connect() {
		if(db.con != null && typeof db.con !== 'undefined') {
			return db.con;
		}
		db.con = mysql.createConnection({
			host     : config.ZM_DB_HOST,
			user     : config.ZM_DB_USER,
			password : config.ZM_DB_PASS,
			database : config.ZM_DB_NAME
		});
		db.pquery = util.promisify(db.con.query.bind(db.con));

		util.promisify(db.con.connect);
		return db.con;
	}

	static close() {
		if(db.con) {
			db.con.end();
		}
		//db.con.destroy;
		db.con = null;
		db.pquery = null;
	}

	static escape(v:any) {
		return mysql.escape(v);
	}

	static async query(sql:string) {
		await db.connect();
		let res = await db.pquery(sql);
		return res;
	}
	/**
	 * Direct query with callback
	 * @param {*} sql 
	 * @param {*} cb (error,results,fields) 
	 */
	static async queryCb(sql:string, cb:{(error:any,results:Array<any>,fields:any):void}) {
		await db.connect();
		if(!db.con) throw new Error('db: could not connect');
		//console.log("***** " + sql);
		db.con.query(sql, cb);
	}

    static async getMonitor(id:number) {
		id = db.checkId(id);
		await db.connect();
		let sql = `SELECT * FROM Monitors WHERE Id = ${id}`;
		let res = await db.pquery(sql);
		return res.length > 0 ? res[0] : null;
    }

	static async getMonitorAndControl(id:number) {
		id = db.checkId(id);
		await db.connect();
		let sql = `SELECT C.*,M.*,C.Protocol
			FROM Monitors as M
			INNER JOIN Controls as C on (M.ControlId = C.Id)
			WHERE M.Id = ${id}`;
		log.debug("server: db: " + sql.replace(/\s\s+/g, ' '));
		let res = await db.pquery(sql);
		return res.length > 0 ? res[0] : null;
	}

	// static async getConfigValue(field) {
	// 	await db.connect();
	// 	let sql = `SELECT ${field} from Config`
	// 	'SELECT * FROM `Config` WHERE `Name`="ZM_LOG_LEVEL_DATABASE" LIMIT 1'
	// }

	static checkId(id:number) {
		if(typeof id == 'undefined' || id == null) {
			throw new Error("Bad id");
		}
		id = Number(id);
		if(id < 0) {
			throw new Error("Id below zero");
		}
		return id;
	}
}


/*
sub zmDbGetMonitorAndControl {
  zmDbConnect();

  my $id = shift;

  return undef if !defined($id);

  my $sql = 'SELECT C.*,M.*,C.Protocol
    FROM Monitors as M
    INNER JOIN Controls as C on (M.ControlId = C.Id)
    WHERE M.Id = ?'
    ;
  my $sth = $dbh->prepare_cached($sql);
  if ( !$sth ) {
    Error("Can't prepare '$sql': ".$dbh->errstr());
    return undef;
  }
  my $res = $sth->execute( $id );
  if ( !$res ) {
    Error("Can't execute '$sql': ".$sth->errstr());
    return undef;
  }
  my $monitor = $sth->fetchrow_hashref();
  return $monitor;
}
*/
