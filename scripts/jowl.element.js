jOWL.Element = Class.extend({
	initialize : function(document, node){
		if(!(document instanceof jOWL.Document)) throw new Error("no document");
		this.node = node;
    //console.log(node instanceof Element);
		this.document = document;
		this._data = {};
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
