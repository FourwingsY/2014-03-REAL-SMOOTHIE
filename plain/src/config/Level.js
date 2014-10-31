(function() {
	var P = BLOCK_TYPE.PIPE.RAND.P;
	var IU = BLOCK_TYPE.PIPE.I.U;
	var IR = BLOCK_TYPE.PIPE.I.R;
	var F = BLOCK_TYPE.FRIEND;
	var E = BLOCK_TYPE.ENEMY;
	
	var LEVEL = {
		"TUTORIAL0": {
			"MAP" : [
			         [E,E,E,E],
			         [IU,IU,IU,IU],
			         [IR,IR,IR,IR],
			         [IU,IU,IU,IU],
			         [F,F,F,F]
			         ].reverse()
	
		},
		"LEVEL0": {
			"MAP" : [
			       [E,E,E,E],
			       [P,P,P,P],
			       [P,P,P,P],
			       [P,P,P,P],
			       [P,P,P,P],
			       [F,F,F,F]
			       ].reverse()
		}
	}
	
	for (var key in LEVEL) {
		var level = LEVEL[key];
		cc.log("Level: " + level);
		level.row = level.MAP.length;
		level.col = level.MAP[0].length;
	}
	
	var SMTH = window.SMTH || {};
	SMTH.LEVEL = LEVEL;
	
	window.SMTH = SMTH;
})()