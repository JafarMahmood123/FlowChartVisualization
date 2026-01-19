export function cleanID(raw) {
    if(!raw) return null;
    const match = raw.trim().match(/^([\w-]+)/);
    const id = match ? match[1] : null;
    if (id && ['graph', 'TD', 'LR', 'subgraph', 'end', 'style', 'classDef'].includes(id)) return null;
    return id;
}

export function parseMermaidGraph(text) {
    const adj = {}; 
    const allIDs = new Set(); 
    const lines = text.split('\n');
    
    lines.forEach(line => {
        const parts = line.split(/\s*(?:-->|-.->|==>|--.*?>)\s*/);
        if (parts.length >= 2) {
            for (let i = 0; i < parts.length - 1; i++) {
                const u = cleanID(parts[i]); 
                const v = cleanID(parts[i+1]);
                if (u && v) {
                    allIDs.add(u); allIDs.add(v);
                    if (!adj[u]) adj[u] = []; 
                    if (!adj[u].includes(v)) adj[u].push(v);
                }
            }
        } else { 
            const single = cleanID(parts[0]); 
            if (single) allIDs.add(single); 
        }
    });
    
    allIDs.forEach(id => { if (!adj[id]) adj[id] = []; });
    const startNode = [...allIDs][0]; 
    return { adj, allIDs, startNode };
}