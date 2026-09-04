const state=JSON.parse(localStorage.getItem('footlyMvp')||'{}');
const match=state.match||JSON.parse(localStorage.getItem('footlyMatch')||'null');
if(!match)location.replace('add-match.html');
