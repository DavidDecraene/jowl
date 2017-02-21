/*
 * jOWL_UI, User Interface Elements for jOWL, semantic javascript library
 * Creator - David Decraene
 * Version 1.0
 * Website: http://Ontologyonline.org
 * Licensed under the MIT license
 * Verified with JSLint http://www.jslint.com/
 */
(function($){

jOWL.UI = {
	broadcaster : function(){
		var listeners = [];
		this.addListener = function(obj){
			function add(obj){if(obj.propertyChange) { listeners.push(obj); } }
			if(obj.constructor == Array){for(var i=0;i<obj.length;i++){ add(obj[i]); } }
			else { add(obj); }
			return this;
		};
		this.broadcast = function(item){
			for(var i=0;i<listeners.length;i++){
				listeners[i].propertyChange.call(listeners[i], item); }
		};
		if(!this.propertyChange){
			this.propertyChange = function(item){};
		}
	},
	asBroadcaster : function(ui_elem){
		ui_elem.broadcaster = jOWL.UI.broadcaster; ui_elem.broadcaster();
	},
	defaults : {
		contentClass: "jowl-content",
		focusClass: "ui-state-hover",
		wrapperClass : "ui-widget-content"
	}
};

/**
WIDGETS
all widgets:
	addListener : add an object with a propertyChange function, will be triggered on select
	propertyChange: update the widget with a new jowl object
Events:
	onSelect: (look into propertylens click), return false to suppress the event, this = jquery element, first argument = jOWL object
CSS:
	wrapperClass: css class(es) for main element, the el itself
	contentClass: css class(es) for main content element, accessible by el.content
	focusClass: css class(es) for element in focus,
*/
$.fn.extend({
/*
owl_navbar
options:
	onSelect : this element refers to jquery node, first argument = jOWL object
*/
	owl_navbar: function(document, options){
		if(!(document instanceof jOWL.Document)) throw new Error("No Document passed");
		options = $.extend({
			contentClass : jOWL.UI.defaults.contentClass,
			focusClass : jOWL.UI.defaults.focusClass,
			onSelect : function(item){},
			onPropertyChange : function(item){}
		}, options);
		var self = this;
		this.addClass("jowl-navbar");
		this.content = $("."+options.contentClass, this).empty();
			if(!this.content.length) { this.content = $("<div/>").addClass(options.contentClass).appendTo(this); }
		this.parents =  $('<div/>').appendTo(this.content);
		this.focus = $('<div/>').addClass(options.focusClass).appendTo(this.content);
		this.children = $('<div/>').appendTo(this.content);
		var listnode = $('<span/>').click(function(){
			var node = $(this);
			var res = document.getResource(node.attr('title'));
			if(options.onSelect.call(node, res) === false) { return; }
			if(res && res instanceof jOWL.Type.Class) {
				self.propertyChange.call(res, res);
				self.broadcast(res);
			}
		});

		jOWL.UI.asBroadcaster(this);

		this.propertyChange = function(item){
			if(options.onPropertyChange.call(this, item) === false) { return; }
			if(item instanceof jOWL.Type.Class){
				item.bind(self.focus);
				if(jOWL.options.reason) { item.hierarchy();}
				self.parents.empty().append(item.parents().bind(listnode));
				self.children.empty().append(item.children().bind(listnode));
			}
		};
		return this;
	},


/**
Use propertyChange to set the class
Use addField to add property refinements
Use serialize to serialize input
*/
	owl_datafield: function(document, options){
		if(!(document instanceof jOWL.Document)) throw new Error("No document specified");
		options = $.extend({
			selectorClass : "jowl-datafield-selector",
			messageClass : "jowl-datafield-message",
			labelClass : "jowl-datafield-property-label"
		}, options);
		var self = this;
		var pArray = {}; //associative array for properties.
		this.messages = {};
		this.messages[jOWL.NS.xsd()+"positiveInteger"] = "Allowed values: positive numbers or comparisons like  '>5 && <15' ";

		this.addClass("owl_UI");
		jOWL.UI.asBroadcaster(this);

		this.property = null;

		this.propertyChange = function(item){
			if(item.isClass){
				this.property = item;
					for(x in pArray){//reset all properties
						if(pArray[x].remove){ pArray[x].remove(); delete pArray[x]; }
					}
			}
		};

		/** Sets up a new field */
        this.addField = function(property){
            if(pArray[property.URI]){
                //allow for multiple fields?
				return;
            }

			var $content = $("<div/>");
				 pArray[property.URI] = $content;

			var $title = property.bind($("<div/>")).addClass(options.labelClass).appendTo($content).click(function(){ $content.remove(); delete pArray[property.URI]; });

            if(property.isObjectProperty){

				var sp = new jOWL.SPARQL_DL(document, "Type(?t, ?c),PropertyValue(concept, property, ?c)", {concept : self.property, property : property }).execute({
					onComplete : function(obj){
						if(!obj.results.length){ return; } //modify to deal with non value results
						obj.sort("?t");

						$select = $("<select class='"+options.selectorClass+"'/>").appendTo($content);

						for(var i=0;i<obj.results.length;i++){
							obj.results[i]['?t'].bind($("<option/>")).appendTo($select);
						}

						$content.appendTo(self);
					}});

            }
            else if(property.isDatatypeProperty){
				var msg ="";
				if(self.messages[property.range]){ msg = self.messages[property.range];	}

				var $input = $('<div/>').addClass(options.selectorClass).attr("title", property.range).append($('<input type="text" style="font-size:11px;width:100px;"/>'));
				var $message = $('<div/>').addClass(options.messageClass).text(msg).appendTo($input);

				$content.append($input).appendTo(self);
				$('input', $content).focus(function(){
					$message.animate({opacity: 1.0}, 1500).fadeOut();
				});


			}

		};

		this.serialize = function(){
			var q = { "Type": self.property, "PropertyValue" : [] };

			$('.'+options.selectorClass, self).each(function(){
				var $this = $(this);
				var $prop = $this.siblings('.'+options.labelClass);
				var prop = $prop.attr('title');
				if( $this.is("select")){
						var s = $this.get(0);
						var thing = $(s[s.selectedIndex]).attr('title');
						q.PropertyValue.push([prop, thing]);
					}
				else {
					var $input = $this.find("input");
					var datatype = $this.attr('title');
					var entry = $input.get(0).value;
					if(entry) { q.PropertyValue.push([prop, '"'+entry+'"']); }
				}
			});
			return q;
		};

		return this;
	}
});


/**
Supporting functionality
*/

$.fn.swapClass = function(c1,c2) {
	return this.each(function() {
		if ($(this).hasClass(c1)) { $(this).removeClass(c1); $(this).addClass(c2);}
		else if ($(this).hasClass(c2)) {$(this).removeClass(c2);$(this).addClass(c1);}
		});
};

})(jQuery);
