OntologyProvider = Class.singleton({
    include: [EventListener],
    initialize: function() {},
    setOntology: function(ontology) {
        this.ontology = ontology;
        this.fireEvent("Document", ontology);
    }

}).getInstance();

LabelEditor = Class.extend({
    initialize: function() {
        var self = this;
        this.$element = $('<div class="editor"/>');
        var row = $('<div class="row"/>').appendTo(this.$element);
        var col1 = $('<div class="col col-sm-3"/>').appendTo(row);
        var col2 = $('<div class="col col-sm-9"/>').appendTo(row);
        var group = $('<div class="input-group"/>').appendTo(col1);
        $('<span class="input-group-addon">locale</span>').appendTo(group);
        this.$locale = $('<input type="text" class="form-control">').appendTo(group)
        .on('keyup', function(){
          var txt = $(this).val();
          if(self.resource) {
            if(!txt || !txt.length){
              if(self.label){
                  //remove the attribute
                  self.label.removeAttr(jOWL.NS.xml, "lang");
              }
              return;
            }
            if(!self.label){
              self.label = self.resource.element.document.createXmlElement(jOWL.NS.rdfs, 'label');
              self.label.appendTo(self.resource.element);
            }
            self.label.attr(jOWL.NS.xml, "lang", txt);
            self.resource.element.document._updateTerms(self.resource);
          }
        });
        group = $('<div class="input-group"/>').appendTo(col2);
        $('<span class="input-group-addon">label</span>').appendTo(group);
        this.$label = $('<input type="text" class="form-control">')
          .appendTo(group).on('keyup', function(){
          var txt = $(this).val();
          if(self.resource) {
            if(!txt || !txt.length){
              //remove it
              if(self.label) {
                self.label.remove();
                self.resource.element.document._updateTerms(self.resource);
              }
              self.$element.remove();
              return;
            }
            if(!self.label){
              self.label = self.resource.element.document.createXmlElement(jOWL.NS.rdfs, 'label');
              self.label.appendTo(self.resource.element);
            }
            self.label.text(txt);
            self.resource.element.document._updateTerms(self.resource);
          }

        });
    }, setResource : function(label, resource){
      this.resource = resource;
      this.label = label;
      if(label){
        this.$locale.val(label.attr("xml:lang"));
        this.$label.val(label.text());
      }
    }
});

DescriptionEditor = Class.extend({
    initialize: function() {
        this.$element = $('<div class="editor"/>');
        $('<h4>Description</h4>').appendTo(this.$element);
        var self = this;
        this.$description = $('<textarea class="form-control">')
        .appendTo(this.$element).on('keyup', function(){
          var txt = $(this).val();
          if(self.resource) self.resource.setDescription(txt);
        });

    }, setResource : function(resource){
      this.resource = resource;
      if(resource) this.$description.val(resource.description());
    }
});

LabelsEditor = Class.extend({
  initialize : function(){
    this.$element = $('<div class="editor"/>');
    var $title = $('<h4>Labels </h4>').appendTo(this.$element);
    this.$add = $('<button class="btn btn-sm" title="Add a label"><i class="fa fa-plus" aria-hidden="true"></i></button>').appendTo($title);
    this.$body =  $('<div/>').appendTo(this.$element);
    var self = this;
    this.$add.click(function(){
      if(!self.resource) return false;
      var labelEditor = new LabelEditor();
      labelEditor.$element.appendTo(self.$body);
      labelEditor.setResource(null, self.resource);
    });

  }, setResource : function(resource){
    this.resource = resource;
    this.$body.empty();
    var terms = resource.annotations(jOWL.NS.rdfs('label'));
    var self = this;
    if (terms && terms.length) {
        terms.forEach(function(v) {
            var labelEditor = new LabelEditor();
            labelEditor.$element.appendTo(self.$body);
            labelEditor.setResource(v, resource);
        });
    }
  }

});

SparqlWidget = Class.extend(DockPanel, {
    initialize: function() {
        this.parent();
        var self = this;
        this.$title.text("Sparql-DL query");
        this.$form  = $('<form class="input-group"/>').submit(function(){
          self.doQuery.call(self);
          return false;
        }).appendTo(this.$body);
        $('<label class="input-group-addon">Query</label>').appendTo(this.$form);
        this.$input = $('<input type="text" size="100" placeholder="Enter a sparql-dl query" class="form-control"/>').appendTo(this.$form);
        $('<br/><h3>Results</h3>').appendTo(this.$body);
        this.$loader =   $('<div class="loader" >'+
          '<div style="color:black">Querying, Please Stand By</div>'+
          '<img src="http://ontologyonline.org/img/ajax-loader.gif" alt="Loading Image"/>'+
        '</div>').appendTo(this.$body).hide();
       this.$results = $('<div  class="card-box"></div>').appendTo(this.$body);
    }, doQuery : function(){
      if (!OntologyProvider.ontology) return false;
      var v = this.$input.val();
      if(!v || !v.length) return false;
      this.$loader.show();
      try {
        var self = this;
        new jOWL.SPARQL_DL(OntologyProvider.ontology, v)
          .execute({ onComplete : function(r){ self.showResults.call(self, r); }, expandQuery : true});
      } catch(e){
        console.error(e);
        this.$loader.hide();
      }
    }, showResults : function(obj){
      this.$loader.hide();
      if(obj.error){ this.$results.text("Error: "+obj.error); }
      else {
        this.$results.empty();
        var display = this.$results;
        if(!obj.results || !obj.results.length) {
					display.text("No results found"); return; }
				display.append($('<div class="stats"/>')
        .text("Number of results: "+obj.results.length));

				for(var i=0;i<obj.results.length;i++){
					var txt = [];
					for(var x in obj.results[i]){
							var str = (typeof obj.results[i][x] == 'string') ? obj.results[i][x] : obj.results[i][x].label();
							txt.push(x+' : '+str);
						}
					display.append($('<div/>').text(txt.join(', ')));
				}
      }
    }
});


ConceptTreeEdit = Class.extend(DockPanel, {
    initialize: function() {
        this.parent();
        this.$title.text("Class Tree View");

    },
    onDocument: function(document) {
        this.$body.empty();

        var tree = $('<div/>').appendTo(this.$body).owl_treeview(document, {
            addChildren: true,
            isStatic: true
        });
        var div = $('<div class="input-group"/>')
            .appendTo(this.$body);
        var autocomplete = $('<input type="text" class="form-control" placeholder="Enter Search Terms here">')
            .appendTo(div)
            .owl_autocomplete(document, {
                focus: true,
                chars: 2,
                filter: 'Class'
            });
        autocomplete.addListener(tree);
        var self = this;
        tree.addListener({
            onResource: function(item) {
                self.fireEvent("Resource", item);
            }
        });
        for (var x in document.getIDIndex()) {
            var entry = document.getIDIndex()[x];
            if (entry instanceof jOWL.Type.Class) {
                concept = entry;
                tree.setResource(concept);
                break;
            }
        }
    },
    initProvider: function() {
        OntologyProvider.addListener(this);
        if (OntologyProvider.ontology) this.onDocument(OntologyProvider.ontology);
    },
    remove: function() {
        this.parent();
        OntologyProvider.removeListener(this);
    }
});

ClassDescriptionEdit = Class.extend(DockPanel, {
    initialize: function() {
        this.parent();
        this.$title.text("Class Info View");
        //if(OntologyProvider.ontology) this.onDocument(OntologyProvider.ontology);
    },
    onResource: function(owlClass) {
        if (!(owlClass instanceof jOWL.Type.Class)) return;
        this.$body.empty();
        this.$title.text(owlClass.URI);
        var descriptionEditor = new DescriptionEditor();
        descriptionEditor.$element.appendTo(this.$body);
        descriptionEditor.setResource(owlClass);
        var self = this;
        var labelsEditor = new LabelsEditor();
        labelsEditor.$element.appendTo(this.$body);
        labelsEditor.setResource(owlClass);

        var $edit = $('<div class="editor"/>').appendTo(self.$body);
        //TODO: get disjoints...
        //TODO: get instances...
        $('<h4>Relations</h4>').appendTo($edit);
        new jOWL.SPARQL_DL(owlClass.element.document,
            "sparql-dl:PropertyValue(item, ?p, ?t)", {
                item: owlClass
            }).execute({
            onComplete: function(r) {
                if (!r.results) return;
                r.results.forEach(function(entry) {
                    var property = entry['?p'];
                    var target = entry['?t'];
                    var $div = $('<div/>').appendTo($edit);
                    if (property) property.bind($('<span/>').appendTo($div));

                    if (target) {
                        if (property) $('<span>: </span>').appendTo($div);
                        target.bind($('<span/>').appendTo($div));
                    }
                });
            }
        });
    }
});

OntologyEdit = Class.extend(DockPanel, {
    initialize: function() {
        this.parent();
        this.$description = $('<div/>').appendTo(this.$body);
        OntologyProvider.addListener(this);
        if (OntologyProvider.ontology) this.onDocument(OntologyProvider.ontology);
    },
    onResource: function(ontology) {
        if (!(ontology instanceof jOWL.Type.Ontology)) return;
        this.$body.empty();
        this.$title.text(ontology.baseURI);
        var descriptionEditor = new DescriptionEditor();
        descriptionEditor.$element.appendTo(this.$body);
        descriptionEditor.setResource(ontology);
        var labelsEditor = new LabelsEditor();
        labelsEditor.$element.appendTo(this.$body);
        labelsEditor.setResource(ontology);
    },
    onDocument: function(document) {
        this.onResource(document.getOntology());
    },
    remove: function() {
        this.parent();
        OntologyProvider.removeListener(this);
    }

});
