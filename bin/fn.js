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
/* // Third party dictionary for build purposes; replace this after the dictionary.c.js file is finished
loadScript("../lib/js/thirdParty/hunspell-spellchecker/lib/dictionary.js"
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
*/
loadScript("/lib/js/dictionary.c.js",function(){
	window.dictionary=new Dictionary("dict/en_US.dic","dict/en_US.aff");
});

//Tile(<string> letter, <int> value, <int> die)
function Tile(letter,value,die){
	var self=this;
	this.letter=letter;
	this.value=value;
	this.die=die;
	this.type;
	this.block=false;
	this.player;
}

//Die(<int> type, array<string> face)
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
	//this.hand=[]; // Deprecated; Tiles are now selected from Game.pool
	this.mana=[0,0,0,0];
	this.movesAvailable=0;
	this.stretch=false;
	this.selectedTile;
	this.isBot=false;
	
	this.autoplay=function(){
		//TODO
	}
}

function Game(userName){
	var self=this;
	this.board=[];
	this.pool=[];
	this.cup=[];
	this.lineup=[];
	this.currentPlayer=-1;
	
	// These methods get overwritten in whatever module is designated for the UI
	this.display=function(){}
	//this.drawAnimation=function(tile,player){} // Deprecated
	this.rollAnimation=function(){}
	this.placeAnimation=function(tile,coord){}
	this.nextTurnAnimation=function(){}
	this.updateMeterAnimation=function(){}
	this.evaluteWordAnimation=function(coordCollection, word){}
	this.winAnimation=function(player){}
	
	/*
	this.draw=function(player){ // Deprecated in favor of this.roll
		if(!this.pool.length){return;}
		this.pool.sort(function(){return 0.5-Math.random();});
		var tile=this.pool.pop();
		player.hand.push(tile);
		player.selectedTile=tile;
		tile.player=player;
		this.drawAnimation(tile, player);
	}
	*/
	this.roll=function(){
		let cup=[];
		function isInPool(die){
			for(var i=0; i<self.pool.length; i++){
				if(self.pool[i].die==die){return true;}
			}
			return false;
		}
		for(var i=0; i<this.cup.length; i++){
			if(!isInPool(i)){
				cup.push(this.cup[i]);
			}
		}
		cup.sort(function(){return 0.5-Math.random();});
		for(var i=0; i<cup.length; i++){
			let t=cup[i].roll();
			let tile=new Tile(t.letter, t.value, self.cup.indexOf(cup[i]));
			tile.type=cup[i].type;
			this.pool.push(tile);
		}
		this.rollAnimation();
	}
	this.place=function(tile,coord){
		if(!tile || !coord){return;}
		let player=this.lineup[this.currentPlayer];
		let x=coord.x, y=coord.y;
		let square=this.board[x][y];
		if(square.letter || square.block || !player.movesAvailable){return;}
		//let hand=tile.player.hand;
		tile.player=player;
		let check=this.getWordFromBoard(coord,tile);
		if(square.type != 4
			&& !(square.dist==1)
			&& !(player.stretch && square.dist==2)
			/*
			&& (x==0 || !this.board[x-1][y].letter)
			&& (y==0 || !this.board[x][y-1].letter)
			&& (x==this.board.length-1 || !this.board[x+1][y].letter)
			&& (y==this.board[0].length-1 || !this.board[x][y+1].letter)
			*/
		){return;} // Tiles may only be played on starting squares or adjacent to other tiles, or over a gap if the stretch spell is active
		
		square.dist=0;
		function setDist(pos,dist){
			if(!pos || pos.block){return;}
			if(pos.dist==null){pos.dist=dist;}
			else{pos.dist=Math.min(pos.dist,dist);} if(isNaN(pos.dist)){console.log(pos);}
		}
		if(x>0){setDist(this.board[x-1][y],1);}
		if(y>0){setDist(this.board[x][y-1],1);}
		if(x<this.board.length-1){setDist(this.board[x+1][y],1);}
		if(y<this.board[0].length-1){setDist(this.board[x][y+1],1);}
		if(x>1){setDist(this.board[x-2][y],2);}
		if(y>1){setDist(this.board[x][y-2],2);}
		if(x<this.board.length-2){setDist(this.board[x+2][y],2);}
		if(y<this.board[0].length-2){setDist(this.board[x][y+2],2);}
		
		//this.board[x][y]=hand.splice(hand.indexOf(tile),1)[0]; // Only if playing from the hand; If playing from the pool, then:
		this.board[x][y]=this.pool.splice(this.pool.indexOf(tile),1)[0];
		player.selectedTile=null;
		player.movesAvailable-=1;
		this.placeAnimation(tile,coord);
		if(check.horizontalCoords.length > 1 
			&& check.horizontalFill
			&& dictionary.isWord(check.horizontal.toLowerCase())
		){this.evaluateWord(check.horizontalCoords, true, check.bonus);}
		if(check.verticalCoords.length > 1
			&& check.verticalFill
			&& dictionary.isWord(check.vertical.toLowerCase())
		){this.evaluateWord(check.verticalCoords, true, check.bonus);}
		player.mana[tile.type]+=(player.mana[tile.type]>=3)?0:1;
		if(tile.type==square.type){
			player.mana[tile.type]+=(player.mana[tile.type]>=3)?0:1;
		}
		this.updateMeterAnimation();
	}
	this.getWordFromBoard=function(coord,placeholder){
		let x=coord.x, y=coord.y;
		let output={};
		output.xMin=output.xMax=output.x=x;
		output.yMin=output.yMax=output.y=y;
		for(var i=x-1; i>-1 && this.board[i][y].letter; i--){output.xMin=i;}
		for(var i=x+1; i<this.board.length && this.board[i][y].letter; i++){output.xMax=i;}
		for(var i=y-1; i>-1 && this.board[x][i].letter; i--){output.yMin=i;}
		for(var i=y+1; i<this.board[x].length && this.board[x][i].letter; i++){output.yMax=i;}
		output.horizontalCoords=[], output.verticalCoords=[];
		output.horizontal="", output.vertical="";
		for(var i=output.xMin; i<=output.xMax; i++){
			output.horizontal+=((placeholder && i==x)?placeholder.letter:this.board[i][y].letter);
			output.horizontalCoords.push({x:i,y:y});
		}
		for(var i=output.yMin; i<=output.yMax; i++){
			output.vertical+=((placeholder && i==y)?placeholder.letter:this.board[x][i].letter);
			output.verticalCoords.push({x:x,y:i});
		}
		//Find whether the letters fill the available spaces
		output.horizontalFill=(
			output.xMin != output.xMax // Range is more than one letter
			&& (output.xMin==0 || this.board[output.xMin-1][y].block)
			&& (output.xMax==this.board.length-1 || this.board[output.xMax+1][y].block)
		)?true:false;
		output.verticalFill=(
			output.yMin != output.yMax
			&& (output.yMin==0 || this.board[x][output.yMin-1].block)
			&& (output.yMax==this.board[0].length-1 || this.board[x][output.yMax+1].block)
		)?true:false;
		output.bonus=(
			(this.board[x][y].type==2 && placeholder.type===0)
			||(this.board[x][y].type==3 && placeholder.type>0)
		)?1:0;
		output.bonus+=(placeholder.type==3)?1:0;
		return output;
	}
	this.evaluateWord=function(coordCollection, fillsContainer, bonus){
		// Scoring subject to change
		for(var i=0; i<coordCollection.length; i++){
			let tile=this.board[coordCollection[i].x][coordCollection[i].y];
			tile.player.score+=tile.value;
		}
		if(fillsContainer){this.lineup[this.currentPlayer].score+=1;}
		this.currentPlayer.score+=bonus;
		this.evaluateWordAnimation(coordCollection);
	}
	this.nextTurn=function(){
		//Check for winner
		if(this.currentPlayer>=0){
			let goal=15;
			if(this.lineup[this.currentPlayer].score>=goal){
				this.win(this.lineup[this.currentPlayer]);
			}
			for(var p=(this.currentPlayer+1<this.lineup.length)?this.currentPlayer+1:0; 
					this.currentPlayer!=p; 
					p=(p+1<this.lineup.length)?p+1:0){
				if(this.lineup[p].score>=goal){
					this.win(this.lineup[p]);
					break;
				}
			}
		}
		
		this.currentPlayer=(this.currentPlayer+1<this.lineup.length)?this.currentPlayer+1:0;;
		let player=this.lineup[this.currentPlayer];
		player.movesAvailable=1;
		player.stretch=false;
		this.roll();
		this.nextTurnAnimation();
		this.updateMeterAnimation();
		if(player.isBot){
			player.autoplay();
		}
	}
	
	//Define the spells
	//Spells functions return true on success or false on failure to signal to the DOM whether to update
	
	this.reroll=function(selection){ // array<int> selection, referring to indices of game.pool
		let player=this.lineup[this.currentPlayer];
		if(player.mana[0]<3 || !selection.length){return false;}
		selection.sort((a,b)=>{return b-a;});
		for(var i in selection){
			game.pool.splice(selection[i],1);
		}
		this.roll();
		player.mana[0]-=3;
		this.updateMeterAnimation();
		return true;
	};
	this.stretch=function(){
		let player=this.lineup[this.currentPlayer];
		if(player.mana[1]<3){return false;}
		player.stretch=true;
		player.mana[1]-=3;
		this.updateMeterAnimation();
		return true;
	};
	this.extraMove=function(){
		let player=this.lineup[this.currentPlayer];
		if(player.mana[2]<3){return false;}
		player.movesAvailable+=1;
		player.mana[2]-=3;
		this.updateMeterAnimation();
		return true;
	};
	this.addWildcard=function(letter, isFullHouse=false){ // <string> letter, <bool>isFullHouse
		let player=this.lineup[this.currentPlayer];
		let hasEnoughMana=(
			(!isFullHouse && player.mana[3]>=3) ||
			(isFullHouse && player.mana[0] && player.mana[1] && player.mana[2] && player.mana[3])
		);
		if(!hasEnoughMana || !letter.length){return false;}
		letter=letter[0].toUpperCase();
		if(!("ABCDEFGHIJKLMNOPQRSTUVWXYZ").includes(letter)){return false;} //I know I can do this with regex, but I want to use an enumerated list to avoid edge cases like diacritics or anything else that I may not have thought about.
		let tile=new Tile(letter, 0);
		tile.type=5;
		this.pool.push(tile);
		if(isFullHouse){
			player.mana[0]-=1;
			player.mana[1]-=1;
			player.mana[2]-=1;
			player.mana[3]-=1;
		}
		else{
			player.mana[3]-=3;
		}
		this.updateMeterAnimation();
		return true;
	};
	
	this.win=function(player){
		this.winAnimation(player);
	}
	
	// Populate the cup with dice
	// t:0=vowels (circle)
	// t:1=common consonants (diamond)
	// t:2=not-so-common consonants (pentagon)
	// t:3=rare consonants (flower)
	let d=[
		{t:0, f:["A","E","I","O","U","Y"]}
		,{t:0, f:["A","E","I","O","U","Y"]}
		,{t:1, f:["D","L","N","R","S","T"]}
		,{t:1, f:["D","L","N","R","S","T"]}
		,{t:2, f:["B","C","G","H","M","P"]}
		,{t:3, f:["F","J","K","Qu","V","W","X","Z"]}
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
	
	// Build a two-dimensional array to represent the game board
	let boardSize;
	switch(this.lineup.length){
		case 2:
			boardSize={
				width: 8
				,height: 8
				,maxBranch: 3
				,startingSquare: 6
			};
			break;
		case 3:
			boardSize={
				width: 12
				,height: 12
				,maxBranch: 3
				,startingSquare: 8
			};
			break;
		default:
			boardSize={
				width: 15
				,height: 15
				,maxBranch: 3
				,startingSquare: 12
			};
	}
	for(var i=0; i<boardSize.width; i++){
		let col=[];
		for(var j=0; j<boardSize.height; j++){
			col.push({block:true});
		}
		this.board.push(col);
	}
	// Carve out some space within the grid for the crossword
	let free=[]; // An array of coordinates pointing to free spaces
	//let initialX=Math.floor(Math.random()*boardSize.width);
	let initialX=0;
	let initialY=Math.floor(Math.random()*boardSize.height);
	this.board[initialX][initialY]={block:false};
	free.push({x:initialX,y:initialY});
	//let maxSquares=Math.floor(boardSize.width*boardSize.height*boardSize.maxBranch*0.15);
	let maxSquares=Math.floor(boardSize.width*boardSize.height*.6);
	let end=boardSize.width*boardSize.height*72/boardSize.maxBranch;
	for(var i=0; free.length<maxSquares && i<end; i++){
		let root=free[Math.floor(Math.random()*free.length)];
		let limit=Math.floor(Math.random()*boardSize.maxBranch);
		let overhead=boardSize.maxBranch+1-limit;
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
		var canContinue=false;
		switch(direction){
			case 0: // Left
					for(var x=root.x+1; (x<=root.x+overhead && root.x<this.board.length); x++){
						if(x>=this.board.length-1 || this.board[x][root.y].block){canContinue=true; break;}
					}
					if(!canContinue){break;}
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
					for(var x=root.x-1; (x>=root.x-overhead && root.x>-1); x--){//look backward to check the total length of the word
						if(x<=0 || this.board[x][root.y].block){canContinue=true; break;}
					}
					if(!canContinue){break;}
					for(var x=root.x+1; ( x<boardSize.width //is not the last square
						&& this.board[x][root.y].block //is not a free space
						&& x-root.x<=limit //is not too far from starting point
						&& verticalClearance(x) //is not on diagonal with free spaces
					); x++){
						this.board[x][root.y].block=false;
						free.push({x:x,y:root.y});
					}
				break;
			case 2: // Up
					for(var y=root.y+1; (y<=root.y+overhead && root.y<this.board[0].length); y++){
						if(y>=this.board[0].length-1 || this.board[root.x][y].block){canContinue=true; break;}
					}
					if(!canContinue){break;}
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
					for(var y=root.y-1; (y>=root.y-overhead && root.y>-1); y--){
						if(y<=0 || this.board[root.x][y].block){canContinue=true; break;}
					}
					if(!canContinue){break;}
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
	// Distribute starting squares, with bias in favor of the first square in a row or column
	function isWordStart(coord){
		if(
			(coord.x==0 || self.board[coord.x-1][coord.y].block)
			&&(coord.y==0 || self.board[coord.x][coord.y-1].block)
		){return true;}
		return false;
	}
	let wordStart=[];
	for(var i=0; i<free.length; i++){
		if(isWordStart(free[i])){
			wordStart.push(i);
		}
	}
	wordStart.sort(()=>{return Math.random()-.5;});
	let bias=Math.floor(boardSize.startingSquare*0.6);
	let selectedStartingSquares=0;
	for(var i=0; i<wordStart.length && selectedStartingSquares<bias; i++){ // Assign starting squares first
		let s=free[wordStart[i]];
		this.board[s.x][s.y].type=4;
		selectedStartingSquares++;
	}
	while(selectedStartingSquares<boardSize.startingSquare){ // Assign free squares next
		let s=free[Math.floor(Math.random()*free.length)];
		if(!this.board[s.x][s.y].type
			&& (s.x==0 || !this.board[s.x-1][s.y].type)
			&& (s.y==0 || !this.board[s.x][s.y-1].type)
			&& (s.x==boardSize.width-1 || !this.board[s.x+1][s.y].type)
			&& (s.y==boardSize.height-1 || !this.board[s.x][s.y+1].type)
		){
			this.board[s.x][s.y].type=4;
			selectedStartingSquares++;
		}
	}
	
	// Distribute bonuses among remaining squares
	let type={
		0:{weight:2, range:null},
		1:{weight:2, range:null},
		2:{weight:1, range:null},
		3:{weight:1, range:null}
	}
	let total=0;
	for(c in type){total+=type[c].weight;}
	let accumulator=0;
	for(c in type){
		accumulator+=type[c].weight/total;
		type[c].range=accumulator;
	}
	for(var i=0; i< free.length; i++){
		let square=this.board[free[i].x][free[i].y];
		if(square.type){continue;}
		let random=Math.random();
		for(c in type){
			if(random<type[c].range){square.type=parseInt(c); break;}
		}
	}
	/*
	boardSize.startingSquare=0;
	for(var i=0; i<free.length; i++){
		if(isWordStart(free[i])){
			boardSize.startingSquare++;
		}
	}
	
	let typePool=[];
	let startingPool=[];
	for(var i=0; i<boardSize.startingSquare; i++){
		if(Math.random()*100<60){startingPool.push(1);} // about 60% of starting squares will land at the beginning of a word
		else{typePool.push(1);}
	}
	for(var i=0; i<boardSize.vowelBonus; i++){typePool.push(2);}
	for(var i=0; i<boardSize.consonantBonus; i++){typePool.push(3);}
	typePool.sort(function(){return 0.5-Math.random();});
	while(startingPool.length){
		var s=free[Math.floor(Math.random()*free.length)];
		if(this.board[s.x][s.y].type ||
			!isWordStart(s)
		){continue;}
		this.board[s.x][s.y].type=startingPool.pop();
	}
	for(var i=0; (typePool.length && i<end); i++){
		var s=free[Math.floor(Math.random()*free.length)];
		if(!this.board[s.x][s.y].type
			&& (s.x==0 || !this.board[s.x-1][s.y].type)
			&& (s.y==0 || !this.board[s.x][s.y-1].type)
			&& (s.x==this.board.length-1 || !this.board[s.x+1][s.y].type)
			&& (s.y==this.board[0].length-1 || !this.board[s.x][s.y+1].type)
		){
			this.board[s.x][s.y].type=typePool.pop();
		}
	}
	*/
	
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
	
	
	this.nextTurn();
}