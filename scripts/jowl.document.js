
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
				console.log("duplicate intersection found between : (Ignoring) "+isect.URI+"  and "+dupe.URI);
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
      var jowl = jOWL.getResource(node);
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
				throw new Error("not found");
  			return null;
  		}
  		return match;
  	}
  	//console.log(resource);
  	var xmlNode = resource;
  	if(resource instanceof jOWL.Element) xmlNode = resource.node;
    var element = new jOWL.Element(this, xmlNode);
  	var jj = jOWL.type(xmlNode);
  	if(!jj){ return null;}
  	return new (jj)(element);
  }
});
