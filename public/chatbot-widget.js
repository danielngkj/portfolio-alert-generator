(function () {
  "use strict";

  const template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host { color: var(--chat-text); display: block; font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; max-width: 44rem; }
      * { box-sizing: border-box; }
      .shell { background: var(--chat-background); border: 1px solid var(--chat-border); border-radius: 1rem; box-shadow: 0 1rem 2.5rem rgb(36 35 33 / 10%); overflow: hidden; }
      header { background: var(--chat-accent); color: #fff; padding: 1rem 1.25rem; }
      h2 { font: 700 1.05rem/1.3 "Manrope", sans-serif; margin: 0; }
      header p { font-size: .82rem; margin: .25rem 0 0; opacity: .9; }
      .messages { display: flex; flex-direction: column; gap: .9rem; max-height: 28rem; min-height: 15rem; overflow-y: auto; padding: 1.25rem; }
      .message { display: grid; gap: .5rem; max-width: 92%; }
      .message.user { align-self: end; }
      .message.assistant { align-self: start; }
      .bubble { background: var(--chat-surface); border-radius: .85rem; line-height: 1.5; padding: .8rem 1rem; white-space: pre-wrap; }
      .user .bubble { background: var(--chat-accent); color: #fff; }
      .error .bubble { color: var(--chat-error); }
      .sources { display: grid; gap: .4rem; }
      .sources > p { color: var(--chat-muted); font-size: .78rem; margin: 0; }
      details { border: 1px solid var(--chat-border); border-radius: .65rem; font-size: .8rem; padding: .55rem .7rem; }
      summary { cursor: pointer; font-weight: 650; }
      .metadata { color: var(--chat-muted); margin: .55rem 0; }
      .document { line-height: 1.45; margin: 0; white-space: pre-wrap; }
      form { border-top: 1px solid var(--chat-border); display: flex; gap: .6rem; padding: 1rem; }
      label { flex: 1; }
      .visually-hidden { clip: rect(0 0 0 0); clip-path: inset(50%); height: 1px; overflow: hidden; position: absolute; white-space: nowrap; width: 1px; }
      input { background: var(--chat-background); border: 1px solid var(--chat-border); border-radius: .65rem; color: var(--chat-text); font: inherit; min-width: 0; padding: .72rem .8rem; width: 100%; }
      input:focus-visible, button:focus-visible, summary:focus-visible { outline: 3px solid var(--chat-accent); outline-offset: 2px; }
      button { background: var(--chat-accent); border: 0; border-radius: .65rem; color: #fff; cursor: pointer; font: inherit; font-weight: 700; padding: .72rem 1rem; }
      button:hover { background: var(--chat-accent-strong); }
      button:disabled { cursor: wait; opacity: .65; }
      .status { color: var(--chat-muted); font-size: .75rem; min-height: 1.1rem; padding: 0 1rem .75rem; }
      @media (max-width: 32rem) { .shell { border-radius: .75rem; } .messages { max-height: 26rem; padding: 1rem; } form { align-items: stretch; flex-direction: column; } }
    </style>
    <section class="shell" aria-label="Documentation chat">
      <header><h2></h2><p>Answers are grounded in the available alert documentation.</p></header>
      <div class="messages" aria-live="polite" aria-label="Chat messages" role="log" aria-busy="false"></div>
      <form><label><span class="visually-hidden">Ask a documentation question</span><input maxlength="2000" required /></label><button type="submit">Ask</button></form>
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
      this.button = root.querySelector("button");
      this.status = root.querySelector(".status");
      root.querySelector("h2").textContent = this.getAttribute("title") || "Documentation assistant";
      this.input.placeholder = this.getAttribute("placeholder") || "Ask about an alert or symptom…";
      this.form.addEventListener("submit", (event) => this.submit(event));
      this.addMessage("assistant", this.getAttribute("welcome") || "Ask a question and I’ll answer from the available documentation.");
    }

    get apiUrl() { return this.getAttribute("api-url") || "/api/chat"; }

    addMessage(role, text, options = {}) {
      const message = document.createElement("article");
      message.className = `message ${role}${options.error ? " error" : ""}`;
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = text;
      message.append(bubble);
      if (options.sources?.length) message.append(this.renderSources("Sources used", options.sources));
      if (options.possibleSources?.length) message.append(this.renderSources("Possible sources—not used as evidence", options.possibleSources));
      this.messages.append(message);
      this.messages.scrollTop = this.messages.scrollHeight;
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
