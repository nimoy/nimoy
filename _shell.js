/* S H E L L
	shell is a layer for creating/destroying components
	shell accepts a mulitplex stream in and out	
	shell runs on server or client
*/

var MuxDemux = require('mux-demux');

module.exports = function () {
	var self = this;
	self.create = function (component) {
	}
	self.destroy = function (component) {
	}
}