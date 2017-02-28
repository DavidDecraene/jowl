
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

  			this.onResource = this.propertyChange = function(item){
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
  						if(self.options[actiontype].prefill) {
								$.extend(fill, self.options[actiontype].prefill); }
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
