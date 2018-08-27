var $imgur_window;

function show_imgur_uploader(blob, pixels_count = 0, position_x = 0, position_y = 0){
	if($imgur_window){
		$imgur_window.close();
	}

	var title = pixels_count > 0 ? "Add to blockchain" : "Upload To Imgur";
	$imgur_window = $FormWindow().title(title).addClass("dialogue-window");

	var $preview_image_area = $(E("div")).appendTo($imgur_window.$main);//.html("<label style='display: block'>Preview:</label>");
	var $nimiq_data = $(E("div")).addClass("imgur-data").appendTo($imgur_window.$main);
	var $nimiq_url_area = $(E("div")).appendTo($imgur_window.$main);
	var $imgur_url_area = $(E("div")).appendTo($imgur_window.$main);
	var $imgur_status = $(E("div")).appendTo($imgur_window.$main);

	if (pixels_count > 0){
		$nimiq_data.css({
			textAlign: "center"
		});
		$nimiq_data.append(
			"<div style=\"white-space: nowrap; display: inline-block; text-align: left;\">Colored pixels:<br>Cost (<small>NIM</small>):</div>" +
			"<div style=\"white-space: nowrap; display: inline-block; text-align: right; font-weight: bold;\">" + pixels_count + "<br>" + parseFloat(pixels_count * 0.01).toFixed(2) + "</div>"
		);
	}

	// TODO: maybe make this preview small but zoomable to full size?
	// (starting small (max-width: 100%) and toggling to either scrollable or fullscreen)
	// it should be clear that it's not going to upload a downsized version of your image
	var $preview_image = $(E("img")).appendTo($preview_image_area);
	$preview_image.attr({src: URL.createObjectURL(blob)});
	// $preview_image.css({maxWidth: "100%", maxHeight: "400px"});
	$preview_image_area.css({
		maxWidth: "90vw",
		maxHeight: "70vh",
		overflow: "auto",
		marginBottom: "0.5em",
		textAlign: "center"
	});
	$preview_image.on("load", function(){
		$imgur_window.css({width: "auto"});
		$imgur_window.center();
	});

	var $upload_button = $imgur_window.$Button("Upload", function(){

		$preview_image_area.remove();
		$nimiq_data.remove();
		$upload_button.remove();
		$cancel_button.remove(); // TODO: allow canceling upload request

		$imgur_window.width(300);
		$imgur_window.center();

		var $progress = $(E("progress")).appendTo($imgur_window.$main);
		var $progress_percent = $(E("span")).appendTo($imgur_window.$main).css({
			width: "2.3em",
			display: "inline-block",
			textAlign: "center",
		});

		var parseImgurResponseJSON = function(responseJSON){
			try {
				var response = JSON.parse(responseJSON);
			} catch(error) {
				$imgur_status.text("Received an invalid JSON response from Imgur: ");
				// .append($(E("pre")).text(responseJSON));

				// show_error_message("Received an invalid JSON response from Imgur: ", responseJSON);
				// show_error_message("Received an invalid JSON response from Imgur: ", responseJSON, but also error);
				// $imgur_window.close();

				// TODO: DRY, including with show_error_message
				$(E("pre"))
				.appendTo($imgur_status)
				.text(responseJSON)
				.css({
					background: "white",
					color: "#333",
					fontFamily: "monospace",
					width: "500px",
					overflow: "auto",
				});
				$(E("pre"))
				.appendTo($imgur_status)
				.text(error.toString())
				.css({
					background: "white",
					color: "#333",
					fontFamily: "monospace",
					width: "500px",
					overflow: "auto",
				});
				$imgur_window.css({width: "auto"});
				$imgur_window.center();
			}
			return response;
		};

		// make an HTTP request to the Imgur image upload API

		var req = new XMLHttpRequest();

		if(req.upload){
			req.upload.addEventListener('progress', function(event){
				if(event.lengthComputable){
					var progress_value = event.loaded / event.total;
					var percentage_text = Math.floor(progress_value * 100) + "%";
					$progress.val(progress_value);
					$progress_percent.text(percentage_text);
				}
			}, false);
		}

		req.addEventListener("readystatechange", function() {
			if(req.readyState == 4 && req.status == 200){
				$progress.add($progress_percent).remove();

				var response = parseImgurResponseJSON(req.responseText);
				if(!response) return;

				if(!response.success){
					$imgur_status.text("Failed to upload image :(");
					return;
				}
				var url = response.data.link;

				$imgur_status.text("");

				// TODO: a button to copy the URL to the clipboard
				// (also maybe put the URL in a readonly input)

				if (pixels_count > 0){
					var nimiq_msg = ((position_x > 0 || position_y > 0) ? position_x + "," + position_y + "," : "") + response.data.id;
					var $nimiq_msg = $(E("input")).css({
					});
					$nimiq_msg.attr('readonly', true);
					$nimiq_msg.val(nimiq_msg);
					$nimiq_msg.click(function(){
						$nimiq_msg.select();
					});

					var nimiq_url = "https://safe.nimiq.com/#_request/" + default_nimiq_address.replace(" ", "-") + "/" + parseFloat(pixels_count * 0.01).toFixed(2) + "_"
					var $nimiq_url = $(E("a")).attr({id: "imgur-url", target: "_blank"});
					$nimiq_url.text(nimiq_url);
					$nimiq_url.attr('href', nimiq_url);

					var $copy_button = $(E("button")).text("<= Copy");
					$copy_button.click(function(e){
						e.preventDefault();
						$nimiq_msg.select();
						$nimiq_msg.focus();
						document.execCommand("copy");
					});

					$nimiq_url_area.append(
						"<label>Copy message for Nimiq transaction:</label>"
					)
					.append("<br>")
					.append($nimiq_msg)
					//.append("<br>")
					.append($copy_button)
					.append("<br>")
					$nimiq_url_area.append(
						"<label>then go to the safe to send transaction and paste the message by visiting:</label>"
					)
					.append("<br>")
					.append($nimiq_url);

				} else {
					var $imgur_url = $(E("a")).attr({id: "imgur-url", target: "_blank"});
					$imgur_url.text(url);
					$imgur_url.attr('href', url);
					$imgur_url_area.append(
						"<label>Imgur image URL: </label><br>"
					).append($imgur_url);
				}

				var $delete_button = $imgur_window.$Button("Delete", function(){
					$nimiq_url_area.remove();
					$imgur_url_area.remove();

					var req = new XMLHttpRequest();

					req.addEventListener("readystatechange", function() {
						if(req.readyState == 4 && req.status == 200){
							$delete_button.remove();

							var response = parseImgurResponseJSON(req.responseText);
							if(!response) return;

							if(response.success){
								$imgur_url_area.remove();
								$imgur_status.text("Deleted successfully");
							}else{
								$imgur_status.text("Failed to delete image :(");
							}
						}else if(req.readyState == 4){
							$imgur_status.text("Error deleting image :(");
						}
					});

					req.open("DELETE", "https://api.imgur.com/3/image/" + response.data.deletehash, true);

					req.setRequestHeader("Authorization", "Client-ID 203da2f300125a1");
					req.setRequestHeader("Accept", "application/json");
					req.send(null);

					$imgur_status.text("Deleting...");
				});
				var $okay_button = $imgur_window.$Button("OK", function(){
					$imgur_window.close();
				});
			}else if(req.readyState == 4){
				$progress.add($progress_percent).remove();
				$imgur_status.text("Error uploading image :(");
			}
		});

		req.open("POST", "https://api.imgur.com/3/image", true);

		var form_data = new FormData();
		form_data.append("image", blob);

		req.setRequestHeader("Authorization", "Client-ID 203da2f300125a1");
		req.setRequestHeader("Accept", "application/json");
		req.send(form_data);

		$imgur_status.text("Uploading...");
	});
	var $cancel_button = $imgur_window.$Button("Cancel", function(){
		$imgur_window.close();
	});
	$imgur_window.width(300);
	$imgur_window.center();
}
