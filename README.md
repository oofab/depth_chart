depth_chart
===========

depth_chart is a chart for displaying orderbook timeseries data. Each price level is displayed as a channel that is more or less filled depending on how many orders are open at that level. The principles of the horizontal chart are used to increase the range of displayable values. Trades are displayed as red or blue intermissions.

#Using

##Creating a chart
```html
<canvas id="mychartid" width=900 height=900>
<script type="text/javascript" src="moving_window.js"></script>
<script type="text/javascript" src="depth_chart.js"></script>
<script type="text/javascript">
tickToPrice = function (x) {return x*0.1;} // Ticksize of 0.1
var myChart = new DepthChart ("mychartid", tickToPrice);
</script>
```
##Adding a orderbook snapshot
```javascript
var snapshot = {};
snapshot.time = 0; // In nanos
// List of [price, tick, volume] triplets
snapshot.asks = [[101.1, 1011, 0.3], [101.2, 1012, 0.4]];
snapshot.bids = [[100.9, 1009, 0.26], [100.7, 1007, 0.82]];
myChart.add(snapshot);
```
##Adding a trade
```javascript
var trade = {};
trade.time = 1000;
trade.sellerActive = false;
trade.volume = 0.3;
trade.price = 101.1;
trade.tick = 1011;
myChart.add(trade);
```

##Rendering
This should be done periodically or the chart wont update.

```javascript
myChart.render ();
```

