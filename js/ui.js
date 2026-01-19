/* globals d3 */

export function updateStructUI(step, added, removed) {
    const structTitle = document.getElementById('ds-struct-title');
    const structContent = document.getElementById('ds-struct-content');
    const visitedContent = document.getElementById('ds-visited-content');

    structTitle.innerText = step.structName || "Data Structure";
    structContent.innerHTML = "";
    
    const isStack = step.structName.includes('Stack');
    const displayList = isStack ? [...step.structure].reverse() : step.structure;

    displayList.forEach(item => {
        const el = document.createElement('div');
        el.className = 'struct-node node-normal';
        if (added.includes(item)) el.classList.add('node-enter');
        el.innerText = item;
        structContent.appendChild(el);
    });

    removed.forEach(item => {
        const el = document.createElement('div');
        el.className = 'struct-node node-exit';
        el.innerText = item;
        if(isStack) structContent.prepend(el); else structContent.insertBefore(el, structContent.firstChild);
    });

    if (structContent.children.length === 0) structContent.innerHTML = '<span style="color:#666; font-size:12px;">(Empty)</span>';

    visitedContent.innerHTML = "";
    (step.visited || []).forEach(item => {
        const el = document.createElement('div');
        el.className = 'struct-node node-visited';
        el.innerText = item;
        visitedContent.appendChild(el);
    });
}

export function updateLogUI(globalSequence, globalIndex, added, removed) {
    const logContent = document.getElementById('log-content');
    logContent.innerHTML = "";
    const start = Math.max(0, globalIndex - 8);
    for(let i = start; i <= globalIndex; i++) {
        if(i < globalSequence.length) {
            const step = globalSequence[i];
            let extraMsg = "";
            if(i === globalIndex) {
                if(removed.length > 0) extraMsg += ` <span class="log-remove">(-${removed.join(',')})</span>`;
                if(added.length > 0) extraMsg += ` <span class="log-add">(+${added.join(',')})</span>`;
            }
            const div = document.createElement('div');
            div.className = `log-item ${i === globalIndex ? 'active' : ''}`;
            div.innerHTML = `<span style="color:#888;">${i+1}.</span><span>${step.msg}${extraMsg}</span>`;
            logContent.appendChild(div);
        }
    }
    logContent.scrollTop = logContent.scrollHeight;
}

export function showDeletionCards(ids) {
    const deletionFeed = document.getElementById('deletion-feed');
    ids.forEach(id => {
        const card = document.createElement('div');
        card.className = 'deletion-card';
        card.innerHTML = `<div class="del-info"><i class="fa-solid fa-trash-can del-icon"></i><span class="del-text">${id}</span></div><span class="del-sub">Deleted</span>`;
        deletionFeed.appendChild(card);
        requestAnimationFrame(() => card.classList.add('show'));
        setTimeout(() => { card.style.opacity = '0'; card.style.transform = 'translateY(-20px)'; setTimeout(() => card.remove(), 500); }, 3000);
    });
}

export function animateDeletionsGhost(ids) {
    const svg = d3.select("#d3-canvas");
    const groups = svg.selectAll("g.deleted-node").data(ids, d => d);
    const enter = groups.enter().append("g").attr("class", "deleted-node").attr("transform", (d, i) => `translate(${250}, ${100 - (i * 20)})`);
    enter.append("circle").attr("r", 0).attr("fill", "#ff4d4d").transition().duration(500).attr("r", 15);
    enter.append("text").text(d => d.substring(0,4)).attr("text-anchor", "middle").attr("dy", 4).attr("fill", "white").style("font-size", "9px").style("opacity", 0).transition().duration(500).style("opacity", 1);
    enter.transition().delay(2000).duration(1000).style("opacity", 0).remove();
}

export function highlightNodes(newIds, oldIds) {
    d3.selectAll('.node').each(function() {
        const parts = this.id.split('-');
        const shape = d3.select(this).select('rect, circle, polygon, path');
        if (newIds.some(id => parts.includes(id))) { shape.style('fill', '#4caf50').transition().duration(1500).style('fill', '#ddf7e1'); } 
        else if (oldIds.some(id => parts.includes(id))) { shape.style('fill', '#e0e0e0'); }
    });
}

export function highlightActiveNode(targetId) {
    d3.selectAll('.node').each(function() {
        const parts = this.id.split('-'); 
        if (parts.includes(targetId)) { 
            d3.select(this).select('rect, circle, polygon, path')
              .style('fill', '#ffeb3b').style('stroke', '#ff9800').style('stroke-width', '4px'); 
        }
    });
}

// --- ZOOM LOGIC ---
let zoomBehavior;
let currentTransform = d3.zoomIdentity;

export function enableZoom() {
    const svg = d3.select("#mermaid-container svg");
    svg.attr("width", "100%").attr("height", "100%").style("max-width", "none");
    zoomBehavior = d3.zoom()
        .scaleExtent([0.1, 5])
        .on("zoom", (e) => {
            currentTransform = e.transform;
            svg.select("g").attr("transform", e.transform);
        });
    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, currentTransform);
}

export function zoomAction(factor) {
    const svg = d3.select("#mermaid-container svg");
    if (!svg.empty() && zoomBehavior) zoomBehavior.scaleBy(svg.transition().duration(300), factor);
}

export function resetZoom() {
    const svg = d3.select("#mermaid-container svg");
    if (!svg.empty() && zoomBehavior) { 
        currentTransform = d3.zoomIdentity; 
        zoomBehavior.transform(svg.transition().duration(750), d3.zoomIdentity); 
    }
}