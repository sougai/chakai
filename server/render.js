var caps = require('./caps'),
    common = require('../common'),
    config = require('../config'),
    db = require('../db'),
    imager = require('../imager'),
    STATE = require('./state'),
    web = require('./web');

var RES = STATE.resources;
var escape = common.escape_html;

function tamashii(num) {
	var op = db.OPs[num];
	if (op && caps.can_access_thread(this.ident, op))
		this.callback(this.post_ref(num, op));
	else
		this.callback('>>' + num);
}

exports.write_thread_html = function (reader, req, out, opts) {
	var oneeSama = new common.OneeSama(tamashii);
	oneeSama.tz_offset = parse_timezone(req.cookies.timezone);

	opts.ident = req.ident;
	caps.augment_oneesama(oneeSama, opts);

	var cookies = web.parse_cookie(req.headers.cookie);
	if (common.thumbStyles.indexOf(cookies.thumb) >= 0)
		oneeSama.thumbStyle = cookies.thumb;

  if (cookies.spoiler_toggle == 'true')
    oneeSama.spoilToggle = (cookies.spoiler_toggle == 'true');

  if (cookies.sauce_toggle == 'true')
    oneeSama.sauceToggle = (cookies.sauce_toggle == 'true');

	var lastN = cookies.lastn && parseInt(cookies.lastn, 10);
	if (!lastN || !common.reasonable_last_n(lastN))
		lastN = config.THREAD_LAST_N;
	oneeSama.lastN = lastN;

	var hidden = {};
	if (cookies.hide && !caps.can_moderate(req.ident)) {
		cookies.hide.slice(0, 200).split(',').forEach(function (num) {
			num = parseInt(num, 10);
			if (num)
				hidden[num] = null;
		});
	}

	var write_see_all_link;

	reader.on('thread', function (op_post, omit, image_omit) {
		if (op_post.num in hidden)
			return;
		op_post.omit = omit;
		var full = oneeSama.full = !!opts.fullPosts;
		oneeSama.op = opts.fullLinks ? false : op_post.num;
		var first = oneeSama.monomono(op_post, full && 'full');
		first.pop();
		out.write(first.join(''));

		write_see_all_link = omit && function (first_reply_num) {
			var o = common.abbrev_msg(omit, image_omit);
			if (opts.loadAllPostsLink) {
				var url = '' + op_post.num;
				if (first_reply_num)
					url += '#' + first_reply_num;
				o += ' '+common.action_link_html(url,
						'See all');
			}
			out.write('\t<span class="omit">'+o+'</span>\n');
		};

		reader.once('endthread', close_section);
	});


	reader.on('post', function (post) {
		if (post.num in hidden || post.op in hidden)
			return;
		if (write_see_all_link) {
			write_see_all_link(post.num);
			write_see_all_link = null;
		}
		out.write(oneeSama.mono(post));
	});

	function close_section() {
		out.write('</section><hr>\n');
	}
};

function make_link_rels(board, bits) {
	var path = imager.config.MEDIA_URL + 'css/';

	var base = 'base.css?v=' + STATE.hot.BASE_CSS_VERSION;
	bits.push(['stylesheet', path + base]);

	var theme = STATE.hot.BOARD_CSS[board];
	var theme_css = theme + '.css?v=' + STATE.hot.THEME_CSS_VERSION;
	bits.push(['stylesheet', path + theme_css, 'theme']);

	bits.push(['stylesheet', path + 'gravitas.css?v=1']);
	return bits.map(function (p) {
		var html = '\t<link rel="'+p[0]+'" href="'+p[1]+'"';
		if (p[2])
			html += ' id="' + p[2] + '"';
		return html + '>\n';
	}).join('');
}

exports.write_board_head = function (out, initScript, board, nav) {
	var indexTmpl = RES.indexTmpl;
	var title = STATE.hot.TITLES[board] || escape(board);
	var metaDesc = "Real-time imageboard";

	var i = 0;
	out.write(indexTmpl[i++]);
	out.write(title);
	out.write(indexTmpl[i++]);
	out.write(escape(metaDesc));
	out.write(indexTmpl[i++]);
	out.write(make_board_meta(board, nav));
	out.write(initScript);
	out.write(indexTmpl[i++]);
	if (RES.navigationHtml)
		out.write(RES.navigationHtml);
	out.write(indexTmpl[i++]);
	out.write(title);
	out.write(indexTmpl[i++]);
};

exports.write_thread_head = function (out, initScript, board, op, opts) {
	var indexTmpl = RES.indexTmpl;
	var title = '/'+escape(board)+'/ - ';
	if (opts.subject)
		title += escape(opts.subject) + ' (#' + op + ')';
	else
		title += '#' + op;
	var metaDesc = "Real-time imageboard thread";

	var i = 0;
	out.write(indexTmpl[i++]);
	out.write(title);
	out.write(indexTmpl[i++]);
	out.write(escape(metaDesc));
	out.write(indexTmpl[i++]);
	out.write(make_thread_meta(board, op, opts.abbrev));
	out.write(initScript);
	out.write(indexTmpl[i++]);
	if (RES.navigationHtml)
		out.write(RES.navigationHtml);
	out.write(indexTmpl[i++]);
	out.write('Thread #' + op);
	out.write(indexTmpl[i++]);
  out.write(common.action_link_html('.', 'Return'));
  out.write(' ' + common.action_link_html('#bottom', 'Bottom'));
	out.write('<hr>\n');
};

function make_board_meta(board, info) {
	var bits = [];
	if (info.cur_page >= 0)
		bits.push(['index', '.']);
	if (info.prev_page)
		bits.push(['prev', info.prev_page]);
	if (info.next_page)
		bits.push(['next', info.next_page]);
	return make_link_rels(board, bits);
}

function make_thread_meta(board, num, abbrev) {
	var bits = [['index', '.']];
	if (abbrev)
		bits.push(['canonical', num]);
	return make_link_rels(board, bits);
}

exports.make_pagination_html = function (info) {
  if (!info.next_page)
    return '';
	var bits = ['<nav class="pagination">'], cur = info.cur_page;
	if (cur >= 0)
		bits.push('<a href=".">live</a>');
	else
		bits.push('<strong>live</strong>');
	var start = 0, end = info.pages, step = 1;
	if (info.ascending) {
		start = end - 1;
		end = step = -1;
	}
	for (var i = start; i != end; i += step) {
		if (i != cur)
			bits.push('<a href="page' + i + '">' + i + '</a>');
		else
			bits.push('<strong>' + i + '</strong>');
	}
	if (info.next_page)
		bits.push(' <input type="button" value="Next">');
  bits.push('</nav>');
	return bits.join('');
};

var returnHTML = '<span id="bottom">' + common.action_link_html('.', 'Return') + ' ' + common.action_link_html('#top', 'Top') + '</span>';

exports.write_page_end = function (out, ident, returnLink) {
	if (returnLink)
		out.write(returnHTML);
	else if (RES.navigationHtml)
		out.write('<br><br>' + RES.navigationHtml);
	var last = RES.indexTmpl.length - 1;
	out.write(RES.indexTmpl[last]);
	if (ident) {
		if (caps.can_administrate(ident))
			out.write('<script src="../admin.js"></script>\n');
		else if (caps.can_moderate(ident))
			out.write('<script src="../mod.js"></script>\n');
	}
};

function parse_timezone(tz) {
	if (!tz && tz != 0)
		return null;
	tz = parseInt(tz, 10);
	if (isNaN(tz) || tz < -24 || tz > 24)
		return null;
	return tz;
}
