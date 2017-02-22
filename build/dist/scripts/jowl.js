/**
* jOWL - a jQuery plugin for traversing and visualizing OWL-DL documents.
* Creator - David Decraene
* Version 1.0
* Website:
*	http://Ontologyonline.org
* Licensed under the MIT license
*	http://www.opensource.org/licenses/mit-license.php
* Verified with JSLint
*	http://www.jslint.com/
*/

jOWL = window.jOWL = {};
jOWL.version = "1.0";

/** for debugging compatibility */
	try { console.log('...'); } catch(e) { console = window.console = { log: function() {} }; }



(function($){

/**
* if no param: @return string of main namespaces
* if 1 param: assume a documentElement, parse namespaces
* if prefix & URI: Bind prefix to namespace URI
*/
jOWL.NS = function(prefix, URI){
	if(!arguments.length)
	{ return "xmlns:"+jOWL.NS.owl.prefix+"='"+jOWL.NS.owl()+"' xmlns:"+jOWL.NS.rdf.prefix+"='"+jOWL.NS.rdf()+"' xmlns:"+jOWL.NS.rdfs.prefix+"='"+jOWL.NS.rdfs()+"' xmlns:"+jOWL.NS.xsd.prefix+" ='"+jOWL.NS.xsd()+"'";}

	if(arguments.length == 1){
		var attr = prefix.get(0).attributes;
		for(var i=0;i<attr.length;i++){
			var nn = attr[i].nodeName.split(':');
			if(nn.length == 2){
				if(attr[i].nodeValue == jOWL.NS.owl.URI){ jOWL.NS.owl.prefix = nn[1];}
				else if(attr[i].nodeValue == jOWL.NS.rdf.URI){ jOWL.NS.rdf.prefix = nn[1];}
				else if(attr[i].nodeValue == jOWL.NS.rdfs.URI){ jOWL.NS.rdfs.prefix = nn[1];}
				else if(attr[i].nodeValue == jOWL.NS.xsd.URI){ jOWL.NS.xsd.prefix = nn[1];}
				else { jOWL.NS(nn[1], attr[i].nodeValue);}
			}
		}
		jOWL.namespace =  prefix.attr('xml:base') || prefix.attr('xmlns');
		return;
	}
	jOWL.NS[prefix] = function(element){
		if(element){
			return (arguments.callee.prefix == 'base') ? element : arguments.callee.prefix + ":" + element;
			}
		return arguments.callee.URI;
		};
	jOWL.NS[prefix].prefix = prefix;
	jOWL.NS[prefix].URI = URI;
};

/** set Main namespaces */
jOWL.NS("owl", "http://www.w3.org/2002/07/owl#");
jOWL.NS("rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#");
jOWL.NS("rdfs", "http://www.w3.org/2000/01/rdf-schema#");
jOWL.NS("xsd", "http://www.w3.org/2001/XMLSchema#");

/** jQuery function additions for easy parsing of identities */
$.fn.extend({
	rdfID : function(match){
		var res = this.attr(jOWL.NS.rdf('ID'));
		if(!res){ return false;}
		res = jOWL.resolveURI(res);
		if(match){
			return res.toLowerCase() == (jOWL.resolveURI(match.toString())).toLowerCase();}
		return res;
		},
	RDF_Resource : function(match){
		function getClassName(dom){
			var cl = jOWL.Xpath(jOWL.NS.owl("Class"), dom);
			console.log("etc", cl);
			if(cl.length == 1){ return new jOWL.Type.Class(cl).URI;}
			return false;
		}
		if(!this.length){ return false;}
		var rsrc = this.attr(jOWL.NS.rdf('resource'));
		if(!rsrc){
			var dom = this.get(0);
			switch(dom.nodeName){
				case jOWL.NS.rdfs("subClassOf"): rsrc = getClassName(dom); break;
				case jOWL.NS.owl("disjointWith"): rsrc = getClassName(dom); break;
				case jOWL.NS.owl("allValuesFrom"): rsrc = getClassName(dom); break;
				case jOWL.NS.owl("someValuesFrom"): rsrc = getClassName(dom); break;
				case jOWL.NS.owl("onProperty"):
					var t = jOWL.Xpath(jOWL.NS.owl("ObjectProperty"), dom);
					if(t.length === 0){ t = jOWL.Xpath(jOWL.NS.owl("DatatypeProperty"), dom);}
					if(t.length === 0){ t = jOWL.Xpath(jOWL.NS.owl("FunctionalProperty"), dom);}
					rsrc = t.attr(jOWL.NS.rdf('about')); break;
				default: return false;
			}
		}
		if(!rsrc){ return false;}
		rsrc = jOWL.resolveURI(rsrc);
		if(match){ return rsrc.toLowerCase() == (jOWL.resolveURI(match.toString())).toLowerCase();}
		return rsrc;
		},
	rdfAbout : function(match){
		var res = this.attr(jOWL.NS.rdf('about'));
		if(!res){ return false;}
		res = jOWL.resolveURI(res);
		if(match){
			return res.toLowerCase() == (jOWL.resolveURI(match.toString())).toLowerCase();}
		return res;
		}
});

/** Check XPath implementation */
if( document.implementation.hasFeature("XPath", "3.0") ){
	XMLDocument.prototype.selectNodes = function(cXPathString, xNode){
		if( !xNode ){ xNode = this;}
		var oNSResolver = this.createNSResolver(this.documentElement);
		var aItems = this.evaluate(cXPathString, xNode, oNSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); var aResult = []; for( var i = 0; i < aItems.snapshotLength; i++){ aResult[i] = aItems.snapshotItem(i);}
		return aResult;
		};
	Element.prototype.selectNodes = function(cXPathString){
		if(this.ownerDocument.selectNodes)  {
			return this.ownerDocument.selectNodes(cXPathString, this);
		}
		else{throw "For XML Elements Only";}
		};
	XMLDocument.prototype.selectSingleNode = function(cXPathString, xNode){ if( !xNode ){ xNode = this;}
		var xItems = this.selectNodes(cXPathString, xNode); if( xItems.length > 0 ){  return xItems[0];} else {  return null;}
		};
	Element.prototype.selectSingleNode = function(cXPathString){
		if(this.ownerDocument.selectSingleNode)  {
			return this.ownerDocument.selectSingleNode(cXPathString, this);
		}
		else{throw "For XML Elements Only";}
		};
}

/** @return A jQuery array of xml elements */
jOWL.Xpath = function(selector, elem){
	var node = null;
	if(elem){ if(elem.each){ node = elem.get(0);} else { node = elem;} }
	var arr = node ? node.selectNodes(selector) :
	jOWL.document.selectNodes(selector);
	return $(arr);
};

/** Functions stored in jOWL.priv are intended for local access only,
to avoid a closure function */
jOWL.priv = {
	/** Arrray functions */
	Array : {
		isArray : function(array){
			return Object.prototype.toString.call(array) === '[object Array]';
		},
		pushUnique : function(array, item){
			if(jOWL.priv.Array.getIndex(array, item) === -1){	array.push(item); return true;}
			return false;
		},
		getIndex : function(array, item){
			for (var i=0; i<array.length; i++){ if(item == array[i]){ return i;} }
			return -1;
		},
		/** Sorted array as input, returns the same array without duplicates. */
		unique : function(array){
			var result = []; var lastValue="";
			for (var i=0; i<array.length; i++)
			{
				var curValue=array[i];
				if(curValue != lastValue){ result[result.length] = curValue;}
				lastValue=curValue;
			}
			return result;
		}
	}
};

jOWL.Type = {

};

/** Utility object */
jOWL.Array = function(arr, isXML){
	var self = this;
	this.items = [];
	if(arr){
		if(isXML){ $.each(arr, function(){
			var entry = this instanceof jOWL.Type.Thing ? this : jOWL($(this));
			self.items.push(entry);});
			}
		else { this.items = arr;}
	}
	this.length = this.items.length;
};

jOWL.Array.prototype = {
	jOWL : jOWL.version,
	isArray : true,
	bind : function(listitem, fn){
		return this.map(function(){
			var syntax = listitem ? listitem.clone(true) : $('<span/>');
			var html  = this.bind(syntax).append(document.createTextNode(' '));
			if(fn){ fn.call(html, html, this);}
			return html.get(0);
		});
	},
	concat : function(arr, ignoreUnique){
		var self = this;
		if(arr.each){ arr.each(function(){
			if(ignoreUnique){ self.push(this); }
			else { self.pushUnique(this); }
			});
			}
		else { self.items = self.items.concat(arr.items); this.length = self.items.length;}
		return this;
	},
	contains : function(o){
		return this.get(o) ? true: false;
	},
	each : function(fn, reverse){
		var i, self = this;
		var stop = false;
		if(reverse){
			for(i=this.items.length - 1; i>=0;i--){
				if(stop){ break;}
				(function(){
					var item = self.eq(i);
					if(fn.call(item, item, i) === false){ stop = true;}
				})();
			}
		}
		else {
			for(i=0;i<this.items.length;i++){
				if(stop){ break;}
				(function(){
					var item = self.eq(i);
					if(fn.call(item, item, i) === false){ stop = true;}
				})();}
		}
		return this;
	},
	eq : function(index){
		if(index < 0 || index > this.items.length -1){ return null;}
		return this.items[index];
	},
	filter : function(fn){
		var self = this;
		this.each(function(item, i){
			var q = fn.call(item, item, i);
			if(!q){ self.items.splice(i, 1);}
			}, true);
		this.length = this.items.length;
		return this;
	},
	getIndex : function(o){
		var found  = -1;
		if(o.equals){
			this.each(function(a, i){
				if(this.equals && this.equals(o)){ found = i; return false;}
			});
		}
		else {
			if(typeof o == 'number'){ return o;}
			var name = typeof o == "string" ? o : o.name;
			var URI = o.URI || name;

			this.each(function(a, i){
				if(this.URI){ if(this.URI == URI){ found = i;}}
				else if(this.name == name){ found = i;}
			});
		}
		return found;
	},
	get : function(o){
		return this.eq(this.getIndex(o));
	},
	map : function(fn){
		var arr = [];
		this.each(function(){ arr.push(fn.call(this, this));});
		return arr;
	},
	push : function(o){
		this.items.push(o);
		this.length = this.items.length;
		return this;
	},
	pushUnique : function(o){
		return this.get(o) || this.push(o).get(o);
	},
	toString : function(){
		return this.map(function(){return this.URI;}).join(', ');
	},
	/** Convert this array into an associative array with key = URI */
	associative : function(){
		var arr = {};
		this.each(function(){
			if(this.URI){ arr[this.URI] = this;}
		});
		return arr;
	}
};


jOWL.options = {reason: true, locale:false, defaultlocale: 'en',
	dictionary : { create: true, addID : true },
	onParseError : function(msg){alert("jOWL parseError: "+msg);}, cacheProperties : true, niceClassLabels : true};
jOWL.document = null;
jOWL.namespace = null;


/**
* Initialize jOWL with an OWL-RDFS document.
* @param path relative path to xml document
* @param callback callback function to be called when loaded.
* @options : optional settings:
*	onParseError : function(msg){} function to ba called when parsing fails
*	reason : true/false, turns on additional reasoning at the expense of performance
*	locale: set preferred language (if available), examples en, fr...
*/
jOWL.load = function(path, callback, options){
	var that = this;
	$.get(path, function(xml){callback(that.parse(xml, options));});
};



/**
* initialize jOWL with some OWL-RDFS syntax
* @param doc Either an xmlString or an xmlDocument
* @param options optional, onParseError(msg) : function to execute when parse fails
* @returns false on failure, or the jOWL object
*/
jOWL.parse = function(doc, options){
	if(typeof doc == 'string'){ doc = jOWL.fromString(doc);}
	jOWL.document = doc;
	if(doc.documentElement.nodeName == 'parsererror'){
		jOWL.options.onParseError(doc.documentElement.firstChild.nodeValue);
		return false;
	}

	var document = new jOWL.Document(doc,  $.extend(jOWL.options, options));

	var root = $(doc.documentElement);
	jOWL.NS(root);

	document.resetIndices();
	document.getIDIndex();

	var xml = document.createXmlElement(jOWL.NS.owl, "Class").attr(jOWL.NS.rdf, 'about', jOWL.NS.owl()+'Thing');
	jOWL.Thing = new jOWL.Type.Thing(xml);
	jOWL.Thing.type = false;
	return document;
};

/**
* A String representation of the OWL-RDFS document
* @param xmlNode optional, node to generate a string from, when unspecified the entire document
*/
jOWL.toString = function(xmlNode){
	if(!xmlNode){ return jOWL.toString(jOWL.document);}
	return new XMLSerializer().serializeToString(xmlNode);// Gecko-based browsers, Safari, Opera.
};

/** create a document from string */
jOWL.fromString = function(doc){
	var owldoc;
	if(document.implementation.createDocument){
		owldoc = new DOMParser().parseFromString(doc, "text/xml");}
		// Mozilla and Netscape browsers
	else if(window.ActiveXObject){ // MSIE
		var xmldoc = new ActiveXObject("Microsoft.XMLDOM");
		xmldoc.async="false";
		xmldoc.validateOnParse = false;
		xmldoc.loadXML(doc);
		owldoc = xmldoc;
		}
	return owldoc;
};

/** @return false if belongs to this namespace, or an array with length two, arr[0] == url, arr[1] == id */
jOWL.isExternal = function(resource){
	var r = jOWL.resolveURI(resource, true);
	return r[0] != jOWL.namespace ? r : false;
};

/**
if a URI belongs to the loaded namespace, then strips the prefix url of,
else preserves URI
also able to parse and reference xml (or Element) elements for their URI.
*/
jOWL.resolveURI = function(URI, array){
	if(typeof URI != "string"){
		if(URI instanceof $){
			throw new Error("No jquery object allowed");
		}
		var node = URI instanceof jOWL.Element ? URI.node : URI;
		URI = node.localName || node.baseName;
		if(node.namespaceURI){ URI = node.namespaceURI + URI;}
		return jOWL.resolveURI(URI, array);
	}
	var rs = URI, ns = jOWL.namespace;
	if(URI.indexOf('http') === 0){
		var tr = URI.indexOf('#');
		if(tr <= 0){ tr = URI.lastIndexOf('/');}
		if(tr > 0)
		{
			ns = URI.substring(0, tr+1);
			rs = URI.substring(tr+1);
		}
	} else if(URI.charAt(0) == '#'){ return URI.substring(1);}
	if(array){ return [ns, rs];}
	if(ns == jOWL.namespace){ return rs;}
	return URI;
};

/**
* @param xmlNode the xml element
* @return the ontology type of the object.
*/
jOWL.type = function(xmlNode){
	switch(xmlNode.nodeName){
		case jOWL.NS.owl("Class") : return jOWL.Type.Class;
		case jOWL.NS.rdfs("Class") : return jOWL.Type.Class; //test
		case jOWL.NS.owl("Ontology") : return jOWL.Type.Ontology;
		case jOWL.NS.owl("ObjectProperty") : return jOWL.Type.ObjectProperty;
		case jOWL.NS.owl("DatatypeProperty") : return jOWL.Type.DatatypeProperty;
		case jOWL.NS.owl("FunctionalProperty") : return jOWL.Type.Property;
		case jOWL.NS.rdf("Property") : return jOWL.Type.Property;
		case jOWL.NS.owl("InverseFunctionalProperty") : return jOWL.Type.ObjectProperty;
		case jOWL.NS.owl("TransitiveProperty") : return jOWL.Type.ObjectProperty;
		case jOWL.NS.owl("SymmetricProperty") : return jOWL.Type.ObjectProperty;
		//jOWL currently treats annotationproperties as string datatypeproperties.
		case jOWL.NS.owl("AnnotationProperty") : return jOWL.Type.DatatypeProperty;
		default :
			switch(xmlNode.namespaceURI){
				case jOWL.NS.owl(): if(xmlNode.nodeName == jOWL.NS.owl("Thing") ){ return jOWL.Type.Individual;} return false;
				case jOWL.NS.rdf(): return false;
				case jOWL.NS.rdfs(): return false;
				default : return jOWL.Type.Individual;
			}
	}
};

/**
@param rdfID <String> or Array<String>
@return Array of DOM (xml) Nodes
*/
jOWL.getXML = function(rdfID){
	var node = [];
	function fetchFromIndex(rdfID){
		var el = jOWL.index("ID")[rdfID];
		return el ? el : null;
	}

	if(typeof rdfID == 'string'){ var q = fetchFromIndex(rdfID); if(q){ node.push(q);} }
	else if(jOWL.priv.Array.isArray(rdfID)){ //assume an array of string rdfIDs
		$.each(rdfID, function(){
			var el = fetchFromIndex(this); if(el){ node.push(el);}
			});
	}
	return node;
};

/** Create new ontology elements */
jOWL.create = function(namespace, name, document){
	var doc = document ? document : jOWL.document;

	var el = {
		attr : function(namespace, name, value){
			this.node.setAttributeNS(namespace(), namespace(name), value);
			return this;
		},
		appendTo : function(node){
			var n = node.node ? node.node : node;
			n.appendChild(this.node);
			return this;
		},
		text : function(text, cdata){
			var txt = cdata ? doc.createCDATASection(text) : doc.createTextNode(text);
			this.node.appendChild(txt);
			return this;
		}
	};

	 el.node = doc.createElementNS(namespace(), namespace(name));
	return el;
};


/** Create a blank ontology document */
jOWL.create.document = function(href){
	var owl = [];
	var base = href || window.location.href+"#";
	owl.push('<?xml version="1.0"?>');
	owl.push('<'+jOWL.NS.rdf('RDF')+' xml:base="'+base+'" xmlns="'+base+'" '+jOWL.NS()+'>');
	owl.push('   <'+jOWL.NS.owl('Ontology')+' '+jOWL.NS.rdf('about')+'=""/>');
	owl.push('</'+jOWL.NS.rdf('RDF')+'>');
	return jOWL.fromString(owl.join('\n'));
};

/**
allows asynchronous looping over arrays (prevent bowser freezing).
arr the array to loop asynchonrously over.
options.modify(item) things to do with each item of the array
options.onUpdate array the size of chewsize or smaller, containing processed entries
options.onComplete(array of results) function triggered when looping has completed
*/
jOWL.throttle =function(array, options){
	options = $.extend({
		modify : function(result){},
		//onUpdate : function(arr){},
		onComplete : function(arr){},
		async : true,
		chewsize : 5,
		startIndex : 0,
		timing : 5
		}, options);
	var temp = array.jOWL ? array.items : (array instanceof $) ? $.makeArray(array) : array;
	var items = options.startIndex ? temp.slice(startIndex) : temp.concat(); //clone the array
	var results = [];

	(function(){
		var count = options.chewsize;
		var a = [];
		while (count > 0 && items.length > 0)
		{
			var item = items.shift(); count--;
			var result = options.modify.call(item, item);
			if(result){ results.push(result); a.push(result);}
		}
		if(options.onUpdate){ options.onUpdate(a);}

		if(items.length> 0){
			if(options.async){ setTimeout(arguments.callee, options.timing);}
			else {arguments.callee();}
		}
		else{ options.onComplete(results);}
	})();
};

/**
* @return Associative array of parameters in the current documents URL
*/
jOWL.getURLParameters = function(){
	var href = window.location.href.split("?", 2), param = {};
	if(href.length == 1){ return {};}
	var qstr = href[1].split('&');
	for(var i =0;i<qstr.length;i++){
		var arr = qstr[i].split("=");
		if(arr.length == 2){ param[arr[0]] = arr[1];}
	}
	return param;
};

/**
Without arguments this function will parse the current url and see if any parameters are defined, returns a JOWL object
@return With argument it will return a string that identifies the potential permalink fr the given entry
*/
jOWL.permalink = function(entry){
	if(!entry){
		var param = jOWL.getURLParameters();
		if(param.owlClass){ return jOWL(unescape(param.owlClass));}
	}
	else {
		if(!entry.URI){ return false;}
		var href = window.location.href.split("?", 2);
		if(window.location.search){ href = href[0];}
		if(entry instanceof jOWL.Type.Class){ return href+'?owlClass='+escape(entry.URI);}
	}
	return false;
};

/** Convert an item into Manchester syntax, currently only for oneOf
* @return String
*/
jOWL.Manchester = function(owlElement){
	var syntax = [];
	if(owlElement.isClass){
		var oneOf = owlElement.oneOf().map(function(){ return this.label();});
		if(oneOf.length){ syntax.push("{ "+oneOf.join(", ")+" }");}
	}
	return syntax.join(", ");
};

})(jQuery);

/**
* @return 1 for exact match, 0 for partial match, -1 for no match.
*/
String.prototype.searchMatch = function(matchstring, exact){
	if(this.search(new RegExp(matchstring, "i")) > -1){ return 1;} //contained within
	var c = 0; var arr = matchstring.match(new RegExp("\\w+", "ig"));
	for(var i = 0;i<arr.length;i++){ if(this.search(arr[i]) > -1){ c++;} }
	if(c == arr.length){ return 0;} //word shift
	return -1; //nomatch
};
/**
* @return Modified String.
*/
String.prototype.beautify = function(){
	var e1 = new RegExp("([a-z0-9])([A-Z])", "g");
	var e2 = new RegExp("([A-Z])([A-Z0-9])([a-z])", "g");
	var e3 = new RegExp("_", "g");
	return this.replace(e1, "$1 $2").replace(e2, "$1 $2$3").replace(e3, " ");
};



jOWL.Type.Thing = Class.extend({
	initialize : function(node){
    if(  $(node.node).data('binding')) throw "already exists";
		this.parseNew(node);
	},
	equals : function(id){
		var URI = (typeof id == "string") ? jOWL.resolveURI(id) : id.URI;
		return URI === this.URI;
	},
	parseNew : function(node){
		if(!(node instanceof jOWL.Element)) throw new Error("no Element");
		var identifier = node.rdfID() || node.rdfAbout();
		if(!identifier){
			identifier = "anonymousOntologyObject";
			this.isAnonymous = true;
		} else {
			identifier = jOWL.resolveURI(identifier);
			this.isExternal = jOWL.isExternal(identifier);
		}

		if(this.isExternal){
			this.baseURI = this.isExternal[0];
			this.name = this.isExternal[1];
			this.URI = this.baseURI+this.name;}
		else { this.baseURI = jOWL.namespace; this.name = identifier; this.URI = this.name;}
		this.element = node;
		$(this.element.node).data("binding", this);
		this.type = node.nodeName();
	},
	/** @return A jQuery array of elements matching the annotation (qualified name or annotation Property) */
	annotations : function(annotation){
		if(!this.element) return [];
		return this.element.selectNodes(annotation);
	},
	/** @return rdfs:comment annotations */
	description : function(description){
		if(description){
			//var ref = this.annotations(jOWL.NS.rdfs('comment'));

		}
		var result = this.annotations(jOWL.NS.rdfs('comment'));
		return result.map(function(n){ return n.text(); });
	},
	/**
	@return Array of Arrays, where secondary array is of form: [0] = term (rdfs:label) , [1] = identifier, [2] = language; [3] = type of object
	example:
	[
		["bleu", "blue", "fr", "owl:Class"]
	]
	*/
	terms : function(){
		var terms = [], self = this;
		var options = this.element.document.options;
		if(options.dictionary.addID && this.name != "anonymousOntologyObject"){
			terms.push([this.name.beautify(), this.URI, options.defaultlocale,
				this.type]);}
		this.annotations(jOWL.NS.rdfs('label')).forEach(function(v){
			var locale = v.attr("xml:lang") || options.defaultlocale;
			var txt = v.text();
			var match = false;
			for(var i =0;i<terms.length;i++){
				if(terms[i][0].toUpperCase() == txt.toUpperCase() &&
					terms[i][2] == locale){ match = true;}
			}
			if(!match){ terms.push([txt, self.URI, locale, self.type]);}
		});
		return terms;
	},
	/** @return A representation name */
	label : function(locale){
		var label = false;
		var options = this.element.document.options;
		var testLocale = locale || options.locale;
		this.annotations(jOWL.NS.rdfs('label')).forEach(function(v){
			if(testLocale){
				var lang = v.attr('xml:lang') || options.defaultlocale;
				if(lang == testLocale){ label = v.text(); return false;}
			} else {
				label = v.text(); return false;
			}
		});
		if(label){ return label;}
		if(this.name == "anonymousOntologyObject"){
			return jOWL.Manchester(this) || "anonymous Object";
		}
		if(options.niceClassLabels &&
			(this instanceof jOWL.Type.Class ||
				this instanceof jOWL.Type.Individual)){
			return this.name.beautify();
		}
		return this.name;
	},
	/** Binds the Ontology element to the jQuery element for visual representation
	* @return jQuery Element
	*/
	bind : function(jqelem){
		return jqelem.text(this.label()).attr('typeof', this.type)
			.attr('title', this.URI);
	}

});

jOWL.Type.External = Class.extend(jOWL.Type.Thing, {
  initialize : function(reference){
		this.isExternal = true;
		this.name = reference;
		this.type = 'Thing';
		this.URI = reference;
		var ext = jOWL.isExternal(reference);
		if(ext){
			this.baseURI = ext[0];
			this.name = ext[1];
		}
	}, label : function(){
		return this.name;
	}, terms : function(){
		return [];
	}
});

jOWL.Element = Class.extend({
	initialize : function(document, node){
		if(!(document instanceof jOWL.Document)) throw new Error("no document");
		this.node = node;
    //console.log(node instanceof Element);
		this.document = document;
		this._data = {};
	}, hasNamespace : function(ns){
		return this.node.namespaceURI == ns;
	}, text : function(){
    return  $(this.node).text();
  }, attr : function(namespace, name, value){
    if(name === undefined) return $(this.node).attr(namespace);
		if(value === undefined) return $(this.node).attr(namespace(name));
		this.node.setAttributeNS(namespace(), namespace(name), value);
		return this;
	}, parent : function(){
			var parent = this.node.parentNode;
			if(!parent || parent.nodeType == 11) return null;
			return new jOWL.Element(this.document, parent);
	}, _siblings : function(n, elem){
			var matched = [];
			for ( ; n; n = n.nextSibling ) {
				if(!n) break;
				if (n.nodeType === 1 && n !== elem ) {
					matched.push(new jOWL.Element(this.document,  n ) );
				}
			}
			return matched;
	}, siblings :function(){
		var parent = this.parent();
		if(!parent) return [];
		return this._siblings(parent.node.firstChild, this.node);
	}, children: function(){
		 return this._siblings(this.node.firstChild, undefined);
	}, rdfID : function(matchValue){
			var id = this.attr(jOWL.NS.rdf, 'ID');
			if(!id) return null;
			var result = jOWL.resolveURI(id);
			if(matchValue){
				return result.toLowerCase() == (jOWL.resolveURI(matchValue.toString())).toLowerCase();
			}
			return result;

	}, rdfAbout : function(matchValue){
			var id = this.attr(jOWL.NS.rdf, 'about');
			if(!id) return null;
			var result = jOWL.resolveURI(id);
			if(matchValue){
				return result.toLowerCase() == (jOWL.resolveURI(matchValue.toString())).toLowerCase();
			}
			return result;
	}, rdfResource : function(matchValue){
  		function getClassName(element){
        var nodes = element.selectNodes(jOWL.NS.owl("Class"));
  			if(nodes.length == 1){
          return new jOWL.Type.Class(nodes[0]).URI;
        }
  			return false;
  		}
  		var rsrc = this.attr(jOWL.NS.rdf, 'resource');
			if(!rsrc) rsrc = this.rdfAbout();
			if(!rsrc) rsrc = this.rdfID();
  		if(!rsrc){
  			switch(this.nodeName()){
  				case jOWL.NS.rdfs("subClassOf"): rsrc = getClassName(this); break;
  				case jOWL.NS.owl("disjointWith"): rsrc = getClassName(this); break;
  				case jOWL.NS.owl("allValuesFrom"): rsrc = getClassName(this); break;
  				case jOWL.NS.owl("someValuesFrom"): rsrc = getClassName(this); break;
  				case jOWL.NS.owl("onProperty"):
  					var t = this.selectNodes(jOWL.NS.owl("ObjectProperty"));
  					if(t.length === 0){ t = this.selectNodes(jOWL.NS.owl("DatatypeProperty"));}
  					if(t.length === 0){ t = this.selectNodes(jOWL.NS.owl("FunctionalProperty"));}
            if(t.length) rsrc = t[0].attr(jOWL.NS.rdf, 'about');
            break;
  				default: return false;
  			}
  		}
  		if(!rsrc){ return false;}
  		rsrc = jOWL.resolveURI(rsrc);
  		if(matchValue){ return rsrc.toLowerCase() == (jOWL.resolveURI(matchValue.toString())).toLowerCase();}
  		return rsrc;
  }, nodeName : function(){
		return this.node.nodeName;
	}, hasNodeName : function(namespace, name){
     if(name){
       return namespace(name) == this.nodeName();
     }
     return namespace == this.nodeName();
  }, selectSingleNode : function(cXPathString){
    if(this.node.ownerDocument.selectSingleNode)  {
      var result = this.node.ownerDocument.selectSingleNode(cXPathString, this.node);
      if(result) return new jOWL.Element(this.document, result);
    }
    return null;
	}, selectNodes : function(cXPathString){
    var self = this;
    if(this.node.ownerDocument.selectNodes)  {
			var arr = this.node.ownerDocument.selectNodes(cXPathString, this.node);
      if(arr && arr.length){
        return arr.map(function(v){
          return new jOWL.Element(self.document, v);
        });
      }
		}
    return [];
  }, data : function(type, data){
		if(data === undefined){
			return this._data[type];
		}
		this._data[type] = data;
		return this;
	}
});


jOWL.Load = Class.extend({
	initialize : function(uri){
		this.uri = uri;
		this.result = null;
	}, then : function(cb){
		this._success = cb;
		if(this.result) this._success(this.result);
		return this;
	}, resolve : function(item){
		this.result = item;
		if(this._success) this._success(item);
	}
});

jOWL.Document = Class.extend({
	initialize : function(xmlDoc, options){
		this.document = xmlDoc;
		this.indices = {};
		this.lazyload = {};
    this.options = $.extend({}, options);
	}, createXmlElement : function(namespace, name){
			return new jOWL.Element(this, this.document.createElementNS(namespace(), namespace(name)));
	}, selectNodes : function(cXPathString){
     var nodes = this.document.selectNodes(cXPathString, this.document);
     if(!nodes || !nodes.length) return [];
     var self = this;
     return nodes.map(function(v){
       return new jOWL.Element(self, v);
     });
  }, subscribe : function(uri){
		 var promise = new jOWL.Load();
		 if(this.indices.IDs) {
			 var item = this.indices.IDs[uri];
			 if(item){
				 promise.resolve(item);
				 return promise;
			 }
		 }
		 if(!this.lazyload[uri]) this.lazyload[uri] = [];
		 this.lazyload[uri].push(promise);
		 return promise;

	}, _indexIntersection : function(isect){
			if(! isect || !isect.URI){return;}
			var dupe = this.indices.II.get(isect);
			if(dupe){
				console.log("duplicate intersection found between : (Ignoring) "+
				isect.URI+"  and "+dupe.URI);
			} else {
				if(!this.indices.I[isect.URI]){
					this.indices.I[isect.URI] = new jOWL.Array();
				}
				this.indices.II.push(isect);
				this.indices.I[isect.URI].push(isect);
			}
	}, _indexProperty : function(jowl){
			this.indices.P.push(jowl);
	}, _indexElement : function(jowl){
    if(!jowl) return;
    var resource = jowl.URI;
		var self = this;
    this.indices.IDs[resource] = jowl;
		if(this.lazyload[resource]){
			this.lazyload[resource].forEach(function(promise){
				promise.resolve(jowl);
			});
			delete this.lazyload[resource];
		}
    this.indices.caseIDs[resource.replace(/ /g, "").toLowerCase()] = jowl;
    if(jowl instanceof jOWL.Type.Individual){
      if(!this.indices.T[jowl.Class]){ this.indices.T[jowl.Class] = new jOWL.Array();}
      this.indices.T[jowl.Class].push(jowl);
    } else if(jowl instanceof jOWL.Type.Property) {
      this._indexProperty(jowl);
    }
    this.indices.D = this.indices.D.concat(jowl.terms());
  }, getIDIndex : function(){
    if(this.indices.IDs) return this.indices.IDs;
    var start = new Date();
    this.indices.IDs = {};
    this.indices.caseIDs = {};
    this.indices.T = {};
    this.indices.P =  new jOWL.Array();
    this.indices.D = [];
		this.indices.II = new jOWL.Array();
		this.indices.I = {};
    var i = this.indices;
    var self = this;
    this.selectNodes("//*[@"+jOWL.NS.rdf("ID")+"]").forEach(function(node){
      var jowl = self.getResource(node);
      self._indexElement.call(self, jowl);
    });
    this.selectNodes("/"+jOWL.NS.rdf("RDF")+"/*[@"+jOWL.NS.rdf("about")+"]").forEach(function(node){
      var jowl = self.getResource(node);
      //console.log(node, jowl);
      if(!jowl){ return;}
      var resource = jowl.URI;
      if(jowl instanceof jOWL.Type.Class ||
        jowl instanceof jOWL.Type.Property ||
        jowl instanceof jOWL.Type.Individual){
        if(i.IDs[resource]){
          //Append to children to the children of the stored one
          var existing = i.IDs[jowl.URI];
          //using a bit of jquery here
        //  console.log($(jowl.element.node).children(), jowl.element);
          var childNodes = $(jowl.element.node).children();
					var elementChildren = jowl.element.children();
          if(elementChildren.length){
						existing.append(jowl.element);
          }
          return;
        }
        self._indexElement.call(self, jowl);
      } else if(jowl instanceof jOWL.Type.Ontology){
        self.indices.ontology = jowl;//TODO: support plural  (joining children)
      } else {
        //console.log(jowl);
      }
    });
    console.log("Loaded in "+(new Date().getTime() - start.getTime())+"ms");

    return this.indices.IDs;
  }, index : function(type, wipe){
    switch (type){
      case "ID": return this.getIDIndex();
      case "Thing" : return this.indices.T;
      case "dictionary": return this.indices.D;
      case "property": return this.indices.P;
      case "intersection": return this.indices.I;
    }
  }, resetIndices : function(){
    this.indices = {};
  }, getOntology : function(){
    return this.indices.ontology;
  },
  getResource : function(resource, options){
    if(!resource){ throw "No resource specified";}
    var node;
  	var opts = $.extend({}, options);
    if(typeof resource == 'string'){
  		resource = jOWL.resolveURI(resource);
  		if(resource == 'Thing' || resource == jOWL.NS.owl()+'Thing'){
        return jOWL.Thing;
      }
  		if(opts.type == 'property' && jOWL.options.cacheProperties){
  			var c = jOWL.index('property').get(resource);
  			if(c){ return c;}
  			if(jOWL.isExternal(resource)){ console.log("external resource: "+resource); return new jOWL.Type.Property(resource);}
  			}
  		var match = this.indices.IDs[resource];
  		if(!match){ //try case insensitive
        match = this.indices.caseIDs[resource];
  		}
  		if(!match){
  			if(jOWL.isExternal(resource)){
  				console.log("external resource: "+resource);
  				return new jOWL.Type.External(resource);
  			}
  			console.log(resource+" not found");
  			return null;
  		}
  		return match;
  	}
  	var xmlNode = resource;
  	if(resource instanceof jOWL.Element) xmlNode = resource.node;
		var existing = $(xmlNode).data('binding');
		if(existing){
			return existing;
		}
    var element = new jOWL.Element(this, xmlNode);

  	var jj = jOWL.type(xmlNode);
  	if(!jj){ return null;}
  	return new (jj)(element);
  },
	/**
	Match part or whole of the rdfResource<String>
	Used for term searches, intend to (partially) replace it by a sparql-dl query later on
	options:
	    filter: filter on a specific type, possible values: Class, Thing, ObjectProperty, DatatypeProperty
	    exclude: exclude specific types, not fully implemented
	*/
	query : function( match, options){
		options = $.extend({exclude : false}, options);
		if(options.filter == 'Class'){ options.filter = jOWL.NS.owl("Class");}
		var that = this;
		//filter : [], exclude : false
		var items = new jOWL.Array();
		var jsonobj = {};
		var test = this.index("dictionary");

		function store(item){
				var include = false, i = 0;
				if(options.filter){
					if(typeof options.filter == 'string'){
						include = (options.filter == item[3]);}
					else { for(i = 0;i<options.filter.length;i++){
						if(options.filter[i] == item[3]){ include = true;} } }
					}
				else if(options.exclude){
					include = true;
					if(typeof options.exclude == 'string'){
						include = (options.exclude !== item[3]);}
					else { for(i = 0;i<options.exclude.length;i++){
						if(options.exclude[i] == item[3]){ include = false;} } }
				}
				else { include = true;}
				if(!include){ return;}
				if(!jsonobj[item[1]]){ jsonobj[item[1]] = [];}
				jsonobj[item[1]].push( { term : item[0], locale: item[2], type: item[3] });
		}

		for(var y = 0;y<test.length;y++){
			var item = test[y];
			var bool = options.exclude;
			var r = item[0].searchMatch(match);
			if(r > -1){
				if(options.locale){ if(options.locale == item[2]){ store(item);} }
				else { store(item);}
			}
		}
		return jsonobj;
	}
});



/** Make values work with jOWL.Array */
jOWL.Literal = function(value){
	this.name = value;
};


/** used for jOWL.Type.Individual.sourceof */
jOWL.priv.testObjectTarget = function(target, matchtarget){
	var i = 0;
	if(target.isArray){
		for(i=0;i<target.length;i++){
			if(jOWL.priv.testObjectTarget(target.get(i), matchtarget)){ return true;}
		}
		return false;
	}
	//if the target is a class, fetch individuals instead.
	else if(target.isClass){
		 var a = target.individuals();
		 for(i=0;i<a.length;i++){
			if(a.get(i).URI == matchtarget){ return true;}
		}
	}
	else if(target.URI == matchtarget){ return true;}
	return false;
};




/** Datatype Logic, local functions */
jOWL.priv.Dt = function(options){
	this.settings = $.extend({base: null, pattern : null, assert: function(b){return true;}, match: function(a, b){return true;}}, options);
	this.base = jOWL.Type.Datatype[this.settings.base];
};

jOWL.priv.Dt.prototype = {
	sanitize : function(b){
		if(this.settings.sanitize){ return this.settings.sanitize(b);}
		if(this.base && this.base.sanitize){ return this.base.sanitize(b);}
	},
	assert : function(b){
		var v = this.sanitize(b); if(v !== undefined){ b = v;}
		if(this.base && !this.base.assert(b)){ return false;}
		if(this.settings.pattern && !this.settings.pattern.test(b)){ return false;}
		return this.settings.assert(b);
	},
	match : function(a, b){
		var v = this.sanitize(b); if(v !== undefined){ b = v;}
		if(!this.assert(b)){ return false;}
		if(this.base && !this.base.match(a, b)){ return false;}
		return this.settings.match(a, b);
	}
};

jOWL.Type.Datatype = function(URI, options){
	jOWL.Type.Datatype[URI] = new jOWL.priv.Dt(options);
};

/** Datatype Definitions */
jOWL.Type.Datatype(jOWL.NS.xsd()+"integer", {sanitize : function(x){return  parseInt(x, 10);}, assert : function(x){ return Math.round(x) == x;}, match : function(a, b){
	var check = parseInt(a, 10);
	if(!isNaN(check)){ return check == b;}
	var arr = a.split('&&');
	for(var i=0;i<arr.length;i++){ arr[i] = b+arr[i];}
	try {
		return eval(arr.join(' && '));
	} catch(e){ return false;}
} });
jOWL.Type.Datatype(jOWL.NS.xsd()+"positiveInteger", {base: jOWL.NS.xsd()+"integer", assert : function(x){ return x > 0;} });
jOWL.Type.Datatype(jOWL.NS.xsd()+"decimal", {base: jOWL.NS.xsd()+"integer" });
jOWL.Type.Datatype(jOWL.NS.xsd()+"float", {base: jOWL.NS.xsd()+"integer" });
jOWL.Type.Datatype(jOWL.NS.xsd()+"double", {base: jOWL.NS.xsd()+"integer" });
jOWL.Type.Datatype(jOWL.NS.xsd()+"negativeInteger", {base: jOWL.NS.xsd()+"integer", assert : function(x){ return x < 0;} });
jOWL.Type.Datatype(jOWL.NS.xsd()+"nonNegativeInteger", {base: jOWL.NS.xsd()+"integer", assert : function(x){ return x >= 0;} });
jOWL.Type.Datatype(jOWL.NS.xsd()+"nonPositiveInteger", {base: jOWL.NS.xsd()+"integer", assert : function(x){ return x <= 0;} });
jOWL.Type.Datatype(jOWL.NS.xsd()+"string");

var URIPattern = /^([a-z0-9+.\-]+):(?:\/\/(?:((?:[a-z0-9-._~!$&'()*+,;=:]|%[0-9A-F]{2})*)@)?((?:[a-z0-9-._~!$&'()*+,;=]|%[0-9A-F]{2})*)(?::(\d*))?(\/(?:[a-z0-9-._~!$&'()*+,;=:@\/]|%[0-9A-F]{2})*)?|(\/?(?:[a-z0-9-._~!$&'()*+,;=:@]|%[0-9A-F]{2})+(?:[a-z0-9-._~!$&'()*+,;=:@\/]|%[0-9A-F]{2})*)?)(?:\?((?:[a-z0-9-._~!$&'()*+,;=:\/?@]|%[0-9A-F]{2})*))?(?:#((?:[a-z0-9-._~!$&'()*+,;=:\/?@]|%[0-9A-F]{2})*))?$/i;

jOWL.Type.Datatype(jOWL.NS.xsd()+"anyURI", {base: jOWL.NS.xsd()+"string", pattern : URIPattern });
jOWL.Type.Datatype(jOWL.NS.xsd()+"boolean", {sanitize : function(x){
		if(typeof x == 'boolean'){ return x;}
		if(x == 'true'){ return true;}
		if(x == 'false'){ return false;}
	}, assert : function(x){
		return typeof x == 'boolean';
	}, match: function(a, b){
		if(a === "false"){ a = false;}
		if(a === "true"){ a = true;}
		return (a === b);
}});



/** Access to the owl:Ontology element, also the main coding namespace for ontology objects */
jOWL.Type.Ontology = Class.extend(jOWL.Type.Thing, {
	initialize : function(element){
		this.parent(element);
	}

});

jOWL.Type.Individual = Class.extend(jOWL.Type.Thing, {
  initialize : function(element){
    this.parent(element);
    if(this.type == jOWL.NS.owl("Thing")){
      var t = this.element.selectNodes(jOWL.NS.rdf('type'));
  		if(!t.length){ throw "unable to find a Class for the Individual "+
        this.name;}
  		this.Class = t[0].rdfResource();
  	}
  	else {
      this.Class = jOWL.resolveURI(this.element.node);
  	}
  	this.type = jOWL.NS.owl("Thing");
  },
	/** @return The owl:Class */
	owlClass : function(owlclass){
    if(!this._owlClass) this._owlClass = this.element.document.getResource(this.Class);
    return this._owlClass;
	},
	/** Access to restrictions */
	sourceof : function(property, target, options){
		options = $.extend({
			inherited : true, // add restrictions specified on parents as well
			transitive : true,
			ignoreGenerics : false, //if a parent has an identical property, with another target 'Thing', skip that restriction
			ignoreClasses : true,
			valuesOnly : true
		}, options);

		var results = new jOWL.Array();

		this.element.children().filter(function(item){
      if(item.hasNamespace(jOWL.NS.rdfs.URI)) return false;
      if(item.hasNamespace(jOWL.NS.owl.URI)) return false;
      if(item.hasNamespace(jOWL.NS.rdf.URI)) return false;
      return true;
    })
			.forEach(function(item){
			var restriction = new jOWL.Type.Restriction(item);
			var propertyMatch = property ? false : true;
			var targetMatch = target ? false : true;

			if(!propertyMatch){
				if( property.isArray){ propertyMatch = property.contains(restriction.property);}
				else { propertyMatch = (property.URI == restriction.property.URI);}
				if(!propertyMatch){ return;}
			}

			if(!target){
				if(options.transitive && restriction.property.isTransitive && !options.ignoreGenerics){
					var rTarget = restriction.getTarget();
					var transitives = rTarget.sourceof(restriction.property, null, options);
					results.concat(transitives);
				}
			}
			else {
				if(restriction.property instanceof jOWL.Type.ObjectProperty){
					targetMatch = jOWL.priv.testObjectTarget(target, restriction.target);
					if(!targetMatch && options.transitive && restriction.property.isTransitive){
						var rTransitives = restriction.getTarget().sourceof(restriction.property, target, options);
						if(rTransitives.length > 0){ targetMatch = true;}
					}
				}
				else if(restriction.property.isDatatypeProperty){
					targetMatch = restriction.property.assert(restriction.target, target);
				}
				else { targetMatch = (target == restriction.target);}
			}
			if(propertyMatch && targetMatch){ results.pushUnique(restriction);}

		});
		if(options.inherited){
			var clRestrictions = this.owlClass().sourceof(property, target, options)
				.each(function(){
				//target can be a class, null, a duplicate individual...
				var clRestr = this;
				if(options.valuesOnly && clRestr.target === null){return;}
				var clTarget = this.getTarget();
				if(clTarget instanceof jOWL.Type.Class && options.ignoreClasses){ return;}

				var containsProperty = false;
				for(var i = 0;i<results.length;i++){
					var restr = results.get(i);
					if(restr.property.URI == clRestr.property.URI){
						containsProperty = true;
						if(!options.ignoreGenerics){
							if(clRestr.target != restr.target){ results.pushUnique(clRestr);}
						}
					}
				}
				if(!containsProperty){ results.pushUnique(clRestr);}
			});
		}
		return results;

	},
	localRestrictions : function(property, target){
		return this.sourceof(property, target,
      {inherited : false, transitive : false });
	},
	/** Include generic will add transitivity reasoning */
	valueRestrictions : function(includeGeneric){
		return this.sourceof(null, null,
      {ignoreGenerics : !includeGeneric, valuesOnly : true });
	}

});



/** 'superclass' for Properties */
jOWL.Type.Property = Class.extend(jOWL.Type.Thing, {
    initialize : function(element){
      if(  $(element.node).data('binding')) throw new Error("already exists");
      this.isProperty = true;
  	  var r =  this.parseProperty(element);
      if(r) return r; //cached versions... todo refine
  }, parseProperty : function(element){
      this.parseNew(element);
      var a = element.selectSingleNode(jOWL.NS.rdfs('domain'));
      if(a) this.domain = a.rdfResource();
      var b = element.selectSingleNode(jOWL.NS.rdfs('range'));
      if(b) this.range = b.rdfResource();

	}
});

jOWL.Type.DatatypeProperty = Class.extend(jOWL.Type.Property, {
  initialize : function(element){
    if(  $(element.node).data('binding')) throw new Error("already exists");
    var r = this.parseProperty(element);
    if(r) return r;
    this.isDatatypeProperty = true;
    if(this.type == jOWL.NS.owl("AnnotationProperty")){ this.range = jOWL.NS.xsd()+"string";}
  },
	/** check datatype values against this */
	assert : function(targetValue, value){
		var self = this;
		var dt = jOWL.Type.Datatype[this.range];
		if(!dt){
			console.log(this.range+" datatype reasoning not implemented");
			return true;
		}
		if(value === undefined){ return dt.assert(targetValue);}
		else {return dt.match(value, targetValue);}
	}

});

jOWL.Type.ObjectProperty = Class.extend(jOWL.Type.Property, {
  initialize : function(element){
    if(  $(element.node).data('binding')) throw new Error("already exists");
    var r = this.parseProperty(element);
    if(r) return r;
    this.isObjectProperty = true;
    var self = this;
    this.element.selectNodes(jOWL.NS.rdf('type')).forEach(function(v){
      if(v.rdfResource() == jOWL.NS.owl()+"TransitiveProperty"){
        self.isTransitive = true;
      }
    });
    if(this.element.hasNodeName(jOWL.NS.owl, "TransitiveProperty")){
      self.isTransitive = true;
    }
  }

});


jOWL.Type.Class = Class.extend(jOWL.Type.Thing, {
  initialize : function(element){
    if(  $(element.node).data('binding')) throw new Error("already exists");
    this.parseNew(element);
    this._parentRefs = [];
    this.intersections = [];
    this.restrictions = [];
    this.append(element, true);
  }, append : function(element, init){
    var self = this;
    if(!init)  $(this.element.node).append($(element.node).children());

    element.children().forEach(function(child){
      if(child.hasNodeName(jOWL.NS.rdfs("subClassOf"))){
        var childUri = child.rdfResource();
        if(childUri){
          self._parentRefs.push(childUri);
        } else {
          child.children().forEach(function(descendant){
            if(descendant.hasNodeName(jOWL.NS.owl("Restriction"))){
                var r = new jOWL.Type.Restriction(descendant, self);
                self.restrictions.push(r);
            }
          });
        }
      } else if(child.hasNodeName(jOWL.NS.owl("intersectionOf"))){
        var isect = new jOWL.Type.Intersection(child, self);
        self.intersections.push(isect);
        for(var i=0;i<isect.classes.length;i++){
          self._parentRefs.push(isect.classes[i]);
        }
      } //else console.log(child.nodeName());
    });

  },
	/** @return A jOWL.Array of individuals for this class & its subclasses */
	individuals : function(){
		var arr = new jOWL.Array();
		var q = new jOWL.SPARQL_DL(this.element.document, "Type(?x, "+this.name+")")
      .execute({async: false, onComplete: function(r){ arr = r.jOWLArray("?x");}  });
		return arr;
	},
	/** @return A jOWL.Array of individuals (if oneOf list) */
	oneOf : function(){
		var arr = new jOWL.Array();
    this.element.selectNodes(jOWL.NS.owl("oneOf/child::node()")).forEach(function(oneof){
      arr.push(oneof.rdfAbout());
    });
		return arr;
	},
	/** @return A jOWL.Array of direct children */
	children : function(){
		var oChildren = this.element.data("children");
		if(oChildren){ return oChildren;}
		oChildren = new jOWL.Array();
		if(this.oneOf().length){return oChildren;}//???
		var URI = this.URI;
    var idIndex = this.element.document.getIDIndex();
    var self = this;
    Object.keys(idIndex).forEach(function(key){
      if(key === URI){ return;}
      var node = idIndex[key];
      if(!(node instanceof jOWL.Type.Class)){return;}
      node._parentRefs.forEach(function(child){
        if(self.equals(child)){
          oChildren.push(node);
        }
      });
      var intersections= node.element.document.index("intersection")[URI];
      if(intersections){
        //node.restrictions + node.intersection.restrictions;
        var clRestr = [].concat(node.restrictions);
        node.intersections.forEach(function(iSect){
          clRestr = clRestr.concat(iSect.restrictions);
        });
        intersections.each(function(){//fully defined Subclasses
					if(this.match(key, node._parentRefs, clRestr)){
            oChildren.push(node);
          }
				});
      }

    });
		//an ObjectProperty mentions this as domain
    var propertyIndex = this.element.document.index("property");
    propertyIndex.each(function(){
      if(this.domain == self.name){
        var xpath = '//'+jOWL.NS.owl('onProperty')+'[@'+jOWL.NS.rdf('resource')+'="#'+this.name+'"]/parent::'+jOWL.NS.owl('Restriction')+'/..';
        this.element.document.selectNodes(xpath).forEach(function(item){
          if(item.nodeName() == jOWL.NS.owl('intersectionOf') ||
          item.nodeName() == jOWL.NS.rdfs('subClassOf')){
            var parent = item.selectSingleNode('parent::'+jOWL.NS.owl('Class'));
            var cl = item.document.getResource(parent);
            if(cl && !oChildren.contains(cl) && cl.name != self.name &&
            cl.name !== undefined){
              oChildren.push(cl);
            }
          }
        });
      }
    });
    //filter out redundancies
    oChildren.filter(function(){
      this.hierarchy(false);
      return this.parents().contains(URI);
    });
		this.element.data("children", oChildren);
		return oChildren;
	},
	setParents : function(parents){
		this.element.data("parents", parents); return parents;
	},
	/** @return A jOWL.Array of parents, includes redundancies, to exclude do a hierarchy search first.*/
	parents : function(){
		var self = this;
		var oParents = this.element.data("parents");
		if(oParents){ return oParents;}

		var temp = [];
		var cls = this._parentRefs;
		for(var i=0;i<cls.length;i++){ jOWL.priv.Array.pushUnique(temp, cls[i]);}

    var restr = [].concat(this.restrictions);
    this.intersections.forEach(function(iSect){
      restr = restr.concat(iSect.restrictions);
    });

		restr.forEach(function(r){
				if(r.property.domain && r.property.domain != self.name){
          if(temp.indexOf(r.property.domain) < 0) temp.push(r.property.domain);
			}
		});

		var iSectLoop = function(){
			if(this.match(self.URI, cls, restr)){
        if(temp.indexOf(this.URI) < 0) temp.push(this.URI);
			}

		};

		if(jOWL.options.reason){
			for(var resource in this.element.document.index('intersection')){
				this.element.document.index('intersection')[resource].each(iSectLoop);
			}
		}
    temp = temp.filter(function(a){
      return a != 'Thing' && a != jOWL.Thing.URI;
    });
    oParents = new jOWL.Array();
    if(!temp.length){
      oParents.push( jOWL.Thing);
    } else {
      temp.forEach(function(uri){
        var resolve = self.element.document.getResource(uri);
        if(!resolve || !(resolve instanceof jOWL.Type.Class || resolve instanceof jOWL.Type.External )) throw new Error("oopsie "+ uri);
        oParents.push(resolve);
      });
    }
		this.setParents(oParents);
		return oParents;
	},
/** @return ancestors to the class in a jOWL.Array */
	ancestors : function(){
		return this.hierarchy(false).flatindex;
	},
/**
Constructs the entire (parent) hierarchy for a class
@return a jOWL.Array containing top nodes (classes directly subsumed by 'owl:Thing')
@param addInverse add a variable invParents (jOWL.Array of child references) to each node with exception of the leaves (original concept)
*/
	hierarchy : function(addInverse){
		var endNodes = new jOWL.Array();
		var self = this;
		endNodes.flatindex  = new jOWL.Array();

		function URIARR(p_arr, obj){
			var add = true;
			if(!obj){ obj = {}; add = false;}
			if(p_arr.each){
				p_arr.each(function(){
					if(obj[this.URI]){return;}
					if(this.URI == jOWL.NS.owl()+'Thing'){ return;}
					if(add){ obj[this.URI] = true;}
					if(this.parents){ URIARR(this.parents(), obj);}
				});
			}
			return obj;
		}

		function traverse(concept){
      if(concept instanceof jOWL.Type.External || concept == jOWL.Thing){
        endNodes.pushUnique(concept);
        return;
      }
			var parents = concept.parents();
			if(parents.length == 1 && parents.contains(jOWL.NS.owl()+'Thing')){
        endNodes.pushUnique(concept); return;}
			else
			{
				var asso = jOWL.options.reason ? URIARR(parents) : {};
				parents.filter(function(){ return (!asso[this.URI]);}); //throw out redundancies
				parents.each(function(){
						var item = endNodes.flatindex.pushUnique(this);
						if(addInverse){
							if(!item.invParents){ item.invParents = new jOWL.Array();}
							item.invParents.pushUnique(concept);
							}
						traverse(item);
					});
				concept.setParents(parents);
			}
		}

		traverse(this);
		return endNodes;

	},
	/**
	@param level depth to fetch children, Default 5
	@return jOWL array of classes that are descendant
	*/
	descendants : function(level){
		level = (typeof level == 'number') ? level : 5;
		var oDescendants = this.element.data("descendants");
		if(oDescendants && oDescendants.level >= level){ return oDescendants;}
		oDescendants = new jOWL.Array();
		oDescendants.level = level;

		function descend(concept, i){
			if(i <= level){
				i++;
				var ch = concept.children();
				oDescendants.concat(ch);
				ch.each(function(item){ descend(item, i);});
			}
		}

		descend(this, 1);
		this.element.data("descendants", oDescendants);
		return oDescendants;
	},
	/** @return jOWL.Array of Restrictions, target is an individual, not a class or undefined (unless includeAll is specified) - deprecated */
	valueRestrictions : function(includeAll, array){
		return this.sourceof(null, null, {ignoreClasses : !includeAll});
	},
	/**
	get all restrictions that satisfy the arguments
	@param property property or array of properties, or null
	@param target class, individuals of array of them, or null
	@return jOWL.Array of Restrictions
	*/
	sourceof : function(property, target, options){
		options = $.extend({
			inherited : true, // add restrictions specified on parents as well
			transitive : true, //expand on transitive relations too
			ignoreGenerics : true, //if a parent has an identical property, with another target 'Thing', skip that restriction
			ignoreClasses : false, //only individuals should return
			valuesOnly : true //do not return valueless criteria
		}, options);
		var self = this;
		var crit = this.element.data("sourceof");

		if(!crit){
			crit = new jOWL.Array();
      var restr = [].concat(this.restrictions);
      this.intersections.forEach(function(iSect){
        restr = restr.concat(iSect.restrictions);
      });
			restr.forEach(function(cr){
				var dupe = false;
				crit.each(function(item, i){
						if(this.property.name == cr.property.name){ dupe = item;}
				});
				if(dupe){ if(!dupe.merge(cr)){ crit.push(cr);} }
				else { crit.push(cr);}
			});
			this.element.data("sourceof", crit);
		}
		var results = new jOWL.Array();

		crit.each(function(){

			var propertyMatch = property ? false : true;
			var targetMatch = target ? false : true;

			if(!propertyMatch){
				if(property.isArray){	propertyMatch = property.contains(this.property);}
				else { propertyMatch = (property.URI == this.property.URI);}
			}

			if(!target){
				if(options.transitive && this.property.isTransitive){
					var rTarget = this.getTarget();
					var transitives = rTarget.sourceof(this.property, null, options);
					results.concat(transitives);
				}
			}

			if(!targetMatch && !this.target){
				targetMatch = !options.valuesOnly;
			}

			if(!targetMatch){
				var targ = this.getTarget();
				if(targ instanceof jOWL.Type.Class && options.ignoreClasses){ return;}
				targetMatch = jOWL.priv.testObjectTarget(target, this.target);
				if(!targetMatch && options.transitive && propertyMatch && this.property.isTransitive){
					if(targ instanceof jOWL.Type.Individual){
						if(targ.sourceof(property, target).length){ targetMatch = true;}
					}
				}
			}

			if(propertyMatch && targetMatch){ results.pushUnique(this);}
		});

		if(!options.inherited){ return results;}

		this.parents().each(function(){
			if(this.sourceof){
				this.sourceof(property, target, options).each(function(parentsource){
					var ptarget = this.getTarget();
					var containsProperty = false;
					var tempArray = new jOWL.Array();
					results.filter(function(){
						var restr = this, keep = true;
						if(restr.property.URI == parentsource.property.URI){
							containsProperty = true;
							if(!options.ignoreGenerics){
								if(parentsource.target != restr.target){ tempArray.push(parentsource);}
							} else {
								if(ptarget instanceof jOWL.Type.Individual){
									keep = restr.getTarget() instanceof jOWL.Type.Individual && parentsource.target != restr.target;
									tempArray.push(parentsource);
								}
							}
						}
						return keep;
					});
					if(!containsProperty){ results.push(parentsource);}
					results.concat(tempArray);
				});
			}
		});
		return results;
	}
});

jOWL.Type.Intersection = Class.extend({
  initialize : function(element, owner){
    if(owner === undefined) throw new Error("No owner set");
    if(  $(element.node).data('binding')) throw "already exists";
    var self = this;
  	this.element = element;
    $(this.element.node).data("binding", this);
    this.owner = owner;
  	this._arr = [];
  	this.URI = owner.URI;
  	this.matches = {};
    this.classes = [];
    this.restrictions = [];
    this.element.children().forEach(function(child){
      if(child.hasNodeName(jOWL.NS.owl("Restriction"))){
      //  console.log('rs', child);
        var restr = new jOWL.Type.Restriction(child);
    		if(restr.isValueRestriction){self._arr.push(restr);}
        self.restrictions.push(restr);
      } else if(child.hasNodeName(jOWL.NS.owl("Class"))){
        var uri = child.rdfResource();
    		if(uri){
          self.classes.push(uri);
          child.document.subscribe(uri).then(function(item){
            self._arr.push(item);
          });
        }
      }
    });
    element.document._indexIntersection(this);
  },
  match : function(id, cls, clRestr){
		if(id == this.URI){ return false;}
		if(this.matches[id] !== undefined){ return this.matches[id]; }//local cache

		for(var i =0;i<this._arr.length;i++){
			var entry = this._arr[i];
			var m = false;
			if(entry instanceof jOWL.Type.Restriction){
				$.each(clRestr, function(){
					if(this.equals(entry)){ m = true; return false;}
				});
				if(!m) {
					this.matches[id] = false;
					return false;
				}
			} else if(entry instanceof jOWL.Type.Class){
        var index = entry.element.document.getIDIndex();
				for(var j = 0;j<cls.length;j++){
					if(entry.equals(cls[j])){m = true; break;}
					var it = index[cls[j]];
					if(it){
            //Fix this...
						var narr = entry._parentRefs;
						for (var z=0;z<narr.length ; z++){
							if(entry.equals(narr[z])){m = true; break;}
						}
					}
				}
				if(!m){
					this.matches[id] = false;
					return false;
				}
			}
		}
		this.matches[id] = true;
		return this.matches[id];
	},
	equals : function(isect){
		if(!(isect instanceof jOWL.Type.Intersection)){ return false;}
			for(var i =0;i<this._arr.length;i++){
				var match = false;
				for(var j = 0;j<isect._arr.length;j++){
          var entry = isect._arr[j];
					if(entry.equals(this._arr[i])){ match = true;}
				}
				if(!match){ return false;}
			}
		return true;
	}
});

jOWL.Type.Restriction = Class.extend({
  initialize : function(element){
    if(  $(element.node).data('binding')) throw new Error("already exists");
    var jprop, op, restrtype;
    this.target = null;
    this.cachedTarget = null;
    this.element = element;
    $(this.element.node).data("binding", this);
    this.type = this.element.nodeName();
    var self = this;
    this.propertyURI = null;

    if(!this.element.hasNodeName(jOWL.NS.owl("Restriction"))){
      this.propertyURI = jOWL.resolveURI(this.element);
      this.target = this.element.rdfResource() || this.element.text();
      restrtype = "Individual";
    }
    else
    {
      this.element.children().forEach(function(child){
        if(child.hasNodeName(jOWL.NS.owl("onProperty"))){
          jprop = child;
          self.propertyURI = child.rdfResource();
        } else {
          restrtype = child.nodeName();
          op = child;
        }
      });
    }
    if(!this.propertyURI) throw "No Property in restriction";
    this.element.document.subscribe(this.propertyURI).then(function(item){
      self.property = item;
      if(item instanceof jOWL.Type.ObjectProperty){
        if(self.isCardinalityRestriction && item.range){
          self.target = item.range;}
        else if(self.isValueRestriction){
          var t = op.rdfResource();
          if(t == "anonymousOntologyObject"){
            //nested groupings, anonymous classes
            var classNode = op.selectSingleNode(jOWL.NS.owl("Class"));
            if(classNode){
              self.cachedTarget = self.element.document.getResource(classNode);
            }


          }
          self.target = t;
        }
      }

    });

    this.restriction = { minCard: false, maxCard : false, some: [], all : [], value : false };

    this.isAnonymous = true;
    this.isValueRestriction = (restrtype == jOWL.NS.owl('someValuesFrom') ||
      restrtype == jOWL.NS.owl('allValuesFrom') ||
      restrtype == jOWL.NS.owl('hasValue'));
    this.isCardinalityRestriction = (restrtype == jOWL.NS.owl('cardinality') ||
     restrtype == jOWL.NS.owl('maxCardinality') ||
     restrtype == jOWL.NS.owl('minCardinality'));

    if(!restrtype){ throw "badly formed owl:restriction";}
    switch(restrtype){
      case jOWL.NS.owl('cardinality'): this.restriction.minCard = this.restriction.maxCard = parseInt(op.text(), 10); break;
      case jOWL.NS.owl('maxCardinality'): this.restriction.maxCard = parseInt(op.text(), 10); break;
      case jOWL.NS.owl('minCardinality'): this.restriction.minCard = parseInt(op.text(), 10); break;
      case jOWL.NS.owl('hasValue'): var res = op.rdfResource(); if(res){ this.target = res;} break;
    }

    var suffix = this.target || this.restrtype;
    this.name = this.propertyURI+'#'+suffix;
    return this;

  },
  bind : function(){return null;},
	merge : function(crit){
		if(this.isCardinalityRestriction && crit.isValueRestriction ){ this.target = crit.target; return true;}
		else if(this.isValueRestriction && crit.isCardinalityRestriction){
			switch(crit.restrtype){
			case jOWL.NS.owl('cardinality'): this.restriction.minCard = this.restriction.maxCard = crit.restriction.minCard; return true;
			case jOWL.NS.owl('minCardinality'): this.restriction.minCard = crit.restriction.minCard; return true;
			case jOWL.NS.owl('maxCardinality'): this.restriction.maxCard = crit.restriction.maxCard; return true;
			}
		}
		return false;
	},
	getTarget : function(){
		if(!this.target){ return jOWL.Thing;}
		if(this.cachedTarget){ return this.cachedTarget;}
		this.cachedTarget = (this.property instanceof jOWL.Type.ObjectProperty) ?
      this.element.document.getResource(this.target) : new jOWL.Literal(this.target);
		return this.cachedTarget;
	},
	equals : function(restr){
		if(!(restr instanceof jOWL.Type.Restriction)){ return false;}
		if(this.propertyURI == restr.propertyURI){
			if(this.target == 'anonymousOntologyObject'){return false;}//oneof lists etc unsupported right now
			if(this.target && this.target === restr.target){ return true;}
		}
		return false;
	}

});



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
