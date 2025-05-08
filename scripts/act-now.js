Hooks.once('init', () => {
    console.log("ActNow | Initializing module");
  });
  
  Hooks.once('ready', () => {
    console.log("ActNow | Ready");
  });
  
  Hooks.on('renderChatLog', (app, html, data) => {
    // Prevent double injection
    if (html.find('.act-now-button').length) return;
  
    const button = $(`
      <button class="act-now-button">
        <i class="fas fa-bullhorn"></i> Act Now
      </button>
    `);
  
    button.on('click', async () => {
      const actorName = game.user.name;
      game.socket.emit('module.actnow-foundryvtt', {
        type: "requestActNow",
        user: actorName,
        userId: game.user.id
      });
    });
  
    html.append(button);
  });
  