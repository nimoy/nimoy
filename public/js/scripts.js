
// m o n o m e

(function (window) {
	var Monome = function (template) {
		var m = this;
		m.template = template;

		m.init = function () {
			m.render();
			skeleton.log('monom ready!!!');
		}

		m.render = function () {
			var html = templayed(m.template)({test:''});
			var container = document.createElement('div');
			container.innerHTML = html;
			document.body.appendChild(container);
			m.ready();
		}
		
		m.ready = function () {
		}
	
	}
	window.mono = Monome;
}(window));
// s k e l e t o n

(function (window) {
	var Skeleton = function (template) {

		var skel = this;
		skel.template = template;

		skel.init = function () {
			skel.render();
		}

		skel.render = function () {
			var html = templayed(skel.template)({test:''});
			var container = document.createElement('div');
			container.innerHTML = html;
			document.body.appendChild(container);
			skel.ready();
		}
		
		skel.ready = function () {
			var cmd = document.getElementById('cmd');
			cmd.onsubmit = function (e) {
				e.preventDefault();
				var input = document.getElementById('prompt'),
				prompt = e.target.prompt.value;
				input.value = '';
				input.blur();
				skel.interpret(prompt);
			}		
		}
		
		skel.interpret = function (cmd) {
			bus.send(['iron','interpret','Waffle','loadModule',cmd]);
		}
		
		skel.log = function (msg) {
			var logger = document.getElementById('console');
			logger.innerHTML = msg;
		}
	
	}
	window.skeleton = Skeleton;
}(window));