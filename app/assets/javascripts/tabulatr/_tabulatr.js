function Tabulatr(id){
  this.id = id;
  this.name = '';
  this.moreResults = true;
  this.currentData = null;
  this.locked = false;
  this.isAPersistedTable = false;
  this.initialRequest = true;
  this.hasInfiniteScrolling = false;
}

var tabulatr_tables;
Tabulatr.prototype = {
  constructor: Tabulatr,

  createPaginationListItem: function(page, active){
    var $page = $('<li><a href="" data-page="'+ page +'">'+ page +'</a></li>');
    if(active){
      $page.addClass('active');
    }
    return $page;
  },

  updatePagination: function(currentPage, numPages){
    var $paginatorUl = $('.pagination[data-table='+ this.id +'] > ul');

    if($('table#'+ this.id).data('persistent')){
      $paginatorUl.html('<li><a href="#" data-tabulatr-reset="'+ this.id +'"><i class="fa fa-refresh"></i></a></li>');
    }else{
      $paginatorUl.html('');
    }
    if(numPages < 13){
      for(var i = 1; i <= numPages; i++){
        $paginatorUl.append(this.createPaginationListItem(i, (i == currentPage)));
      }
    }else{
      if(currentPage > 1){
        $paginatorUl.append(this.createPaginationListItem(1, false));
      }

      var between = Math.floor((1 + currentPage) / 2);
      if(between > 1 && between < currentPage - 2){
        $paginatorUl.append('<li><span>...</span></li>');
        $paginatorUl.append(this.createPaginationListItem(between, false));
      }

      if(currentPage > 4){
        $paginatorUl.append('<li><span>...</span></li>');
      }

      if(currentPage > 3){
        $paginatorUl.append(this.createPaginationListItem(currentPage-2, false));
      }

      if(currentPage > 2){
        $paginatorUl.append(this.createPaginationListItem(currentPage-1, false));
      }

      $paginatorUl.append(this.createPaginationListItem(currentPage, true));

      if(currentPage < numPages - 1){
        $paginatorUl.append(this.createPaginationListItem(currentPage+1, false));
      }

      if(currentPage < numPages - 2){
        $paginatorUl.append(this.createPaginationListItem(currentPage+2, false));
      }

      if(currentPage < numPages - 3){
        $paginatorUl.append('<li><span>...</span></li>');
      }

      between = Math.floor((currentPage + numPages) / 2);

      if(between > currentPage + 3 && between < numPages - 1){
        $paginatorUl.append(this.createPaginationListItem(between, false));
        $paginatorUl.append('<li><span>...</span></li>');
      }
      if(currentPage < numPages){
        $paginatorUl.append(this.createPaginationListItem(numPages, false));
      }
    }

  },

  updateTable: function(hash, forceReload) {
    var $table = $('#'+ this.id);
    var data;
    if(hash.page !== undefined && !forceReload){
      //old page should be stored
      this.storePage = true;
      // check if this page was already loaded
      $table.find('tbody tr').hide();
      if($table.find('tbody tr[data-page='+ hash.page +']').length > 0){
        $table.find('tbody tr[data-page='+ hash.page +']').show();

        this.updatePagination(hash.page,
          $('.pagination[data-table='+ this.id +'] a:last').data('page'),
          this.id);
        if(this.isAPersistedTable){
          data = this.createParameterString(hash, this.id);
          localStorage[this.id] = JSON.stringify(data);
        }
        return;
      }
    }else{
      this.storePage = false;
    }
    if(this.locked){ return; }
    this.locked = true;
    var curTable = this;
    this.showLoadingSpinner();
    if(this.initialRequest && this.isAPersistedTable && localStorage[this.id]){
      data = JSON.parse(localStorage[this.id]);
    }else{
      data = this.createParameterString(hash, this.id);
      if(this.isAPersistedTable) {
        localStorage[this.id] = JSON.stringify(data);
      }
    }
    $.ajax({
      context: this,
      type: 'GET',
      url: $('table#'+ this.id).data('path'),
      accepts: {
        json: 'application/json'
      },
      data: data,
      success: this.handleResponse,
      complete: this.hideLoadingSpinner,
      error: this.handleError
    });
  },

  checkIfCheckboxesAreMarked: function(){
    return $('tr[data-page] input[type=checkbox]:checked').length > 0;
  },

  currentCount: function(){
    return $('#'+ this.id +' tbody tr.tabulatr-row').length;
  },

  handleResponse: function(response) {
    this.insertTabulatrData(response);
    this.updatePagination(response.meta.page, response.meta.pages, response.meta.table_id);
    if($('.pagination[data-table='+ response.meta.table_id +']').length > 0){
      if(response.meta.page > response.meta.pages){
        this.updateTable({page: response.meta.pages});
      }
    }
  },

  handleError: function(foo, bar){
    if(this.isAPersistedTable && this.initialRequest){
      this.initialRequest = false;
      this.locked = false;
      this.resetTable();
    }
  },

  insertTabulatrData: function(response){
    var tableId = response.meta.table_id;
    var tbody = $('#'+ tableId +' tbody');
    if(!response.meta.append){
      if(this.storePage){
        $('#'+ tableId +' tbody tr').hide();
      }else{
        $('#'+ tableId +' tbody').html('');
      }
    }
    if(response.data.length === 0){
      this.moreResults = false;
      $('.pagination_trigger[data-table='+ tableId +']').unbind('inview');
    }else{
      if(this.currentCount() + response.data.length >= response.meta.count){
        this.moreResults = false;
        $('.pagination_trigger[data-table='+ tableId + ']').unbind('inview');
      }

      // insert the actual data
      for(var i = 0; i < response.data.length; i++){
        var data = response.data[i];
        var id = data.id;
        var tr = $('#'+ tableId +' tr.empty_row').clone();
        tr.removeClass('empty_row');
        if(data._row_config.data){
          tr.data(data._row_config.data);
          delete data._row_config.data;
        }
        tr.attr(data._row_config);
        tr.attr('data-page', response.meta.page);
        tr.attr('data-id', id);
        tr.find('td').each(function(index,element) {
          var td = $(element);
          var coltype = td.data('tabulatr-type');
          var name = td.data('tabulatr-column-name');
          var cont = data[name];
          if(coltype === 'checkbox') {
            cont = $("<input>").attr('type', 'checkbox').val(id).addClass('tabulatr-checkbox');
          }
          td.html(cont);
        });
        tbody.append(tr);
      }
    }
    var count_string = $('.tabulatr_count[data-table='+ tableId +']').data('format-string');
    count_string = count_string.replace(/%\{current\}/, response.meta.count);
    count_string = count_string.replace(/%\{total\}/, response.meta.total);
    count_string = count_string.replace(/%\{per_page\}/,
      response.meta.pagesize);
    $('.tabulatr_count[data-table='+ tableId +']').html(count_string);

    if(this.isAPersistedTable){
      this.retrieveTableFromLocalStorage(response);
    }
  },


  replacer: function(match, attribute, offset, string){
    return this.currentData[attribute];
  },


  makeAction: function(action, data){
    this.currentData = data;
    return unescape(action).replace(/{{([\w:]+)}}/g, this.replacer);
  },

  submitFilterForm: function(){
    if(this.hasInfiniteScrolling){
      $('.pagination_trigger[data-table='+ this.id +']').unbind('inview', cbfn);
      $('.pagination_trigger[data-table='+ this.id +']').bind('inview', cbfn);
    }
    this.updateTable({page: 1, append: false}, true);
    return false;
  },

  createParameterString: function(hash){
    var tableName = this.id.split('_')[0];
    if(hash === undefined){
      hash = {};
      hash.append = false;
    }
    var pagesize = hash.pagesize;
    if(pagesize === undefined){
      pagesize = $('table#'+ this.id).data('pagesize');
    }
    if(hash.page === undefined){
      if(this.hasInfiniteScrolling){
        hash.page = Math.floor($('#'+ this.id +' tbody tr[class!=empty_row]').length/pagesize) + 1;
      }
      if(!isFinite(hash.page)){
        hash.page = 1;
      }
    }
    hash.pagesize = pagesize;
    hash.arguments = $.map($('#'+ this.id +' th'), function(n){
      return $(n).data('tabulatr-column-name');
    }).filter(function(n){return n; }).join();
    hash.table_id = this.id;
    hash[tableName + '_search'] = $('input#'+ this.id +'_fuzzy_search_query').val();
    var form_array = $('.tabulatr_filter_form[data-table="'+ this.id +'"]')
      .find('input:visible,select:visible,input[type=hidden]').serializeArray();
    for(var i = 0; i < form_array.length; i++){
      hash[form_array[i].name] = form_array[i].value;
    }
    return hash;
  },

  localDate: function(value, $td, $tr, obj){
    return new Date(value).toLocaleString();
  },

  showLoadingSpinner: function(){
    $('.tabulatr-spinner-box[data-table="'+ this.id +'"]').show();
  },

  hideLoadingSpinner: function(){
    this.initialRequest = false;
    this.locked = false;
    $('.tabulatr-spinner-box[data-table="'+ this.id +'"]').hide();
  }

};

$(document).on('ready page:load', function(){
  tabulatr_tables = [];

  $('th.tabulatr-sortable').click(function(){
    var th = $(this);
    var sort_by = th.data('tabulatr-column-name');
    var dir = th.attr('data-sorted');
    var table = th.parents('table');
    var tableId = table.attr('id');
    var table_obj;
    for(var i = 0; i < tabulatr_tables.length; i++){
      if(tabulatr_tables[i].id == tableId){
        table_obj = tabulatr_tables[i];
      }
    }
    var tableName = table_obj.id.split('_')[0];
    table.find('th.tabulatr-sortable.sorted').removeClass('sorted').removeAttr('data-sorted');
    dir = (dir === 'asc') ? 'desc' : 'asc';
    th.addClass('sorted').attr('data-sorted', dir);
    $('.tabulatr_filter_form[data-table='+ tableId +'] input[name='+ tableName +'_sort]').val(sort_by + ' '+  dir);
    if(!table_obj.moreResults){
      table_obj.moreResults = true;
      if(table_obj.hasInfiniteScrolling){
        $('.pagination_trigger[data-table='+ tableId +']').bind('inview', cbfn);
      }
    }
    $($(this).parents('table').find('tbody tr')).remove();

    $('.tabulatr_mark_all[data-table='+ tableName +']').prop('checked', false).prop('indeterminate', false);
    table_obj.updateTable({});
  });


  $('.tabulatr_table').each(function(ix, el){
    if($('.pagination[data-table="'+ $(el).attr('id') +'"]').length === 0){
      $('.pagination_trigger[data-table="'+ $(el).attr('id') +'"]').bind('inview', cbfn);
    }
  });

  $('.batch-action-inputs').click(function(){
    var a = $(this);
    var name = a.data('do-batch-action-name');
    var key = a.data('do-batch-action');
    var tableId = a.data('table-id');
    var params = {page: 1};
    params[name] = key;
    params.tabulatr_checked = {checked_ids: jQuery.map($('#'+ tableId +' .tabulatr-checkbox:checked'), function(el){return $(el).val();}).join(',')};
    $('.tabulatr_mark_all[data-table='+ tableId +']').prop('indeterminate', false).prop('checked', false);
    $('#'+ tableId +' .tabulatr-wrench').addClass('disabled');
    var table_obj;
    for(var i = 0; i < tabulatr_tables.length; i++){
      if(tabulatr_tables[i].id == tableId){
        table_obj = tabulatr_tables[i];
      }
    }
    table_obj.updateTable(params, true);
  });

  $('form.tabulatr-fuzzy-search').submit(function(){
    var tableId = $(this).data('table');
    var table_obj;
    for(var i = 0; i < tabulatr_tables.length; i++){
      if(tabulatr_tables[i].id == tableId){
        table_obj = tabulatr_tables[i];
      }
    }
    if(table_obj.hasInfiniteScrolling){
      $('.pagination_trigger[data-table='+ tableId +']').unbind('inview', cbfn);
      $('.pagination_trigger[data-table='+ tableId +']').bind('inview', cbfn);
    }
    table_obj.updateTable({page: 1, append: false}, true);
    return false;
  });

  $('form.tabulatr_filter_form input, form.tabulatr_filter_form select').change(function(){
    $(this).parents('form.tabulatr_filter_form').submit();
  });

  $('form.tabulatr_filter_form').submit(function(){
    var tableId = $(this).data('table');
    var table_obj;
    for(var i = 0; i < tabulatr_tables.length; i++){
      if(tabulatr_tables[i].id == tableId){
        table_obj = tabulatr_tables[i];
      }
    }
    table_obj.submitFilterForm();
    return false;
  });

  $('.tabulatr_mark_all').click(function(){
    var tableId = $(this).parents('table').prop('id');
    var table_obj;
    for(var i = 0; i < tabulatr_tables.length; i++){
      if(tabulatr_tables[i].id == tableId){
        table_obj = tabulatr_tables[i];
      }
    }
    if($(this).is(':checked')){
      $('#'+ tableId +' tr[data-page]:visible input[type=checkbox]').prop('checked', true);
      $('#'+ tableId +' .tabulatr-wrench').removeClass('disabled');
    }else{
      $('#'+ tableId +' tr[data-page]:visible input[type=checkbox]').prop('checked', false);
      if(table_obj.checkIfCheckboxesAreMarked()){
        $('#'+ tableId +' .tabulatr-wrench').removeClass('disabled');
      }else{
        $('#'+ tableId +' .tabulatr-wrench').addClass('disabled');
      }
    }
  });

  $('.tabulatr_table').on('click', 'input.tabulatr-checkbox', function(){
    var $table = $(this).closest('.tabulatr_table');
    var tableId = $table.attr('id');
    var $markAllCheckbox = $table.find('.tabulatr_mark_all');
    var table_obj;
    for(var i = 0; i < tabulatr_tables.length; i++){
      if(tabulatr_tables[i].id == tableId){
        table_obj = tabulatr_tables[i];
      }
    }
    if($(this).is(':checked')){
      if($('#'+ tableId +' tr[data-page]:visible input[type=checkbox]').not(':checked').length > 0){
        $markAllCheckbox.prop("indeterminate", true);
      }else{
        $markAllCheckbox.prop('indeterminate', false);
        $markAllCheckbox.prop('checked', true);
      }
      $('#'+ tableId +' .tabulatr-wrench').removeClass('disabled');
    }else{
      if($('#'+ tableId +' tr[data-page]:visible input[type=checkbox]:checked').length > 0){
        $markAllCheckbox.prop('indeterminate', true);
        $('#'+ tableId +' .tabulatr-wrench').removeClass('disabled');
      }else{
        $markAllCheckbox.prop('indeterminate', false);
        $markAllCheckbox.prop('checked', false);
        if(table_obj.checkIfCheckboxesAreMarked()){
          $('#'+ tableId +' .tabulatr-wrench').removeClass('disabled');
        }else{
          $('#'+ tableId +' .tabulatr-wrench').addClass('disabled');
        }
      }
    }
  });

  $('.tabulatr-per-page a').click(function(){
    if($(this).hasClass('active')){ return false; }
    $(this).closest('div').find('a').removeClass('active');
    $(this).addClass('active');
    var tableId = $(this).closest('div').data('table');
    var table_obj;
    for(var i = 0; i < tabulatr_tables.length; i++){
      if(tabulatr_tables[i].id == tableId){
        table_obj = tabulatr_tables[i];
      }
    }
    table_obj.moreResults = true;
    if(table_obj.hasInfiniteScrolling){
      $('.pagination_trigger[data-table='+ tableId +']').bind('inview', cbfn);
    }
    if(typeof(Storage) !== undefined){
      localStorage.tabulatr_page_display_count = $(this).data('items-per-page');
    }
    table_obj.updateTable({page: 1}, true);
  });

  $(document).on('click', 'a[data-tabulatr-reset]',function(){
    var a = $(this);
    var tableObj, tableName;
    var tableId = a.data('tabulatrReset');
    a.parents('.tabulatr-outer-wrapper').removeClass('filtered')
    for(var i = 0; i < tabulatr_tables.length; i++){
      if(tabulatr_tables[i].id == tableId){
        tableObj = tabulatr_tables[i];
        tableObj.resetTable();
        return false;
      }
    }
  });

  if($('.tabulatr_table:not(".tabulatr_static_table")').length > 0){
    if(typeof(Storage) !== undefined){
      var count = localStorage.tabulatr_page_display_count;
      if(count !== undefined){
        $('.tabulatr-per-page a').removeClass('active');
        $('.tabulatr-per-page a[data-items-per-page='+ count +']').
          addClass('active');
      }
    }
    var tableObj, tableId, tabulatrTable;
    $('.tabulatr_table:not(".tabulatr_static_table")').each(function(ix, el){
      tableId = $(el).attr('id');
      tabulatrTable = new Tabulatr(tableId);
      if($(el).data('persistent')){
        tabulatrTable.isAPersistedTable = true;
      }
      if($('.pagination[data-table='+ tableId +']').length === 0){
        tabulatrTable.hasInfiniteScrolling = true;
      }
      tabulatr_tables.push(tabulatrTable);
      for(var i = 0; i < tabulatr_tables.length; i++){
        if(tabulatr_tables[i].id == tableId){
          tableObj = tabulatr_tables[i];
        }
      }
      tableObj.updateTable({}, false);
    });
  }

  $(document).on('click', 'a[data-show-filters-for]', function(){
    var a = $(this);
    a.parents('.tabulatr-outer-wrapper').addClass('filtered');
  });

});

$(document).on('click', '.pagination a[data-page]', function(){
  var a = $(this);
  if(a.parent().hasClass('active') ||
     a.parent().hasClass('disabled')){
    return false;
  }
  var tableId = $(a).closest('.pagination').data('table');
  $('.tabulatr_mark_all[data-table='+ tableId +']').prop('checked', false);
  $('.tabulatr_mark_all[data-table='+ tableId +']').prop('indeterminate', false);
  var table_obj;
  for(var i = 0; i < tabulatr_tables.length; i++){
    if(tabulatr_tables[i].id == tableId){
      table_obj = tabulatr_tables[i];
    }
  }
  table_obj.updateTable({append: false, page: a.data('page')});
  return false;
});


$(document).on('change', 'select[data-tabulatr-date-filter]', function() {
  var select = $(this);
  var option = select.find('option:selected');
  var val = option.val();
  if (val === 'from_to') {
    select.parents('.tabulatr-filter-row').find(".from_to").show().removeClass('hidden');
  } else {
    select.parents('.tabulatr-filter-row').find(".from_to").hide().val('');
  }
});


var cbfn = function(event, isInView, visiblePartX, visiblePartY) {
  if (isInView) {
    // element is now visible in the viewport
    if (visiblePartY == 'top') {
      // top part of element is visible
    } else if (visiblePartY == 'bottom') {
      // bottom part of element is visible
    } else {
      var tableId = $(event.currentTarget).data('table');
      var table_obj;
      for(var i = 0; i < tabulatr_tables.length; i++){
        if(tabulatr_tables[i].id == tableId){
          table_obj = tabulatr_tables[i];
        }
      }
      table_obj.updateTable({append: true});
    }
  }
};
