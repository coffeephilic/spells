function loadScript(path, callback){
	let head=document.getElementsByTagName("head")[0];
	let script=document.createElement("script");
	script.src=path;
	script.onload=callback;
	head.appendChild(script);
}

function getTextFromFile(path,callback){
	var xhttp=new XMLHttpRequest();
	xhttp.onreadystatechange=function(){
		if(this.readyState==4 && this.status==200){
			callback && callback(this.responseText);
		}
	}
	xhttp.open("GET",path,true);
	xhttp.send();
}

// Build the dictionary
loadScript("../lib/js/thirdParty/hunspell-spellchecker/lib/dictionary.js" //TODO: replace this after the dictionary.c.js file is finished
	,function(){loadScript("../lib/js/thirdParty/hunspell-spellchecker/lib/index.js"
		,function(){
			window.dictionary=new Spellchecker();
			var dictionaryPackage={aff:"",dic:""};
			let affIsLoaded=dicIsLoaded=false;
			function parseAttempt(){
				if(!affIsLoaded || !dicIsLoaded){return;}
				dictionary.use(dictionary.parse(dictionaryPackage));
			}
			getTextFromFile("dict/en_US.aff",function(text){
				dictionaryPackage.aff=text;
				affIsLoaded=true;
				parseAttempt();
			});
			getTextFromFile("dict/en_US.dic",function(text){
				dictionaryPackage.dic=text;
				dicIsLoaded=true;
				parseAttempt();
			});
		}
	);}
);

function Tile(letter,value){
	var self=this;
	this.letter=letter;
	this.value=value;
	this.type;
	this.block=false;
	this.player;
}

function Die(type, face=[]){
	var self=this;
	this.type=type;
	this.face=face;
	this.roll=function(){
		return this.face[Math.floor(Math.random()*this.face.length)];
	}
}

function Player(){
	var self=this;
	this.name="";
	this.score=0;
	this.hand=[]; // Deprecated; Tiles are now selected from Game.pool
	this.selectedTile;
	this.isBot=false;
	
	this.autoplay=function(){
		//TODO
	}
}

function Game(userName){
	var self=this;
	//this.dictionary=new Dictionary(); TODO: consider uncommenting this line after dictionary.c.js is finished
	this.board=[];
	this.pool=[];
	this.cup=[];
	this.lineup=[];
	this.currentPlayer=-1;
	
	// These methods get overwritten in whatever module is designated for the UI
	this.display=function(){}
	this.drawAnimation=function(tile,player){}
	this.rollAnimation=function(){}
	this.placeAnimation=function(tile,coord){}
	this.nextTurnAnimation=function(){}
	this.evaluteWordAnimation=function(coordCollection, word){}
	
	this.draw=function(player){ // Deprecated in favor of this.roll
		if(!this.pool.length){return;}
		this.pool.sort(function(){return 0.5-Math.random();});
		var tile=this.pool.pop();
		player.hand.push(tile);
		player.selectedTile=tile;
		tile.player=player;
		this.drawAnimation(tile, player);
	}
	this.roll=function(){
		this.cup.sort(function(){return 0.5-Math.random();});
		this.pool=[];
		for(var i=0; i<this.cup.length; i++){
			let t=this.cup[i].roll();
			let tile=new Tile(t.letter, t.value);
			tile.type=this.cup[i].type;
			this.pool.push(tile);
		}
		this.rollAnimation();
	}
	this.place=function(tile,coord){
		if(!tile || this.board[coord.x][coord.y].letter || this.board[coord.x][coord.y].block){return;}
		//let hand=tile.player.hand;
		tile.player=this.lineup[this.currentPlayer];
		let check=this.getWordFromBoard(coord,tile);
		if(this.board[coord.x][coord.y].type != 1
			&& (coord.x==0 || !this.board[coord.x-1][coord.y].letter)
			&& (coord.y==0 || !this.board[coord.x][coord.y-1].letter)
			&& (coord.x==this.board.length-1 || !this.board[coord.x+1][coord.y].letter)
			&& (coord.y==this.board[0].length-1 || !this.board[coord.x][coord.y+1].letter)
		){return;} // Tiles may only be played on starting squares or adjacent to other tiles
		//this.board[coord.x][coord.y]=hand.splice(hand.indexOf(tile),1)[0]; // Only if playing from the hand; If playing from the pool, then:
		this.board[coord.x][coord.y]=this.pool.splice(this.pool.indexOf(tile),1)[0];
		tile.player.selectedTile=null;
		this.placeAnimation(tile,coord);
		if(check.horizontalCoords.length > 1 && dictionary.check(check.horizontal)){this.evaluateWord(check.horizontalCoords, check.horizontalFill, check.bonus);}
		if(check.verticalCoords.length > 1 && dictionary.check(check.vertical)){this.evaluateWord(check.verticalCoords, check.verticalFill, check.bonus);}
		this.nextTurn();
	}
	this.getWordFromBoard=function(coord,placeholder){
		let output={};
		output.xMin=output.xMax=output.x=coord.x;
		output.yMin=output.yMax=output.y=coord.y;
		for(var i=coord.x-1; i>-1 && this.board[i][coord.y].letter; i--){output.xMin=i;}
		for(var i=coord.x+1; i<this.board.length && this.board[i][coord.y].letter; i++){output.xMax=i;}
		for(var i=coord.y-1; i>-1 && this.board[coord.x][i].letter; i--){output.yMin=i;}
		for(var i=coord.y+1; i<this.board[coord.x].length && this.board[coord.x][i].letter; i++){output.yMax=i;}
		output.horizontalCoords=[], output.verticalCoords=[];
		output.horizontal="", output.vertical="";
		for(var i=output.xMin; i<=output.xMax; i++){
			output.horizontal+=((placeholder && i==coord.x)?placeholder.letter:this.board[i][coord.y].letter);
			output.horizontalCoords.push({x:i,y:coord.y});
		}
		for(var i=output.yMin; i<=output.yMax; i++){
			output.vertical+=((placeholder && i==coord.y)?placeholder.letter:this.board[coord.x][i].letter);
			output.verticalCoords.push({x:coord.x,y:i});
		}
		//Find whether the letters fill the available spaces
		output.horizontalFill=(
			output.xMin != output.xMax // Range is more than one letter
			&& (output.xMin==0 || this.board[output.xMin-1][coord.y].block)
			&& (output.xMax==this.board.length-1 || this.board[output.xMax+1][coord.y].block)
		)?true:false;
		output.verticalFill=(
			output.yMin != output.yMax
			&& (output.yMin==0 || this.board[coord.x][output.yMin-1].block)
			&& (output.yMax==this.board[0].length-1 || this.board[coord.x][output.yMax+1].block)
		)?true:false;
		output.bonus=(
			(this.board[coord.x][coord.y].type==2 && placeholder.type===0)
			||(this.board[coord.x][coord.y].type==3 && placeholder.type>0)
		)?1:0;
		output.bonus+=(placeholder.type==3)?1:0; console.log("Bonus: "+output.bonus);
		return output;
	}
	this.evaluateWord=function(coordCollection, fillsContainer, bonus){
		// Scoring subject to change
		for(var i=0; i<coordCollection.length; i++){
			let tile=this.board[coordCollection[i].x][coordCollection[i].y];
			tile.player.score+=tile.value;
		}
		if(fillsContainer){this.lineup[this.currentPlayer].score+=1; console.log("Container filled, points+1");}
		this.currentPlayer.score+=bonus;
		this.evaluateWordAnimation(coordCollection);
	}
	this.nextTurn=function(){
		this.currentPlayer=(this.currentPlayer+1<this.lineup.length)?this.currentPlayer+1:0;
		this.nextTurnAnimation();
		let player=this.lineup[this.currentPlayer];
		// let handSize=5;
		// while(player.hand.length<handSize && this.pool.length){
		// 	this.draw(player);
		// }
		if(!this.pool.length){this.roll();}
		if(player.isBot){
			player.autoplay();
		}
	}
	
	// Build a two-dimensional array to represent the game board
	let boardSize={
		width: 15
		,height: 15
		,maxBranch: 4
		,startingSquare: 8
		,vowelBonus: 8
		,consonantBonus: 8
	};
	for(var i=0; i<boardSize.width; i++){
		let col=[];
		for(var j=0; j<boardSize.height; j++){
			col.push({block:true});
		}
		this.board.push(col);
	}
	// Carve out some space within the grid for the crossword
	let free=[]; // An array of coordinates pointing to free spaces
	let initialX=Math.floor(Math.random()*boardSize.width);
	let initialY=Math.floor(Math.random()*boardSize.height);
	this.board[initialX][initialY]={block:false};
	free.push({x:initialX,y:initialY});
	let maxSquares=Math.floor(boardSize.width*boardSize.height*.6)
	let end=boardSize.width*boardSize.height*16;
	for(var i=0; free.length<maxSquares && i<end; i++){
		let root=free[Math.floor(Math.random()*free.length)];
		let limit=Math.floor(Math.random()*boardSize.maxBranch);
		let overhead=boardSize.maxBranch-limit;
		let direction=Math.floor(Math.random()*4);
		function verticalClearance(x){
			return((root.y==0 || self.board[x][root.y-1].block)
				&& (root.y==boardSize.height-1 || self.board[x][root.y+1].block)
			)?true:false;
		}
		function horizontalClearance(y){
			return((root.x==0 || self.board[root.x-1][y].block)
				&& (root.x==boardSize.width-1 || self.board[root.x+1][y].block)
			)?true:false;
		}
		switch(direction){
			case 0: // Left
					for(var x=root.x-1; ( x>-1
						&& this.board[x][root.y].block
						&& root.x-x<=limit
						&& verticalClearance(x)
					); x--){
						this.board[x][root.y].block=false;
						free.push({x:x,y:root.y});
					}
				break;
			case 1: // Right
					for(var x=root.x+1; ( x<boardSize.width
						&& this.board[x][root.y].block
						&& x-root.x<=limit
						&& verticalClearance(x)
					); x++){
						this.board[x][root.y].block=false;
						free.push({x:x,y:root.y});
					}
				break;
			case 2: // Up
					for(var y=root.y-1; ( y>-1
						&& this.board[root.x][y].block
						&& root.y-y<=limit
						&& horizontalClearance(y)
					); y--){
						this.board[root.x][y].block=false;
						free.push({x:root.x,y:y});
					}
				break;
			case 3: // Down
					for(var y=root.y+1; ( y<boardSize.height
						&& this.board[root.x][y].block
						&& y-root.y<=limit
						&& horizontalClearance(y)
					); y++){
						this.board[root.x][y].block=false;
						free.push({x:root.x,y:y});
					}
				break;
		}
	}
	// Scatter some bonuses among the unblocked squares
	let typePool=[];
	for(var i=0; i<boardSize.startingSquare; i++){typePool.push(1);}
	for(var i=0; i<boardSize.vowelBonus; i++){typePool.push(2);}
	for(var i=0; i<boardSize.consonantBonus; i++){typePool.push(3);}
	typePool.sort(function(){return 0.5-Math.random();});
	while(typePool.length){
		let s=free[Math.floor(Math.random()*free.length)];
		if(!this.board[s.x][s.y].type
			&& (s.x==0 || !this.board[s.x-1][s.y].type)
			&& (s.y==0 || !this.board[s.x][s.y-1].type)
			&& (s.x==this.board.length-1 || !this.board[s.x+1][s.y].type)
			&& (s.y==this.board[0].length-1 || !this.board[s.x][s.y+1].type)
		){
			this.board[s.x][s.y].type=typePool.pop();
		}
	}
	
	// Populate the pool with tiles
	/* // This was just for development and testing purposes.  We're not actually going to use Scrabble tiles.
	let t=[
		{l: "A", v: 1, quant: 9}
		,{l: "B", v: 3, quant: 2}
		,{l: "C", v: 3, quant: 2}
		,{l: "D", v: 2, quant: 4}
		,{l: "E", v: 1, quant: 12}
		,{l: "F", v: 4, quant: 2}
		,{l: "G", v: 2, quant: 3}
		,{l: "H", v: 4, quant: 2}
		,{l: "I", v: 1, quant: 9}
		,{l: "J", v: 8, quant: 1}
		,{l: "K", v: 5, quant: 1}
		,{l: "L", v: 1, quant: 4}
		,{l: "M", v: 3, quant: 2}
		,{l: "N", v: 1, quant: 6}
		,{l: "O", v: 1, quant: 8}
		,{l: "P", v: 3, quant: 2}
		,{l: "Q", v: 10, quant: 1}
		,{l: "R", v: 1, quant: 6}
		,{l: "S", v: 1, quant: 4}
		,{l: "T", v: 1, quant: 6}
		,{l: "U", v: 1, quant: 4}
		,{l: "V", v: 4, quant: 2}
		,{l: "W", v: 4, quant: 2}
		,{l: "X", v: 8, quant: 1}
		,{l: "Y", v: 4, quant: 2}
		,{l: "Z", v: 10, quant: 1}
	];
	for(var i=0; i<t.length; i++){
		for(var j=0; j<t[i].quant; j++){
			this.pool.push(new Tile(t[i].l,t[i].v));
		}
	}
	*/
	
	// Populate the cup with dice
	// t:0=vowels
	// t:1=common consonants
	// t:2=not-so-common consonants
	// t:3=rare consonants
	let d=[
		{t:0, f:["A","E","I","O","U","Y"]}
		,{t:0, f:["A","E","I","O","U","E"]}
		,{t:0, f:["A","E","I","O","U","E"]}
		,{t:0, f:["A","E","I","O","U","A"]}
		,{t:1, f:["G","H","R","S","T","L"]}
		,{t:1, f:["N","M","R","S","T","B"]}
		,{t:1, f:["N","P","W","S","T","L"]}
		,{t:1, f:["N","B","R","S","G","H"]}
		,{t:2, f:["C","L","P","W","D","K"]}
		,{t:2, f:["C","L","P","W","D","K"]}
		,{t:2, f:["C","L","P","W","D","K"]}
		,{t:2, f:["C","L","P","W","D","K"]}
		,{t:3, f:["F","V","Q","X","Z","J"]}
		,{t:3, f:["F","V","Q","X","Z","J"]}
		,{t:3, f:["F","V","Q","X","Z","J"]}
	];
	for(var i=0; i<d.length; i++){
		let face=[];
		for(var j=0; j<d[i].f.length; j++){
			face.push(new Tile(d[i].f[j],1));
		}
		this.cup.push(new Die(d[i].t,face));
	}
	// Populate the lineup with players
	let n=(userName)?userName:[
		"Player 1"
		,"Player 2"
		,"Player 3"
		,"Player 4"
	];
	for(var i=0; i<n.length; i++){
		this.lineup.push(new Player());
		this.lineup[i].name=n[i];
	}
	this.nextTurn();
}