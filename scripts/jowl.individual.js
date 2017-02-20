jOWL.Type.Individual = Class.extend(jOWL.Type.Thing, {
  initialize : function(jnode){
    this.parent(jnode);
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

		this.jnode.children().filter(function(){
      return (this.prefix != jOWL.NS.rdfs.prefix && this.prefix != jOWL.NS.rdf.prefix && this.prefix != jOWL.NS.owl.prefix);})
			.each(function(){
			var restriction = new jOWL.Type.Restriction($(this));
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
				if(restriction.property.isObjectProperty){
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
				if(clTarget.isClass && options.ignoreClasses){ return;}

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
