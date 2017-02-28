jOWL.UI.Autocomplete = Class.extend({
  include :  [EventListener],
	initialize : function($element, options){
		this.$element = $element;
		this.options = options;
		if(this.options.hint){
			this.attr('placeholder', this.options.hint);
		}
		var autocomplete = this;
		var self = this.$element;
		var old = ''; var open = false;
		self.val('');
		var results = $('<ul/>').addClass(options.contentClass).addClass("jowl_autocomplete_results");

		var div = $("<div/>").addClass(options.wrapperClass).append(results);
		self.after(div);
		results.cache = {};
		results.isEmpty = function(){ for(var x in results.cache) { return false; }
			return true;
		};
		results.close = function(){this.hide();};
		results.open = function(q, cache){
			this.show();
			if(q){
				if(!cache || results.isEmpty()) {
          results.cache = autocomplete.document.query(q, options);
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
        var res = autocomplete.document.getResource(node.data("jowltype"));
				if(options.onSelect.call(node, res) === false) { return; }
				autocomplete.fireEvent("Resource", res);
			};

			var onHover = function(){ $(this).addClass(options.focusClass); };
			var offHover = function(){$(this).removeClass(options.focusClass);};

			for(var x in data){
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
			if(open){setTimeout(function(){
					results.close();}, 200);open = false;}
		});
		//timeout for registering clicks on results.
		self.bind('focus', function(){
			if(self.val().length && !open){results.open('', open);open = true;}});
	}, setDocument : function(document){
		this.document = document;
	}
});

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
		var autoComplete = new jOWL.UI.Autocomplete(this, options);
		autoComplete.setDocument(document);
		return autoComplete;
	}
});
