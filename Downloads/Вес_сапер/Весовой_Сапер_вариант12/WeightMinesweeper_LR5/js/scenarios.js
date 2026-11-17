export function createScenarios(widget) {
  return {
    scanCurrent() { widget.performScan(); },
    revealAll() { 
      widget.revealAll = true; 
      widget.setMessage('Сценарий revealAll: поле полностью показано.'); 
      widget.render(); 
    },
    togglePause() { 
      widget.paused = !widget.paused; 
      widget.setMessage(widget.paused ? 'Игра приостановлена.' : 'Игра продолжена.'); 
      widget.updateStatus(); 
      widget.render(); 
    },
    restart() { widget.restart(); }
  };
}