import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const SYSTEM_BEHAVIOR = "You are Core LLM, an independent expert. Be direct, clear, and optimistic.";
const USER_LABEL = "You";

// Initialize UI Structure
document.getElementById('core-app-root').innerHTML = `
    <div id="app-root">
        <div id="sidebar">
            <button class="new-chat-btn" id="new-chat-trigger">+ New Chat</button>
            <div class="sidebar-header">Saved Chats</div>
            <div id="chat-list"></div>
        </div>
        <main>
            <div id="chat-container"></div>
            <footer>
                <div class="input-pill">
                    <input type="text" id="user-input" placeholder="Ask something..." disabled>
                    <button id="send-btn" disabled>Send</button>
                </div>
            </footer>
        </main>
    </div>
`;

const chatContainer = document.getElementById("chat-container");
const input = document.getElementById("user-input");
const btn = document.getElementById("send-btn");
const chatListEl = document.getElementById("chat-list");

let engine = new webllm.MLCEngine();
let currentChatId = null;
let allChats = JSON.parse(localStorage.getItem('core_llm_chats')) || [];

function saveToStorage() {
    localStorage.setItem('core_llm_chats', JSON.stringify(allChats));
    renderSidebar();
}

function renderSidebar() {
    chatListEl.innerHTML = '';
    allChats.forEach((chat) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-item-wrapper';
        const div = document.createElement('div');
        div.className = `chat-item ${currentChatId === chat.id ? 'active' : ''}`;
        div.innerText = chat.title || "New Thread";
        div.onclick = () => loadChat(chat.id);
        wrapper.appendChild(div);
        chatListEl.appendChild(wrapper);
    });
}

function loadChat(id) {
    currentChatId = id;
    const chat = allChats.find(c => c.id === id);
    chatContainer.innerHTML = '';
    chat.messages.forEach(m => {
        if(m.role !== 'system') appendMessage(m.content, m.role === 'user' ? 'user' : 'ai');
    });
    renderSidebar();
}

function startNewChat() {
    const newId = Date.now();
    const newChat = { id: newId, title: "New conversation", messages: [{ role: "system", content: SYSTEM_BEHAVIOR }] };
    allChats.unshift(newChat);
    currentChatId = newId;
    saveToStorage();
    loadChat(newId);
    appendMessage("Core LLM is ready. What's on your mind?", 'ai');
}

async function init() {
    try {
        await engine.reload("gemma-2b-it-q4f32_1-MLC");
        input.disabled = false;
        btn.disabled = false;
        if (allChats.length > 0) loadChat(allChats[0].id);
        else startNewChat();
    } catch (e) { console.error("WebGPU Init Failed", e); }
}

function appendMessage(text, className) {
    const row = document.createElement("div");
    row.className = `message-row ${className}`;
    const label = (className === 'user') ? USER_LABEL : 'C';
    row.innerHTML = `<div class="avatar">${label}</div><div style="flex:1;">${text}</div>`;
    chatContainer.appendChild(row);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return row;
}

btn.onclick = async () => {
    const text = input.value.trim();
    if (!text) return;
    const chat = allChats.find(c => c.id === currentChatId);
    appendMessage(text, 'user');
    chat.messages.push({ role: "user", content: text });
    input.value = "";
    const aiRow = appendMessage("...", 'ai');
    const chunks = await engine.chat.completions.create({ messages: chat.messages, stream: true });
    let reply = "";
    for await (const chunk of chunks) {
        reply += chunk.choices[0]?.delta?.content || "";
        aiRow.lastChild.innerText = reply;
    }
    chat.messages.push({ role: "assistant", content: reply });
    saveToStorage();
};

document.getElementById("new-chat-trigger").onclick = startNewChat;
init();
renderSidebar();
