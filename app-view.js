const requestedView=new URLSearchParams(location.search).get('view');
if(requestedView)document.querySelector(`[data-view="${requestedView}"]`)?.click();
