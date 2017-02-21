

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
