/*global window, document, $, alert, confirm, prompt, localStorage, setTimeout*/
/*global checkAround,initGame,saveZone*/
var data = {
	row: 0,
	cell: 0,
	color: [],
	mine: [],
	minesum: 0,
	turn: 0,
	name: "",
	lock: 0
};
var checkCache = [];
var animateBuffer = [];
var NO_UI = false;
var DEVICE_WIDTH = $(window).width();
DEVICE_WIDTH -= DEVICE_WIDTH % 20;

var viewHelp = function () {
	var str;
	str = " - ColorGolf (" + location.href + ")\n";
	str += "모든 칸을 한가지 색상으로 점령하는 게임\n\n";
	str += "하단의 6개 버튼을 눌러보세용..\n";
	alert(str);
};
var viewRecord = function () {
	$.getJSON("http://cz.azki.org/history.jsonp.php?c=" + data.cell + "&callback=?", function (sdata) {
		var da, i, len, str;
		da = sdata.split("\t");
		len = da.length;
		str = "- " + data.row + "x" + data.cell + " 순위표 -\n";
		for (i = 0; i < len; i += 3) {
			if (da[i + 2]) {
				str += (i / 3 + 1) + "등. [" + da[i + 2] + "턴] " + da[i] + " (" + da[i + 1] + ")\n";
			}
		}
		alert(str);
	});
//	.error(function () {
//		alert("기록을 불러오는데 실패했어.\n인터넷이 잘되나 확인해봐.");
//	});
};
var resetCheckCache = function () {
	var rowIndex;
	checkCache = [];
	for (rowIndex = 0; rowIndex < data.row; rowIndex += 1) {
		checkCache[rowIndex] = [];
	}
};
var initZone = function () {
	var rowIndex, cellIndex;
	for (rowIndex = 0; rowIndex < data.row; rowIndex += 1) {
		data.color[rowIndex] = [];
		data.mine[rowIndex] = [];
		for (cellIndex = 0; cellIndex < data.cell; cellIndex += 1) {
			if (rowIndex + cellIndex === 0) {
				data.mine[rowIndex][cellIndex] = true;
				data.color[rowIndex][cellIndex] = 9;
			} else {
				data.mine[rowIndex][cellIndex] = false;
				data.color[rowIndex][cellIndex] = Math.floor(Math.random() * 6);
			}
		}
	}
};
var initZoneByCode = function (code) {
	var codeArr, rowIndex, cellIndex;
	codeArr = code.split("");
	for (rowIndex = 0; rowIndex < data.row; rowIndex += 1) {
		data.color[rowIndex] = [];
		data.mine[rowIndex] = [];
		for (cellIndex = 0; cellIndex < data.cell; cellIndex += 1) {
			data.mine[rowIndex][cellIndex] = rowIndex + cellIndex === 0;
			data.color[rowIndex][cellIndex] = codeArr.shift();
		}
	}
};
var initData = function (row, cell) {
	data.color = [];
	data.mine = [];
	data.row = row;
	data.cell = cell;
	data.minesum = 1;
	data.turn = 0;
	data.lock = 0;
	initZone();
	resetCheckCache();
	saveZone();
};
var initDataByCode = function (code) {
	data.color = [];
	data.mine = [];
	data.row = Math.round(Math.sqrt(code.length));
	data.cell = data.row;
	data.minesum = 1;
	data.turn = 0;
	data.lock = 0;
	initZoneByCode(code);
	resetCheckCache();
	saveZone();
};
var createTable = function () {
	var tableElem, rowIndex, cellIndex, rowElem, cellElem, $div, halfSize;
	$("#zone").empty();
	tableElem = document.createElement("table");
	tableElem.cellSpacing = "0";
	tableElem.cellPadding = "0";
	halfSize = Math.floor(DEVICE_WIDTH / data.cell / 2);
	for (rowIndex = 0; rowIndex < data.row; rowIndex += 1) {
		rowElem = tableElem.insertRow(rowIndex);
		for (cellIndex = 0; cellIndex < data.cell; cellIndex += 1) {
			cellElem = rowElem.insertCell(cellIndex);
			$div = $("<div>");
			if (rowIndex + cellIndex === 0) {
				$div.css("text-align", "center").css("font-size", halfSize + "px").text("H");
			}
			$div
			.removeClass()
			.addClass("color" + data.color[rowIndex][cellIndex])
			.height(DEVICE_WIDTH / data.row).width(DEVICE_WIDTH / data.cell).appendTo(cellElem);
			if (data.mine[rowIndex][cellIndex]) {
				$div.css("border-radius", halfSize + "px");
			}
		}
	}
	$("#zone").append(tableElem);
};
var drawStage = function () {
	$("#stage").text(data.row + "x" + data.cell);
};
var drawTurn = function (plus) {
	$("#turn").text(data.turn += (plus || 0));
};
var setMineBorder = function ($zone, size) {
	$zone.css("border-radius", size + "px");
};
var animateBorder = function ($zone, rowIndex, cellIndex) {
	var halfSize, bufIndex;
	halfSize = Math.floor(DEVICE_WIDTH / data.cell / 2);
	bufIndex = rowIndex * cellIndex + cellIndex;
	animateBuffer[bufIndex] = $zone;
	setTimeout(function () {
		var v;
		if (data.lock === -1) {
			return;
		}
		v = halfSize * 0.4;
		setMineBorder($zone, v);
		setTimeout(function () {
			var v;
			if (data.lock === -1) {
				return;
			}
			v = halfSize * 0.7;
			setMineBorder($zone, v);
			setTimeout(function () {
				if (data.lock === -1) {
					return;
				}
				v = halfSize;
				setMineBorder($zone, v);
				animateBuffer[bufIndex] = null;
			}, 80);
		}, 80);
	}, 80);
};
var get$zone = function (rowIndex, cellIndex) {
	if (!NO_UI) {
		var $zone = $("#zone div:eq(" + (data.cell * rowIndex + cellIndex) + ")");
		return $zone.length ? $zone : null;
	} else {
		return 0 <= rowIndex && rowIndex < data.row && 0 <= cellIndex && cellIndex < data.cell;
	}
};
var checkZone = function (rowIndex, cellIndex, newColorIndex) {
	var $zone = get$zone(rowIndex, cellIndex);
	if ($zone && checkCache[rowIndex][cellIndex] !== true) {
		if (data.mine[rowIndex][cellIndex] === true) {
			checkCache[rowIndex][cellIndex] = true;
			data.color[rowIndex][cellIndex] = newColorIndex;
			if (!NO_UI) {
				$zone
				.removeClass()
				.addClass("color" + data.color[rowIndex][cellIndex]);
			}
			return checkAround(rowIndex, cellIndex, newColorIndex);
		} else {
			if (data.color[rowIndex][cellIndex] === newColorIndex) {
				checkCache[rowIndex][cellIndex] = true;
				data.mine[rowIndex][cellIndex] = true;
				data.minesum += 1;
				if (!NO_UI) {
					animateBorder($zone, rowIndex, cellIndex);
				}
				return 1 + checkAround(rowIndex, cellIndex, newColorIndex);
			} else {
				checkCache[rowIndex][cellIndex] = true;
			}
		}
	}
	return 0;
};
var checkAround = function (rowIndex, cellIndex, newColorIndex) {
	var drawCount = 0;
	drawCount += checkZone(rowIndex + 1, cellIndex, newColorIndex);
	drawCount += checkZone(rowIndex, cellIndex + 1, newColorIndex);
	drawCount += checkZone(rowIndex - 1, cellIndex, newColorIndex);
	drawCount += checkZone(rowIndex, cellIndex - 1, newColorIndex);
	return drawCount;
};
var clearSave = function () {
	var game = localStorage.getItem("cz_game");
	if (game) {
		localStorage.removeItem("cz_game");
	}
};
var saveZone = function () {
	var s = JSON.stringify(data);
	localStorage.setItem("cz_stage", s);
};
var saveGame = function () {
	var s = JSON.stringify(data);
	localStorage.setItem("cz_game", s);
};
var changeStage = function (plus) {
	var stage;
	stage = data.cell + plus;
	if (stage < 3) {
		stage = 30;
	}
	if (20 < stage) {
		stage = 3;
	}
	clearSave();
	initGame(stage);
};
var saveName = function (name) {
	//TODO.azki
	if (window.localStorage) {
		localStorage.setItem("cz_name", name);
	}
};
var restoreName = function () {
	//TODO.azki
	if (window.localStorage) {
		data.name = localStorage.getItem("cz_name");
	}
};

var setBtn = function (index) {
	var drawCount, i, len, halfSize;
	if (data.lock < 0) {
		alert("게임이 이미 끝났어..");
		return;
	}
	if (0 < data.lock) {
		data.lock += 1;
		if (5 <= data.lock) { //error catch..
			changeStage(0);
		}
		return;
	}
	data.lock = 1;
	drawCount = checkZone(0, 0, index);
	if (0 < drawCount) {
		drawTurn(1);
	}
	if (data.row * data.cell <= data.minesum) {
		data.lock = -1; //end
		setTimeout(function () {
			var sendRecord;
			data.name = prompt(data.turn + "턴인데 기록할려면 이름을 입력:", data.name);
			if (data.name) {
				sendRecord = function () {
					$.getJSON("http://cz.azki.org/record.jsonp.php?c=" + data.cell + "&t=" + data.turn + "&n=" + encodeURIComponent(data.name) + "&callback=?", function (sdata) {
						var da;
						da = sdata.split("\t");
						alert("기록에 성공했어.\n네 기록은 " + da[1] + "명 중에 " + da[0] + "등이래.\n대단한걸~");
						changeStage(0);
					});
//					.error(function() {
//						if (confirm("기록에 실패했어.\n기록 전송을 위해 서버 연결을 다시 시도할래?")) {
//							sendRecord();
//						} else {
//							changeStage(0);
//						}
//					});
				};
				sendRecord();
				saveName(data.name);
			} else {
				changeStage(0);
			}
		}, 100);
		clearSave();
		//clear animation
		len = data.row * data.cell;
		halfSize = Math.floor(DEVICE_WIDTH / data.cell / 2);
		for (i = 0; i < len; i += 1) {
			if (animateBuffer[i]) {
				setMineBorder(animateBuffer[i], halfSize);
			}
		}
		animateBuffer = [];
	} else {
		resetCheckCache();
		data.lock = 0;
		saveGame();
	}
};
var createButtons = function () {
	var i, callbackFn, btnWidth, $div;
	$("#btns").empty();
	callbackFn = function () {
		setBtn($(this).data("index"));
	};
	btnWidth = Math.floor(DEVICE_WIDTH / 3 - 2);
	for (i = 0; i < 6; i += 1) {
		if (i === 3) {
			$("<br>").appendTo($("#btns"));
		}
		$div = $("<div>")
		.addClass("color" + i)
		.width(btnWidth - 20)
		.height(Math.floor(btnWidth / 3))
		.data("index", i).appendTo($("#btns"));
		if ("ontouchstart" in $div[0]) {
			$div[0].ontouchstart = callbackFn;
		} else {
			$div[0].onmousedown = callbackFn;
		}
	}
};
var drawGame = function () {
	createTable();
	drawStage();
	drawTurn();
	createButtons();
};
var loadGame = function () {
	var s, d;
	s = localStorage.getItem("cz_game");
	try {
		d = JSON.parse(s);
	} catch (ignore) {}
	if (d && d.lock === 0) {
		data = d;
		resetCheckCache();
		drawGame();
		return true;
	}
	return false;
};
var loadZone = function () {
	var s, d;
	s = localStorage.getItem("cz_stage");
	try {
		d = JSON.parse(s);
	} catch (ignore) {}
	if (d && d.lock === 0) {
		data = d;
		resetCheckCache();
		drawGame();
		return true;
	}
	return false;
};
var initGame = function (cell) {
	initData(cell, cell);
	drawGame();
	localStorage.setItem("cz_cell", data.cell);
};
var initGameByCode = function (code) {
	initDataByCode(code);
	drawGame();
	localStorage.setItem("cz_cell", data.cell);
};
var getLastCell = function () {
	var lastCell;
	//TODO.azki
	lastCell = localStorage.getItem("cz_cell");
	if (lastCell) {
		return +lastCell;
	}
	return 3;
};