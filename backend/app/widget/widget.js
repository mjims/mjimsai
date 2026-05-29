/**
 * MILA Open — Embeddable Chat Widget
 * 
 * Usage:
 *   <script
 *     src="https://your-api.com/widget.js"
 *     data-api-url="https://your-api.com"
 *     data-api-key="your-org-api-key"
 *     data-agent="your-agent-slug"
 *     defer></script>
 */
(function () {
  "use strict";

  // --- Configuration ---
  const scriptTag = document.currentScript;
  const API_URL = (scriptTag && scriptTag.getAttribute("data-api-url")) || "";
  const API_KEY = (scriptTag && scriptTag.getAttribute("data-api-key")) || "";
  const AGENT_SLUG = (scriptTag && scriptTag.getAttribute("data-agent")) || "default";

  if (!API_URL || !API_KEY) {
    console.error("[MILA Widget] data-api-url and data-api-key are required.");
    return;
  }

  // --- Visitor ID (persistent per browser) ---
  function getVisitorId() {
    let id = localStorage.getItem("mila_visitor_id");
    if (!id) {
      id = "v_" + crypto.randomUUID();
      localStorage.setItem("mila_visitor_id", id);
    }
    return id;
  }

  // --- State ---
  let conversationId = sessionStorage.getItem("mila_conv_" + AGENT_SLUG) || null;
  let agentConfig = null;
  let isOpen = false;
  let isLoading = false;
  let messages = [];

  // --- Fetch Agent Config ---
  async function fetchAgentConfig() {
    try {
      const res = await fetch(`${API_URL}/api/v1/chat/agent/${AGENT_SLUG}/config`, {
        headers: { "X-API-Key": API_KEY },
      });
      if (!res.ok) throw new Error("Agent not found");
      agentConfig = await res.json();
      applyConfig();
    } catch (e) {
      console.error("[MILA Widget] Failed to load agent config:", e);
      agentConfig = {
        name: "Assistant",
        welcome_message: "Bonjour ! Comment puis-je vous aider ?",
        widget_config: {
          primary_color: "#6366f1",
          text_color: "#ffffff",
          position: "bottom-right",
          border_radius: 16,
        },
      };
      applyConfig();
    }
  }

  // --- Build DOM ---
  function createWidget() {
    const container = document.createElement("div");
    container.id = "mila-widget-container";
    container.innerHTML = `
      <div id="mila-bubble" role="button" aria-label="Ouvrir le chat" tabindex="0">
        <svg id="mila-bubble-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <svg id="mila-bubble-close" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
      <div id="mila-chat" style="display:none;">
        <div id="mila-chat-header">
          <div id="mila-chat-header-info">
            <div id="mila-chat-avatar">🤖</div>
            <div>
              <div id="mila-chat-name">Assistant</div>
              <div id="mila-chat-status">En ligne</div>
            </div>
          </div>
          <button id="mila-chat-close" aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div id="mila-chat-messages"></div>
        <div id="mila-chat-input-area">
          <textarea id="mila-chat-input" placeholder="Écrivez votre message..." rows="1"></textarea>
          <button id="mila-chat-send" aria-label="Envoyer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // --- Event Listeners ---
    document.getElementById("mila-bubble").addEventListener("click", toggleChat);
    document.getElementById("mila-chat-close").addEventListener("click", toggleChat);
    document.getElementById("mila-chat-send").addEventListener("click", sendMessage);
    
    const input = document.getElementById("mila-chat-input");
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    input.addEventListener("input", autoResize);
  }

  function applyConfig() {
    if (!agentConfig) return;
    const wc = agentConfig.widget_config || {};
    const primary = wc.primary_color || "#6366f1";
    const textColor = wc.text_color || "#ffffff";
    const radius = wc.border_radius || 16;
    const position = wc.position || "bottom-right";

    const root = document.getElementById("mila-widget-container");
    if (!root) return;
    root.style.setProperty("--mila-primary", primary);
    root.style.setProperty("--mila-text", textColor);
    root.style.setProperty("--mila-radius", radius + "px");

    // Position
    const bubble = document.getElementById("mila-bubble");
    const chat = document.getElementById("mila-chat");
    if (position === "bottom-left") {
      bubble.style.right = "auto";
      bubble.style.left = "24px";
      chat.style.right = "auto";
      chat.style.left = "24px";
    }

    // Agent name
    const nameEl = document.getElementById("mila-chat-name");
    if (nameEl) nameEl.textContent = agentConfig.name || "Assistant";

    // Show welcome message
    if (messages.length === 0 && agentConfig.welcome_message) {
      addMessage("assistant", agentConfig.welcome_message);
    }
  }

  // --- Inject Styles ---
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #mila-widget-container {
        --mila-primary: #6366f1;
        --mila-text: #ffffff;
        --mila-radius: 16px;
        --mila-shadow: 0 8px 32px rgba(0,0,0,0.15);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        position: fixed;
        z-index: 2147483647;
        bottom: 0;
        right: 0;
      }
      #mila-bubble {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--mila-primary);
        color: var(--mila-text);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: var(--mila-shadow);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s;
        border: none;
        outline: none;
      }
      #mila-bubble:hover {
        transform: scale(1.1);
        box-shadow: 0 12px 40px rgba(0,0,0,0.2);
      }
      #mila-chat {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 400px;
        max-width: calc(100vw - 48px);
        height: 560px;
        max-height: calc(100vh - 140px);
        background: #ffffff;
        border-radius: var(--mila-radius);
        box-shadow: var(--mila-shadow);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: mila-slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes mila-slide-up {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      #mila-chat-header {
        background: var(--mila-primary);
        color: var(--mila-text);
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      #mila-chat-header-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      #mila-chat-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }
      #mila-chat-name {
        font-weight: 600;
        font-size: 15px;
      }
      #mila-chat-status {
        font-size: 12px;
        opacity: 0.85;
      }
      #mila-chat-close {
        background: none;
        border: none;
        color: var(--mila-text);
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        transition: background 0.2s;
      }
      #mila-chat-close:hover {
        background: rgba(255,255,255,0.15);
      }
      #mila-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #f8f9fc;
      }
      #mila-chat-messages::-webkit-scrollbar { width: 6px; }
      #mila-chat-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
      .mila-msg {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 14px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
        animation: mila-fade-in 0.25s ease;
      }
      @keyframes mila-fade-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .mila-msg-user {
        align-self: flex-end;
        background: var(--mila-primary);
        color: var(--mila-text);
        border-bottom-right-radius: 4px;
      }
      .mila-msg-assistant {
        align-self: flex-start;
        background: #ffffff;
        color: #1f2937;
        border: 1px solid #e5e7eb;
        border-bottom-left-radius: 4px;
      }
      .mila-typing {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        align-self: flex-start;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        border-bottom-left-radius: 4px;
      }
      .mila-typing span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #9ca3af;
        animation: mila-bounce 1.4s infinite ease-in-out;
      }
      .mila-typing span:nth-child(1) { animation-delay: -0.32s; }
      .mila-typing span:nth-child(2) { animation-delay: -0.16s; }
      @keyframes mila-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      #mila-chat-input-area {
        display: flex;
        align-items: flex-end;
        padding: 12px 16px;
        border-top: 1px solid #e5e7eb;
        background: #ffffff;
        gap: 8px;
        flex-shrink: 0;
      }
      #mila-chat-input {
        flex: 1;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 14px;
        font-family: inherit;
        resize: none;
        outline: none;
        max-height: 120px;
        line-height: 1.4;
        transition: border-color 0.2s;
      }
      #mila-chat-input:focus {
        border-color: var(--mila-primary);
      }
      #mila-chat-send {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--mila-primary);
        color: var(--mila-text);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: transform 0.2s, opacity 0.2s;
      }
      #mila-chat-send:hover { transform: scale(1.08); }
      #mila-chat-send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      @media (max-width: 480px) {
        #mila-chat {
          width: calc(100vw - 16px);
          height: calc(100vh - 80px);
          bottom: 8px;
          right: 8px;
          border-radius: 12px;
          max-height: none;
        }
        #mila-bubble { bottom: 16px; right: 16px; width: 54px; height: 54px; }
      }
    `;
    document.head.appendChild(style);
  }

  // --- Actions ---
  function toggleChat() {
    isOpen = !isOpen;
    const chat = document.getElementById("mila-chat");
    const iconOpen = document.getElementById("mila-bubble-icon");
    const iconClose = document.getElementById("mila-bubble-close");
    
    chat.style.display = isOpen ? "flex" : "none";
    iconOpen.style.display = isOpen ? "none" : "block";
    iconClose.style.display = isOpen ? "block" : "none";

    if (isOpen) {
      scrollToBottom();
      document.getElementById("mila-chat-input").focus();
    }
  }

  function addMessage(role, content) {
    messages.push({ role, content });
    const container = document.getElementById("mila-chat-messages");
    const div = document.createElement("div");
    div.className = `mila-msg mila-msg-${role}`;
    div.textContent = content;
    container.appendChild(div);
    scrollToBottom();
    return div;
  }

  function showTyping() {
    const container = document.getElementById("mila-chat-messages");
    const div = document.createElement("div");
    div.className = "mila-typing";
    div.id = "mila-typing-indicator";
    div.innerHTML = "<span></span><span></span><span></span>";
    container.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById("mila-typing-indicator");
    if (el) el.remove();
  }

  function scrollToBottom() {
    const container = document.getElementById("mila-chat-messages");
    if (container) container.scrollTop = container.scrollHeight;
  }

  function autoResize() {
    const input = document.getElementById("mila-chat-input");
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  }

  async function sendMessage() {
    const input = document.getElementById("mila-chat-input");
    const text = input.value.trim();
    if (!text || isLoading) return;

    input.value = "";
    input.style.height = "auto";
    addMessage("user", text);

    isLoading = true;
    document.getElementById("mila-chat-send").disabled = true;
    showTyping();

    try {
      const res = await fetch(`${API_URL}/api/v1/chat/agent/${AGENT_SLUG}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          visitor_id: getVisitorId(),
          metadata: {
            page_url: window.location.href,
            referrer: document.referrer,
          },
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      hideTyping();
      const msgDiv = addMessage("assistant", "");
      msgDiv.textContent = "";

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "meta" && data.conversation_id) {
              conversationId = data.conversation_id;
              sessionStorage.setItem("mila_conv_" + AGENT_SLUG, conversationId);
            } else if (data.type === "chunk") {
              fullText += data.content;
              msgDiv.textContent = fullText;
              scrollToBottom();
            } else if (data.type === "error") {
              msgDiv.textContent = "Désolé, une erreur est survenue. Veuillez réessayer.";
            }
          } catch (e) { /* skip malformed JSON */ }
        }
      }

      // Update the stored message content
      if (messages.length > 0) {
        messages[messages.length - 1].content = fullText;
      }
    } catch (e) {
      hideTyping();
      console.error("[MILA Widget] Error:", e);
      addMessage("assistant", "Désolé, je ne peux pas répondre pour le moment. Veuillez réessayer.");
    } finally {
      isLoading = false;
      document.getElementById("mila-chat-send").disabled = false;
    }
  }

  // --- Init ---
  function init() {
    injectStyles();
    createWidget();
    fetchAgentConfig();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
