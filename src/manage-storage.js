
var $storage_manager;
var $quota_exceeded_window;
var ignoring_quota_exceeded = false;

function storage_quota_exceeded(){
	if($quota_exceeded_window){
		$quota_exceeded_window.close();
		$quota_exceeded_window = null;
	}
	if(ignoring_quota_exceeded){
		return;
	}
	var $w = $FormWindow().title("Storage Error").addClass("dialogue-window");
	$w.$main.html(
		"<p>JS Paint stores images as you work on them so that if you " +
		"close your browser or tab or reload the page " +
		"your images are usually safe.</p>" +
		"<p>However, it has run out of space to do so.</p>" +
		"<p>You can still save the current image with <b>File > Save</b>. " +
		"You should save frequently, or free up enough space to keep the image safe.</p>"
	);
	$w.$Button("View and manage storage", function(){
		$w.close();
		ignoring_quota_exceeded = false;
		manage_storage();
	});
	$w.$Button("Ignore", function(){
		$w.close();
		ignoring_quota_exceeded = true;
	});
	$w.width(500);
	$w.center();
	$quota_exceeded_window = $w;
}

function manage_storage(){
	if($storage_manager){
		$storage_manager.close();
	}
	$storage_manager = $FormWindow().title("Manage Storage").addClass("storage-manager dialogue-window");
	// @TODO: remove all button (with confirmation)
	var $table = $(E("table")).appendTo($storage_manager.$main);
	var $message = $(E("p")).appendTo($storage_manager.$main).html(
		"Any images you've saved to your computer with <b>File > Save</b> will not be affected."
	);
	$storage_manager.$Button("Close", function(){
		$storage_manager.close();
	});
	
	var addRow = function(k, imgSrc){
		var $tr = $(E("tr")).appendTo($table);
		
		var $img = $(E("img")).attr({src: imgSrc});
		var $remove = $(E("button")).text("Remove").addClass("remove-button");
		var href = "#" + k.replace("image#", "local:");
		var $open_link = $(E("a")).attr({href: href, target: "_blank"}).text("Open");
		var $thumbnail_open_link = $(E("a")).attr({href: href, target: "_blank"}).addClass("thumbnail-container");
		$thumbnail_open_link.append($img);
		$(E("td")).append($thumbnail_open_link).appendTo($tr);
		$(E("td")).append($open_link).appendTo($tr);
		$(E("td")).append($remove).appendTo($tr);
		
		$remove.click(function(){
			localStorage.removeItem(k);
			$tr.remove();
			if($table.find("tr").length == 0){
				$message.html("<p>All clear!</p>");
			}
		});
	};
	
	// @TODO: handle localStorage unavailable
	for(var k in localStorage){
		if(k.match(/^image#/)){
			var v = localStorage[k];
			addRow(k, v[0] === '"' ? JSON.parse(v) : v);
		}
	}
	if($table.find("tr").length == 0){
		$message.html("<p>All clear!</p>");
	}
	$storage_manager.width(450);
	$storage_manager.center();
}

function save_changes(){
	storage.set('image#' + address_hash, bg_canvas.toDataURL("image/png"));
}

function restore_canvas(callback){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	storage.get('image#' + address_hash, function(err, value) {
		var restore = !err && value;
		if (restore) {
			var img = new Image();
			img.src = value;
			img.onload = function (){
				bg_ctx.clearRect(0, 0, canvas.width, canvas.height);
				//ctx.fillStyle = "white";
				//ctx.fillRect(0, 0, canvas.width, canvas.height);
				bg_ctx.drawImage(img, 0, 0);
			};
		} else {
			bg_ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
		if (callback) {
			callback(restore);
		}
	});
}

function get_changes(){
	var bg_id = bg_ctx.getImageData(0, 0, canvas.width, canvas.height);
	var sid = ctx.getImageData(0, 0, canvas.width, canvas.height);
	var l = canvas.width;
	var r = 0;
	var t = canvas.height;
	var b = 0;
	for(var i=0; i<sid.data.length; i+=4){
		if (pixel_changed()){
			var x = (i / 4) % canvas.width;
			var y = ~~((i / 4) / canvas.width);
			if (x < l) l = x;
			if (x > r) r = x;
			if (y < t) t = y;
			if (y > b) b = y;
		}
	}
	var w = r - l + 1;
	var h = b - t + 1;
	//console.log([w, h]);
	if (w > 0 && h > 0){
		//console.log([l, t, w, h]);
		var bg_id = bg_ctx.getImageData(l, t, w, h);
		var sid = ctx.getImageData(l, t, w, h);
		var dc = new Canvas(w, h);
		var did = dc.ctx.getImageData(0, 0, w, h);
		var pixels_count = 0;
		for(var i=0; i<did.data.length; i+=4){
			if (pixel_changed()){
				did.data[i+0] = sid.data[i+0];
				did.data[i+1] = sid.data[i+1];
				did.data[i+2] = sid.data[i+2];
				did.data[i+3] = sid.data[i+3];
				pixels_count++;
			}
		}
		dc.ctx.putImageData(did, 0, 0);
		console.log('pixels count: ' + pixels_count);
		console.log('position: ' + l + ' ' + t);
		console.log('value: ' + image_price(pixels_count));
		dc.toBlob(function(blob){
			sanity_check_blob(blob, function(){
				show_imgur_uploader(blob, pixels_count, l, t);
			});
		});
	}

	function pixel_changed(){
		return (
			sid.data[i+0] != 0 ||
			sid.data[i+1] != 0 ||
			sid.data[i+2] != 0 ||
			sid.data[i+3] != 0
		) &&
		(
			sid.data[i+0] != bg_id.data[i+0] ||
			sid.data[i+1] != bg_id.data[i+1] ||
			sid.data[i+2] != bg_id.data[i+2] ||
			sid.data[i+3] != bg_id.data[i+3]
		);
	}
}
