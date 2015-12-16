// The following are access function to extract the relevant information
// from each data point.
var getId = function(d) {
    return d["_row"];
};

var getSymbol = function(d) {
    return d["Symbol"];
};

var getX = function(d) {
    return d["logFC"];
};

var getY = function(d) {
    return d["adj.P.Val"];
};

// This is a classical example of function composition. It will return
// the value returned by the specified accessor, scaled, and rounded.
var getScaled = function(scale, accessor) {
    return function (d) {
        return Math.round(scale(accessor(d)));
    }
};

// This is a predicate (returns true or false) depending on whether a data point
// is statistically significant.
var isSignificant = function(d) {
    return !!(Math.abs(getX(d)) > 1 && getY(d) < 0.05);
};

var margin = {top: 20, right: 20, bottom: 40, left: 40},
// This margin makes sure the two axes will not overlap,
// making the plot more readable.
    axesMargin = 10,
    width = 950 - margin.left - margin.right - axesMargin,
    height = 500 - margin.top - margin.bottom - axesMargin;

// Legend box size
var legendWidth = 110,
    legendHeight = 60;

// The radius and border size of each data point.
var radius = 3, border = 2;

// Build a linear scale for the x-axis.
var xScale = d3.scale.linear().range([0, width]),
// Build a log10 scale for the y-axis
    yScale = d3.scale.log().range([0, height]);

// Create the D3 axes objects.
var xAxis = d3.svg.axis().scale(xScale).orient("bottom"),
    yAxis = d3.svg.axis().scale(yScale).orient("left");

// Create the SVG container in which we will draw the volcano plot
// making sure to reserve enough space on the left and on the bottom
// to show the axes labels. We also reserve a bit of space on the top
// and on the right to avoid that data points on the edges will be
// cut off from the SVG container.
var svg = d3.select("body").append("svg")
    .style("width", width + margin.left + margin.right)
    .style("height", height + margin.top + margin.bottom);

// We create the svg group that will contain the volcano plot and
// we translate all the contained object
var plot = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


// We read our data from a json file.
d3.json("GSE55633_gene_expressions_de.json", function (error, root) {
    if (error) throw error;

    // We can finally retrieve the extremes of our data using the function d3.extent.
    xScale.domain(d3.extent(root, getX));
    yScale.domain(d3.extent(root, getY));

    // It is time to draw the y axis...
    plot.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(0," + -axesMargin + ")")
        .call(yAxis)
        // ...and its label.
        .append("text")
        .attr("class", "label")
        // We want to rotate the label so that it follows the axis orientation
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("-Log10 P-Value");

    // Now the x-axis...
    plot.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + axesMargin + "," + height + ")")
        .call(xAxis)
        // ... and its label.
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Log2 Fold Changes");

    // Let's create a group to contain all the data points, correctly spaced from the axes.
    var scatter = plot.append("g")
        .attr("class", "scatter")
        .attr("transform", "translate(" + axesMargin + "," +  -axesMargin + ")");

    // Finally let's draw the single data points
    var circles = scatter.selectAll("circle").data(root, getId)
        .enter().append("circle")
        .attr("cx", getScaled(xScale, getX))
        .attr("cy", getScaled(yScale, getY))
        .attr("r", radius)
        .classed("significant", isSignificant);

    // We add a small legend to help the users
    // Start from an ordinal scale to vertically place the labels in the box
    var legendScale = d3.scale.ordinal()
        .domain([true,false])
        .rangeRoundPoints([0, legendHeight],1.5);

    // Add the graphical element containing the legend
    var legend = scatter.append("g")
        .attr("class","legend")
        .attr("transform", "translate(" + (width - legendWidth) + "," + 0 + ")");

    // Add the legend entries (circle + text)

    // We simply add some fictitious data to make the first
    // entry significant, and the second not, so that the
    // styling we chose for the scatterplot will apply
    // here too, free of charge :)
    var legendEntry = legend.selectAll("g")
        .data([{"adj.P.Val": 0.01, "logFC": 1.5},
            {"adj.P.Val": 0.5, "logFC": 0.5}])
        .enter().append("g");

    legendEntry.append("circle")
        .attr("r", radius)
        .attr("cx", 20)
        .attr("cy", function(d) {return legendScale(isSignificant(d));})
        .classed("significant", isSignificant);

    legendEntry.append("text")
        .attr("class", "label")
        .attr("x", 30)
        .attr("y",  function(d){return legendScale(isSignificant(d));})
        .style("dominant-baseline", "middle")
        .style("text-anchor", "begin")
        .text(function(d) {
            return (isSignificant(d) ? "" : "not ") + "significant";
        } );


    // Let's create a Voronoi diagram using the accessors defined before.
    // We also clip the Voronoi to the plotting area dimensions.
    var voronoi = d3.geom.voronoi()
        .x(getScaled(xScale, getX))
        .y(getScaled(yScale, getY))
        .clipExtent([[0,0], [width, height]]);

    // For convenience we create a new SVG group that contains all the
    // Voronoi elements.
    var voronoiG = plot.append("g")
        .attr("class", "voronoi")
        .attr("transform", "translate(" + axesMargin + "," +  -axesMargin + ")");

    // Predicate that returns true if and only if the area of the polygon
    // is larger than minArea.
    var hasLargerArea = function(minArea) {
        return function(polygon) {
            return polygon.area() > minArea
        }
    };

    d3.selection.prototype.moveToFront = function() {
        return this.each(function(){
            this.parentNode.appendChild(this);
        });
    };

    svg.append("defs")
        .selectAll("clipPath").data(root).enter()
        .append("svg:clipPath")
        .attr("id", getId)
        .append("circle")
        .attr("cx", getScaled(xScale, getX))
        .attr("cy", getScaled(yScale, getY))
        .attr("r", 20);

    var paths = voronoiG.selectAll("path")
        .data(voronoi(root).map(d3.geom.polygon).filter(hasLargerArea(Math.pow(radius + border/2, 2)*Math.PI)))
        .enter().append("svg:polygon")
        .attr("points", function(d) {
            //console.log(d);
            if (!d) return;
            return d.map(function(x){
                return [Math.round(x[0]),Math.round(x[1])];
            }).join(",")
        })
        .attr("clip-path", function(d) { return "url(#" + getId(d.point) + ")"; })
        .attr("class", "invisible");

    circles.each(function(d) {
        var content = "<p>ID: " + getId(d) + "<br>" +
            "Log2 Fold Changes: " + getX(d) + "<br>" +
            "Adjusted P-Value: " + getY(d) + "</p>";
        new Opentip(this, content, {
            title: getSymbol(d),
            background: "white",
            borderColor: "darkgray",
            borderWidth: 2,
            delay: 0.25,
            hideDelay: 0,
            shadow: false,
            stem: 'center bottom',
            target: true,
            targetJoint: 'center top',
            tipJoint: 'center bottom',
            showOn: "mouseenter",
            hideOn: "mouseleave"
        });
    });

    circles.on("mouseenter", function() {
        d3.select(this).classed("hover", true).moveToFront();
    });
    circles.on("mouseleave", function() {
        d3.select(this).classed("hover", false)
    });

    // This function get an event from the Voronoi and triggers the same
    // event type on the circle element associated with the partition.
    var forwardEvent = function(d) {
        var event = document.createEvent("SVGEvents");
        event.initEvent(d3.event.type, true, true);
        circles.data([d.point], getId).node().dispatchEvent(event);
    };

    paths.on("mouseenter", forwardEvent);
    paths.on("mouseleave", forwardEvent);

});