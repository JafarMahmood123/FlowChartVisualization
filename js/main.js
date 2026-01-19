/* globals CodeMirror, d3 */
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
import { parseMermaidGraph } from './parser.js';
import { getSequenceBFS, getSequenceDFS, getSequenceLinear } from './algorithms.js';
import * as UI from './ui.js';

mermaid.initialize({ startOnLoad: false });

CodeMirror.defineSimpleMode("mermaid", {
    start: [
        {regex: /graph|TD|LR|subgraph|end/, token: "keyword"},
        {regex: /-->|-\.->|==>|--/, token: "operator"},
        {regex: /\(\(.*\)\)|\[.*\]|\{.*\}|\(.*\)/, token: "string"},
        {regex: /[\w]+/, token: "variable"},
    ]
});

const editor = CodeMirror(document.getElementById("code-editor"), {
    value: `graph TD
    %% --- The Trigger ---
    User((User)) -->|Init Transfer| App[Mobile App]
    App -->|HTTPS Post| API[API Gateway]

    %% --- Security Layer ---
    subgraph Security_Zone
        API --> Auth{Is Token Valid?}
        Auth -- No --> Log1[Log Intrusion]
        Auth -- Yes --> Rate{Rate Limit?}
        Rate -- OK --> FraudScan{AI Fraud Check}
    end`,
    mode: "mermaid", theme: "dracula", lineNumbers: true
});

// State
let previousIDs = new Set();
let timer;
let simulationTimeout;
let isPlaying = false;
let currentSpeed = 800;
let globalSequence = [];
let globalIndex = 0;

// Listeners
document.getElementById('speed-slider').addEventListener('input', (e) => currentSpeed = parseInt(e.target.value));
editor.on("change", () => { clearTimeout(timer); timer = setTimeout(renderDiagram, 800); });

// Attach to Window
window.togglePanel = (id) => {
    const panel = document.getElementById(`${id}-panel`);
    const btn = document.querySelector(`.toggle-btn[onclick="togglePanel('${id}')"]`);
    if (panel.classList.contains('visible')) { panel.classList.remove('visible'); btn.classList.remove('active'); }
    else { panel.classList.add('visible'); btn.classList.add('active'); }
};
window.zoomAction = UI.zoomAction;
window.resetZoom = UI.resetZoom;
window.updateLineStyle = () => renderDiagram();

// Core
const renderDiagram = async () => {
    fullStop();
    let code = editor.getValue();
    
    // FIX: Retrieve style and inject config for corners
    const curveStyle = document.getElementById('line-style').value;
    const fullCode = `%%{init: {'flowchart': {'curve': '${curveStyle}'}}}%%\n` + code;
    
    const { allIDs } = parseMermaidGraph(code);
    const currentIDs = allIDs;
    const newNodes = [...currentIDs].filter(x => !previousIDs.has(x));
    const deletedNodes = [...previousIDs].filter(x => !currentIDs.has(x));
    const oldNodes = [...currentIDs].filter(x => previousIDs.has(x));
    previousIDs = currentIDs;

    if (deletedNodes.length > 0) {
        UI.showDeletionCards(deletedNodes);
        UI.animateDeletionsGhost(deletedNodes);
    }

    document.getElementById('mermaid-container').innerHTML = `<pre class="mermaid">${fullCode}</pre>`;
    try {
        await mermaid.run({ nodes: document.querySelectorAll('.mermaid') });
        UI.highlightNodes(newNodes, oldNodes);
        UI.enableZoom(); 
    } catch (err) { console.log("Waiting..."); }
};

function generateSequence() {
    const mode = document.getElementById('algo-mode').value;
    const code = editor.getValue();
    if (mode === 'bfs') globalSequence = getSequenceBFS(code);
    else if (mode === 'dfs') globalSequence = getSequenceDFS(code);
    else globalSequence = getSequenceLinear(code);
}

function drawCurrentStep() {
    d3.selectAll('.node rect, .node circle, .node polygon, .node path').style('fill', '#e0e0e0').style('stroke', '#333').style('stroke-width', '1px');
    const winSize = parseInt(document.getElementById('window-size').value) || 1;
    
    if(globalIndex < globalSequence.length && globalIndex >= 0) {
        const currentStep = globalSequence[globalIndex];
        const prevStep = globalIndex > 0 ? globalSequence[globalIndex - 1] : { structure: [] };
        
        const currentStruct = currentStep.structure || [];
        const prevStruct = prevStep.structure || [];
        const added = currentStruct.filter(x => !prevStruct.includes(x));
        const removed = prevStruct.filter(x => !currentStruct.includes(x));

        UI.updateLogUI(globalSequence, globalIndex, added, removed);
        UI.updateStructUI(currentStep, added, removed);

        for(let i = 0; i < winSize; i++) {
            if (globalIndex + i < globalSequence.length) UI.highlightActiveNode(globalSequence[globalIndex + i].id);
        }
    }
    document.getElementById('step-counter').innerText = `${Math.min(globalIndex + 1, globalSequence.length)}/${globalSequence.length}`;
}

window.togglePlay = () => {
    if (isPlaying) { isPlaying = false; clearTimeout(simulationTimeout); document.getElementById('play-btn').innerHTML = '<i class="fa-solid fa-play"></i>'; } 
    else { if (globalSequence.length === 0) generateSequence(); if (globalIndex >= globalSequence.length) globalIndex = 0; isPlaying = true; document.getElementById('play-btn').innerHTML = '<i class="fa-solid fa-pause"></i>'; autoStep(); }
};

window.manualStep = (dir) => {
    if (isPlaying) window.togglePlay(); if (globalSequence.length === 0) generateSequence();
    let newIndex = globalIndex + dir; if (newIndex < 0) newIndex = 0; if (newIndex > globalSequence.length - 1) newIndex = globalSequence.length - 1;
    globalIndex = newIndex; drawCurrentStep();
};

window.fullStop = () => {
    isPlaying = false; clearTimeout(simulationTimeout); document.getElementById('play-btn').innerHTML = '<i class="fa-solid fa-play"></i>';
    globalIndex = 0; globalSequence = []; document.getElementById('step-counter').innerText = "0/0";
    document.getElementById('ds-struct-content').innerHTML = "<span style='color:#666; font-size:12px;'>(Empty)</span>"; 
    document.getElementById('ds-visited-content').innerHTML = "";
    document.getElementById('log-content').innerHTML = '<div class="log-item">Ready...</div>';
    d3.selectAll('.node rect, .node circle, .node polygon, .node path').style('fill', '#e0e0e0').style('stroke', '#333').style('stroke-width', '1px');
};

window.resetSimulation = () => window.fullStop();

function autoStep() {
    if (!isPlaying) return; if (globalIndex >= globalSequence.length) { window.togglePlay(); return; }
    drawCurrentStep(); globalIndex++; simulationTimeout = setTimeout(autoStep, currentSpeed);
}

setTimeout(renderDiagram, 500);