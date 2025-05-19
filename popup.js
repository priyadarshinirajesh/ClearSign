document.addEventListener("DOMContentLoaded", () => {
  const togglePanelBtn = document.getElementById("togglePanel");
  const autoShowCheckbox = document.getElementById("autoShow");
  const panelSizeSelect = document.getElementById("panelSize");
  const panelPositionSelect = document.getElementById("panelPosition");

  chrome.storage.sync.get(["autoShow", "panelSize", "panelPosition"], (data) => {
    autoShowCheckbox.checked = data.autoShow !== false;
    panelSizeSelect.value = data.panelSize || "medium";
    panelPositionSelect.value = data.panelPosition || "right";
  });

  togglePanelBtn.addEventListener("click", () => {
    console.log("Toggle Panel button clicked, sending message to content script...");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        console.error("No active tab found");
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: "togglePanel" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message to content script:", chrome.runtime.lastError);
        } else {
          console.log("Received response from content script:", response);
          togglePanelBtn.textContent = response.status === "Panel visible" ? "Hide Panel" : "Show Panel";
        }
      });
    });
  });

  autoShowCheckbox.addEventListener("change", () => {
    chrome.storage.sync.set({ autoShow: autoShowCheckbox.checked });
  });

  panelSizeSelect.addEventListener("change", () => {
    chrome.storage.sync.set({ panelSize: panelSizeSelect.value }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "updatePanel" });
      });
    });
  });

  panelPositionSelect.addEventListener("change", () => {
    chrome.storage.sync.set({ panelPosition: panelPositionSelect.value }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "updatePanel" });
      });
    });
  });
});