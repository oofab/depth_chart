function MovingWindow (maxlen) {
    this.arr = [];
    this.maxlen = maxlen
}
MovingWindow.prototype.push = function (x) {
    this.arr.push(x);
    if (this.arr.length > this.maxlen * 2) {
	this.arr.splice(0,this.maxlen);
    }
}
MovingWindow.prototype.len = function (x) {
    return Math.min (this.arr.length, this.maxlen);
}
MovingWindow.prototype.get = function (x) {
    return this.arr[this.arr.length-1-x];
}
MovingWindow.prototype.clear = function () {
    this.arr = [];
}