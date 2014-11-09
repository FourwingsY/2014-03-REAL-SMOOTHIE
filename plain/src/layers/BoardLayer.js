
var BoardLayer = cc.Layer.extend ({

	ctor:function () {
		this._super();
		this.init();
	},

	init: function() {
		this._routeController = null;
		this._level = SMTH.STATUS.CURRENT_LEVEL;
		SMTH.STATUS.PLAY_STATE = SMTH.CONST.PLAY_STATE.IDEAL;

		//SMTH.CONTAINER안에 pipe를 초기화
		SMTH.CONTAINER.PIPES =[];

		var row = this._level.row;
		var col = this._level.col;
		var winSize = cc.director.getWinSize()
        // set BlockSize By block count
        BLOCK.SIZE.WIDTH = winSize.width / this._level.MAP[0].length;
        BLOCK.SIZE.HEIGHT = BLOCK.SIZE.WIDTH;
                                  
		this._createMap(row, col);
		this.setPosition((winSize.width - col * BLOCK.SIZE.WIDTH)/2, (winSize.height - row * BLOCK.SIZE.HEIGHT)/2);
//		this._routeController = new RouteController();
//		this.scheduleUpdate();
                                  
        cc.audioEngine.setMusicVolume(0.7);
        cc.audioEngine.playMusic(res.GamePlayBGM_mp3, true);
                                  
            
	},

	_createMap : function(row, col) { 
		var map = this._level.MAP;
		var levelLoader = new LevelLoader(this._level);
		for (var r = 0; r < row; r++) {
			for (var c = 0; c < col; c++) {
				var block = SMTH.CONTAINER.PIPES[r*col+c]; // 좌표에 레퍼런스 할당.
				this.addChild(block); // 화면에 배치 
			}
		}
	},
	replaceBlock: function(block) {
		var row = Number(block.row);
		var col = Number(block.col);
		var levelCol = this._level.col;
		
		this.removeChild(block);
		
		var randomNewPipe = new Pipe(BLOCK.TYPE.PIPE.RAND.P);
		randomNewPipe.setPositionByRowCol(row, col);
		this.addChild(randomNewPipe);
		SMTH.CONTAINER.PIPES[row*levelCol+col] = randomNewPipe;
		SMTH.EVENT_MANAGER.notice("blockReplaced");
	}
});
