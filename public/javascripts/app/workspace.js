// Main controller for the journalist workspace. Orchestrates subviews.
dc.controllers.Workspace = Backbone.Controller.extend({

  routes : {
    'help/:page': 'help',
    'help':       'help'
  },

  // Initializes the workspace, binding it to <body>.
  initialize : function() {
    this.createSubViews();
    this.renderSubViews();
    dc.app.searcher = new dc.controllers.Searcher();
    if (!Backbone.history.start()) {
      dc.app.searcher.loadDefault({showHelp: true});
    }
  },

  help : function(page) {
    this.help.openPage(page);
  },

  // Create all of the requisite subviews.
  createSubViews : function() {
    dc.app.paginator  = new dc.ui.Paginator();
    dc.app.navigation = new dc.ui.Navigation();
    dc.app.toolbar    = new dc.ui.Toolbar();
    dc.app.organizer  = new dc.ui.Organizer();
    dc.ui.notifier    = new dc.ui.Notifier();
    dc.ui.tooltip     = new dc.ui.Tooltip();
    dc.app.searchBox  = VS.init(this.searchOptions());
    this.sidebar      = new dc.ui.Sidebar();
    this.panel        = new dc.ui.Panel();
    this.documentList = new dc.ui.DocumentList();
    this.entityList   = new dc.ui.EntityList();

    if (!dc.account) return;

    dc.app.uploader   = new dc.ui.UploadDialog();
    dc.app.accounts   = new dc.ui.AccountDialog();
    this.accountBadge = new dc.ui.AccountView({model : Accounts.current(), kind : 'badge'});
  },

  // Render all of the existing subviews and place them in the DOM.
  renderSubViews : function() {
    var content   = $('#content');
    content.append(this.sidebar.render().el);
    content.append(this.panel.render().el);
    dc.app.navigation.render();
    dc.app.hotkeys.initialize();
    this.help = new dc.ui.Help({el : $('#help')[0]}).render();
    this.panel.add('search_box', dc.app.searchBox.render().el);
    this.panel.add('pagination', dc.app.paginator.el);
    this.panel.add('search_toolbar', dc.app.toolbar.render().el);
    this.panel.add('document_list', this.documentList.render().el);
    this.sidebar.add('entities', this.entityList.render().el);
    $('#no_results_container').html(JST['workspace/no_results']({}));
    this.sidebar.add('organizer', dc.app.organizer.render().el);

    if (!dc.account) return;

    this.sidebar.add('account_badge', this.accountBadge.render().el);
  },

  searchOptions : function() {
    return {
      unquotable : [
        'text',
        'account',
        'document',
        'filter',
        'group',
        'access',
        'related',
        'projectid'
      ],
      callbacks : {
        search : function(query) {
          if (!dc.app.searcher.flags.outstandingSearch) {
            dc.ui.spinner.show();
            dc.app.paginator.hide();
            _.defer(dc.app.toolbar.checkFloat);
            dc.app.searcher.search(query);
          }
          return false;
        },
        focus : function() {
          Documents.deselectAll();
        },
        facetMatches : function(category) {
          switch (category) {
            case 'account':
              return Accounts.map(function(a) { return {value: a.get('slug'), label: a.fullName()}; });
            case 'project':
              return Projects.pluck('title');
            case 'filter':
              return ['published', 'annotated'];
            case 'access':
              return ['public', 'private', 'organization'];
            case 'title':
              return _.uniq(Documents.pluck('title'));
            case 'source':
              return _.uniq(_.compact(Documents.pluck('source')));
            case 'group':
              return Organizations.map(function(o) { return {value: o.get('slug'), label: o.get('name') }; });
            case 'document':
              return Documents.map(function(d){ return {value: d.canonicalId(), label: d.get('title')}; });
            default:
              // Meta data
              return _.compact(_.uniq(Documents.reduce(function(memo, doc) {
                if (_.size(doc.get('data'))) memo.push(doc.get('data')[category]);
                return memo;
              }, [])));
          }
        },
        categoryMatches : function() {
          var prefixes = [
            { label: 'project',       category: '' },
            { label: 'text',          category: '' },
            { label: 'title',         category: '' },
            { label: 'description',   category: '' },
            { label: 'source',        category: '' },
            { label: 'account',       category: '' },
            { label: 'document',      category: '' },
            { label: 'filter',        category: '' },
            { label: 'group',         category: '' },
            { label: 'access',        category: '' },
            { label: 'related',       category: '' },
            { label: 'projectid',     category: '' },
            // Entities
            { label: 'city',          category: '' },
            { label: 'country',       category: '' },
            { label: 'term',          category: '' },
            { label: 'state',         category: '' },
            { label: 'person',        category: '' },
            { label: 'place',         category: '' },
            { label: 'organization',  category: '' },
            { label: 'email',         category: '' },
            { label: 'phone',         category: '' }
          ];
          var metadata = _.map(_.keys(Documents.reduce(function(memo, doc) {
            if (_.size(doc.get('data'))) _.extend(memo, doc.get('data'));
            return memo;
          }, {})), function(key) {
            return {label: key, category: ''};
          });
          return prefixes.concat(metadata);
        }
      }
    };
  }

});
