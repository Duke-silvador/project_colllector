(()=>{
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('#sign-out');
    if(button&&window.tradeflowSubscriberSignOut){e.preventDefault();e.stopImmediatePropagation();window.tradeflowSubscriberSignOut();}
  },true);
})();