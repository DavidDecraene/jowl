$.fn.extend({

/**
autocomplete field.
*/
	owl_autocomplete : function(document, options){
    if(!(document instanceof jOWL.Document)) throw new Error("No Document passed");
		options = $.extend({
			time:500, //responsetime to check for new keystrokes, default 500
			chars:3, //number of characters needed before autocomplete starts searching
			focus:false, //put cursor on the input field when loading
			limit:10, //limit size of result list to given amount
			contentClass : "ui-widget-content",
			focusClass : jOWL.UI.defaults.focusClass,
			hintClass : "ui-autocomplete-hint",
			hint: false, //Message (if any) to show when unfocused.
			onSelect : function(item){}, //function that can be overridden
			formatListItem : function(listitem, type, identifier, termarray){ //formatting of results, can be overridden
				if(type){ listitem.append($('<div class="type"/>').text(type)); }
				listitem.append($('<div class="name"/>').text(identifier));
				if(termarray.length) { listitem.append($('<div class="terms"/>').text(termarray.join(', '))
					.prepend($('<span/>').addClass('termlabel').text("Terms: ")));
			}
		}}, options);
		jOWL.UI.asBroadcaster(this);

		this.showHint = function(){
			this.hinted = true;
			if(options.hint){
				this.addClass(options.hintClass).val(options.hint);
			}
			else {this.val(''); }
		};
		this.showHint();

		var self = this; var old = ''; var open = false; self.val('');
		var results = $('<ul/>').addClass(options.contentClass).addClass("jowl_autocomplete_results");
		var div = $("<div/>").addClass(options.wrapperClass).append(results); this.after(div);
		results.cache = {};
		results.isEmpty = function(){ for(x in results.cache) { return false; } return true; };
		results.close = function(){this.hide();};
		results.open = function(q, cache){
			this.show();
			if(q){
				if(!cache || results.isEmpty()) {
          results.cache = document.query(q, options);
        }
				else {
					var newcache = {};
					for(x in results.cache){
						var entry = results.cache[x];
						var found = false;
						var newentries = [];
						if(x.searchMatch(q) > -1) { found = true; }
						for(var i = 0;i<entry.length;i++){
							if(entry[i].term.searchMatch(q) > -1) { found = true; newentries.push(entry[i]); }
						}
						if(found) { newcache[x] = newentries; }
						}
					results.cache = newcache;
					}
				this.populate(results.cache);
				}
		};

		results.populate = function(data){
			var res = this; this.empty(); var count =0;
			var clickFunction = function(){

				var node = $(this);
        var res = document.getResource(node.data("jowltype"));
				if(options.onSelect.call(node, res) === false) { return; }
				self.broadcast(res);
			};

			var onHover = function(){ $(this).addClass(options.focusClass); };
			var offHover = function(){$(this).removeClass(options.focusClass);};

			for(x in data){
				if(count < options.limit){
					var item = data[x];
					var v = jOWL.isExternal(x);
					v = v ? v[1] : x;
					var list = $('<li/>').data("jowltype", x)
					.click(clickFunction).hover(onHover, offHover)
					.appendTo(res);
					var terms = [];
					for(var l = 0;l<item.length;l++){
						var found = false; var newterm = item[l].term;
						for(var y=0; y < terms.length;y++){ if(terms[y].toLowerCase() == newterm.toLowerCase()) { found = true; } }
						if(!found) { terms.push(newterm); }
						}
					options.formatListItem.call(list, list, item[0].type, v, terms);

				}
				count++;
			}
		};

		setInterval(function(){
			var newvalue = self.val();
			var cache = true;
			if(old != newvalue){
				var longervalue = newvalue.length > old.length && newvalue.indexOf(old) === 0;
				if(!old) { cache = false; }
				old = newvalue;
				if(newvalue.length < options.chars && open){ results.close();open = false;}
				else if(newvalue.length >=options.chars && newvalue.length > 0){
					if(cache) { cache = longervalue && newvalue.length > options.chars; }
					results.open(newvalue, cache);
					open = true;
					}

			}
		}, options.time);

		self.bind('keyup', function(){ if(!this.value.length){ results.close(); open = false; } });
		self.bind('blur', function(){
			if(open){setTimeout(function(){results.close();}, 200);open = false;}
			if(!self.val().length){self.showHint();}
			});
		//timeout for registering clicks on results.
		self.bind('focus', function(){
			if(self.hinted){
				self.hinted = false;
				$(this).removeClass(options.hintClass).val('');
			}
			if(self.val().length && !open){results.open('', open);open = true;}});
		//reopen, but do not get results
		return this;
	}
});

/**
* jOWL Browser -extension to jOWL to easily visualize ontologies.
* Creator - David Decraene
* Version 1.0
* Website:
*	http://jowl.ontologyonline.org
*/

var jOWLBrowser = {
	isReady : false,
	views : []
};

function createSparqlDLWidget(document){
		function displayResults(obj){
			var display = $('#sparqlresults');
			if(obj.error){ display.text("Error: "+obj.error); }
			else {
				display.empty();
				if(!obj.results || !obj.results.length) {  display.text("No results found"); $(".loader").hide(); return; }
				display.append($('<div class="stats"/>').text("Number of results: "+obj.results.length));

				for(var i=0;i<obj.results.length;i++){
					var txt = [];
					for(x in obj.results[i]){
							var str = (typeof obj.results[i][x] == 'string') ? obj.results[i][x] : obj.results[i][x].label();
							txt.push(x+' : '+str);
						}
					display.append($('<div/>').text(txt.join(', ')));
				}

			}
			$(".loader").hide();
		}

		$('#sparql').submit(function(){
				var v = $('input', this).val();
				$(".loader").show();
				try {
					new jOWL.SPARQL_DL(document, v)
						.execute({ onComplete : displayResults, expandQuery : true});
				} catch(e){
					console.error(e);
				}
				return false;
		});
}

function showOverviewResults(document, results, list, widget){
	var maxcount = 50;
	var hidden = $('<div/>').hide();
	jOWL.throttle(results, {
		limit : 200,
		modify : function(item){
			maxcount--;
			var $el = item.bind($("<span class='jowl_link'/>"));
			$el.click(function(){
				if(widget && widget.propertyChange){ widget.propertyChange(
					document.getResource(this.title)); }
			});
			if(maxcount > 0)  { if(maxcount != 49) list.append($("<span/>").text(",   ")); $el.appendTo(list); }
			else if(maxcount === 0){ list.append(hidden); }
			if(maxcount <=0) {if(maxcount != 0) hidden.append($("<span/>").text(",   "));  $el.appendTo(hidden);}
		},
		onComplete : function(arr){
			if(maxcount < 0) list.append($("<div class='jowl_link' style='margin-top:5px;'/>").text("... ["+maxcount*-1+" more]").click(function(){hidden.slideDown(); $(this).hide(); }));
		},
		chewsize : 20,
		timing : 5
	})

}

function createOverviewWidget(document){

	function sparql(query, list, widget, cb){
		var maxcount = 50; var hidden = $('<div/>').hide();
		new jOWL.SPARQL_DL(document, query).execute( {
			limit : 200,
			onComplete : function(res){
				if(!res.results) {return; }
				showOverviewResults(document, res.jOWLArray("?x"), list, widget);
				if(cb){ cb();}
			}
		});
	}

	function triggerView(num){
		var v = jOWLBrowser.views[num];
		if(v){
			sparql(v.query, v.element, v.widget, function(){
				triggerView(num+1);
			});
		}
	}
	triggerView(0);

};

function createConceptWidget(document){
		var widget = {};
		jOWL.UI.asBroadcaster(widget);
		widget.propertyChange = function(item){
			widget.broadcast(item);
		}

		var jnode = $('#conceptwidget');

		var descriptionpanel = $('.resourcebox', jnode).owl_propertyLens(document, {
			"term" : {split: ", "},
			"sparql-dl:DirectType(?i, owl:Class)": {split: ", "},
			"owl:disjointWith": {split: ", "},
			onChange : {
				"owl:Thing": function(source, target, resourcebox){
					this.addClass("jowl_tooltip"); tooltip.display(target, this); },
				"owl:Class": function(source, target, resourcebox){
					resourcebox.link(source, target, this); }
			}
		});

		var tooltip = $('#thingwidget .resourcebox').clone(true)
			.removeClass("owl_UI_box").addClass("owl_UI");
		tooltip.children('.title').remove();
		tooltip = tooltip.owl_propertyLens(document, {tooltip: true});

		//initialize UI components
		var tree = $('#treeview').owl_treeview(document, {addChildren: true, isStatic: true});
		var autocomplete = $('#owlauto').owl_autocomplete(document, {focus : true, chars : 2, filter : 'Class'});
		var navbar = $('#navbar').owl_navbar(document);

		widget.show = function(){
			var concept = null;
			if(configuration.owlClass){ concept = document.getResource(configuration.owlClass);}
			else {
				for(x in document.getIDIndex()){
					var entry = document.getIDIndex()[x];
					if(entry instanceof jOWL.Type.Class){
						concept = entry;
						break;
					}
				}
			}
			if(concept){
				this.propertyChange(concept);
			}
		}

		function toggleView(id){
			switch (id)
			{
			case 'navbar': $('#navbar').show(); $('#treeview').hide(); break;
			case 'treeview': $('#navbar').hide(); $('#treeview').show(); break;
			} return this;
		}
		toggleView($(':radio:checked').val());
		//show hint section
		$('#owlauto').blur(function(){$(this).siblings('.info').show();}).focus(function(){$(this).siblings('.info').fadeOut(1000);}).blur();
		$(':radio').change(function(){toggleView($(this).val());});
		//making sure components respond to each others input:
		widget.addListener([tree, navbar, descriptionpanel]);
		autocomplete.addListener([tree, navbar, descriptionpanel]);
		tree.addListener([navbar, descriptionpanel]);
		navbar.addListener([tree, descriptionpanel]);
		descriptionpanel.addListener([tree, navbar]);
		widget.show();
		return widget;
	}

function createPropertyWidget(document){
	$('#propertywidget').show();
	return $('#propertywidget .resourcebox').owl_propertyLens(document, {"term" : {split: ", "}});
}

function createIndividualsWidget(document){
	$('#thingwidget').show();
	return $('#thingwidget .resourcebox').owl_propertyLens(document, {"sparql-dl:PropertyValue(owl:Thing, ?p, ?t)" : {sort: "?p"}});
}

function createOntologyWidget(document){
	var ontologywidget = $('#title').owl_propertyLens(document);
	ontologywidget.propertyChange(document.getOntology());
}

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


/**arr: associative array of variablrd, jqel: node for which variables need to be substituted,  */
jOWL.UI.Template = function(arr, jqel, splitter){
	var options = {
		resultClass : "jowl-template-result",
		splitterClass : "jowl-template-splitter"
	};
	if(!arr) { return; }

	function bindObject(value, jnode){
		var bound = false;
		if(!value) { return false; }
		if(typeof value == 'string') { jnode.html(value); bound = true;}
		else if(value.constructor == Array){
			if(value.length == 2) { value[1].bind(jnode).text(value[0]); bound = true;	}
			}
		else if(value.bind){ value.bind(jnode); bound = true; }
		return bound;
	}
	var count = 0, a = [], b = {};
	var remnantFn = function(){
		var txt = $(this).text();
		if(txt.indexOf('${') === 0 && txt.lastIndexOf('}') == txt.length-1 ) { $(this).hide(); }
	};
	for(var i=0;i<arr.length;i++){
		var x = jqel.clone(true).wrapInner("<"+jqel.get(0).nodeName+" class='"+options.resultClass+"'/>").children();
		/** copy style settings */
			x.addClass(jqel.attr('class')).removeClass('propertybox');
		/** accepted obj types= string, array["string", "jowlobject"], jowlobject*/
		for(obj in arr[i]){
			if(!b[obj]) { b[obj] = []; }
			var occurrences = $(':contains(${'+obj+'})', x);
			if(!occurrences.length){
				if(x.text() == "${"+obj+"}") { if(bindObject(arr[i][obj], x)) {
					count++; b[obj].push(x.get(0));
				}}
			}
			else {
				occurrences.each(function(){
					if(this.innerHTML == "${"+obj+"}") { var node = $(this); if(bindObject(arr[i][obj], node)) { count++;  b[obj].push(this); }	}
				});
			}
		}
		var remnants = $(':contains(${)', x); //hide parameters that weren't substituted
			remnants.each(remnantFn);
		if(count){
			x.insertBefore(jqel);
			a.push(x.get(0));
			if(count > 1 && splitter) {
				$splitter = (splitter.indexOf('<') === 0) ? $(splitter) : $("<span/>").text(splitter);
				$splitter.addClass(options.splitterClass).insertBefore(x);
				}
		}
	}
	for(x in b){ if(b[x].length) { b[x] = $(b[x]); } }
	var nodes = $(a);
	$.data(nodes, "parameters", b);
	return nodes;
};

jOWL.UI.PropertyBox = Class.extend({
  initialize : function(document, $el, resourcebox){
  	var v = $('[data-jowl]', $el);
  	if(v.length){	this.descendant = true;}
    this.document = document;

  	this.el = $el;
  	this.resourcebox = resourcebox;
  	this.valuebox = v.length ? v : $el;
  	this.actiontype = this.valuebox.attr('data-jowl');
  },
  setResults : function(results, item){
		var nodes = jOWL.UI.Template(results, this.valuebox,
      this.resourcebox.options[this.actiontype].split);
		this.complete(nodes, item);
		if(nodes && nodes.length && this.descendant) {
      this.el.show(); this.valuebox.hide();
    }
		if(this.resourcebox.options[this.actiontype].onComplete) {
      this.resourcebox.options[this.actiontype].onComplete.call(this.el.get(0));
    }
	},
	complete : function(nodes, item){
		var res = this.resourcebox;
    var self = this;
		if(!nodes || !nodes.length) { return; }
		var v = $.data(nodes, "parameters");
		for(x in v){
			if(v[x].length && typeof res.options[this.actiontype][x] == "function") {
				v[x].each(res.options[this.actiontype][x]);
			}}
		for(x in res.options.onChange){
			var data = $('[typeof="'+x+'"]', nodes)
        .add(nodes.filter('[typeof="'+x+'"]'));
			if(x.charAt(0) == "." || x.charAt(0) == "#"){ data = data.add($(x, nodes));}
			data.each(function(){
				var node = $(this);
				$.data(node, 'data-jowl', x);
				var id = node.attr('title');
				if(id != "anonymousOntologyObject") {
					res.options.onChange[$.data(node, 'data-jowl')]
					.call(node, item, self.document.getResource(id), res);
				}
			});
		}
	},
	clear : function(){
		var prev = this.valuebox.prev('.jowl-template-result');
		if(!prev.length){ prev = this.valuebox.prev('.jowl-template-splitter');}
		if(prev.length) { prev.remove(); this.clear(this.valuebox); }
	}

});




$.fn.extend({
  /** Uses templating
  options:
  onChange: owl:Class, owl:Thing, etc..., tell the widget what to do with the different kinds of Ontology Objects.
  "data-jowl" : {split: ",  ", "somevariable" : function_triggered_for_each_result }
     example: "rdfs:label" : {split: ",  ", "rdfs:label" : function(){ //'this' keyword refers to HTML element}} )
     example: "sparql-dl:PropertyValue(owl:Class, ?p, ?x)" : {"?p": function(){ //'this' keyword refers to HTML element }}
     //prefil: for sparql-dl queries
     //onComplete: function to trigger when the specific propertybox query is completed, this refers to the HTML element for propertybox
     //sort: sort results on specified parameter, for sparql-dl results.
  onUpdate: called when the widget updates itself
  */
  		owl_propertyLens : function(document, options){
  			var self = this;
  			self.options = $.extend({
  				backlinkClass : "backlink",
  				split: {},
  				disable : {},
  				click : {}},
  				options);
  			self.resourcetype = this.attr('data-jowl') || "owl:Class";
  			var propertyboxes = [];
  			$('.propertybox', this).each(function(){
  				var node = new jOWL.UI.PropertyBox(document, $(this), self);
  				propertyboxes.push(node);
  				node.el.hide();
  			});
  			var backlink = $('.backlink', this).hide();
  			if(!backlink.length) { backlink = $('<div class="jowl_link"/>').addClass(self.options.backlinkClass).text("Back").hide().appendTo(this); }
  			jOWL.UI.asBroadcaster(this);

  			/** fn: optional function to execute*/
  			this.link = function(source, target, htmlel, fn){
  				htmlel.addClass("jowl_link").click(function(){
  				if(fn) { fn(); }
  				self.broadcast(target);
  				self.propertyChange(target);
  				backlink.source = source.name;
  				backlink.show().unbind('click').click(function(){
  					self.broadcast(source); self.propertyChange(source); backlink.hide();
  				});

  				});

  			};

  			var action = {
  				"rdfs:label": function(item){ return [{"rdfs:label": item.label() }]; },
  				"rdf:ID" : function(item){ return [{"rdf:ID": [item.name, item] }]; },
  				"rdfs:comment" : function(item){
  					return $.map(item.description(), function(n){return {"rdfs:comment":n }; });
  					},
  				"rdf:type" : function(item){
  					if(item.owlClass) { return [{"rdf:type": item.owlClass() }]; }
  					return [{"rdf:type": item.type }];
  				},
  				"term" : function(item){
  					return $.map(item.terms(), function(n, i){ return { "term" : n[0] }; });
  				},
  				"rdfs:range": function(item){if(item.range) { return [{"rdfs:range": item.range }]; } },
  				"rdfs:domain": function(item){if(item.domain) { return [{"rdfs:domain": item.domain }]; } },
  				"permalink": function(item){
  					var href = jOWL.permalink(item);
  					return [{"permalink": "<a href='"+href+"'>Permalink</a>" }];
  				},
  				"owl:disjointWith": function(item){
  					if(!(item instanceof jOWL.Type.Class)) { return; }
  					return $.map(
  							jOWL.Xpath('*', item.jnode)
  								.filter(function(){return this.nodeName == "owl:disjointWith"; }),
  							function(n, i){ return {"owl:disjointWith": jOWL($(n).RDF_Resource())};
  							});
  				},
  				"default" : function(item){
  					var type = this.attr("data-jowl");
  					return $.map(
  								jOWL.Xpath('*', item.jnode).filter(function(){return this.nodeName == type; }),
  								function(n, i){ var x = {}; x[type] = $(n).text(); return x; }
  								);
  				}
  			};

  			this.propertyChange = function(item){
  				if(!item) { return; }
  				self.property = item;
  				if(backlink.source != item.name) { backlink.hide(); } else { backlink.source = false; }

  				if(item.type != self.resourcetype){
  					if(item.isDatatypeProperty && self.resourcetype == "rdf:Property") {}
  					else if(item.isObjectProperty && self.resourcetype == "rdf:Property"){}
  					else { return; }
  				}

  				for(var i = 0;i<propertyboxes.length;i++){
  					var pbox = propertyboxes[i];
  					pbox.clear();
  					if(!pbox.actiontype){return; }
  					var actiontype = pbox.actiontype;
  					if(self.options.disable[actiontype]) { return; }

  					if(!self.options[actiontype]) { self.options[actiontype] = {}; }

  					if(actiontype.indexOf("sparql-dl:") === 0){
  						var query = actiontype.split("sparql-dl:", 2)[1];
  						var fill = {}; fill[self.resourcetype] = item;
  						if(self.options[actiontype].prefill) { $.extend(fill, self.options[actiontype].prefill); }
  						var qr = new jOWL.SPARQL_DL(document, query, fill).execute(
                {onComplete : function(r){
  							if(self.options[actiontype].sort) {
                  r.sort(self.options[actiontype].sort);
                }
  							pbox.setResults(r.results, item);
  							}});
  					}
  					else {
  						var choice = (action[actiontype]) ? actiontype : "default";
  						var results = action[choice].call(pbox.valuebox, item);
  						pbox.setResults(results, item);
  					}
  				}

  					if(self.options.onUpdate) { self.options.onUpdate.call(this, item); }
  			}; //end property change

  		if(self.options.tooltip){
  			var lens = this.remove();
  			this.display = function(element, htmlel){
  				htmlel.tooltip({
  					title: element.label(),
  					html: function(){	lens.propertyChange(element); backlink.hide(); return lens.get(0); }
  				});
  			};
  		}
  		return this;
  		}
});


		/** construct the hierarchy & make a tree of it */
jOWL.UI.TreeModel = Class.extend({
  initialize : function(owlobject, tree){
    tree.setModel(this);
    this.document = owlobject.element.document;
    this.options = tree.options;
    var h = owlobject.hierarchy(true);
    if(this.options.rootThing) {
      this.traverse(h, tree.root(jOWL.Thing));
    }
    else {
      var root = tree.root(h);
      for(var i=0;i<root.length;i++){
          this.traverse(root[i].invParents, root[i]);
          if(!root[i].invParents) { this.leaf(root[i]); }
        }

      }
    this.clear(owlobject);
  }, clear : function(el){
      var self = this;
      if(el.parents) {
        el.parents().each(function(){
        this.invParents = null; self.clear(this);
      });
    }
  }, leaf : function(node){
    node.jnode.addClass(this.options.focusClass);
    if(this.options.addChildren){
      var entry = this.document.getResource(node.$name.attr('title'));
      if(entry && entry.children){ entry.children().each(function(){
        node.add(this); }); }
      }
  }, traverse : function(itemarray, appendto){
    if(!itemarray) { return; }
    var self = this;
    itemarray.each(function(){
      var node = appendto.add(this);
      if(this.invParents){ self.traverse(this.invParents, node); }
      else { self.leaf(node); }
    });

  }

});

jOWL.UI.TreeNode = Class.extend({
  initialize : function(tree, text, isRoot){
    this.tree = tree;
    var self = this;
    this.jnode = isRoot ? $('<li/>').addClass(this.tree.options.rootClass) :
      $('<li class="tvi"/>');
    this.$name = null;

    if(text){
      this.$name = $('<span/>').addClass(this.tree.options.nameClass);
      if(typeof text == "string") { this.$name.html(text); }
      else if(text.bind) {
        text.bind(this.$name);
      }
      var n = this.$name;
      this.$name.appendTo(this.jnode).click(function(){
        var entry = tree.model.document.getResource(n.attr('title'));
        if(entry && tree.options.onSelect.call(n, entry) === false) { return; }
        tree.broadcast(entry);
        if(tree.options.isStatic) { tree.propertyChange(entry); }
        return false;});
    }

    this.wrapper = $('<ul/>').appendTo(this.jnode);
    this.jnode.click(function(){self.toggle(); return false;});
  }, add : function(text){
    var nn = new jOWL.UI.TreeNode( this.tree, text, false);
    if(!this.wrapper.children().length) { this.toNode();	}
    else {
      var lastchild = this.wrapper.children(':last');
      lastchild.swapClass("tvilc", "tvic");
      lastchild.swapClass("tvile", "tvie");
      lastchild.swapClass("tvil", "tvi");

      }//children - change end of list
    this.wrapper.append(nn.jnode.swapClass('tvi', 'tvil'));
    return nn;
  },
  toggle : function(){
    var t = this.jnode.hasClass("tvic") || this.jnode.hasClass("tvie") ||
    this.jnode.hasClass("tvilc") || this.jnode.hasClass("tvile");
    if(!t) { return; }
    this.jnode.swapClass('tvic', 'tvie');
    this.jnode.swapClass('tvilc', 'tvile');
    this.wrapper.slideToggle();
  }, toNode : function(){
    this.jnode.swapClass('tvil', 'tvilc');
    this.jnode.swapClass('tvi', 'tvic');
  }

});

/**
var tree = $(selector).owl_treeview();
var root = tree.root("node");
root.add("node2").add("child");
*/
jOWL.UI.Tree = Class.extend({
  initialize : function(node, options){
    this.options = options;
    this.rack = $('<ul/>').addClass(options.treeClass).appendTo(node);
    var tree = this;
  }, root : function(item){
    var rt = null; //root
    var self = this;
    this.rack.empty();
    if(item && item.each) {
      rt = [];
      item.each(function(it){
        var x =  new jOWL.UI.TreeNode(self, it, true);
        x.wrapper.addClass("tv");
        x.jnode.appendTo(self.rack);
        x.invParents = it.invParents;
        it.invParents = null;	//reset for later use
        rt.push(x);
      });
      return rt;
    }
    rt = new fn.node(item, true);
    rt.wrapper.addClass("tv");
    rt.jnode.appendTo(this.rack);
    return rt;
  }, propertyChange : function(item){
    if(item instanceof jOWL.Type.Class) {
      var m = new jOWL.UI.TreeModel(item, this);
    }
  }, setModel : function(model){
    this.model = model;
  }


});


$.fn.extend({
/**
Tree View
*/
	owl_treeview : function(document, options){
    if(!(document instanceof jOWL.Document)) throw new Error("No Document passed");
		options = $.extend({
			contentClass : jOWL.UI.defaults.contentClass,
			focusClass: "focus",
			nameClass: "name",
			treeClass: "jowl-treeview",
			rootClass: "root",
			onSelect : function(item){}, //function that can be overwritten to specfy behavior when something is selected
			rootThing : false, //if true then topnode is (owl) 'Thing'
			isStatic : false, // if static then selections will refresh the entire tree
			addChildren : false //add a given objects children to the treeview as well
		}, options);


		this.addClass("jowl-tree");
		this.content = $("."+options.contentClass, this).empty();
		if(!this.content.length){
      this.content = $('<div/>').addClass(options.contentClass).appendTo(this);
    }
		var tree = new jOWL.UI.Tree(this.content, options);
		jOWL.UI.asBroadcaster(tree);
		return tree;
	}
});
