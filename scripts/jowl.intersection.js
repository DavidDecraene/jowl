jOWL.Type.Intersection = Class.extend({
  initialize : function(element, owner){
    if(owner === undefined) throw new Error("No owner set");
    var self = this;
  	this.element = element;
    this.owner = owner;
  	this._arr = [];
  	this.URI = owner.URI;
  	this.matches = {};
    this.classes = [];
    this.restrictions = [];
    this.element.children().forEach(function(child){
      if(child.hasNodeName(jOWL.NS.owl("Restriction"))){
      //  console.log('rs', child);
        var restr = new jOWL.Type.Restriction(child);
    		if(restr.isValueRestriction){self._arr.push(restr);}
        self.restrictions.push(restr);
      } else if(child.hasNodeName(jOWL.NS.owl("Class"))){
        var uri = child.rdfResource();
    		if(uri){
          self.classes.push(uri);
          child.document.subscribe(uri).then(function(item){
            self._arr.push(item);
          });
        }
      }
    });
    element.document._indexIntersection(this);
  },
  match : function(id, cls, clRestr){
		if(id == this.URI){ return false;}
		if(this.matches[id] !== undefined){ return this.matches[id]; }//local cache

		for(var i =0;i<this._arr.length;i++){
			var entry = this._arr[i];
			var m = false;
			if(entry instanceof jOWL.Type.Restriction){
				$.each(clRestr, function(){
					if(this.equals(entry)){ m = true; return false;}
				});
				if(!m) {
					this.matches[id] = false;
					return false;
				}
			} else if(entry instanceof jOWL.Type.Class){
        var index = entry.element.document.getIDIndex();
				for(var j = 0;j<cls.length;j++){
					if(entry.equals(cls[j])){m = true; break;}
					var it = index[cls[j]];
					if(it){
            //Fix this...
						var narr = entry._parentRefs;
						for (var z=0;z<narr.length ; z++){
							if(entry.equals(narr[z])){m = true; break;}
						}
					}
				}
				if(!m){
					this.matches[id] = false;
					return false;
				}
			}
		}
		this.matches[id] = true;
		return this.matches[id];
	},
	equals : function(isect){
		if(!(isect instanceof jOWL.Type.Intersection)){ return false;}
			for(var i =0;i<this._arr.length;i++){
				var match = false;
				for(var j = 0;j<isect._arr.length;j++){
          var entry = isect._arr[j];
					if(entry.equals(this._arr[i])){ match = true;}
				}
				if(!match){ return false;}
			}
		return true;
	}
});
