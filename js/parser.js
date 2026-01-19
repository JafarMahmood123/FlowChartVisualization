export function cleanID(raw) {
    if(!raw) return null;
    // Match basic ID
    const match = raw.trim().match(/^([\w-]+)/);
    const id = match ? match[1] : null;
    // Filter keywords
    if (id && ['graph', 'TD', 'LR', 'subgraph', 'end', 'style', 'classDef', '%%'].includes(id)) return null;
    return id;
}

export function parseMermaidGraph(text) {
    const adj = {};
    const allIDs = new Set();
    const hasIncoming = new Set(); // Tracks nodes that are destinations
    
    const lines = text.split('\n');

    lines.forEach(line => {
        // Remove comments
        let cleanLine = line.split('%%')[0].trim();
        if (!cleanLine) return;

        // Split by any arrow type
        const parts = cleanLine.split(/\s*(?:-->\|.*?\||--.*?-->|-->|-\.->|==>)\s*/);

        if (parts.length >= 2) {
            for (let i = 0; i < parts.length - 1; i++) {
                const u = cleanID(parts[i]);
                const v = cleanID(parts[i+1]);

                if (u && v) {
                    allIDs.add(u);
                    allIDs.add(v);
                    hasIncoming.add(v); // Mark v as a destination

                    if (!adj[u]) adj[u] = [];
                    if (!adj[u].includes(v)) adj[u].push(v);
                }
            }
        } else {
            const single = cleanID(parts[0]);
            if (single) allIDs.add(single);
        }
    });

    // Determine Root: First node defined that has NO incoming edges
    const allIDsArray = [...allIDs];
    let startNode = allIDsArray.find(id => !hasIncoming.has(id));
    
    // Fallback if circular graph
    if (!startNode && allIDsArray.length > 0) startNode = allIDsArray[0];

    return { adj, allIDs, startNode };
}