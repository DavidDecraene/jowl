
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
