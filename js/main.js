/* globals CodeMirror, d3 */
// 1. IMPORT MERMAID HERE (Fixes ReferenceError)
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

import { parseMermaidGraph } from './parser.js';
import { getSequenceBFS, getSequenceDFS, getSequenceLinear } from './algorithms.js';
import * as UI from './ui.js';

// 2. Initialize Mermaid
mermaid.initialize({ startOnLoad: false });

// 3. CodeMirror Setup
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
    Root((Root)) --> A[Branch A]
    Root --> B[Branch B]
    A --> A1[Leaf A1]
    A --> A2[Leaf A2]
    B --> B1[Leaf B1]
    B --> B2[Leaf B2]`,
    mode: "mermaid", theme: "dracula", lineNumbers: true
});

// --- GLOBAL STATE ---
let previousIDs = new Set();
let timer;
let simulationTimeout;
let isPlaying = false;
let currentSpeed = 800;
let globalSequence = [];
let globalIndex = 0;

// --- DOM ELEMENTS ---
const container = document.getElementById('mermaid-container');
const styleSelect = document.getElementById('line-style');
const playBtn = document.getElementById('play-btn');
const stepDisplay = document.getElementById('step-counter');

// --- EVENT LISTENERS ---
document.getElementById('speed-slider').addEventListener('input', (e) => currentSpeed = parseInt(e.target.value));
editor.on("change", () => { clearTimeout(timer); timer = setTimeout(renderDiagram, 800); });

// --- EXPOSE FUNCTIONS TO WINDOW (Fixes onclick errors) ---
window.togglePanel = (id) => {
    const panel = document.getElementById(`${id}-panel`);
    const btn = document.querySelector(`.toggle-btn[onclick="togglePanel('${id}')"]`);
    if (panel.classList.contains('visible')) { panel.classList.remove('visible'); btn.classList.remove('active'); }
    else { panel.classList.add('visible'); btn.classList.add('active'); }
};

// Connect UI functions to Window
window.zoomAction = UI.zoomAction;
window.resetZoom = UI.resetZoom;
window.updateLineStyle = () => renderDiagram();

// --- CORE LOGIC ---
const renderDiagram = async () => {
    fullStop();
    let code = editor.getValue();
    const curveStyle = styleSelect ? styleSelect.value : 'basis';
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

    container.innerHTML = `<pre class="mermaid">${fullCode}</pre>`;
    try {
        await mermaid.run({ nodes: container.querySelectorAll('.mermaid') });
        UI.highlightNodes(newNodes, oldNodes);
        UI.enableZoom(); 
    } catch (err) { console.log("Mermaid Syntax Error (Waiting...)", err); }
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
            if (globalIndex + i < globalSequence.length) {
                UI.highlightActiveNode(globalSequence[globalIndex + i].id);
            }
        }
    }
    stepDisplay.innerText = `${Math.min(globalIndex + 1, globalSequence.length)}/${globalSequence.length}`;
}

// --- CONTROLS EXPOSED TO WINDOW ---
window.togglePlay = () => {
    if (isPlaying) { 
        isPlaying = false; clearTimeout(simulationTimeout); playBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; 
    } else { 
        if (globalSequence.length === 0) generateSequence(); 
        if (globalIndex >= globalSequence.length) globalIndex = 0; 
        isPlaying = true; playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; autoStep(); 
    }
};

window.manualStep = (dir) => {
    if (isPlaying) window.togglePlay(); 
    if (globalSequence.length === 0) generateSequence();
    let newIndex = globalIndex + dir; 
    if (newIndex < 0) newIndex = 0; 
    if (newIndex > globalSequence.length - 1) newIndex = globalSequence.length - 1;
    globalIndex = newIndex; 
    drawCurrentStep();
};

window.fullStop = () => {
    isPlaying = false; clearTimeout(simulationTimeout); playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    globalIndex = 0; globalSequence = []; stepDisplay.innerText = "0/0";
    document.getElementById('ds-struct-content').innerHTML = "<span style='color:#666; font-size:12px;'>(Empty)</span>"; 
    document.getElementById('ds-visited-content').innerHTML = "";
    document.getElementById('log-content').innerHTML = '<div class="log-item">Ready...</div>';
    d3.selectAll('.node rect, .node circle, .node polygon, .node path').style('fill', '#e0e0e0').style('stroke', '#333').style('stroke-width', '1px');
};

window.resetSimulation = () => window.fullStop();

function autoStep() {
    if (!isPlaying) return; 
    if (globalIndex >= globalSequence.length) { window.togglePlay(); return; }
    drawCurrentStep(); 
    globalIndex++; 
    simulationTimeout = setTimeout(autoStep, currentSpeed);
}

// Initial Run
setTimeout(renderDiagram, 500);