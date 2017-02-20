jOWL.Type.Restriction = Class.extend({
  initialize : function(element){
    var jprop, op, restrtype;
    this.target = null;
    this.cachedTarget = null;
    this.element = element;
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
          if(t == "anonymousOntologyObject"){//nested groupings, anonymous classes
            self.cachedTarget = new jOWL.Type.Class(op.selectSingleNode(jOWL.NS.owl("Class")));

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
		if(!this.target){ return jOWL('Thing');}
		if(this.cachedTarget){ return this.cachedTarget;}
		this.cachedTarget = (this.property.isObjectProperty) ? jOWL(this.target) : new jOWL.Literal(this.target);
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
