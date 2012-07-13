// tickToPrice is a function that converts tick index, to the corresponding price.
function DepthChart (canvas_id, tickToPrice) {
    var canvas = document.getElementById(canvas_id)
    this.ctx = canvas.getContext("2d");

    this.colors     = ["#e4e178", "#d6b337", "#9d590f", "#6d3902", "#3d2103"];
    this.colorsblue = ["#6cb5f2", "#2a81f7", "#073fce", "#0000ff"];
    this.colorsred  = ["#f44949", "#e61f1f", "#cf0a0a", "#790000"];
    
    this.timeIndicatorSize = 100;
    this.w = canvas.width-this.timeIndicatorSize;
    this.h = canvas.height;
    this.unprocessed = new MovingWindow(this.h);
    this.channelSize = 100;
    this.channelMargin = 10;
    this.tickAtMid = 0;
    this.lastMid = null;

    this.tickToPrice = tickToPrice;
 
    this.lastTime = 0;
    this.lastDate = new Date ();

    var offScreenCanvas = document.createElement("canvas");
    this.oscw = 902;
    offScreenCanvas.width=this.oscw;
    offScreenCanvas.height=this.h;

    this.offsets = new MovingWindow(this.h);
    this.processed = new MovingWindow(this.h);
    this.osc = offScreenCanvas.getContext("2d");
    this.times = new MovingWindow (this.h);
}

/*

Add an object to the chart. Two objects possible: trade object, and volume object

A trade object should have the following properties
time: in nanos
sellerActive: true if someone sold against a bid in the market.
volume: normalised version of volume. A volume of 1.0 completely fills the volume bar once.
price: displayed price.
tick:  Tick is the index of the current price.

A volume object should have the following properties
time: in nanos
asks: list of [price, tick, volume] pairs
bids: list of [price, tick, volume] pairs

*/

DepthChart.prototype.add = function (obj) {
    this.unprocessed.push(obj);
}

DepthChart.prototype.reset = function (tickToPrice) {
    this.unprocessed.clear ();
    this.tickToPrice = tickToPrice;
    
    this.osc.clearRect(0,0,this.oscw,this.h);
    this.processed.clear ();
    this.times.clear ();
    this.offsets.clear ();
}

DepthChart.prototype.render = function () {
    var n = this.unprocessed.len ();

    var time = -1;
    for (var i = n; i > 0; --i) {
	time = this.unprocessed.get(i-1).time;
	this.times.push(time);
    }

    var bboMid = this.internalGetMid ();
    if (bboMid == null)
	return;

    var diff = Math.abs(bboMid-this.tickAtMid);

    if (diff > 0.01 || n != 0) {
	this.internalDrawChart (bboMid, diff, n);
    }
    this.internalDrawTimer (time);
}

DepthChart.prototype.internalDrawChannel = function (ctx, val, xoff, line, isL, colors) {
    var colorInd = 0;
    val *= this.channelSize;
    while (val > 0) {
	ctx.fillStyle = colors[colorInd];
	var x = Math.min(val,this.channelSize);
	if (isL)
	    ctx.fillRect (xoff+this.channelSize-x, line, x, 1);
	else
	    ctx.fillRect (xoff+1, line, x, 1);
	val -= x;
	colorInd++;
    }
}

DepthChart.prototype.internalRenderOne = function (ctx, vx, f, line, type) {
    var v = vx;
    var retoffset = null;
    if (vx.volume) {
	v = this.lastMid;
	var fprice = f(vx.tick);
    } else {
	this.lastMid = v;
    }
    if(v) {
	if(type) {
	    var offset = f(v.bids[v.bids.length-1][1]);
	    var len = f(v.asks[v.asks.length-1][1]) - offset + this.channelSize;
	    if (len > this.oscw) {
		return null;
	    }
	    retoffset = v.bids[v.bids.length-1][1];
	} else {
	    var offset = 0;
	}
    } else {
	var offset = fprice;
    }
    if (!vx.volume) {
	for (var i = 0; i < v.bids.length; ++i)
	    this.internalDrawChannel(ctx, v.bids[i][2],f(v.bids[i][1])-offset, line, true, this.colors);
	
	for (var i = 0; i < v.asks.length; ++i)
	    this.internalDrawChannel(ctx, v.asks[i][2],f(v.asks[i][1])-offset, line, false, this.colors);
    } else {
	this.internalDrawChannel (ctx, vx.volume, fprice-offset, line, vx.sellerActive, vx.sellerActive?this.colorsred:this.colorsblue);
    }
    if (v) {
	var x0 = this.w/2 + (Math.ceil(this.tickAtMid)-(this.tickAtMid+0.5))*(this.channelSize+this.channelMargin);

	ctx.fillStyle = "pink";
	ctx.fillRect (this.w/2 + this.channelSize + this.channelMargin/2 + (v.bids[0][1]-this.tickAtMid-0.5)*(this.channelMargin+this.channelSize) - offset, line, this.channelMargin+(this.channelMargin+this.channelSize)*((v.asks[0][1]-v.bids[0][1])-1), 1);
    }

    return retoffset;
}

DepthChart.prototype.internalGetMid = function () {
    var v = this.lastMid;
    var n = this.unprocessed.len ();
    for (var i = 0; i < n; ++i) {
	var vx = this.unprocessed.get(i);
	if (!vx.volume) {
	    v = vx;
	    break;
	}
    }
    if (v == null)
	return null;
    return 0.5*(v.asks[0][1]+v.bids[0][1]);
}

DepthChart.prototype.internalClear = function (n) {
    this.ctx.clearRect(0,0,this.w,this.h);
    if (n < this.h) {
	var imd = this.osc.getImageData(0,0,this.oscw,this.h-n);
	this.osc.putImageData(imd, 0,n);
	imd = null;
	this.osc.clearRect(0,0,this.oscw,n);
    } else {
	this.osc.clearRect(0,0,this.oscw,this.h);
    }
}

DepthChart.prototype.internalDrawChart = function (bboMid, diff, n) {
    if (diff < 5)
	this.tickAtMid = this.tickAtMid * 0.95 + 0.05 * bboMid;
    else
	this.tickAtMid = bboMid;

    this.internalClear (n);

    this.ctx.save ();
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.w, this.h);
    this.ctx.clip();
    var th = this;
    var f = function (xx) {return th.w/2  + th.channelMargin/2 + (xx-th.tickAtMid-0.5)*(th.channelMargin+th.channelSize);};

    while (n > 0) {
	var offset = this.internalRenderOne(this.osc, this.unprocessed.get(n-1), f, n-1, true);
	this.offsets.push(offset);
	this.processed.push(this.unprocessed.get(n-1));
	n--;
    }
    this.unprocessed.clear();
    var n = this.processed.len ();
    var startN = -1;
    var endN = -1;
    var offset = null;
    while (n > 0) {
	var vx = this.processed.get(n-1);
	var curOff = this.offsets.get(n-1);

	// Segment end
	
	if (curOff != offset && offset != null) {
	    var imd = this.osc.getImageData(0, endN-1, this.oscw, startN-endN+1);
	    this.ctx.putImageData(imd, Math.floor(f(offset)), endN-1);
	}

	// Segment start

	if (curOff != offset && curOff != null) {
	    startN = n;
	    endN = n;
	    offset = curOff;
	}

	// Segment mid

	if (curOff == offset && curOff != null)
	    endN = n;

	// Single

	if (curOff == null) {
	    this.internalRenderOne(this.ctx, vx, f, n);
	    offset = null;
	}

	n--;
    }
    if (offset != null) {
	var imd = this.osc.getImageData(0, endN-1, this.oscw, startN-endN+1);
	this.ctx.putImageData(imd, f(offset), endN-1);
    }

    this.ctx.fillStyle = "black";
    var roundedMid = Math.round(this.tickAtMid);
    
    for (var tick =  roundedMid - 5; tick <= roundedMid+5;tick++) {
	var price = Math.round(this.tickToPrice(tick));
	var ftick = Math.floor(f(tick));
	this.ctx.fillText ("         "+price, ftick, 20);
	this.ctx.fillRect (ftick, 0, 1, this.h);
	this.ctx.fillRect (ftick-10, 0, 1, this.h);
    }

    this.ctx.restore ();
}

DepthChart.prototype.internalDrawTimer = function (time) {
    var newDate = new Date ();
    if (time == -1) {
	time = this.lastTime*1 + (newDate.getTime ()-this.lastDate.getTime ())*1000000;
    } else {
	this.lastTime = time;
	this.lastDate = newDate;
    }
    
    for (var i = 0; i < this.times.len (); ++i) {
	var v = Math.min(Math.round((time-this.times.get(i))/400000000),255);
	this.ctx.fillStyle = "rgb("+(255-v)+",0,"+v+")";
	this.ctx.fillRect(this.w, i,this.timeIndicatorSize, 1);
    }
}
