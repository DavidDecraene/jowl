

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
