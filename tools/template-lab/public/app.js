const selectEl = document.getElementById("template-select");
const statusEl = document.getElementById("status");
const frameEl = document.getElementById("preview-frame");

const MCP_SERVER_URL = "http://127.0.0.1:3001/mcp";

let templates = [];

function initMcpCopy() {
  const urlEl = document.getElementById("mcp-server-url");
  const btn = document.getElementById("mcp-server-copy");
  if (!urlEl || !btn) return;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(MCP_SERVER_URL);
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = "Copy";
        btn.classList.remove("copied");
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

function templateLabel(template) {
  if (!template.hasDist) return `${template.name} (build required)`;
  if (!template.hasResponse) return `${template.name} (default mock)`;
  return template.name;
}

async function fetchTemplates() {
  const res = await fetch("/api/templates");
  if (!res.ok) throw new Error(`Failed to load templates (${res.status})`);
  const data = await res.json();
  return data.templates || [];
}

async function fetchMockPayload(templateName) {
  const res = await fetch(`/api/mock/template?name=${encodeURIComponent(templateName)}`);
  if (!res.ok) throw new Error(`Failed to load mock payload (${res.status})`);
  return res.json();
}

async function prepareTemplate(templateName) {
  const res = await fetch(`/api/template/prepare?name=${encodeURIComponent(templateName)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Failed to prepare template (${res.status})`);
  }
  return data;
}

function postToFrame(payload) {
  if (!frameEl.contentWindow) return;
  frameEl.contentWindow.postMessage(payload, "*");
}

async function sendInitialEvents(templateName) {
  const { payload, source } = await fetchMockPayload(templateName);

  postToFrame({
    jsonrpc: "2.0",
    method: "ui/notifications/host-context-changed",
    params: {
      theme: "light",
      displayMode: "inline",
    },
  });

  postToFrame({
    jsonrpc: "2.0",
    method: "ui/notifications/tool-result",
    params: {
      structuredContent: payload,
      content: [{ type: "text", text: "MCP Apps Playground mock event" }],
    },
  });

  return source;
}

const REPO_TEMPLATES = "https://github.com/apigene/mcp-apps/tree/main/templates";

function renderOptions() {
  selectEl.innerHTML = "";

  templates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.name;
    option.textContent = templateLabel(template);
    selectEl.append(option);
  });

  const firstBuilt = templates.find((template) => template.hasDist);
  if (firstBuilt) {
    selectEl.value = firstBuilt.name;
  } else if (templates[0]) {
    selectEl.value = templates[0].name;
  }
  updateSourceLink();
}

function updateSourceLink() {
  const link = document.getElementById("source-link");
  if (!link) return;
  const selected = templates.find((t) => t.name === selectEl.value);
  link.href = selected ? `${REPO_TEMPLATES}/${encodeURIComponent(selected.name)}` : REPO_TEMPLATES;
  link.textContent = selected ? `Open source: templates/${selected.name}/ →` : "View all templates on GitHub →";
}

async function loadSelectedTemplate() {
  const selected = templates.find((template) => template.name === selectEl.value);
  if (!selected) return;

  setStatus(`Selected: ${selected.name}\nPreparing template...`);

  const prepareResult = await prepareTemplate(selected.name);
  selected.hasDist = true;

  if (prepareResult.built) {
    const method = prepareResult.installed ? "install + build" : "build";
    setStatus(`Selected: ${selected.name}\nPrepared via ${method}\nLoading preview...`);
  } else {
    setStatus(`Selected: ${selected.name}\nAlready built\nLoading preview...`);
  }
  frameEl.src = `/template/${selected.distPath.replace(/^\//, "")}`;
}

frameEl.addEventListener("load", async () => {
  const selected = templates.find((template) => template.name === selectEl.value);
  if (!selected) return;

  try {
    const source = await sendInitialEvents(selected.name);
    setStatus(
      `Selected: ${selected.name}\nStatus: preview loaded + mock events sent\nMock source: ${source}`,
    );
  } catch (error) {
    console.error(error);
    setStatus(`Selected: ${selected.name}\nStatus: preview loaded, mock payload failed`);
  }
});

selectEl.addEventListener("change", () => {
  updateSourceLink();
  loadSelectedTemplate().catch((error) => {
    console.error(error);
    setStatus(`Error: ${error.message}`);
  });
});

initMcpCopy();

async function init() {
  try {
    templates = await fetchTemplates();

    if (!templates.length) {
      setStatus("No template directories found in repository root.");
      return;
    }

    renderOptions();
    await loadSelectedTemplate();
  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error.message}`);
  }
}

init();
