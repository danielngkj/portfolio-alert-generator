(function () {
  "use strict";

  const template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host { color: var(--chat-text); display: block; font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; max-width: 44rem; }
      :host([hide-header]) header { display: none; }
      * { box-sizing: border-box; }
      .shell { background: var(--chat-background); border: 0; border-radius: 1rem; box-shadow: none; overflow: hidden; }
      header { align-items: center; background: var(--chat-accent); color: #fff; display: flex; gap: 1rem; justify-content: space-between; padding: 1rem 1.25rem; }
      h2 { font: 700 1.05rem/1.3 "Manrope", sans-serif; margin: 0; }
      header p { font-size: .82rem; margin: .25rem 0 0; opacity: .9; }
      .new-chat { background: transparent; border: 1px solid rgb(255 255 255 / 55%); font-size: .78rem; padding: .45rem .65rem; white-space: nowrap; }
      .new-chat:hover { background: rgb(255 255 255 / 15%); }
      .messages { display: flex; flex-direction: column; gap: .9rem; max-height: 28rem; min-height: 15rem; overflow-y: auto; padding: 1.25rem; }
      .welcome-panel { background: transparent; border: 0; border-radius: .85rem; margin-bottom: .1rem; padding: .75rem .25rem 1.1rem; }
      .welcome-panel strong { color: var(--chat-text); display: block; font: 800 clamp(1.1rem, 2.6vw, 1.55rem)/1.05 "Manrope", sans-serif; letter-spacing: -.045em; margin-bottom: .7rem; }
      .welcome-panel p { color: var(--chat-muted); font-size: .82rem; line-height: 1.45; margin: 0 0 .8rem; }
      .suggestions { display: flex; flex-wrap: wrap; gap: .45rem; }
      .suggestion { background: var(--chat-background); border: 1px solid var(--chat-border); color: var(--chat-text); font-size: .78rem; font-weight: 600; padding: .5rem .65rem; text-align: left; }
      .suggestion:hover { background: var(--chat-accent); color: #fff; }
      .message { display: grid; gap: .5rem; max-width: 92%; }
      .message.user { align-self: end; }
      .message.assistant { align-self: start; }
      .bubble { background: var(--chat-surface); border-radius: .85rem; line-height: 1.5; padding: .8rem 1rem; }
      .bubble p { margin: 0 0 .75rem; }
      .bubble p:last-child { margin-bottom: 0; }
      .bubble ul, .bubble ol { margin: .35rem 0 .75rem 1.25rem; padding: 0; }
      .bubble li + li { margin-top: .25rem; }
      .bubble h3 { font-size: 1rem; margin: 0 0 .5rem; }
      .bubble code { background: rgb(0 0 0 / 7%); border-radius: .25rem; font-family: ui-monospace, SFMono-Regular, monospace; font-size: .88em; padding: .1rem .3rem; }
      .bubble pre { background: rgb(0 0 0 / 7%); border-radius: .45rem; overflow-x: auto; padding: .7rem; white-space: pre; }
      .bubble pre code { background: transparent; padding: 0; }
      .bubble a { color: var(--chat-accent-strong); }
      .citation { color: var(--chat-muted); font-size: .7em; font-weight: 650; opacity: .85; white-space: nowrap; }
      .user .bubble { background: var(--chat-accent); color: #fff; }
      .error .bubble { color: var(--chat-error); }
      .sources { display: grid; gap: .4rem; }
      .sources > p { color: var(--chat-muted); font-size: .78rem; margin: 0; }
      details { border: 1px solid var(--chat-border); border-radius: .65rem; font-size: .8rem; padding: .55rem .7rem; }
      summary { cursor: pointer; font-weight: 650; }
      .metadata { color: var(--chat-muted); margin: .55rem 0; }
      .document { line-height: 1.45; margin: 0; white-space: pre-wrap; }
      form { border-top: 1px solid var(--chat-border); display: flex; gap: .6rem; padding: 1rem 1rem .55rem; }
      label { flex: 1; }
      .visually-hidden { clip: rect(0 0 0 0); clip-path: inset(50%); height: 1px; overflow: hidden; position: absolute; white-space: nowrap; width: 1px; }
      input { background: var(--chat-background); border: 1px solid var(--chat-border); border-radius: .65rem; color: var(--chat-text); font: inherit; min-width: 0; padding: .72rem .8rem; width: 100%; }
      input:focus-visible, button:focus-visible, summary:focus-visible { outline: 3px solid var(--chat-accent); outline-offset: 2px; }
      button { background: var(--chat-accent); border: 0; border-radius: .65rem; color: #fff; cursor: pointer; font: inherit; font-weight: 700; padding: .72rem 1rem; }
      button:hover { background: var(--chat-accent-strong); }
      button:disabled { cursor: wait; opacity: .65; }
      .send-button { font-size: 1.2rem; line-height: 1; min-width: 2.75rem; padding-left: .7rem; padding-right: .7rem; }
      .status { color: var(--chat-muted); font-size: .75rem; min-height: 1.1rem; padding: 0 1rem .75rem; }
      @media (max-width: 32rem) { .shell { border-radius: .75rem; } .messages { max-height: 26rem; padding: 1rem; } form { align-items: stretch; flex-direction: column; } }
    </style>
    <section class="shell" aria-label="Documentation chat">
      <header><div><h2></h2><p>Answers are grounded in the available alert documentation.</p></div><button class="new-chat" type="button">New chat</button></header>
      <div class="messages" aria-live="polite" aria-label="Chat messages" role="log" aria-busy="false"></div>
      <form><label><span class="visually-hidden">Ask a documentation question</span><input maxlength="2000" required /></label><button class="send-button" type="submit" aria-label="Send question">↑</button></form>
      <div class="status" role="status"></div>
    </section>`;

  class DocumentationChat extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: "open" });
      root.append(template.content.cloneNode(true));
      this.messages = root.querySelector(".messages");
      this.form = root.querySelector("form");
      this.input = root.querySelector("input");
      this.button = root.querySelector("form button");
      this.newChatButton = root.querySelector(".new-chat");
      this.status = root.querySelector(".status");
      this.welcomeText = this.getAttribute("welcome") || "Ask a question and I’ll answer from the available documentation.";
      this.newChatButton.addEventListener("click", () => this.reset());
      root.querySelector("h2").textContent = this.getAttribute("title") || "Documentation assistant";
      this.input.placeholder = this.getAttribute("placeholder") || "Ask about an alert or symptom…";
      this.form.addEventListener("submit", (event) => this.submit(event));
      this.showWelcome();
    }

    get apiUrl() { return this.getAttribute("api-url") || "/api/chat"; }

    addMessage(role, text, options = {}) {
      const message = document.createElement("article");
      message.className = `message ${role}${options.error ? " error" : ""}`;
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerHTML = this.renderMarkdown(text);
      message.append(bubble);
      if (options.sources?.length) message.append(this.renderSources("Sources used", options.sources));
      if (options.possibleSources?.length) message.append(this.renderSources("Possible sources—not used as evidence", options.possibleSources));
      this.messages.append(message);
      this.messages.scrollTop = this.messages.scrollHeight;
    }

    renderMarkdown(markdown) {
      const escape = (value) => value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
      }[character]));
      const inline = (value) => value
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\[Alert ([^\]]+)\]/g, '<sup class="citation" aria-label="Source Alert $1">[$1]</sup>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/__([^_]+)__/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/_([^_]+)_/g, "<em>$1</em>");
      const lines = escape(String(markdown || "")).split("\n");
      const output = [];
      let listType = "";
      let inCode = false;
      for (const line of lines) {
        if (line.trim().startsWith("```")) {
          if (inCode) output.push("</code></pre>");
          else output.push("<pre><code>");
          inCode = !inCode;
          continue;
        }
        if (inCode) { output.push(`${line}\n`); continue; }
        const unordered = line.match(/^\s*[-*]\s+(.+)$/);
        const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
        if (unordered || ordered) {
          const nextType = unordered ? "ul" : "ol";
          if (listType !== nextType) { if (listType) output.push(`</${listType}>`); output.push(`<${nextType}>`); listType = nextType; }
          output.push(`<li>${inline(unordered ? unordered[1] : ordered[1])}</li>`);
          continue;
        }
        if (listType) { output.push(`</${listType}>`); listType = ""; }
        if (!line.trim()) continue;
        const heading = line.match(/^#{1,3}\s+(.+)$/);
        output.push(heading ? `<h3>${inline(heading[1])}</h3>` : `<p>${inline(line)}</p>`);
      }
      if (listType) output.push(`</${listType}>`);
      if (inCode) output.push("</code></pre>");
      return output.join("");
    }

    showWelcome() {
      const panel = document.createElement("section");
      panel.className = "welcome-panel";
      const heading = document.createElement("strong");
      heading.textContent = "What can I help you with?";
      const copy = document.createElement("p");
      copy.textContent = this.welcomeText;
      const list = document.createElement("div");
      list.className = "suggestions";
      panel.append(heading, copy, list);
      const suggestions = [
        "Which alerts need the most urgent attention?",
        "How do operator, service, and technician responses differ?",
        "What kinds of problems can affect coffee machine service?",
      ];
      for (const suggestion of suggestions) {
        const button = document.createElement("button");
        button.className = "suggestion";
        button.type = "button";
        button.textContent = suggestion;
        button.addEventListener("click", () => {
          this.input.value = suggestion;
          this.input.focus();
        });
        list.append(button);
      }
      this.messages.append(panel);
    }

    reset() {
      if (this.button.disabled) return;
      this.messages.replaceChildren();
      this.status.textContent = "";
      this.showWelcome();
      this.input.value = "";
      this.input.focus();
    }

    renderSources(label, sources) {
      const container = document.createElement("section");
      container.className = "sources";
      const heading = document.createElement("p");
      heading.textContent = label;
      container.append(heading);
      for (const source of sources) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        const metadata = source.metadata || {};
        summary.textContent = `${metadata.alert_id ? `Alert ${metadata.alert_id}` : source.id || "Source"}: ${metadata.title || "Untitled"}`;
        const facts = document.createElement("p");
        facts.className = "metadata";
        facts.textContent = [metadata.version, metadata.system_area, Number.isFinite(source.distance) ? `Distance ${source.distance.toFixed(4)}` : ""].filter(Boolean).join(" · ");
        const documentText = document.createElement("p");
        documentText.className = "document";
        documentText.textContent = source.document || "";
        details.append(summary, facts, documentText);
        container.append(details);
      }
      return container;
    }

    async submit(event) {
      event.preventDefault();
      const question = this.input.value.trim();
      if (!question || this.button.disabled) return;
      this.messages.querySelector(".welcome-panel")?.remove();
      this.addMessage("user", question);
      this.input.value = "";
      this.button.disabled = true;
      this.input.disabled = true;
      this.messages.setAttribute("aria-busy", "true");
      this.status.textContent = "Searching documentation…";
      let requestId = "";
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ contract_version: "1", question }),
          cache: "no-store",
          signal: controller.signal,
        });
        requestId = response.headers.get("X-Request-ID") || "";
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error?.message || "The chat request could not be completed.");
        this.addMessage("assistant", body.answer, { sources: body.sources, possibleSources: body.possible_sources });
        this.status.textContent = requestId ? `Request ID: ${requestId}` : "";
      } catch (error) {
        const message = error?.name === "AbortError" ? "The chat request timed out. Please try again." : error instanceof Error ? error.message : "The chat service is unavailable.";
        this.addMessage("assistant", `${message}${requestId ? ` Request ID: ${requestId}` : ""}`, { error: true });
        this.status.textContent = "";
      } finally {
        window.clearTimeout(timeout);
        this.messages.setAttribute("aria-busy", "false");
        this.button.disabled = false;
        this.input.disabled = false;
        this.input.focus();
      }
    }
  }

  if (!customElements.get("documentation-chat")) customElements.define("documentation-chat", DocumentationChat);
})();
