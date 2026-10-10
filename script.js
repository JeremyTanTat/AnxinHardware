(() => {
const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector("#primary-nav");

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation" : "Close navigation");
  primaryNav.classList.toggle("is-open", !isExpanded);
});

primaryNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    primaryNav.classList.remove("is-open");
  }
});

document.querySelector("#year").textContent = new Date().getFullYear();

if (document.querySelector(".chatbot")) return;

const productKnowledge = window.ANXIN_PRODUCT_KNOWLEDGE;

if (!Array.isArray(productKnowledge)) {
  console.error("Anxin Customer Service Chatbot could not load its product knowledge.");
} else {
  const chatbot = document.createElement("section");
  chatbot.className = "chatbot";
  chatbot.setAttribute("aria-label", "Anxin Customer Service Chatbot");
  chatbot.innerHTML = `
    <button class="chatbot-launcher" type="button" aria-label="Open Anxin Customer Service Chatbot" aria-expanded="false" aria-controls="chatbot-panel">
      <span class="chatbot-launcher-icon" aria-hidden="true">✳</span>
      <span class="chatbot-launcher-label">Ask us</span>
    </button>
    <section class="chatbot-panel" id="chatbot-panel" aria-labelledby="chatbot-title" hidden>
      <header class="chatbot-header">
        <span class="chatbot-avatar" aria-hidden="true">A</span>
        <span class="chatbot-heading"><strong id="chatbot-title">Anxin Customer Service Chatbot</strong><small>Product information · Online assistant</small></span>
        <button class="chatbot-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div class="chatbot-disclaimer">Answers are based on available product sources. Prices and availability may change; please confirm with our team.</div>
      <div class="chatbot-messages" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Chat messages"></div>
      <form class="chatbot-form">
        <label class="sr-only" for="chatbot-input">Ask about Emax, Kinghawk or Kärcher products</label>
        <input id="chatbot-input" name="message" type="text" maxlength="500" placeholder="Ask about a product…" autocomplete="off" required>
        <button type="submit" aria-label="Send message">Send <span aria-hidden="true">→</span></button>
      </form>
      <p class="chatbot-contact">Need help choosing? <a href="contact.html">Contact our team</a>.</p>
    </section>`;

  document.body.append(chatbot);

  const launcher = chatbot.querySelector(".chatbot-launcher");
  const panel = chatbot.querySelector(".chatbot-panel");
  const closeButton = chatbot.querySelector(".chatbot-close");
  const messageList = chatbot.querySelector(".chatbot-messages");
  const form = chatbot.querySelector(".chatbot-form");
  const input = chatbot.querySelector("#chatbot-input");
  const suggestions = [
    "What Emax tools are available?",
    "Tell me about Kinghawk diamond tools",
    "What Kärcher products are there?"
  ];

  function appendMessage(role, text, source) {
    const message = document.createElement("article");
    message.className = `chatbot-message chatbot-message-${role}`;
    const messageText = document.createElement("p");
    messageText.textContent = text;
    message.append(messageText);

    if (source) {
      const sourceLink = document.createElement("a");
      sourceLink.className = "chatbot-source";
      sourceLink.href = source.url;
      sourceLink.textContent = `Source: ${source.label}`;
      if (/^https?:\/\//i.test(source.url) || /\.pdf(?:$|[?#])/i.test(source.url)) {
        sourceLink.target = "_blank";
        sourceLink.rel = "noreferrer";
      }
      message.append(sourceLink);
    }

    messageList.append(message);
    messageList.scrollTop = messageList.scrollHeight;
  }

  function addWelcome() {
    appendMessage("assistant", "Hi! I can help you explore Emax, Kinghawk and Kärcher professional products. Ask about a product, what it is for, how to use it, or pricing.");
    const suggestionList = document.createElement("div");
    suggestionList.className = "chatbot-suggestions";
    suggestions.forEach((suggestion) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chatbot-suggestion";
      button.textContent = suggestion;
      button.addEventListener("click", () => handleQuestion(suggestion));
      suggestionList.append(button);
    });
    messageList.append(suggestionList);
  }

  function normalize(text) {
    return text.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function findProducts(query) {
    const normalizedQuery = normalize(query);
    const stopWords = ["the", "and", "for", "what", "how", "can", "does", "use", "price", "pricing", "cost", "tell", "about", "have", "much", "are", "with", "from", "there", "available", "product", "products", "tool", "tools", "range", "list", "show", "all", "brand", "professional", "you", "your", "does", "this", "that"];
    const brand = ["emax", "kinghawk", "kaercher", "karcher"].find((name) => normalizedQuery.includes(name));
    const terms = normalizedQuery.split(/\s+/).filter((term) => term.length > 2 && term !== brand && !stopWords.includes(term));

    if (brand && !terms.length) {
      const overview = productKnowledge.find((product) => product.overview && normalize(product.brand) === brand);
      if (overview) return [overview];
    }

    const rankedMatches = productKnowledge.map((product) => {
      const searchable = normalize(`${product.name} ${product.brand} ${product.aliases.join(" ")} ${product.description} ${product.use}`);
      let score = terms.reduce((total, term) => total + (searchable.includes(term) ? (product.name.toLowerCase().includes(term) ? 3 : 1) : 0), 0);
      if (brand && normalize(product.brand).includes(brand)) score += 5;
      if (normalizedQuery.includes(normalize(product.name))) score += 6;
      return { product, score };
    }).filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);
    const bestScore = rankedMatches[0]?.score || 0;
    const likelySpecificMatch = bestScore >= 12;
    return rankedMatches.filter((match) => !likelySpecificMatch || match.score >= bestScore - 4)
      .slice(0, 3)
      .map((match) => match.product);
  }

  function handleQuestion(question) {
    const query = question.trim();
    if (!query) return;
    appendMessage("user", query);
    input.value = "";

    const normalizedQuery = normalize(query);
    const isPriceQuestion = /\b(price|pricing|cost|how much|quote)\b/.test(normalizedQuery);
    const isUseQuestion = /\b(use|using|operate|operation|instructions|how to|work)\b/.test(normalizedQuery);
    const requestedModels = query.match(/\b[a-z]{1,5}[- ]?\d{2,}(?:\/\d+)?\b/gi) || [];
    const matchingModelProducts = productKnowledge.filter((product) => requestedModels.some((model) => normalize(`${product.name} ${product.aliases.join(" ")}`).includes(normalize(model))));
    const matches = requestedModels.length ? matchingModelProducts : findProducts(query);

    if (requestedModels.length && !matchingModelProducts.length) {
      const isKaercher = /\b(kaercher|karcher)\b/.test(normalizedQuery);
      appendMessage("assistant", "I couldn't confirm that exact model in the product information available here. Contact our team to confirm current details, availability and price.", isKaercher
        ? { label: "Kärcher Singapore Professional directory", url: "https://www.kaercher.com/sg/professional.html" }
        : { label: "Contact Anxin Hardware", url: "contact.html" });
      return;
    }

    if (!matches.length) {
      appendMessage("assistant", "I couldn't find a reliable match in the product information available here. Try a brand or product name (Emax, Kinghawk or Kärcher), or contact our team for help.", {
        label: "Contact Anxin Hardware",
        url: "contact.html"
      });
      return;
    }

    matches.forEach((product) => {
      let answer = `${product.name} — ${product.description}`;
      if (isPriceQuestion) {
        answer += product.price
          ? ` Listed price: ${product.price}. Please confirm the current price with our team.`
          : " I don't have a verified price for this product here. Contact our team for a current quote.";
      }
      if (isUseQuestion) {
        answer += ` ${product.use}`;
      }
      appendMessage("assistant", answer, { label: product.source, url: product.url });
    });
  }

  function openChat() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    if (!messageList.children.length) addWelcome();
    input.focus();
  }

  function closeChat() {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", () => {
    if (panel.hidden) openChat();
    else closeChat();
  });
  closeButton.addEventListener("click", closeChat);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleQuestion(input.value);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeChat();
  });
  addWelcome();
}
})();
