function Dictionary(){
	var self=this;
	this.affRule=[];
	this.wordList=[];
	
	this.loadDict=function(path){
		function Rule(){
			this.type;
			this.mix;
			this.variant=[];
			
			this.apply(string){
				for(var v in this.variant){
					// TODO: distinguish between prefixes and suffixes
					if(string.match(new RegExp(v.condition))){ // TODO: this condition is probably wrong
						// TODO: remove letters
						// TODO: add letters
						break;
					}
				}
			}
		}
		
		// Following code for development only
		// Delete below after the function is complete
		let words=["apple","banana","cherry","durian"];
		words.forEach(function(w){
			self.wordList[w]=true;
		});
		// Delete above after the function is complete
	}
	this.isWord=function(string){
		return (this.wordList[string])?true:false;
	}
	
	
}