
		/** construct the hierarchy & make a tree of it */
jOWL.UI.TreeModel = Class.extend({
  initialize : function(owlobject, tree){
    tree.setModel(this);
    this.document = owlobject.element.document;
    this.options = tree.options;
    var h = owlobject.hierarchy(true);
    if(this.options.rootThing) {
      this.traverse(h, tree.root(jOWL.Thing));
    }
    else {
      var root = tree.root(h);
      for(var i=0;i<root.length;i++){
          this.traverse(root[i].invParents, root[i]);
          if(!root[i].invParents) { this.leaf(root[i]); }
        }

      }
    this.clear(owlobject);
  }, clear : function(el){
      var self = this;
      if(el.parents) {
        el.parents().each(function(){
        this.invParents = null; self.clear(this);
      });
    }
  }, leaf : function(node){
    node.jnode.addClass(this.options.focusClass);
    if(this.options.addChildren){
      var entry = this.document.getResource(node.$name.attr('title'));
      if(entry && entry.children){ entry.children().each(function(){
        node.add(this); }); }
      }
  }, traverse : function(itemarray, appendto){
    if(!itemarray) { return; }
    var self = this;
    itemarray.each(function(){
      var node = appendto.add(this);
      if(this.invParents){ self.traverse(this.invParents, node); }
      else { self.leaf(node); }
    });

  }

});

jOWL.UI.TreeNode = Class.extend({
  initialize : function(tree, text, isRoot){
    this.tree = tree;
    var self = this;
    this.jnode = isRoot ? $('<li/>').addClass(this.tree.options.rootClass) :
      $('<li class="tvi"/>');
    this.$name = null;

    if(text){
      this.$name = $('<span/>').addClass(this.tree.options.nameClass);
      if(typeof text == "string") { this.$name.html(text); }
      else if(text.bind) {
        text.bind(this.$name);
      }
      var n = this.$name;
      this.$name.appendTo(this.jnode).click(function(){
        var entry = tree.model.document.getResource(n.attr('title'));
        if(entry && tree.options.onSelect.call(n, entry) === false) { return; }
        tree.broadcast(entry);
        if(tree.options.isStatic) { tree.propertyChange(entry); }
        return false;});
    }

    this.wrapper = $('<ul/>').appendTo(this.jnode);
    this.jnode.click(function(){self.toggle(); return false;});
  }, add : function(text){
    var nn = new jOWL.UI.TreeNode( this.tree, text, false);
    if(!this.wrapper.children().length) { this.toNode();	}
    else {
      var lastchild = this.wrapper.children(':last');
      lastchild.swapClass("tvilc", "tvic");
      lastchild.swapClass("tvile", "tvie");
      lastchild.swapClass("tvil", "tvi");

      }//children - change end of list
    this.wrapper.append(nn.jnode.swapClass('tvi', 'tvil'));
    return nn;
  },
  toggle : function(){
    var t = this.jnode.hasClass("tvic") || this.jnode.hasClass("tvie") ||
    this.jnode.hasClass("tvilc") || this.jnode.hasClass("tvile");
    if(!t) { return; }
    this.jnode.swapClass('tvic', 'tvie');
    this.jnode.swapClass('tvilc', 'tvile');
    this.wrapper.slideToggle();
  }, toNode : function(){
    this.jnode.swapClass('tvil', 'tvilc');
    this.jnode.swapClass('tvi', 'tvic');
  }

});

/**
var tree = $(selector).owl_treeview();
var root = tree.root("node");
root.add("node2").add("child");
*/
jOWL.UI.Tree = Class.extend({
  initialize : function(node, options){
    this.options = options;
    this.rack = $('<ul/>').addClass(options.treeClass).appendTo(node);
    var tree = this;
  }, root : function(item){
    var rt = null; //root
    var self = this;
    this.rack.empty();
    if(item && item.each) {
      rt = [];
      item.each(function(it){
        var x =  new jOWL.UI.TreeNode(self, it, true);
        x.wrapper.addClass("tv");
        x.jnode.appendTo(self.rack);
        x.invParents = it.invParents;
        it.invParents = null;	//reset for later use
        rt.push(x);
      });
      return rt;
    }
    rt = new fn.node(item, true);
    rt.wrapper.addClass("tv");
    rt.jnode.appendTo(this.rack);
    return rt;
  }, propertyChange : function(item){
    if(item instanceof jOWL.Type.Class) {
      var m = new jOWL.UI.TreeModel(item, this);
    }
  }, setModel : function(model){
    this.model = model;
  }


});


$.fn.extend({
/**
Tree View
*/
	owl_treeview : function(document, options){
    if(!(document instanceof jOWL.Document)) throw new Error("No Document passed");
		options = $.extend({
			contentClass : jOWL.UI.defaults.contentClass,
			focusClass: "focus",
			nameClass: "name",
			treeClass: "jowl-treeview",
			rootClass: "root",
			onSelect : function(item){}, //function that can be overwritten to specfy behavior when something is selected
			rootThing : false, //if true then topnode is (owl) 'Thing'
			isStatic : false, // if static then selections will refresh the entire tree
			addChildren : false //add a given objects children to the treeview as well
		}, options);


		this.addClass("jowl-tree");
		this.content = $("."+options.contentClass, this).empty();
		if(!this.content.length){
      this.content = $('<div/>').addClass(options.contentClass).appendTo(this);
    }
		var tree = new jOWL.UI.Tree(this.content, options);
		jOWL.UI.asBroadcaster(tree);
		return tree;
	}
});
