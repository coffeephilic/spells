/* //

// Dictionary(dicPath<string>, affPath<string>, onLoad<function>)

// This is a minimal implementation of the Hunspell format, designed to satisfy the need
// for a regular expression dictionary search in English.  It does not support continuation
// classes, compounding, or suggestions at this time.

// */

function Dictionary(dicPath, affPath, onLoad){
	var self=this;
	this.affRule=[];
	this.wordList=[];
	this.caseSensitive=true;
	this.onLoad=onLoad;
	
	this.parseDict=function(dicFileContents, affFileContents){
		function Rule(){
			this.mix;
			this.type;
			this.variant=[];
			
			this.apply=function(string){
				for(var i=0; i<this.variant.length; i++){
					if(string.match(this.variant[i].condition)){
						return result=string.replace(this.variant[i].remove,this.variant[i].add);
					}
				}
			}
		}
		
		let affLine=affFileContents.split(/\n/);
		for(var i in affLine){
			if(!affLine[i].match(/\S/)){continue;}
			let param=affLine[i].split(/\s+/);
			if(param[0]=="PFX" || param[0]=="SFX"){
				let rule=this.affRule[param[1]];
				if(rule){
					var v={};
					if(param[0]=="PFX"){
						v.condition=new RegExp("^"+param[4]);
						v.remove=new RegExp("^"+((param[2]==="0")?"":param[2]));
					}else{
						v.condition=new RegExp(param[4]+"$");
						v.remove=new RegExp(((param[2]==="0")?"":param[2])+"$");
					}
					v.add=param[3];
					rule.variant.push(v);
				}else{
					rule=new Rule();
					rule.mix=(param[2]=="Y")?true:false;
					rule.type=param[0];
					this.affRule[param[1]]=rule;
				}
			}
		}
		
		let dicLine=dicFileContents.split(/\n/);
		for(var i in dicLine){
			if(!dicLine[i].match(/\S/)){continue;}
			let line=dicLine[i].split("/");
			this.wordList.push(line[0]);
			
			let pfx=[],sfx=[],wordRules=[];
			for(var j in line[1]){
				let r=line[1][j];
				if(!this.affRule[r]){continue;}
				wordRules.push(r);
				if(this.affRule[r].mix){
					if(this.affRule[r].type=="PFX"){
						pfx.push(r);
					}else{
						sfx.push(r);
					}
				}
			}
			for(var j in pfx){
				for(var k in sfx){
					wordRules.push(pfx[j]+sfx[k]);
				}
			}
			
			for(var j in wordRules){
				let result=line[0];
				for(var k in wordRules[j]){
					result=this.affRule[wordRules[j][k]].apply(result);
				}
				this.wordList.push(result);
			}
		}
		
		this.wordList.sort(function(a,b){
			return(a>b)?1:-1;
		});
		for(var i=this.wordList.length-1; i>1; i--){
			if(this.wordList[i]==this.wordList[i-1]){this.wordList.splice(i,1);}
		}
		
		this.onLoad && this.onLoad();
	}
	this.match=function(string){
		let regex=new RegExp("^"+string+"$", (this.caseSensitive?"":"i")+"u");
		let result=this.wordList.filter(word => word.match(regex));
		return result;
	}
	this.isWord=function(string){
		return (this.match(string).length)?true:false;
	}
	
	this.loadDict=function(dicPath, affPath){
		var loaded={dic:false, aff:false,dicFileContents:null,affFileContents:null};
		var xhttp0=new XMLHttpRequest();
		xhttp0.onreadystatechange=function(){
			if(this.readyState==4 && this.status==200){
				loaded.dic=true;
				loaded.dicFileContents=this.responseText;
				if(loaded.aff
					&& loaded.dicFileContents
					&& loaded.affFileContents
					){
					self.parseDict(loaded.dicFileContents,loaded.affFileContents);
				}
			}
		}
		xhttp0.open("GET",dicPath,true);
		xhttp0.send();
		
		var xhttp1=new XMLHttpRequest();
		xhttp1.onreadystatechange=function(){
			if(this.readyState==4 && this.status==200){
				loaded.aff=true;
				loaded.affFileContents=this.responseText;
				if(loaded.dic
					&& loaded.dicFileContents
					&& loaded.affFileContents
					){
					self.parseDict(loaded.dicFileContents,loaded.affFileContents);
				}
			}
		}
		xhttp1.open("GET",affPath,true);
		xhttp1.send();
	}
	
	if(dicPath && affPath){this.loadDict(dicPath, affPath);}
}