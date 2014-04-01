/*!
 * d3pie
 * @author Ben Keen
 * @version 0.1.0
 * @date Mar 2014
 * http://github.com/benkeen/d3pie
 */
;(function($) {
	"use strict";

	var _scriptName = "d3pie";
	var _version = "0.1.0";

	// used to uniquely generate IDs and classes, ensuring no conflict between multiple pies on the same page
	var _uniqueIDCounter = 0;

	// this section includes all helper libs. None of the helper libs ever need to worry about "this". They're always
	// passed everything they need from the code below. They're populated via grunt-template. Note: to keep the syntax
	// highlighting from getting all messed up, I commented out each line. That REQUIRES each of the files to have an
	// empty first line. Crumby, yes, but acceptable.
	//<%=_defaultSettings%>
	//<%=_validate%>
	//<%=_helpers%>
	//<%=_math%>
	//<%=_labels%>
	//<%=_segments%>
	//<%=_text%>


	// --------------------------------------------------------------------------------------------

	// our constructor
	var d3pie = function(element, options) {
		validate.initialCheck(element, options);

		// element can be an ID or DOM element
		this.element = $(element)[0]; // TODO
		this.options = $.extend(true, {}, _defaultSettings, options);

		// if the user specified a custom CSS element prefix (ID, class), use it. Otherwise use the
		if (this.options.misc.cssPrefix !== null) {
			this.cssPrefix = this.options.misc.cssPrefix;
		} else {
			this.cssPrefix = "p" + _uniqueIDCounter + "_";
			_uniqueIDCounter++;
		}

		// add a data-role to the DOM node to let anyone know that it contains a d3pie instance, and it's version
		$(this.element).data(_scriptName, _version);

		_init.call(this);
	};

	d3pie.prototype.recreate = function() {
		this.element.innerHTML = "";
		_init();
	};

	d3pie.prototype.destroy = function() {
		$(this.element).removeData(_scriptName); // remove the data attr
		this.element.innerHTML = ""; // clear out the SVG
	};

	/**
	 * Returns all pertinent info about the current open info. Returns null if nothing's open, or if one is, an object of
	 * the following form:
	 * 	{
	 * 	  element: DOM NODE,
	 * 	  index: N,
	 * 	  data: {}
	 * 	}
	 */
	d3pie.prototype.getOpenPieSegment = function() {
		var segment = segments.currentlyOpenSegment;
		if (segment !== null) {
			var index = parseInt($(segment).data("index"), 10);
			return {
				element: segment,
				index: index,
				data: this.options.data[index]
			}
		} else {
			return null;
		}
	};

	d3pie.prototype.openSegment = function(index) {
		var index = parseInt(index, 10);
		if (index < 0 || index > this.options.data.length-1) {
			return;
		}
		segments.openSegment($("#segment" + index)[0]);
	};

	// this let's the user dynamically update aspects of the pie chart without causing a complete redraw. It
	// intelligently re-renders only the part of the pie that the user specifies. Some things cause a repaint, others
	// just redraw the single element
	d3pie.prototype.updateProp = function(propKey, value, optionalSettings) {
		switch (propKey) {
			case "header.title.text":
				var oldVal = helpers.processObj(this.options, propKey);
				helpers.processObj(this.options, propKey, value);
				$("#title").html(value);
				if ((oldVal === "" && value !== "") || (oldVal !== "" && value === "")) {
					this.recreate();
				}
				break;

			case "header.subtitle.text":
				var oldValue = helpers.processObj(this.options, propKey);
				helpers.processObj(this.options, propKey, value);
				$("#subtitle").html(value);
				if ((oldValue === "" && value !== "") || (oldValue !== "" && value === "")) {
					this.recreate();
				}
				break;

			case "callbacks.onload":
			case "callbacks.onMouseoverSegment":
			case "callbacks.onMouseoutSegment":
			case "callbacks.onClickSegment":
			case "effects.pullOutSegmentOnClick.effect":
			case "effects.pullOutSegmentOnClick.speed":
			case "effects.pullOutSegmentOnClick.size":
			case "effects.highlightSegmentOnMouseover":
			case "effects.highlightLuminosity":
				helpers.processObj(this.options, propKey, value);
				break;

		}
	};


	// ------------------------------------------------------------------------------------------------

	// private functions

	var _init = function() {

		// 1. prep-work
		this.options.data   = math.sortPieData(this.options.data.content, this.options.data.sortOrder);
		this.options.colors = helpers.initSegmentColors(this.options.data, this.options.misc.colors.segments);
		this.totalSize      = math.getTotalPieSize(this.options.data);

		this.svg = helpers.addSVGSpace(
			this.element,
			this.options.size.canvasWidth,
			this.options.size.canvasHeight,
			this.options.misc.colors.background
		);

		// 2. store info about the main text components as part of the d3pie object instance. This is populated
		this.textComponents = {
			title: {
				exists: this.options.header.title.text !== "",
				h: 0,
				w: 0
			},
			subtitle: {
				exists: this.options.header.subtitle.text !== "",
				h: 0,
				w: 0
			},
			footer: {
				exists: this.options.footer.text !== "",
				h: 0,
				w: 0
			}
		};

		// 3. add the key text components offscreen (title, subtitle, footer). We need to know their widths/heights for later computation
		text.addTextElementsOffscreen(this.cssPrefix, this.textComponents, this.options.header);
		text.addFooter(this.options.footer);

		// the footer never moves - this puts it in place now
		helpers.whenIdExists(this.cssPrefix + "footer", function() {
			text.positionFooter(this.options.footer.location, text.components.footer.w, this.options.size.canvasWidth, this.options.size.canvasHeight, this.options.misc.canvasPadding);
			var d3 = helpers.getDimensions("footer");
			this.textComponents.footer.h = d3.h;
			this.textComponents.footer.w = d3.w;
		});

		var radii = math.computePieRadius(this.options.size, this.options.misc.canvasPadding);
		this.innerRadius = radii.inner;
		this.outerRadius = radii.outer;

		// this value is used all over the place for placing things and calculating locations. We figure it out ONCE
		// and store it as part of the object
		this.pieCenter = math.getPieCenter(
			this.options.header.location,
			this.textComponents,
			this.options.misc.canvasPadding,
			this.options.header.titleSubtitlePadding,
			this.options.size.canvasWidth,
			this.options.size.canvasHeight,
			this.options.misc.pieCenterOffset
		);

		// STEP 2: now create the pie chart and position everything accordingly
		var reqEls = [];
		if (this.textComponents.title.exists)    { reqEls.push(this.cssPrefix + "title"); }
		if (this.textComponents.subtitle.exists) { reqEls.push(this.cssPrefix + "subtitle"); }
		if (this.textComponents.footer.exists)   { reqEls.push(this.cssPrefix + "footer"); }

		helpers.whenElementsExist(reqEls, function() {
			if (this.textComponents.title.exists) {
				var d1 = helpers.getDimensions(this.cssPrefix + "title");
				this.textComponents.title.h = d1.h;
				this.textComponents.title.w = d1.w;
			}
			if (this.textComponents.subtitle.exists) {
				var d2 = helpers.getDimensions(this.cssPrefix + "subtitle");
				this.textComponents.subtitle.h = d2.h;
				this.textComponents.subtitle.w = d2.w;
			}

			// position the title and subtitle
			text.positionHeadings(
				this.cssPrefix,
				this.pieCenter,
				this.textComponents,
				this.options.header.location,
				this.options.misc.canvasPadding,
				this.options.size.canvasWidth,
				this.options.size.canvasHeight,
				this.options.header.titleSubtitlePadding
			);

			segments.create();
			var l = labels;
			l.add("inner", this.options.labels.inner.format);
			l.add("outer", this.options.labels.outer.format);

			// position the label elements relatively within their individual group (label, percentage, value)
			l.positionLabelElements("inner", this.options.labels.inner.format);
			l.positionLabelElements("outer", this.options.labels.outer.format);
			l.computeOuterLabelCoords();

			// this is (and should be) dumb. It just places the outer groups at their pre-calculated, collision-free positions
			l.positionLabelGroups("outer");

			// we use the label line positions for many other calculations, so ALWAYS compute them
			l.computeLabelLinePositions();

			// only add them if they're actually enabled
			if (this.options.labels.lines.enabled && this.options.labels.outer.format !== "none") {
				l.addLabelLines();
			}

			l.positionLabelGroups("inner");
			l.fadeInLabelsAndLines();

			segments.addSegmentEventHandlers();
		});
	};

	// expose our d3pie function
	window.d3pie = d3pie;

})(jQuery);