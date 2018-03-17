var CurThread;

var $DOC = $(document);
var $name = $('#name'), $email = $('#email');
var $ceiling = $('hr:first');

DEFINES.PAGE_BOTTOM = -1;
var menuOptions = ['Focus'];
var menuHandlers = {};

var syncs = {}, ownPosts = {};
var readOnly = ['archive'];

var connSM = new FSM('load');
var postSM = new FSM('none');
var TAB_ID = random_id();
var CONN_ID;

var oneeSama = new OneeSama(function (num) {
	if (this.links && num in this.links)
		this.callback(this.post_ref(num, this.links[num]));
	else
		this.callback('>>' + num);
});
oneeSama.full = oneeSama.op = THREAD;
