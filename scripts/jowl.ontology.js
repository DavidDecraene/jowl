

/** Access to the owl:Ontology element, also the main coding namespace for ontology objects */
jOWL.Type.Ontology = Class.extend(jOWL.Type.Thing, {
	initialize : function(jnode){
		this.parent(jnode);
	}

});
