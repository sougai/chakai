/* Copies old threads to the archive board.
 * Run this in parallel with the main server.
 */

var config = require('../config'),
    db = require('../db'),
    winston = require('winston');

// Load hooks
require('../imager');
require('../server/amusement');

var yaku;
function connect() {
	var r;
	if (!yaku) {
		yaku = new db.Yakusoku('archive', db.UPKEEP_IDENT);
		r = yaku.connect();
		r.on('error', function (err) {
			winston.error(err);
			process.exit(1);
		});
	}
	else
		r = yaku.connect();
	return r;
}
var yaku_curfew;
function connect_curfew() {
	var r;
	if (!yaku_curfew) {
		yaku_curfew = new db.Yakusoku('reien', db.UPKEEP_IDENT);
		r = yaku_curfew.connect();
		r.on('error', function (err) {
			winston.error(err);
			process.exit(1);
		});
	}
	else
		r = yaku_curfew.connect();
	return r;
}

function at_next_minute(func) {
	var now = Date.now();
	var inFive = new Date(now + 5000);

	var nextMinute = inFive.getTime();
	var ms = inFive.getMilliseconds(), s = inFive.getSeconds();
	if (ms > 0) {
		nextMinute += 1000 - ms;
		s++;
	}
	if (s > 0 && s < 60)
		nextMinute += (60 - s) * 1000;
	var delay = nextMinute - now;

	return setTimeout(func, delay);
}

var CLEANING_LIMIT = 10; // per minute

function clean_up() {
	var r = connect();
	var expiryKey = db.expiry_queue_key('non_curfew');
	var now = Math.floor(Date.now() / 1000);
	r.zrangebyscore(expiryKey, 1, now, 'limit', 0, CLEANING_LIMIT,
				function (err, expired) {
		if (err) {
			winston.error(err);
			return;
		}
		expired.forEach(function (entry) {
			var m = entry.match(/^(\d+):/);
			if (!m)
				return;
			var op = parseInt(m[1], 10);
			if (!op)
				return;
			yaku.archive_thread(op, function (err) {
				if (err)
					return winston.error(err);
				r.zrem(expiryKey, entry, function (err, n) {
					if (err)
						return winston.error(err)
					winston.info("Archived thread #" + op);
					if (n != 1)
						winston.warn("Not archived?");
				});
			});
		});
	});
	at_next_minute(clean_up);
}

function clean_up_curfew() {
  // Cleanup curfew boards too
	var r = connect_curfew();
	var now = Math.floor(Date.now() / 1000);
  if (config.CURFEW_BOARDS.length > 0) {
	  var expiryKeyCurfew = db.expiry_queue_key(config.CURFEW_BOARDS[0]);
	  r.zrangebyscore(expiryKeyCurfew, 1, now, 'limit', 0, CLEANING_LIMIT,
				function (err, expired) {
		  if (err) {
			  winston.error(err);
			  return;
		  }
		  expired.forEach(function (entry) {
			  var m = entry.match(/^(\d+):/);
			  if (!m)
				  return;
			  var op = parseInt(m[1], 10);
			  if (!op)
				  return;
		    yaku_curfew.archive_thread_curfew(op, function (err) {
				  if (err)
					  return winston.error(err);
				  r.zrem(expiryKeyCurfew, entry, function (err, n) {
					  if (err)
						  return winston.error(err)
					  winston.info("Archived thread #" + op);
					  if (n != 1)
						  winston.warn("Not archived?");
				  });
			  });
		  });
	  });
  }
	at_next_minute(clean_up_curfew);
}

if (require.main === module) process.nextTick(function () {
	connect();
  connect_curfew();
	var args = process.argv;
	if (args.length == 3) {
		yaku.archive_thread(parseInt(args[2], 10), function (err) {
			if (err)
				throw err;
			process.exit(0);
		});
		yaku_curfew.archive_thread_curfew(parseInt(args[2], 10), function (err) {
			if (err)
				throw err;
			process.exit(0);
		});
	}
	at_next_minute(clean_up);
	at_next_minute(clean_up_curfew);
});
