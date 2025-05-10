Hooks.once("init", () => {
  game.settings.register("actnow-foundryvtt", "simultaneity", {
    name: "Allow Multiple Modals",
    hint: "If enabled, more than one 'Act Now' request can be active at once.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("actnow-foundryvtt", "cooldown", {
    name: "Cooldown Between Requests (seconds)",
    hint: "Minimum time between 'Act Now' requests per player.",
    scope: "world",
    config: true,
    type: Number,
    default: 30
  });
});

Hooks.on("ready", () => {
  game.socket.on("module.actnow-foundryvtt", handleSocket);
});

Hooks.on("renderChatLog", (log, html, data) => {
  if (!game.user.isGM && !html.find(".actnow-foundryvtt-button").length) {
    const wrapper = $(`<div class="actnow-wrapper"></div>`);
    const button = $(`<button class="actnow-foundryvtt-button">Act Now!</button>`);
    button.on("click", () => sendActNowRequest());
    wrapper.append(button);
    html.append(wrapper);
  }
});

let lastClickTime = 0;

function sendActNowRequest() {
  console.log("action request sent");
  const cooldown = game.settings.get("actnow-foundryvtt", "cooldown");
  const now = Date.now();
  if (now - lastClickTime < cooldown * 1000) {
    ui.notifications.warn(`You must wait ${cooldown} seconds between requests.`);
    return;
  }
  lastClickTime = now;

  const payload = {
    user: game.user.name,
    timestamp: now,
    id: randomID() // Ensure `randomID()` is defined elsewhere
  };

  const allowMultiple = game.settings.get("actnow-foundryvtt", "simultaneity");
  if (!allowMultiple && window.actNowModalOpen) {
    ui.notifications.warn("An 'Act Now' request is already active.");
    return;
  }

  game.socket.emit("module.actnow-foundryvtt", { type: "show", payload });
  handleSocket({ type: "show", payload });
  ChatMessage.create({
    content: `<strong>${game.user.name}</strong> wants to act now!`,
    whisper: []
  });
}

function handleSocket(data) {
  console.log("Socket data received ", data);
  if (data.type === "show") {
    const { user, id } = data.payload;
    if (window.actNowModalOpen && !game.settings.get("actnow-foundryvtt", "simultaneity")) return;

    window.actNowModalOpen = true;
    const content = `<p><strong>${user}</strong> wants to act now!</p>`;
    const buttons = game.user.isGM ? {
      close: {
        label: "Dismiss",
        callback: () => {
        game.socket.emit("module.actnow-foundryvtt", { type: "close", payload: { id } });
        }
      }
    } : {};

    const dialog = new Dialog({
      title: "Act Now!",
      content,
      buttons,
      default: "close",
      close: () => { window.actNowModalOpen = false; }
    });
    dialog.render(true);
  }

  if (data.type === "close") {
    const actNowModal = Object.values(ui.windows).find(w => w instanceof Dialog && w.options.title === "Act Now!");
    if (actNowModal) actNowModal.close();
    window.actNowModalOpen = false;
  }
};

game.socket.on("module.actnow-foundryvtt", handleSocket);
