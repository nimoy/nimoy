// U I  K I T
(function (window) {
// editor module bulk prints elements

//---------------------------------------------
// M A S T E R
//---------------------------------------------
var UI = {

	template : 

	create : function (component, settings) {
		var newObj = Object.create(this[component], {set: {value: settings}});
		return newObj;
	},




}

// components should have a base

//---------------------------------------------
// C O M P O N E N T S
//---------------------------------------------
//---------------------------------------------
// P A N E L
//---------------------------------------------
var UI_Panel = {

	name : 'untitled',
	
	template : '<div class="panel"></div>',

	insert : null,
	
	render : function () { // render takes template assembles and adds to dom

		this.name = this.set.name;

		if(this.set.insert) {
			var components = this.set.insert;
			for(var i=0;i<components.length;i++) {
				var obj = window[components[i]];
				var newObj = Object.create(obj, {set: {
					enumerable: true, value:
					{
						name: 'cmd',
						io : ['skeleton', 'interpret']
					}
				}});
				newObj.send('test');
			}
		}
		
		var container = document.createElement('div')
		, offset_x    = 0
		, offset_y    = 0;
		container.setAttribute('id', this.name);
		container.innerHTML = this.template;
		document.body.appendChild(container);
		var panel = container.querySelector('.panel');

		panel.ondragstart = function (e) {
			offset_x = e.clientX - panel.offsetLeft;
			offset_y = e.clientY - panel.offsetTop;
		}

		panel.ondragend = function (e) {
			e.preventDefault();
		}

		panel.ondrag = function (e) {
			panel.style.left = (e.clientX-offset_x)+'px';
			panel.style.top = (e.clientY-offset_y)+'px';
		}

	}
}
//---------------------------------------------
// T E X T  I N P U T
//---------------------------------------------
var UI_TextInput = {

	template : '',

	render : function () {
		var input = document.getElementById('cmd');
		cmd.onsubmit = function (e) {
			e.preventDefault();
			var input = document.getElementById('prompt'),
			prompt = e.target.prompt.value;
			input.value = '';
			input.blur();
			this.output(prompt);
		}		
	},

	send : function (params) {
		var module = this.set.io[0]
		, method   = this.set.io[1];
		window[module][method](params);
	}
}
//---------------------------------------------
// N U M B E R  B O X
//---------------------------------------------
var UI_NumberBox = {

	name : 'untitled',

	markup : '',

	render : function () {
		var num = box.querySelector('.number');
		num.onmousewheel = function (event) {
			var oldVal = parseInt(this.innerHTML)
			, value = event.wheelDeltaY
			, newVal = null;
			if(value<0){
				newVal = oldVal+Math.abs(value);
			}else{
				newVal = oldVal-Math.abs(value);
			}
		}
	},

	ready : function () {
	}
}

	window.ui = Ui;
}(window));