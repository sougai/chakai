(function () {

var $banner;

function queue_roll(bit) {
	var n = this.allRolls.sent++;
	var info = this.allRolls[n];
	if (!info)
		info = this.allRolls[n] = {};
	info.bit = bit;
	info.$tag = $(this.callback(safe('<strong>')));
	this.strong = true;
  if (bit == '#poi') {
    if (info.dice) {
      this.callback(safe('<a style="text-decoration:none;" href="javascript:void(0);" onclick="this.nextSibling.play();">#poi</a>'));
      this.callback(safe('<audio src="/poi/poi' + info.dice[1] + '.mp3"></audio>'));
    }
    else
      this.callback(bit);
  }
  else if (bit == '#honk') {
    if (info.dice) {
      this.callback(safe('<a style="text-decoration:none;" href="javascript:void(0);" onclick="this.nextSibling.play();">#honk</a>'));
      this.callback(safe('<audio src="/soto/honk.ogg"></audio>'));
    }
    else
      this.callback(bit);
  }
  else
	  this.callback(info.dice ? readable_dice(bit, info.dice) : bit);
	this.strong = false;
	this.callback(safe('</strong>'));
}

oneeSama.hook('imouto', function (imouto) {
	imouto.dice = GAME_BOARDS.indexOf(BOARD) >= 0;
	imouto.queueRoll = queue_roll;
	imouto.allRolls = {sent: 0, seen: 0};
});

oneeSama.hook('insertOwnPost', function (extra) {
	if (!postForm || !postForm.imouto || !extra || !extra.dice)
		return;
	var rolls = postForm.imouto.allRolls;
	for (var i = 0; i < extra.dice.length; i++) {
		var n = rolls.seen++;
		var info = rolls[n];
		if (!info)
			info = rolls[n] = {};
		info.dice = extra.dice[i];
		if (info.$tag) {
      if (info.bit == '#poi') {
        var $poi = $('<a style="text-decoration:none;" href="javascript:void(0);" onclick="this.nextSibling.play();">#poi</a>');
        var $ppoi = $('<audio src="/poi/poi' + info.dice[1] + '.mp3"></audio>');
        info.$tag.text('');
        info.$tag.append($poi);
        info.$tag.append($ppoi);
        info.$tag.children[0].text('#poi');
      }
      else if (info.bit == '#honk') {
        var $honk = $('<a style="text-decoration:none;" href="javascript:void(0);" onclick="this.nextSibling.play();">#honk</a>');
        var $hhonk = $('<audio src="/soto/honk.ogg"></audio>');
        info.$tag.text('');
        info.$tag.append($honk);
        info.$tag.append($hhonk);
        info.$tag.children[0].text('#honk');
      }
      else
			  info.$tag.text(readable_dice(info.bit, info.dice));
    }
	}
});

var bannerExtra = null; //$.parseHTML('<b>Other stream info</b>');

dispatcher[UPDATE_BANNER] = function (msg, op) {
	msg = msg[0];
	if (!$banner) {
		var dest;
		if (THREAD == op)
			dest = '#lock';
		else {
			var $s = $('#' + op);
			if ($s.is('section'))
				dest = $s.children('header');
		}
		if (dest)
			$banner = $('<span id="banner"/>').insertAfter(dest);
	}
	if ($banner) {
		if (Array.isArray(msg)) {
			construct_banner(msg);
			if (bannerExtra)
				$banner.append(' / ', bannerExtra);
		}
		else if (msg) {
			$banner.text(msg);
			if (bannerExtra)
				$banner.append(' / ', bannerExtra);
		}
		else if (bannerExtra) {
			$banner.empty().append(bannerExtra);
		}
		else {
			$banner.remove();
			$banner = null;
		}
	}
};

function construct_banner(parts) {
	$banner.empty();
	parts.forEach(function (part) {
		if (part.href)
			$('<a></a>', _.extend({target: '_blank', rel: 'noopener noreferrer'}, part)
					).appendTo($banner);
		else
			$banner.append(document.createTextNode(part));
	});
}

dispatcher[EXECUTE_JS] = function (msg, op) {
	if (THREAD != op)
		return;
	try {
		eval(msg[0]);
	}
	catch (e) {
		/* fgsfds */
	}
};

window.flash_bg = function (color) {
	var $b = $('body');
	var back = $b.css('background');
	$b.css('background', color);
	setTimeout(function () { $b.css('background', back); }, 200);
};

})();
