let currentPopup = null;

Hooks.once('init', () => {
  console.log("ActNow | Initializing module");
});

Hooks.once('ready', () => {
  console.log("ActNow | Ready");

  // Set up socket listener
  game.socket.on('module.actnow-foundryvtt', async (data) => {
    if (data.type === "requestActNow") {
      showActNowPopup(data.user);
    } else if (data.type === "closeActNow") {
      closeActNowPopup();
    }
  });
});

Hooks.on('renderChatLog', (app, html, data) => {
  // Prevent double injection
  if (html.find('.act-now-button').length) return;

  const button = $(`
    <button class="act-now-button" title="Request to Act Now">
      <i class="fas fa-bullhorn"></i>
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

  // Add button to the chat controls area
  const controls = html.closest(".app").find(".chat-controls .control-buttons");
  controls.append(button);
});

function showActNowPopup(username) {
  // Prevent duplicate dialogs
  if (currentPopup) return;

  const content = `
    <div class="act-now-popup">
      <h2>${username} wants to act now!</h2>
      ${game.user.isGM ? '<button class="close-popup-button">Close</button>' : ''}
    </div>
  `;

  const dialog = new Dialog({
    title: "Act Now",
    content,
    buttons: {},
    render: (html) => {
      if (game.user.isGM) {
        html.find(".close-popup-button").on("click", () => {
          game.socket.emit('module.actnow-foundryvtt', { type: "closeActNow" });
          closeActNowPopup();
        });

        // Listen for Enter key to close
        html.closest(".app").on("keydown", (e) => {
          if (e.key === "Enter") {
            game.socket.emit('module.actnow-foundryvtt', { type: "closeActNow" });
            closeActNowPopup();
          }
        });
      }
    },
    close: () => {
      currentPopup = null;
    }
  });

  currentPopup = dialog;
  dialog.render(true);
}

function closeActNowPopup() {
  if (currentPopup) {
    currentPopup.close();
    currentPopup = null;
  }
}
