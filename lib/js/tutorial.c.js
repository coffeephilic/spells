/*//

// The two exposed endpoints are Tutorial.addStep() and Tutorial.start().
//
// Tutorial.addStep(text,focus,completionCondition,onActivate,onComplete)
//		text<string || function || object>
//			display text, or a function that returns a string for the display text.
//			If an object, all properties override properties of the step.
//		focus<element || function> (optional)
//			element that should be highlighted and in the foreground, or a function that
//			returns such an element
//		completionCondition<string> ("clickAnywhere" || "clickOn" || "event")
//			how to advance to the next step
//			if "event", you can put Tutorial.complete(stepId<string>)
//			in the code wherever the event is satisfied.
//		onActivate<function> (optional)
//			function that runs after the step is displayed and before user action
//		onComplete<function> (optional)
//			function that runs after user action and after display is removed


//*/

//CSS

(()=>{
	let rule=[
		`html {
			--background: #EEEEEE;
			--backgroundInactive: #C0C0C0;
			--borderRadius: 8px;
			--matteBlur: 1.5px;
		}`
		,`#tutorial {
			position: fixed;
			display: none;
			width: 100vw;
			height: 100vh;
			top: 0;
			left: 0;
			z-index: 200;
		}`
		,`#tutorial.active {
			display: block;
		}`
		,`#tutorial .skip {
			display: none;
			position: absolute;
			top: 2px;
			right: 2px;
			cursor: pointer;
			user-select: none;
		}`
		,`#tutorial.skippable .skip {
			display: block;
		}`
		,`#tutorial .hole {
			position: absolute;
			box-shadow: 0 0 0 9999px var(--backgroundInactive);
			opacity: 0.8;
			transition: .4s;
			border: 4px solid transparent;
			margin: -4px;
			border-radius: var(--borderRadius);
			z-index: -10;
		}`
		,`#tutorial .step {
			display: inline;
			position: absolute;
			top: 50%;
			left: 50%;
			padding: 4px;
			margin: -4px;
			transform: translate(-50%, -50%);
			z-index: 10;
		}`
		,`#tutorial .step::before {
			content: "";
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			z-index:-1;
			background-color: var(--background);
			opacity: 0.6;
			border-radius: var(--borderRadius);
			backdrop-filter: blur(var(--matteBlur));
		}`
	];
	
	let style=document.createElement("style");
	style.id="tutorial";
	document.head.appendChild(style);
	for(var i=0; i<rule.length; i++){
		style.sheet.insertRule(rule[i],i);
	}
})();

//JS

function Tutorial(){
	var self=this;
	this.container=document.createElement("div");
	this.hole=document.createElement("div");
	this.skipButton=document.createElement("div");
	this.skipButtonLabel=document.createElement("span");
	this.sequence=[];
	this.currentStep=0;
	this.skippable=true;
	
	//this.populateSkipButtonLabel=()=>{} // override this function to create a customized label.
	//this.onStart=()=>{} //override this to provide a callback for the start function.
	//this.onSkip=()=>{} //override this to provide a callback for the skip function.
	
	this.complete=function(id){
		next(id);
	};
	
	function next(){}
	
	function Step(text,focus,completionCondition="clickAnywhere",onActivate,onComplete){
		var step=this;
		this.id;
		this.text;
		this.element=document.createElement("div");
		this.focus=focus;
		this.completionCondition=completionCondition;
		this.onActivate=onActivate;
		this.onComplete=onComplete;
		this.activationDelay=0;
		switch (typeof text){
			case "object":
				for(var i in text){this[i]=text[i];}
				break;
			case "string":
				this.text=text;
				break;
			case "function":
				this.text=text;
				break;
		}
		
		this.activate=function(){
			clear();
			self.container.appendChild(this.element);
			switch(typeof this.text){
				case "function": this.element.innerText=this.text();
					break;
				case "string": this.element.innerText=this.text;
					break;
			}
			
			var focusElement=(typeof this.focus=="function")?this.focus():this.focus;
			if(focusElement){focusElement.scrollIntoView();}
			next=function(){};
			switch(this.completionCondition){
				case "clickAnywhere":
						next=function(){
							complete(step);
						}
						self.container.addEventListener("click",self.complete);
					break;
				case "clickOn":
						next=function(){
							complete(step);
						}
						self.hole.addEventListener("click",self.complete);
					break;
				case "event":
						next=function(id){
							if(id==step.id){complete(step);}
						} //remember that this.id is null by default
						self.hole.addEventListener("click",self.complete);
					break;
			}
			
			let h=self.hole.style;
			let f=focusElement?focusElement.getBoundingClientRect():null;
			h.width=(f)?(f.width+8)+"px":0;
			h.height=(f)?(f.height+8)+"px":0;
			h.top=(f)?(f.top-4)+"px":null;
			h.left=(f)?(f.left-4)+"px":null;
			
			this.onActivate && this.onActivate(this);
		}
		
		function clear(){
			let elem=self.container.getElementsByClassName("step");
			for(var i=0; i<elem.length; i++){
				self.container.removeChild(elem[i]);
			}
		}
		
		function complete(step){
			if(step !== self.sequence[self.currentStep]){return;}
			next=function(){};
			self.container.removeEventListener("click", self.complete);
			self.hole.removeEventListener("click", self.complete);
			clear();
			step.onComplete && step.onComplete(this);
			if(self.sequence.length>self.sequence.indexOf(step)+1){
				requestAnimationFrame(()=>{
					self.currentStep++;
					let s=self.sequence[self.currentStep];
					if(s.activationDelay){
						setTimeout(()=>{s.activate();}, s.activationDelay);
					}else{s.activate();}
				});
			}else{
				self.container.classList.remove("active");
			}
		}
		
		this.element.classList="step";
		self.sequence.push(this);
	}
	
	this.addStep=function(text,focus,completionCondition,onActivate,onComplete){
		new Step(text,focus,completionCondition,onActivate,onComplete);
	}
	this.start=function(){
		if(this.sequence.length==0){return;}
		this.currentStep=0;
		this.container.classList="active";
		this.sequence[0].activate();
		if(this.skippable){
			this.container.classList.add("skippable");
		}else{
			this.container.classList.remove("skippable");
		}
		this.onStart && this.onStart();
	}
	this.skip=function(){
		self.container.classList.remove("active");
		self.onSkip &&self.onSkip();
	}
	
	this.container.id="tutorial";
	document.body.appendChild(this.container);
	
	this.hole.classList="hole";
	this.hole.addEventListener("click",function(event){
		self.container.style.pointerEvents="none";
		let target=document.elementFromPoint(event.clientX, event.clientY);
		target.click();
		target.focus();
		self.container.style.pointerEvents="auto";
	});
	this.container.appendChild(this.hole);
	
	this.skipButton.classList="skip";
	this.skipButton.addEventListener("click",function(event){
		event.cancelBubble=true;
		self.skip();
	});
	this.populateSkipButtonLabel && (()=>{this.skipButtonLabel.appendChild(this.populateSkipButtonLabel());})();
	this.skipButton.appendChild(this.skipButtonLabel);
	this.skipButton.appendChild(document.createTextNode("×"));
	this.container.appendChild(this.skipButton);
}