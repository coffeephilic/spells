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
loadScript("/../lib/js/thirdParty/hunspell-spellchecker/lib/dictionary.js" //TODO: replace this after the dictionary.c.js file is finished
	,function(){loadScript("/../lib/js/thirdParty/hunspell-spellchecker/lib/index.js"
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
	this.player;
}

function Player(){
	var self=this;
	this.name="";
	this.score=0;
	this.hand=[];
	this.selectedTile;
	this.isBot=false;
	
	this.autoplay=function(){
		//TODO
	}
}

function Game(){
	var self=this;
	//this.dictionary=new Dictionary(); TODO: consider uncommenting this line after dictionary.c.js is finished
	this.board=[];
	this.pool=[];
	this.lineup=[];
	this.currentPlayer=-1;
	
	// These methods get overwritten in whatever module is designated for the UI
	this.display=function(){}
	this.drawAnimation=function(tile,player){}
	this.placeAnimation=function(tile,coord){}
	this.nextTurnAnimation=function(){}
	this.evaluteWordAnimation=function(coordCollection, word){}
	
	this.draw=function(player){
		if(!this.pool.length){return;}
		this.pool.sort(function(){return 0.5-Math.random();});
		var tile=this.pool.pop();
		player.hand.push(tile);
		player.selectedTile=tile;
		tile.player=player;
		this.drawAnimation(tile, player);
	}
	this.place=function(tile,coord){
		if(!tile || this.board[coord.x][coord.y].letter){return;}
		let hand=tile.player.hand;
		let check=this.getWordFromBoard(coord,tile.letter);
		// TODO: if(this is not a legal move){return;}
		this.board[coord.x][coord.y]=hand.splice(hand.indexOf(tile),1)[0];
		tile.player.selectedTile=null;
		this.placeAnimation(tile,coord);
		if(check.horizontalCoords.length > 1 && dictionary.check(check.horizontal)){this.evaluateWord(check.horizontalCoords);}
		if(check.verticalCoords.length > 1 && dictionary.check(check.vertical)){this.evaluateWord(check.verticalCoords);}
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
			output.horizontal+=((placeholder && i==coord.x)?placeholder:this.board[i][coord.y].letter);
			output.horizontalCoords.push({x:i,y:coord.y});
		}
		for(var i=output.yMin; i<=output.yMax; i++){
			output.vertical+=((placeholder && i==coord.y)?placeholder:this.board[coord.x][i].letter);
			output.verticalCoords.push({x:coord.x,y:i});
		}
		return output;
	}
	this.evaluateWord=function(coordCollection, word){
		// Scoring subject to change
		for(var i=0; i<coordCollection.length; i++){
			let tile=this.board[coordCollection[i].x][coordCollection[i].y];
			tile.player.score+=tile.value;
		}
		this.evaluateWordAnimation(coordCollection, word);
	}
	this.nextTurn=function(){
		this.currentPlayer=(this.currentPlayer+1<this.lineup.length)?this.currentPlayer+1:0;
		this.nextTurnAnimation();
		let player=this.lineup[this.currentPlayer];
		let handSize=5;
		while(player.hand.length<handSize && this.pool.length){
			this.draw(player);
		}
		if(player.isBot){
			player.autoplay();
		}
	}
	
	// Build a two-dimensional array to represent the game board
	let boardSize={
		width: 15
		,height: 15
	};
	for(var i=0; i<boardSize.width; i++){
		let col=[];
		for(var j=0; j<boardSize.height; j++){
			col.push({});
		}
		this.board.push(col);
	}
	
	// Populate the pool with tiles
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
	
	// Populate the lineup with players
	let playerCount=4;
	let defaultPlayerName=[
		"Player 1"
		,"Player 2"
		,"Player 3"
		,"Player 4"
	];
	for(var i=0; i<playerCount; i++){
		this.lineup.push(new Player());
		this.lineup[i].name=defaultPlayerName[i];
	}
	this.nextTurn();
}