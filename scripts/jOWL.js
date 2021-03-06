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
jOWL.NS("xml", "http://www.w3.org/XML/1998/namespace");

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

	var xml = document.createXmlElement(jOWL.NS.owl, "Class")
		.attr(jOWL.NS.rdf, 'about', jOWL.NS.owl()+'Thing');
	jOWL.Thing = new jOWL.Type.Thing(xml);
	jOWL.Thing.type = false;
	return document;
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
	if(!entry) return;
	if(entry instanceof jOWL.Document){
		var param = jOWL.getURLParameters();
		var result = null;
		if(param.owlClass){
			result = entry.getResource(unescape(param.owlClass));
			return result instanceof jOWL.Type.Class ? result : null;
		}
		if(param.owlProperty){
			result =  entry.getResource(unescape(param.owlProperty));
			return result instanceof jOWL.Type.Property ? result : null;
		}
		if(param.owlThing){
			result = entry.getResource(unescape(param.owlThing));
			return result instanceof jOWL.Type.Individual ? result : null;
		}
		if(param.resource){
			return entry.getResource(unescape(param.resource));
		}
		return result;
	}
	else {
		if(!entry.URI){ return false;}
		var href = window.location.href.split("?", 2);
		if(window.location.search){ href = href[0];}
		if(entry instanceof jOWL.Type.Class){
			return href+'?owlClass='+escape(entry.URI);
		} else if(entry instanceof jOWL.Type.Property){
			return href+'?owlProperty='+escape(entry.URI);
		} else if(entry instanceof jOWL.Type.Individual){
			return href+'?owlThing='+escape(entry.URI);
		}
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
