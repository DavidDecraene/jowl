

/** Make values work with jOWL.Array */
jOWL.Literal = function(value){
	this.name = value;
};


/** used for jOWL.Type.Individual.sourceof */
jOWL.priv.testObjectTarget = function(target, matchtarget){
	var i = 0;
	if(target.isArray){
		for(i=0;i<target.length;i++){
			if(jOWL.priv.testObjectTarget(target.get(i), matchtarget)){ return true;}
		}
		return false;
	}
	//if the target is a class, fetch individuals instead.
	else if(target.isClass){
		 var a = target.individuals();
		 for(i=0;i<a.length;i++){
			if(a.get(i).URI == matchtarget){ return true;}
		}
	}
	else if(target.URI == matchtarget){ return true;}
	return false;
};




/** Datatype Logic, local functions */
jOWL.priv.Dt = function(options){
	this.settings = $.extend({base: null, pattern : null, assert: function(b){return true;}, match: function(a, b){return true;}}, options);
	this.base = jOWL.Type.Datatype[this.settings.base];
};

jOWL.priv.Dt.prototype = {
	sanitize : function(b){
		if(this.settings.sanitize){ return this.settings.sanitize(b);}
		if(this.base && this.base.sanitize){ return this.base.sanitize(b);}
	},
	assert : function(b){
		var v = this.sanitize(b); if(v !== undefined){ b = v;}
		if(this.base && !this.base.assert(b)){ return false;}
		if(this.settings.pattern && !this.settings.pattern.test(b)){ return false;}
		return this.settings.assert(b);
	},
	match : function(a, b){
		var v = this.sanitize(b); if(v !== undefined){ b = v;}
		if(!this.assert(b)){ return false;}
		if(this.base && !this.base.match(a, b)){ return false;}
		return this.settings.match(a, b);
	}
};

jOWL.Type.Datatype = function(URI, options){
	jOWL.Type.Datatype[URI] = new jOWL.priv.Dt(options);
};

/** Datatype Definitions */
jOWL.Type.Datatype(jOWL.NS.xsd()+"integer", {sanitize : function(x){return  parseInt(x, 10);}, assert : function(x){ return Math.round(x) == x;}, match : function(a, b){
	var check = parseInt(a, 10);
	if(!isNaN(check)){ return check == b;}
	var arr = a.split('&&');
	for(var i=0;i<arr.length;i++){ arr[i] = b+arr[i];}
	try {
		return eval(arr.join(' && '));
	} catch(e){ return false;}
} });
jOWL.Type.Datatype(jOWL.NS.xsd()+"positiveInteger", {base: jOWL.NS.xsd()+"integer", assert : function(x){ return x > 0;} });
jOWL.Type.Datatype(jOWL.NS.xsd()+"decimal", {base: jOWL.NS.xsd()+"integer" });
jOWL.Type.Datatype(jOWL.NS.xsd()+"float", {base: jOWL.NS.xsd()+"integer" });
jOWL.Type.Datatype(jOWL.NS.xsd()+"double", {base: jOWL.NS.xsd()+"integer" });
jOWL.Type.Datatype(jOWL.NS.xsd()+"negativeInteger", {base: jOWL.NS.xsd()+"integer", assert : function(x){ return x < 0;} });
jOWL.Type.Datatype(jOWL.NS.xsd()+"nonNegativeInteger", {base: jOWL.NS.xsd()+"integer", assert : function(x){ return x >= 0;} });
jOWL.Type.Datatype(jOWL.NS.xsd()+"nonPositiveInteger", {base: jOWL.NS.xsd()+"integer", assert : function(x){ return x <= 0;} });
jOWL.Type.Datatype(jOWL.NS.xsd()+"string");

var URIPattern = /^([a-z0-9+.\-]+):(?:\/\/(?:((?:[a-z0-9-._~!$&'()*+,;=:]|%[0-9A-F]{2})*)@)?((?:[a-z0-9-._~!$&'()*+,;=]|%[0-9A-F]{2})*)(?::(\d*))?(\/(?:[a-z0-9-._~!$&'()*+,;=:@\/]|%[0-9A-F]{2})*)?|(\/?(?:[a-z0-9-._~!$&'()*+,;=:@]|%[0-9A-F]{2})+(?:[a-z0-9-._~!$&'()*+,;=:@\/]|%[0-9A-F]{2})*)?)(?:\?((?:[a-z0-9-._~!$&'()*+,;=:\/?@]|%[0-9A-F]{2})*))?(?:#((?:[a-z0-9-._~!$&'()*+,;=:\/?@]|%[0-9A-F]{2})*))?$/i;

jOWL.Type.Datatype(jOWL.NS.xsd()+"anyURI", {base: jOWL.NS.xsd()+"string", pattern : URIPattern });
jOWL.Type.Datatype(jOWL.NS.xsd()+"boolean", {sanitize : function(x){
		if(typeof x == 'boolean'){ return x;}
		if(x == 'true'){ return true;}
		if(x == 'false'){ return false;}
	}, assert : function(x){
		return typeof x == 'boolean';
	}, match: function(a, b){
		if(a === "false"){ a = false;}
		if(a === "true"){ a = true;}
		return (a === b);
}});
