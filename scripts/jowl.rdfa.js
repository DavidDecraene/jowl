

/** Extracts RDFa syntax from current page and feeds it to jOWL, simple implementation, only classes for the time being */
jOWL.parseRDFa = function(fn, options){
	var entries = options.node ? $("[typeof]", options.node) : $("[typeof]");
	var doc = jOWL.create.document();

	 function property(p, node){
		var arr = [];
		$("[property="+p+"]", node).each(function(){ arr.push($(this).attr('content') || $(this).html());});
		if(node.attr('property') === p){ arr.push(node.attr('content') || node.html());}
		return arr;
	}

	function rel(p, node){
		var arr = [];
		$("[rel="+p+"]", node).each(function(){ arr.push($(this).attr('resource'));});
		if(node.attr("rel") === p){ arr.push(node.attr('resource'));}
		return arr;
	}

	function makeClass(node, ID){
		var cl = jOWL.create(jOWL.NS.owl, "Class", doc).attr(jOWL.NS.rdf, 'about', ID).appendTo(doc.documentElement);

		var parents = property(jOWL.NS.rdfs("subClassOf"), node).concat(rel(jOWL.NS.rdfs("subClassOf"), node));
		for(var i = 0;i<parents.length;i++){
			var p = jOWL.create(jOWL.NS.rdfs, "subClassOf", doc).attr(jOWL.NS.rdf, "resource", parents[i]).appendTo(cl);
		}
		return cl;
	}

	entries.each(function(){
		var node = $(this);
		var type = node.attr("typeof"), el;

		if(type == jOWL.NS.owl("Class")){ el = makeClass(node, jOWL.resolveURI(node.attr("about")));}

		$.each(property(jOWL.NS.rdfs('comment'), node), function(){
			jOWL.create(jOWL.NS.rdfs, "comment", doc).appendTo(el).text(this, true);
		});

		$.each(property(jOWL.NS.rdfs('label'), node), function(){
			jOWL.create(jOWL.NS.rdfs, "label", doc).appendTo(el).text(this);
		});
	});
	jOWL.parse(doc, options);
	fn();
};
