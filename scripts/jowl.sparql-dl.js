

/** Creates a new resultobj for the SPARQL-DL functionality */
jOWL.SPARQL_DL_Result = function(){
	this.assert = undefined;
	this.head = {}; //associative array of query parameters, with value jOWL Array of results
	this.results = []; //sparql-dl bindings
	this.isBound = false;
};

jOWL.SPARQL_DL_Result.prototype = {
	sort : function(param){
		if(!param){ throw "parameter must be defined for sort function";}
		function sortResults(a, b){
			var o = a[param].name || a[param];
			var p = b[param].name || b[param];
			return (o < p) ? -1 : 1;
		}
		if(this.results){ this.results.sort(sortResults); }
	},
	jOWLArray : function(param){
		if(!param){ throw "parameter must be defined for jOWLArray function";}
		var arr = new jOWL.Array();
		for(var i=0;i<this.results.length;i++){
		if(this.results[i][param]){ arr.pushUnique(this.results[i][param]);}
		}
		return arr;
	},
	/** Filter head Parameters */
	filter : function(param, arr){
		if(this.head[param] === undefined){this.head[param] = arr;}
		else {
			var self = this;
			this.head[param].filter(function(){ return (arr.contains(this));});
			arr.filter(function(){ return (self.head[param].contains(this));});
		}
	},
	/** Update result section, results = SPARQL_DL_Array */
	bind : function(results){
		if(!this.isBound){//new results
			this.results = this.results.concat(results.arr);
			this.isBound = true;
			return;
		}
		var multimapping = -1;
		var x = null;
		for(x in results.mappings){ multimapping++; }
		var toAdd = [];

		for(x in results.mappings){
			var otherKeys;
			if(multimapping){
				otherKeys = results.keyCentric(x);
			}
			for(var i = this.results.length-1;i>=0;i--){
				var valueX = this.results[i][x];
				if(valueX){
					if(!results.mappings[x].contains(valueX)){
						this.results.splice(i, 1);
						continue;
					}
					if(multimapping){
						var keyArr= otherKeys[valueX.URI];
						//ignoring the opposite for now (assuming original key x is unique (limits statements))
						//TODO: improve these result merging methods/flexibility
						for(var oK = 0; oK < keyArr.length;oK++){
							var obj = (oK === 0) ? this.results[i] : {};
							var valueY = keyArr[oK];
							obj[x] = valueX;
							for(var yK in valueY){ obj[yK] = valueY[yK]; }
							toAdd.push(obj);
						}
						this.results.splice(i, 1);
					}
				}
			}
		}
		this.results = this.results.concat(toAdd);
	}
};

/** Creates a new query for the SPARQL-DL functionality */
jOWL.SPARQL_DL_Query = function(document, syntax, parameters){
		if(!(document instanceof jOWL.Document)) throw new Error("No Document specified");
		this.document = document;
		this.entries = [];
		this.parse(syntax);
		this.fill(parameters);
		this.entries = this.entries.sort(this.sort);
};

jOWL.SPARQL_DL_Query.prototype = {
	parse : function(syntax){
		 var r2 = /(\w+)[(]([^)]+)[)]/;
		 var entries = syntax.match(/(\w+[(][^)]+[)])/g);
		 if(!entries){ this.error =  "invalid abstract sparql-dl syntax"; return;}
		 entries = jOWL.priv.Array.unique(entries);
		 for(var i = 0;i<entries.length;i++){
			var y = entries[i].match(r2);
			if(y.length != 3){ this.error = "invalid abstract sparql-dl syntax"; return;}
			entries[i] = [y[1], y[2].replace(/ /g, "").split(',')];
		 }
		 this.entries = entries;
	},
	fill : function(parameters){
		for(var i = 0;i<this.entries.length;i++){
			for(var j =0; j<this.entries[i][1].length; j++){
				var p = parameters[this.entries[i][1][j]];
				if(p !== undefined)  { this.entries[i][1][j] = p;}
				else {
					p = this.entries[i][1][j];
					if(p.charAt(0) != '?')
					{
						if(this.entries[i][0] == "PropertyValue" && j == 2)
						{
						var m = p.match(/^["'](.+)["']$/);
						if(m && m.length == 2){ this.entries[i][1][j] = {test: m[1]}; break;}
						}
					this.entries[i][1][j] = this.document.getResource(p);
					if(this.entries[i][1][j] === null){
						this.entries.error = "a parameter in the query was not found";
						return;}
					}
				}
			}
		}
	},
	sort : function(a, b){
		var i;
		if(a[1].length == 1){ return (b[0] == 'PropertyValue') ? 1 : -1;}
		if(b[1].length == 1){ return (a[0] == 'PropertyValue') ? -1 : 1;}
		var avar = 0; for(i = 0;i<a[1].length;i++){ if(typeof a[1][i] == 'string'){ avar++;} }
		var bvar = 0; for(i = 0;i<a[1].length;i++){ if(typeof b[1][i] == 'string'){ bvar++;} }
		if(avar != bvar){ return avar - bvar;}
		if(a[0] == 'Type' && b[0] != 'Type'){ return -1;}
		if(a[0] != 'Type' && b[0] == 'Type'){ return 1;}
		return 0;
	}
};

/** Private function */
function _Binding(bindingarray){
	this.value = {};
	this.arr = bindingarray;
}

_Binding.prototype = {
	bind : function(key, value){
		this.value[key] = value;
		if(!this.arr.mappings[key]){ this.arr.mappings[key] = new jOWL.Array();}
		this.arr.mappings[key].push(value);
		return this;
	}
};

/** Local Function, private access, Temp results */
function SPARQL_DL_Array(keys){
	this.arr = [];
	this.mappings = {};

	if(keys){
		for(var i =0;i<keys.length;i++){
			if(keys[i]){this.mappings[keys[i]] = new jOWL.Array();}
		}
	}
}

SPARQL_DL_Array.prototype = {
	add : function(binding){
		this.arr.push(binding.value);
		return binding;
	},
	push : function(key, value){
		var binding = new _Binding(this);
		binding.bind(key, value);
		this.arr.push(binding.value);
		return binding;
	},
	keyCentric : function(keyX){
		var arr = {};
		for(var i = this.arr.length-1;i>=0;i--){
			if(this.arr[i][keyX]){
				if(!arr[this.arr[i][keyX].URI]){ arr[this.arr[i][keyX].URI] = []; }
				arr[this.arr[i][keyX].URI].push(this.arr[i]);
			}
		}
		return arr;
	},
	get : function(key)
	{
		return (this.mappings[key]) ? this.mappings[key] : new jOWL.Array();
	},
	getArray : function(){
		//check mappings for presence, discard arr entries based on that, return remainder.
		for(var i = this.arr.length - 1;i>=0;i--){
			var binding = this.arr[i], splice = false;
			for(var key in binding){
				if(!splice){
					splice = (!this.mappings[key] || !this.mappings[key].contains(binding[key]));
				}
			}
			if(splice){
				this.arr.splice(i, 1);
			}
		}
		return this;
	}
};

/**
Support for abstract SPARQl-DL syntax
options.onComplete: function triggered when all individuals have been looped over
options.childDepth: depth to fetch children, default 5, impacts performance
options.chewsize: arrays will be processed in smaller chunks (asynchronous), with size indicated by chewsize, default 10
options.async: default true, query asynchronously
parameters: prefill some sparql-dl parameters with jOWL objects
execute: start query, results are passed through options.onComplete
*/
jOWL.SPARQL_DL = function(document, syntax, parameters, options){
	if(!(document instanceof jOWL.Document)) throw new Error("No Document specified");
	if(!(this instanceof arguments.callee)){ return new jOWL.SPARQL_DL(document, syntax, parameters, options);}
	var self = this;
	this.document = document;
	this.parameters = $.extend({}, parameters);
	this.query = new jOWL.SPARQL_DL_Query(document, syntax, this.parameters).entries;
	this.result = new jOWL.SPARQL_DL_Result();
	this.options = $.extend({onComplete: function(results){}}, options);
};

jOWL.SPARQL_DL.prototype = {
	error: function(msg){ this.result.error = msg;
		return this.options.onComplete(this.result);},
	/**
	if(options.async == false) then this method returns the result of options.onComplete,
	no matter what, result is always passed in options.onComplete
	*/
	execute : function( options){
		var self = this;
		this.options = $.extend(this.options, options);
		if(this.query.error){ return this.error(this.query.error);}

		var resultobj = this.result;
		var i = 0;
		var loopoptions = $.extend({}, this.options);
		loopoptions.onComplete = function(results){ i++; resultobj = results; loop(i);};

		if(!this.query.length){
			resultobj.error = "no query found or query did not parse properly";
			return self.options.onComplete(resultobj);
			}

		function loop(i){
			if(i < self.query.length){
				self.process( self.query[i], resultobj, loopoptions );
				}
			else {
				for(var j =0;j<resultobj.results.length;j++){ //Convert Literals into strings
					var b = resultobj.results[j];
					for(var x in b){
						if(b[x] instanceof jOWL.Literal){b[x] = b[x].name;}
					}
				}
				return self.options.onComplete(resultobj);
			}
		}
		loop(i);
	},
	/** results are passed in the options.onComplete function */
	process: function( entry, resultobj, options){
		var document = this.document;
		if(!document) throw new Error("No Document specified");
		var self = this;
		options = $.extend({chewsize: 10, async : true,
			onComplete : function(results){}}, options);
		var q = entry[0];
		var sizes = {
			"Type": [jOWL.NS.owl('Thing'), jOWL.NS.owl('Class')],
			"DirectType": [jOWL.NS.owl('Thing'), jOWL.NS.owl('Class')],
			"PropertyValue" : [false, false, false],
			"Class": [false],
			"Thing": [false],
			"ObjectProperty": [false],
			"DatatypeProperty": [false],
			"SubClassOf" : [jOWL.NS.owl('Class'), jOWL.NS.owl('Class')],
			"DirectSubClassOf" : [jOWL.NS.owl('Class'), jOWL.NS.owl('Class')]
			};

		if(!sizes[q]){ return self.error("'"+q+"' queries are not implemented");}
		if(sizes[q].length != entry[1].length){ return self.error("invalid SPARQL-DL "+q+" specifications, "+sizes[q].length+" parameters required");}
		for(var i = 0;i<entry[1].length;i++){
			var v = sizes[q][i];
			if(v){
				var m = entry[1][i];
				if(typeof m != 'string' && m.type != v){ return self.error("Parameter "+i+" in SPARQL-DL Query for "+q+" must be of the type: "+v);}
			}
		}
		if(q == "DirectType"){ options.childDepth = 0;
			return self.fn.Type.call(self, this.document, entry[1], resultobj, options);}
		else if(q == "DirectSubClassOf"){ options.childDepth = 1;
			return self.fn.SubClassOf.call(self, this.document, entry[1], resultobj, options);}
		return self.fn[q].call(self, this.document, entry[1], resultobj, options);
	},
	fn : {
			"SubClassOf" : function(document, syntax, resultobj, options){
				var atom = new jOWL.SPARQL_DL.DoubleAtom(syntax, resultobj.head);
				var results = new SPARQL_DL_Array();

				if(atom.source.isURI() && atom.target.isURI()){//assert
					if(resultobj.assert !== false){
						var parents = atom.source.value.ancestors();
						resultobj.assert = parents.contains(atom.target.value);
					}
					return options.onComplete(resultobj);
				}
				else if(atom.source.isURI()){//get parents
					atom.source.value.ancestors().each(function(){
						results.push(atom.target.value, this);
						});
					resultobj.filter(atom.target.value, results.get(atom.target.value));
					resultobj.bind(results.getArray());
					return options.onComplete(resultobj);
				}
				else if(atom.target.isURI()){//get children
					atom.target.value.descendants(options.childDepth).each(function(){
						results.push(atom.source.value, this);
						});
					resultobj.filter(atom.source.value, results.get(atom.source.value));
					resultobj.bind(results.getArray());
					return options.onComplete(resultobj);
				}
				else{//both undefined
					return this.error('Unsupported SubClassOf query');
				}
			},
			"Type" : function(document, syntax, resultobj, options){
				var atom = new jOWL.SPARQL_DL.DoubleAtom(syntax, resultobj.head);

			function addIndividual(cl){
				if(indivs[this.URI]){ return;}
				var b = results.push(atom.source.value, this);
				if(addTarget){  b.bind(atom.target.value, cl);}
				indivs[this.URI] = true;
			}

			function traverse(node, match){
					var a = node.parents();
					var found = false;
					if(a.contains(match)){ found = true;}
					else {
						a.each(function(){
							if(this == jOWL.Thing){ return;}
							if(!found && traverse(this, match)){ found = true;} });
						}
					return found;
				}

				if(atom.source.isURI() && atom.target.isURI()){//assert
					return jOWL.SPARQL_DL.priv.assert(resultobj, function(){
						var cl = atom.source.value.owlClass();
						if(cl.URI == atom.target.value.URI){ return true;}
						return traverse(cl, atom.target.value);
					}, options.onComplete);
				}
				else if(atom.source.getURIs() && !atom.target.getURIs()){//get class
					var results = new SPARQL_DL_Array();
					var addSource = !atom.source.isURI();
					var addTarget = !atom.target.isURI();
					 atom.source.getURIs().each(function(){
						var b;
						if(addTarget){ b = results.push(atom.target.value, this.owlClass());}
						if(addSource){
							if(addTarget){ b.bind(atom.source.value, this);}
							else {results.push(atom.source.value, this);}
						}
					 });
					if(addSource){  resultobj.filter(atom.source.value, results.get(atom.source.value));}
					if(addTarget){  resultobj.filter(atom.target.value, results.get(atom.target.value));}
					resultobj.bind(results.getArray());
					return options.onComplete(resultobj);
				}
				else if(atom.target.getURIs()){//get Individuals, slow
					var addTarget = !atom.target.isURI();
					var classlist = atom.target.getURIs(),
						classes = {}, indivs = {};

						var results = new SPARQL_DL_Array();


						classlist.each(function(){ //expand list of classes, not very fast!
							if(classes[this.URI]){ return;}
							var oneOf = this.oneOf(), cl = this;
							if(oneOf.length){ oneOf.each(function(){ addIndividual.call(this, cl);});}
							else{ this.descendants(options.childDepth).each(function(){ //this is the slower call
								classes[this.URI] = true;
							}); }
							classes[this.URI] = true;
						});

						for(x in classes){
							var individuals = document.index("Thing")[x];
							if(individuals){
								var cl = document.index('ID')[x];
								if(options.onUpdate){ options.onUpdate(individuals);}
								individuals.each(function(){
									addIndividual.call(this, cl);
								});
							}
						}
						resultobj.filter(atom.source.value, results.get(atom.source.value));
						resultobj.bind(results.getArray());
						return options.onComplete(resultobj);
				}
				return this.error('Unsupported Type query');
			},
			"Thing" : function(document, syntax, resultobj, options){
				jOWL.SPARQL_DL.priv.IDQuery(document, syntax[0], jOWL.Type.Individual, resultobj, options);
			},
			"Class" : function(document, syntax, resultobj, options){
				jOWL.SPARQL_DL.priv.IDQuery(document, syntax[0], jOWL.Type.Class, resultobj, options);
			},
			"ObjectProperty" : function(document, syntax, resultobj, options){
				jOWL.SPARQL_DL.priv.PropertyQuery(document, syntax[0],
					document.index("property").items, jOWL.Type.ObjectProperty, resultobj, options);
			},
			"DatatypeProperty" : function(document, syntax, resultobj, options){
				jOWL.SPARQL_DL.priv.PropertyQuery(document, syntax[0],
					document.index("property").items, jOWL.Type.DatatypeProperty, resultobj, options);
			},
			"PropertyValue" : function(document, syntax, resultobj, options){
				var atom = new jOWL.SPARQL_DL.TripleAtom(syntax, resultobj.head);

				if(atom.source.isURI() && atom.property.isURI() && atom.target.isURI()){//assert
					if(resultobj.assert !== false){
						jOWL.SPARQL_DL.priv.PropertyValuegetSourceInfo(atom.source.value, atom.property.value, atom.target.value, resultobj, { assert : true });
					}
					return options.onComplete(resultobj);
				}

				if(!atom.source.getURIs()){
					jOWL.SPARQL_DL.priv.IDQuery(atom.source.value, [jOWL.Type.Class, jOWL.Type.Individual], resultobj, options);
					return;
				}
				var filterTarget = atom.target.isVar() ? atom.target.value : false;
				var filterProperty = atom.property.isVar() ? atom.property.value : false;
				var filterSource = atom.source.isVar() ? atom.source.value : false;
				jOWL.SPARQL_DL.priv.PropertyValuegetSourceInfo(atom.source.getURIs(), atom.property.getURIs(), atom.target.getURIs(), resultobj,
					{
						filterTarget : filterTarget, filterProperty : filterProperty, filterSource : filterSource
					});
				return options.onComplete(resultobj);
			}
		}
};

jOWL.SPARQL_DL.priv = {
	assert : function(resultobj, fn, onComplete){
		if(resultobj.assert !== false){
			resultobj.assert = fn();
		}
		onComplete(resultobj);
	},
	//reusable function
	PropertyValuegetSourceInfo : function(jSource, property, target, resultobj, options){
		if(!(jSource.isArray)){
			return jOWL.SPARQL_DL.priv.PropertyValuegetSourceInfo(new jOWL.Array([jSource]), property, target, resultobj, options);
		}

		options = $.extend({}, options);
		var results = new SPARQL_DL_Array([options.filterSource, options.filterProperty, options.filterTarget]),
			match = false;
		jSource.each(function(){
			var source = this;
			if(target && target.isArray && target.length == 1){
				var literal = target.get(0).test;
				if(literal){ target = literal;}//unwrap literal expressions
			}
			var restrictions = source.sourceof(property, target);
			if(options.assert){
				if(restrictions.length > 0){ match = true;}
				return;
			}
			if(!restrictions.length){ return;}
			restrictions.each(function(){
				var binding = new _Binding(results);
				if(options.filterSource){
					binding.bind(options.filterSource, source);
					if(!options.filterProperty && !options.filterTarget){ results.add(binding); return false;}
				}
				if(options.filterProperty){
					binding.bind(options.filterProperty, this.property);
				}
				if(options.filterTarget){
					binding.bind(options.filterTarget, this.getTarget());
				}
				results.add(binding);
			});
			return true;
		});
		if(options.assert){
			resultobj.assert = match;
			return resultobj.assert;
		}
		if(options.filterSource){ resultobj.filter(options.filterSource, results.get(options.filterSource));}
		if(options.filterProperty){ resultobj.filter(options.filterProperty, results.get(options.filterProperty));}
		if(options.filterTarget)  { resultobj.filter(options.filterTarget, results.get(options.filterTarget));}
		resultobj.bind(results.getArray());
	},
	hasClassID: function(match, classID){
		if(Object.prototype.toString.call(classID) === '[object Array]'){
			for(var i =0;i<classID.length;i++){

				if(match instanceof classID){ return true;}
			}
		} else if(match instanceof classID){  return true;}
		return false;
	},
	IDQuery : function(document, parameter, classID, resultobj, options){
		if(!(document instanceof jOWL.Document)) throw new Error("No document passed");
		var atom = new jOWL.SPARQL_DL.Atom(parameter, resultobj.head);
		if(atom.isURI()){
			return jOWL.SPARQL_DL.priv.assert(resultobj, function(){
				return jOWL.SPARQL_DL.priv.hasClassID(atom.getURIs().get(0), classID);
			}, options.onComplete);
		}
		var results = new SPARQL_DL_Array();
		for(var x in document.index("ID")){
			var match = document.index("ID")[x];
			if(jOWL.SPARQL_DL.priv.hasClassID(match, classID)){ results.push(parameter, match);}
		}
		resultobj.filter(parameter, results.get(parameter));
		resultobj.bind(results.getArray());
		options.onComplete(resultobj);
	},
	PropertyQuery : function(document, parameter, index, className, resultobj, options){

			if(!(document instanceof jOWL.Document)) throw new Error("No document passed");
			var atom = new jOWL.SPARQL_DL.Atom(parameter, resultobj.head);
		if(atom.isURI()){
			return jOWL.SPARQL_DL.priv.assert(resultobj, function(){
				return jOWL.SPARQL_DL.priv.hasClassID(atom.getURIs().get(0), className);
			}, options.onComplete);
		}
		var results = new SPARQL_DL_Array();
		var tr = new jOWL.throttle(index, $.extend({}, options, {
			modify : function(result){
				if(!(result instanceof jOWL.Type.Thing)){ result = jOWL(result);}
				if(jOWL.SPARQL_DL.priv.hasClassID(result, className)){results.push(parameter, result);}
				return false;
			},
			onComplete : function(){
				resultobj.filter(parameter, results.get(parameter));
				resultobj.bind(results.getArray());
				options.onComplete(resultobj);
			}
		}));
	}
};

jOWL.SPARQL_DL.TripleAtom = function(syntax, store){
	this.source = new jOWL.SPARQL_DL.Atom(syntax[0], store);
	this.property = new jOWL.SPARQL_DL.Atom(syntax[1], store);
	this.target = new jOWL.SPARQL_DL.Atom(syntax[2], store);
};

jOWL.SPARQL_DL.DoubleAtom = function(syntax, store){
	this.source = new jOWL.SPARQL_DL.Atom(syntax[0], store);
	this.target = new jOWL.SPARQL_DL.Atom(syntax[1], store);
};


jOWL.SPARQL_DL.Atom = function(syntax, store){
	this.value = syntax;
	this.type = 0;
	if(typeof syntax == 'string'){
		if(syntax.indexOf('?') === 0){
			this.type = this.VAR;
			if(store && store[syntax]){ this.mappings = store[syntax];}
		} else {
			this.type = this.LITERAL;
		}
	} else {
		this.type = this.URI;
	}
};

jOWL.SPARQL_DL.Atom.prototype = {
	URI : 1, LITERAL : 2, VAR : 3,
	getURIs : function(){
		if(this.isURI()){return new jOWL.Array([this.value]);}
		return this.mappings;
	},
	isVar : function(){return this.type == this.VAR;},
	isLiteral :  function(){return this.type == this.LITERAL;},
	isURI : function(){ return this.type == this.URI;}
};
