

DockingElement = Class.extend({
  include :  [EventListener],
  initialize : function($element){
    this.$element = $element;
  }, appendTo : function($e){
      var originalParent = this.$element.parent();
      $e.append(this.$element);
      if(this.fireEvent) this.fireEvent("Move", this, originalParent, $e);
      return this;
    }, prependTo : function($e){
        var originalParent = this.$element.parent();
        $e.prepend(this.$element);
        if(this.fireEvent) this.fireEvent("Move", this, originalParent, $e);
        return this;
    }
});

GhostRectangle = Class.extend({
  initialize : function($element){
    this.$ghostBorderN = $('<div class="ghost-border top"/>').hide().appendTo($element);
    this.$ghostBorderS = $('<div class="ghost-border bottom"/>').hide().appendTo($element);
    this.$ghostBorderE = $('<div class="ghost-border right"/>').hide().appendTo($element);
    this.$ghostBorderW = $('<div class="ghost-border left"/>').hide().appendTo($element);
  }, show : function(position){
    //calculate a rectangle:
    // x y z q
    // x == topleft, y = topright, z = botleft, q = botright
    var x = position.left;
    if( x <= 5) x = 5;
    var y = x + position.width;
    if(y  > this.maxWidth-5) y = this.maxWidth-5;
    this.$ghostBorderN.css({
      top: position.top, left : x, width: y-x
    }).show();
    this.$ghostBorderS.css({
      top : position.top+position.height-10, left : x, width : y-x
    }).show();
    this.$ghostBorderE.css({
      top : position.top, left : y-10, height : position.height
    }).show();
    this.$ghostBorderW.css({
      top : position.top, left : x,height : position.height
    }).show();
  }, hide : function(){
    this.$ghostBorderN.hide();
    this.$ghostBorderS.hide();
    this.$ghostBorderE.hide();
    this.$ghostBorderW.hide();
  }
});

TabPane = Class.extend({
  initialize : function(dockPanel, tabPanel){
    this.panel = dockPanel;
    this.tabs = tabPanel;
    var active = !tabPanel.$tabContent.children().length;
    var $li = $('<li class="nav-item"/>').appendTo(tabPanel.$navbar);

    this.$tab = $('<a class="nav-link" data-toggle="tab" role="tab"></a>')
    .appendTo($li)
    .attr('href', '#'+dockPanel.id)
    .text(dockPanel.$title.text());
    this.$panel =  $('<div class="tab-pane" role="tabpanel">')
    .attr('id', dockPanel.id)
    .appendTo(tabPanel.$tabContent);
    if(DockArea.options.bootstrap == 4){
      if(active){
        this.$tab.addClass("active");
        this.$panel.addClass("active");
      }
    } else {
      this.$panel.addClass('fade');
      if(active){
         $li.addClass("active");
         this.$panel.addClass("in active");
      }
    }
    dockPanel.appendTo(this.$panel);
    dockPanel.addListener(this);

  }, onClose : function(dockPanel){
    if(dockPanel !== this.panel) return;
    this.remove();
  }, onMove : function(dockpanel, from, to){
    if(dockpanel !== this.panel) return;
    this.remove();
  }, remove : function(){
    this.$tab.parent().remove();
    this.$panel.remove();
    var allTabs = this.tabs.$tabContent.children('.tab-pane');
    if(!allTabs.length){
      this.tabs.remove();
    } else if(allTabs.length == 1){
      //if only one panel remains: unwrap
      this.tabs.unwrap();
    } else {
      //if multiple panels remain; make sure we have an active tab..
      this.tabs.$navbar.find('a:first').tab("show");
    }


  }
});

TabDockPanel = Class.extend(DockingElement, {
  initialize : function(){
    this.$element = $('<div class="tab-dock-panel"/>').data('panel', this);
    /*if(DockArea.options.bootstrap == 4){
      this.$element.addClass('card');
      var $header = $('<div class="card-header"/>').appendTo(this.$element);
      this.$tabContent = $('<div class="card-block"/>').appendTo(this.$element);
      this.$navbar = $('<ul class="nav nav-tabs card-header-tabs"/>').appendTo($header);
    } else {*/
      this.$navbar = $('<ul class="nav nav-tabs"/>').appendTo(this.$element);
      this.$tabContent = $('<div class="tab-content"/>').appendTo(this.$element);
    //}
  }, addPanel : function(dockPanel){
    //dockPanel title becomes tab title... TODO
    var pane = new TabPane(dockPanel, this);
  }, isEmpty : function(){
    return this.$tabContent.children().length === 0;
  }, remove : function(){
     this.$element.remove();
  }, unwrap : function(){
     var $content = this.$tabContent.children('.tab-pane').children();
     if(!$content.length) this.remove();
     else this.$element.replaceWith($content);
  }
});

DockArea = Class.extend(DockingElement, {
  initialize : function($element){
    this.$element = $element.addClass("docking-area");
    this.ghost = new GhostRectangle($element);
    //make at least one row
    $('<div class="row dock-row"/>').appendTo($element)
    .append($('<div class="col col-sm-12"/>').append($('<div class="dock-col"/>')));
    var self = this;
    this.dropOrientation = null;
    this.maxWidth = $(document).width();
    this.$element.on('dragenter', function(event){
      self.maxWidth = $(document).width();
      self.showBorder.call(self, event.target, event);
      event.stopPropagation();
    }).on('dragover', function(event){
      var id = event.originalEvent.dataTransfer.getData("dockpanel");
      if(!id){ return; }
        event.preventDefault();
        event.stopPropagation();
       self.showBorder.call(self, event.target, event);

    }).on('dragleave', function(event){
      self.ghost.hide.call(self.ghost);
      event.stopPropagation();
    }).on('drop', function(event){
       event.preventDefault();
       event.stopPropagation();
       self.dropPanel.call(self, event);
       self.ghost.hide.call(self.ghost);
    });
  },
  splitLeft : function($column){
      var $children = $column.children();
      var split = this.splitHorizontal($column);
      split.right.append($children);
      return split.left;
  }, splitHorizontal : function($column){
    //move the current child content to a nested column...
    var $newrow =  $('<div class="row dock-row"/>').appendTo($column);
    var $column1 = $('<div class="dock-col"/>')
      .appendTo($('<div class="col col-sm-6"/>').appendTo($newrow));
    var $column2 = $('<div class="dock-col"/>')
      .appendTo($('<div class="col col-sm-6"/>').appendTo($newrow));
    var result = {
      left : $column1, right : $column2
    };
    return result;
  }, splitVertical : function($column){
    var $row1 = $('<div class="row dock-row"/>').appendTo($column);
    var $row2 = $('<div class="row dock-row"/>').appendTo($column);
    var $column1 = $('<div class="dock-col"/>')
      .appendTo($('<div class="col col-sm-12"/>').appendTo($row1));
    var $column2 = $('<div class="dock-col"/>')
      .appendTo($('<div class="col col-sm-12"/>').appendTo($row2));
    return { top : $column1, bottom : $column2};
  }, splitUp : function($column){
      var $children = $column.children();
      var split = this.splitVertical($column);
      split.bottom.append($children);
      return split.top;
  }, splitDown : function($column){
      var $children = $column.children();
      var split = this.splitVertical($column);
      split.top.append($children);
      return split.bottom;
  }, splitRight : function($column){
    var $children = $column.children();
    var split = this.splitHorizontal($column);
    split.left.append($children);
    return split.right;
  }, dropPanel : function(event){
      var id = event.originalEvent.dataTransfer.getData("dockpanel");
      if(!id) return;
      var regex = /panel\-(\d+)/;
      var result = regex.exec(id);
      if(result.length != 2) return;
      var panel = DockArea.IDX[parseInt(result[1], 10)];
      if(!panel) return;
      //var panel =
      var $target = $(event.target);
      if(!$target.is('.dock-col')){
        $target = $target.closest('.dock-col');
      }
      if($target.is('.dock-col')){
        var $children = $target.children();
        if(this.dropOrientation){

          switch(this.dropOrientation){
            case "left":
              panel.appendTo(this.splitLeft($target));
              break;
            case "right":
              panel.appendTo(this.splitRight($target));
              break;
            case "top":
            //add another row unless there isnt any content yet...
             if(!$target.children().length) panel.appendTo($target);
             else panel.appendTo(this.splitUp($target));
             break;
           case "bottom":
           //add another row unless there isnt any content yet...
            if(!$target.children().length) panel.appendTo($target);
            else panel.appendTo(this.splitDown($target));
            break;
          }

        } else {//center orientation....
          var tabs = null;
          //If there are components: create a tabbed view, else just append...
          var $panels = $target.children('.dock-panel');
          if($panels.length == 1){
            //there should only be one...
            tabs = new TabDockPanel();
            tabs.appendTo($target);
            tabs.addPanel($panels.data('panel'));
          }
          //is there a tabbed view already?
          var $tabs =  $target.children('.tab-dock-panel');
          if($tabs.length == 1){
            tabs =$tabs.data('panel');
            tabs.addPanel(panel);
            return;
          }
          panel.appendTo($target);

        }
      }
  }, showBorder : function(target, event){
    var $target = $(target);
    this.dropOrientation = null;
    if(!$target.is('.dock-col')){
      $target = $target.closest('.dock-col');
    }
    var position  = null;
    if($target.is('.dock-col')){
      this.$dropTarget  = $target;
      position = $target.offset();
      position.width = $target.width();
      position.height = $target.height();
      //get mouse coords..
      var mx = event.pageX - position.left;
      var my = event.pageY - position.top;

      var leftSided = mx < position.width/4;
      if(leftSided){
        this.dropOrientation = "left";
        position.width /=2;
        this.ghost.show(position);
        return;
      }
      var rightSided = mx > position.width-position.width/4;
      if(rightSided){
        this.dropOrientation = "right";
        position.width /=2;
        position.left += position.width;
        this.ghost.show(position);
        return;
      }
      var topSided = my < position.height/4;
      if(topSided){
        this.dropOrientation = "top";
        position.height /=2;
        this.ghost.show(position);
        return;
      }
      var botSided = my > position.height-position.height/4;
      if(botSided){
        this.dropOrientation = "bottom";
        position.height /=2;
        position.top += position.height;
        this.ghost.show(position);
        return;
      }
      this.ghost.show(position);
    } else if($target.is('.dock-col')){
      position = $target.offset();
      position.width = $target.width();
      position.height = $target.height();
      this.ghost.show(position);

    } else return;
  }

});
DockArea.IDX = [];
DockArea.unregister = function(panel){
  DockArea.IDX[panel.index] = false;
  var $row = panel.$element.closest('.dock-row');
  panel.$element.remove();
  if(!$row.find('.dock-panel').length){
    //Remove the empty row...
    $row.remove();
  }
};
DockArea.register = function(panel){
  panel.index = DockArea.IDX.length;
  DockArea.IDX.push(panel);

};

DockArea.options = {
  bootstrap : 3,
  v4 : {
    panel : "card",
    title : "card-header",
    body : "card-block",
    right : "float-right",
    btnXs : "btn-sm",
    btnDefault : "btn-secondary"

  },
  v3 : {
    panel : "panel panel-default",
    title : "panel-heading",
    body : "panel-body",
    right : "pull-right",
    btnXs : "btn-xs",
    btnDefault : "btn-default"

  }
};




DockPanel = Class.extend(DockingElement, {
  include :  [EventListener],
  initialize : function(options){
    DockArea.register(this);
    this.id = "panel-"+this.index;
    var self = this;
    this.options = $.extend({}, options);
    this.$element = $('<div class="dock-panel"/>').data('panel', this);
    var css = DockArea.options.bootstrap == 4 ? DockArea.options.v4 : DockArea.options.v3;
    this.$element.addClass(css.panel);
    var $heading = $('<div draggable="true"/>')
      .addClass(css.title)
      .appendTo(this.$element)
      .on('dragstart', function(e){
        e.originalEvent.dataTransfer.setData("dockpanel", self.id);
      });
    this.$body = $('<div/>')
      .addClass(css.body)
      .appendTo(this.$element);
    this.$title = $('<span/>').appendTo($heading);
    var $buttonGroup = $('<span/>')
      .addClass(css.right)
      .appendTo($heading);
    this.$minimize = $('<button class="dock-minimize btn" title="Minimize">'+
      '<i class="fa fa-window-minimize" aria-hidden="true"></i></button>')
      .addClass(css.btnXs+" "+css.btnDefault)
      .appendTo($buttonGroup);/*
    this.$maximize = $('<button class="dock-maximize btn" title="Maximize">'+
      '<i class="fa fa-window-maximize" aria-hidden="true"></i></button>')
      .addClass(css.btnXs+" "+css.btnDefault)
      .appendTo($buttonGroup);*/
    this.$close =  $('<button class="dock-close btn" title="Remove">'+
    '<i class="fa fa-times" aria-hidden="true"></i></button>')
      .addClass(css.btnXs+" "+css.btnDefault)
      .appendTo($buttonGroup);
    this.$element.click(function(e){
      var $target = $(e.target);
      if($target.is('.dock-minimize')){
        if(self.options.onClose) self.options.onMinimize();
        self.$body.toggle();
        self.fireEvent.call(self, "Minimize", self);
        return false;
      }
      if($target.is('.dock-close')){
        self.remove.call(self);
        return false;
      }
    });
  }, remove : function(){
    if(this.options.onClose) {
      var result = this.options.onClose();
      if(result === false) return false;
    }
    this.fireEvent.call(this, "Close", this);
    DockArea.unregister(this);
  }

});

DockPanelCreator = Class.extend({
  initialize : function($element, options){
    this.$source = $element;
    this.options = $.extend({
      create : function(){
        return new DockPanel();
      },
      destroy : function(){

      }
    }, options);
    var self = this;
    this.$source.attr('draggable', 'true')
    .on('dragstart', function(e){
      var panel = self.panel = self.options.create();
      if(self.callback) panel.addListener(self);
      e.originalEvent.dataTransfer.setData("dockpanel", panel.id);
    });
  }, onMove : function(dockpanel){
    if(dockpanel == this.panel){
      dockpanel.removeListener(this);
      if(this.options.destroy) this.options.destroy.call(dockpanel);
    }
  }
});
