import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const SYSTEM_BEHAVIOR = "You are Core LLM, an independent expert. Be direct, clear, and optimistic.";

// UPDATED: Added Logo path fix
const LOGO_URL = "https://raw.githubusercontent.com/thearcadeedition/corellm/main/logo.png";

document.getElementById('core-app-root').innerHTML = `
    <div id="app-root">
        <div id="sidebar">
            <div class="logo-container">
                <img src="${LOGO_URL}" alt="CORE" onerror="this.innerHTML='CORE';">
            </div>
            <button class="new-chat-btn" id="new-chat-trigger">+ New Chat</button>
            <div id="chat-list"></div>
        </div>
        <main>
            <div id="chat-container"></div>
            <footer>
                <div class="input-pill">
                    <input type="text" id="user-input" placeholder="Ask something..." autofocus>
                    <button id="send-btn">Send</button>
                </div>
            </footer>
        </main>
    </div>
`;

const chatContainer = document.getElementById("chat-container");
const input = document.getElementById("user-input");
const btn = document.getElementById("send-btn");

let engine = new webllm.MLCEngine();
let chatHistory = [{ role: "system", content: SYSTEM_BEHAVIOR }];

async function init() {
    try {
        await engine.reload("gemma-2b-it-q4f32_1-MLC");
        appendMessage("Core LLM is ready. What's on your mind?", 'ai');
    } catch (e) {
        appendMessage("WebGPU error. Please use a supported browser.", 'ai');
    }
}

function appendMessage(text, role) {
    const row = document.createElement("div");
    row.className = `message-row ${role === 'user' ? 'user' : 'ai'}`;
    const color = role === 'user' ? '#5436da' : '#10a37f';
    const label = role === 'user' ? 'You' : 'C';
    
    row.innerHTML = `
        <div class="avatar" style="background:${color}">${label}</div>
        <div style="flex:1; line-height:1.5;">${text}</div>
    `;
    chatContainer.appendChild(row);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return row;
}

async function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    
    appendMessage(text, 'user');
    chatHistory.push({ role: "user", content: text });
    input.value = "";

    const aiRow = appendMessage("...", 'ai');
    const chunks = await engine.chat.completions.create({ messages: chatHistory, stream: true });
    
    let reply = "";
    for await (const chunk of chunks) {
        reply += chunk.choices[0]?.delta?.content || "";
        aiRow.querySelector('div:last-child').innerText = reply;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    chatHistory.push({ role: "assistant", content: reply });
}

btn.onclick = handleSend;
input.onkeypress = (e) => { if(e.key === 'Enter') handleSend(); };
document.getElementById("new-chat-trigger").onclick = () => {
    chatContainer.innerHTML = "";
    chatHistory = [{ role: "system", content: SYSTEM_BEHAVIOR }];
    appendMessage("Core LLM is ready. What's on your mind?", 'ai');
};

init();
