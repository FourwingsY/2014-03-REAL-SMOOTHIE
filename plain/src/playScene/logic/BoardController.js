var BoardController = cc.Class.extend({
	ctor: function () {
		this.init();
		this.initListener();
	},
	init: function() {
		this.board = SMTH.CONTAINER.BOARD;
		this._level = SMTH.STATUS.CURRENT_LEVEL;
		this.blockFallingCount = 0;
		this.fadeoutCount = 0;
	},
	initListener: function() {
//		SMTH.EVENT_MANAGER.listen("characterSelected", function(e) {
//			this.board._level = SMTH.STATUS.CURRENT_LEVEL;
//			var row = this._level.row;
//			var col = this._level.col;
//
//			this.board._createMap(row, col);
//		}.bind(this));
		// 이벤트 핸들러 등록 하기 
		SMTH.EVENT_MANAGER.listen("attackEnd", function(e) {
			var pipes = SMTH.CONTAINER.PIPES;
			for (var i in pipes) {
				var block = pipes[i];
				// 아군은 교체하지 않음 
				if (block.isFriend()) continue;
				// HP가 남아있어도 교체하지 않음.
				if (block.getHP() > 0) continue;
				
				// 다른 녀석들은 교체할 녀석들.
				// 0.5초 애니메이션 후
				// NullBlock으로 교체
				this.fadeoutCount++;
				block.runAction(cc.sequence(
						cc.fadeOut(0.5), 
						cc.callFunc(function(block){
							this.replaceBlock(block);
							this.fadeoutCount--;
							if (this.fadeoutCount <= 0) {
								SMTH.EVENT_MANAGER.notice("fadeoutEnd");
							}
						}.bind(this, block))
				));
			}
		}.bind(this));
		
		SMTH.EVENT_MANAGER.listen("fadeoutEnd", function(e) {
			this.fallBlock();
		}.bind(this));
		
		SMTH.EVENT_MANAGER.listen("allBlockFallingEnd", function(e) {
			SMTH.EVENT_MANAGER.notice("slurp");	
		}); 
		
		SMTH.EVENT_MANAGER.listen("enemyDied", function(e) {
			cc.log("enemyDied");
			var deadEnemy = e.getUserData();
			this.replaceBlock(deadEnemy);
			SMTH.EVENT_MANAGER.notice("gameOver");
		}.bind(this));
	},
	_increaseBlockFalling : function() {
		this.blockFallingCount++;
	},
	_decreaseBlockFalling : function() {
		this.blockFallingCount--;
		if(this.blockFallingCount <= 0) 
			SMTH.EVENT_MANAGER.notice("allBlockFallingEnd");
	},
	replaceBlock: function(block) {
		var row = Number(block.row);
		var col = Number(block.col);
		var levelCol = this._level.col;

		var replacement = new NullBlock();
		if(block.isEnemy())
			replacement = block.getReplacementBlock();
		this.board.removeChild(block);
		
		// 블록의 화면 상의 위치를 세
		replacement.setPositionByRowCol(row, col);
		this.board.addChild(replacement);
		// 컨테이너 배열의 해당 인덱스에 참조를 저장
		SMTH.CONTAINER.PIPES[row*levelCol+col] = replacement;
	},
	fallBlock: function(){
		this.fallStep = 0;

		// 애니메이션큐 초기화
		var pipes = SMTH.CONTAINER.PIPES;
		for(var i in pipes) {
			var pipe = pipes[i];
			pipe.animationQueue = [];
		}
//		this._printBlockSnapshot();
		while(this._fallOneStep()){
//			this._printBlockSnapshot();
			this.fallStep++;
		};
//		this._printBlockSnapshot();
		this._updateBlockPotisionRender();
	},
	_fallOneStep: function() {
		// 한칸만 이동하도록 한다.
		var pipes = SMTH.CONTAINER.PIPES;
		// blockSwaped
		var blockSwaped = false;

		for (var r = 0; r < this._level.row; r++) {
			for (var c = 0; c < this._level.col; c++) {
				var pipe = this._getBlockWithRowAndColumn(r,c);
				if(pipe.type === BLOCK.TYPE.NULL && pipe.fillBlockExecuted === undefined) {
					var blank = pipe;
					// 나의 위에 있는 블록에 이리온나 라고 호출한다.
					// 내 위치에 할당 
					if(this._fillBlock(r,c) !== 0){
						blockSwaped = true;
					}
				}
			}
		}

		// 플래그 초기화
		for (var r = 0; r < this._level.row; r++) {
			for (var c = 0; c < this._level.col; c++) {
				var pipe = this._getBlockWithRowAndColumn(r,c);
				delete pipe.fillBlockExecuted;
			}
		}

		var pipes = SMTH.CONTAINER.PIPES;
		for(var i in pipes) {
			var pipe = pipes[i];
//			애니메이션 큐에 저장해두기
			pipe.appendAnimation(pipe.moveToProperPosition());
		}
		return blockSwaped;
	},
	_fillBlock: function(row, col) {
		// row가 맨 윗줄을 의미하면 새로운 파이프블록을 랜덤하게 생성해서 반환한다.
		if(row === this._level.row-1) {
			var newBlock = new Pipe(Pipe.getRandomPipeType(360));
			// 나중에 추가된 블록은 일정 시간 기다렸다가 움직여야 하나씩 떨어지는 것처럼 보임.
			newBlock.appendAnimation(new cc.DelayTime(this.fallStep * 0.2));
			// 맨 위에서 떨어지도록 초기 위치를 윗쪽으로 설정 
			newBlock.setPositionByRowCol(this._level.row, col);
			this.board.addChild(newBlock);
			return newBlock;
		}	

		var block = this._getBlockWithRowAndColumn(row, col);

		// block에 방문 플래그를 단다.
		block.fillBlockExecuted = true;

		// 블록이 내려갈 수 있는 놈이면 반환 한다.
		if(block.type !== BLOCK.TYPE.NULL && !block.fixed) {
			return block;
		}
		// 블록이 내려갈 수 없는 놈이면,
		if (block.type == BLOCK.TYPE.PIPE && block.fixed) {
			// 못 내려가겠다고 선언한다.
			return 0;
		}

		var result = this._fillBlock(row+1, col); // result :  내려갈 수 있는 유효한 블록이 반환됨 or 블록이 올 예정이라면 "기다려" 값이옴 or 끝까지 갔는데 확보실패했다면 "기다리지마"
		if(result instanceof Block) {
			this._swapBlock(block, result);
			// 여기서 리턴을 해주면 처음만나는 내려올 수 있는 블록만 내려오게 된다.
			return 1;
		} else if (result > 0) {
			// 기다려
			return result + 1;
		}

		// 만약 블록이 직하강할 수 없는 위치라면...
		// 여기서 대각선 위의 것을 고려하는 것을 구현한다
		if(col !== 0) {
			result = this._fillBlock(row+1, col-1);
			var temp;
			if (result instanceof Block) {
				this._swapBlock(block, result);
				// 여기서 리턴을 해주면 처음만나는 내려올 수 있는 블록만 내려오게 된다.
				return 1;
			} else if (result > 0) {
				// 양쪽을 모두 비교한 후 짧은 쪽을 선택한다.
				temp = result;
			}
		}

		if(col !== this._level.col - 1) {
			result = this._fillBlock(row+1, col+1);
			if (result instanceof Block) {
				this._swapBlock(block, result);
				return 1;
			} else if (result > 0) {
				return temp < result ? temp : result;
			}
		}

		return 0;
	},
	_swapBlock: function(b1, b2) {
		var levelCol = this._level.col;

		// 두번째 블록이 새로 생성된 블록이라면 row, col == -1.
		// 이 때, r1, c1 에 넣고 원래있던 블록을 소멸시킨다.
		if(b2.row === -1 && b2.col === -1) {
			b2.row = b1.row;
			b2.col = b1.col;
			var b2_raw_index = b2.getContainerIndex();
			SMTH.CONTAINER.PIPES[b2_raw_index] = b2;
			this.board.removeChild(b1);
		} else {
			// 모델(데이터)만 우선 바꾼다
			//// 파이프의 row col 을 교환
			var tempRow = b2.row;
			var tempCol = b2.col;
			b2.row = b1.row;
			b2.col = b1.col;
			b1.row = tempRow;
			b1.col = tempCol;
			//// 컨테이너에서 저장된 참조를 교환
			var b1_raw_index = b1.getContainerIndex(); // 블록의 row col 을 참고하여 컨테이너에서 존재해야될 인덱스를 계산해서 반환. 현재 컨테이너에서의 인덱스가 아닐 수 잇음!
			var b2_raw_index = b2.getContainerIndex();	
			SMTH.CONTAINER.PIPES[b2_raw_index] = b2;
			if (b1_raw_index < SMTH.CONTAINER.PIPES.length) {
				SMTH.CONTAINER.PIPES[b1_raw_index] = b1;
			} else {
				// null블록이 하늘 위로 스왑된경우
				// index가 Container 밖의 이상한 곳에 존재
				this.board.removeChild(b1);
			}

			// 스왑되어서 올라간 애는 플래그 삭제				
			delete b1.fillBlockExecuted;
		}
	},
	_updateBlockPotisionRender: function() {
		// 모델의(컨테이너) 좌표에 맞게 화면 상의 블록 스프라이트 좌표들을 업데이트하기 
		var pipes = SMTH.CONTAINER.PIPES;
		for(var i in pipes) {
			var pipe = pipes[i];
			if (pipe.animationQueue.length == 0 || pipe.animationQueue == null) {
				continue;
			}
			this._increaseBlockFalling();
			pipe.appendAnimation(cc.callFunc(this._decreaseBlockFalling.bind(this)));
			pipe.runAction(cc.sequence(pipe.animationQueue));
		}
	},
	_printBlockSnapshot: function() {
		var pipes = SMTH.CONTAINER.PIPES;
		var result ="";
		var resultArr =[];
		for(var i in pipes) {
			var pipe = pipes[i];
			result += this._getBlockExpression(pipe);
			if(result.length === this._level.col) {
				resultArr.push(result);
				result="";
			}
		}
		resultArr.reverse();
		cc.log("\n"+resultArr.join("\n"));
	},
	_getBlockExpression: function(block) {
		var type = block.type;
		var result="";
		if(type === 0) result+="0";
		else if(type === BLOCK.TYPE.FRIEND) result+="F";	
		else if(type === BLOCK.TYPE.ENEMY) result+="E";
		else if(type === 7000) result+="*";
		else if(type === BLOCK.TYPE.PIPE) {
			var pipeTypeCode= block.pipeType;
			var pipeKind = Math.floor(pipeTypeCode/1000);
			var pipeDirection = pipeTypeCode%1000;
			if(pipeKind === 0) result+="P";	
			if(pipeKind === 1) result+="L";	
			if(pipeKind === 2) {
				if(pipeDirection===90 ||pipeDirection===270) result+="-";
				else result+="I";
			}
			if(pipeKind === 3) result+="X";
			if(pipeKind === 4) result+="T";	
		}
		return result;
	},
	_getBlockWithRowAndColumn: function(row,col) {
		var pipes = SMTH.CONTAINER.PIPES;
		var introw = parseInt(row);
		var intcol = parseInt(col);
		var index = introw*(this._level.col) + intcol;
		return pipes[index];
	}
});