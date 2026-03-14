(function(){
  const designSystem = {
    version: 'phase1-phase2',
    tokens: {
      brand: getComputedStyle(document.documentElement).getPropertyValue('--cws-color-brand').trim(),
      radius: getComputedStyle(document.documentElement).getPropertyValue('--cws-radius-md').trim(),
      touchTarget: getComputedStyle(document.documentElement).getPropertyValue('--cws-touch-target').trim()
    },
    classes: {
      page: 'cws-page',
      toolbar: 'cws-toolbar',
      toolbarGroup: 'cws-toolbar-group',
      card: 'cws-card',
      cardPad: 'cws-card-pad',
      button: 'cws-btn',
      buttonPrimary: 'cws-btn cws-btn-primary',
      input: 'cws-input'
    }
  };
  window.CWSDesignSystem = designSystem;
})();
