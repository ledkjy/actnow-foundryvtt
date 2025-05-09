Hooks.once("init", () => {
  game.settings.register("act-now", "simultaneity", {
    name: "Allow Multiple Modals",
    hint: "If enabled, more than one 'Act Now' request can be active at once.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("act-now", "cooldown", {
    name: "Cooldown Between Requests (seconds)",
    hint: "Minimum time between 'Act Now' requests per player.",
    scope: "client",
    config: true,
    type: Number,
    default: 30
  });
});

Hooks.on("ready", () => {
  game.socket.on("module.act-now", handleSocket);
});

Hooks.on("renderChatLog", (log, html, data) => {
  if (!game.user.isGM) {
    const button = $(`<button class="act-now-button">Act Now!</button>`);
    button.on("click", () => sendActNowRequest());
    html.append(button);
  }
});

let lastClickTime = 0;

function sendActNowRequest() {
  const cooldown = game.settings.get("act-now", "cooldown");
  const now = Date.now();
  if (now - lastClickTime < cooldown * 1000) {
    ui.notifications.warn(`You must wait ${cooldown} seconds between requests.`);
    return;
  }
  lastClickTime = now;

  const payload = {
    user: game.user.name,
    timestamp: now,
    id: randomID()
  };

  const allowMultiple = game.settings.get("act-now", "simultaneity");
  if (!allowMultiple && window.actNowModalOpen) {
    ui.notifications.warn("An 'Act Now' request is already active.");
    return;
  }

  game.socket.emit("module.act-now", { type: "show", payload });
  ChatMessage.create({
    content: `<strong>${game.user.name}</strong> wants to act now!`,
    whisper: []
  });
}

function handleSocket(data) {
  if (data.type === "show") {
    const { user, id } = data.payload;
    if (window.actNowModalOpen && !game.settings.get("act-now", "simultaneity")) return;

    window.actNowModalOpen = true;
    const content = `<p><strong>${user}</strong> wants to act now!</p>`;
    const buttons = game.user.isGM ? {
      close: {
        label: "Dismiss",
        callback: () => {
          game.socket.emit("module.act-now", { type: "close", payload: { id } });
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
    ui.windows.forEach(w => {
      if (w instanceof Dialog && w.options.title === "Act Now!") w.close();
    });
    window.actNowModalOpen = false;
  }
}
