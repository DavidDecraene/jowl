/**
* jOWL Browser -extension to jOWL to easily visualize ontologies.
* Creator - David Decraene
* Version 1.0
* Website:
*	http://jowl.ontologyonline.org
*/


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
					for(var x in obj.results[i]){
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

SparqlList = Class.extend({
	include : [EventListener],
	initialize : function($element, query, variable){
		this.$element = $element;
		this.querySyntax = query;
		this.variable = variable;
		this.$hidden = $('<div/>').hide();
		var self = this;
		this.$element.click(function(e){
			var $target = $(e.target);
			if($target.is('.expand')){
				self.$hidden.slideDown(); $target.hide();
				return false;
			}
			if($target.is('a')){
				if(!self.document) return false;
				var title = $target.attr('title');
				if(title){
					var resource = self.document.getResource($target.attr('title'));
					self.fireEvent("Resource", resource);
				}
				return false;
			}
		});
	}, query : function(document, cb){
		var self = this;
		this.document = document;
		new jOWL.SPARQL_DL(document, this.querySyntax).execute( {
			limit : 200,
			onComplete : function(res){
				if(!res.results) {return; }
				self.setResults(document, res.jOWLArray(self.variable));
				if(cb){ cb();}
			}
		});
	}, setResults : function(document, results){
		var maxcount = 50;
		var currCount = maxcount;
		var self = this;
		jOWL.throttle(results, {
			limit : 200,
			modify : function(item){
				currCount--;
				if(currCount > 0)  {
					if(currCount != maxcount-1) self.$element.append($("<span/>").text(",   "));
					item.bind($("<a href='#'/>")).appendTo(self.$element);
				} else {
					if(currCount === 0){ self.$element.append(self.$hidden); }
					else self.$hidden.append($("<span/>").text(",   "));
					item.bind($("<a href='#'/>")).appendTo(self.$hidden);
				}
			},
			onComplete : function(){
				if(currCount < 0) {
					self.$element
					.append($("<a href='#' class='expand' style='margin-top:5px;'/>")
					.text("... ["+currCount*-1+" more]"));
				}
			},
			chewsize : 50,
			timing : 5
		});
	}
});

function createOverviewWidget(document, views){
	if(!views.length) return;
	var view = views.splice(0, 1);
	view[0].query(document, function(){
		createOverviewWidget(document, views);
	});
}



function createConceptWidget(document){
		var widget = {	};
		jOWL.UI.asBroadcaster(widget);
		widget.onResource =  widget.propertyChange = function(item){
			widget.broadcast(item);
		};

		var jnode = $('#conceptwidget');

		var descriptionpanel = $('.resourcebox', jnode).owl_propertyLens(document,
			{
			"term" : {split: ", "},
			"sparql-dl:DirectType(?i, owl:Class)": {split: ", "},
			"owl:disjointWith": {split: ", "},
			onChange : {
				"owl:Thing": function(source, target, resourcebox){
					this.addClass("jowl_tooltip");
					tooltip.display(target, this);
				},
				"owl:Class": function(source, target, resourcebox){
					resourcebox.link(source, target, this);
				}
			}
		});

		var tooltip = $('#thingwidget .resourcebox').clone(true);
		tooltip.children('.title').remove();
		tooltip = tooltip.owl_propertyLens(document, {tooltip: true});

		//initialize UI components
		var tree = $('#treeview').owl_treeview(document, {addChildren: true, isStatic: true});
		var autocomplete = $('#owlauto').owl_autocomplete(document, {focus : true, chars : 2, filter : 'Class'});
		var navbar = $('#navbar').owl_navbar(document);

		widget.show = function(){
			var concept = null;
			if(configuration.owlClass){
				concept = document.getResource(configuration.owlClass);}
			else {
				for(var x in document.getIDIndex()){
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
		};

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
