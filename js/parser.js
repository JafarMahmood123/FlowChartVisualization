export function cleanID(raw) {
    if (!raw) return null;
    // Extract ID from syntax like "NodeA[Label]" or "NodeB((Circle))"
    const match = raw.trim().match(/^([\w-]+)/);
    const id = match ? match[1] : null;
    // Ignore Mermaid keywords
    if (id && ['graph', 'TD', 'LR', 'subgraph', 'end', 'style', 'classDef', '%%'].includes(id)) return null;
    return id;
}

export function parseMermaidGraph(text) {
    const adj = {};
    const allIDs = new Set(); // Keeps insertion order
    const hasIncoming = new Set(); // Tracks nodes that are destinations
    
    const lines = text.split('\n');

    lines.forEach(line => {
        // 1. Remove comments
        let cleanLine = line.split('%%')[0].trim();
        if (!cleanLine) return;

        // 2. Robust Splitter
        // Matches: -->|text|, -- text -->, -->, -.->, ==>
        const parts = cleanLine.split(/\s*(?:-->\|.*?\||--.*?-->|-->|-\.->|==>)\s*/);

        if (parts.length >= 2) {
            for (let i = 0; i < parts.length - 1; i++) {
                const u = cleanID(parts[i]);
                const v = cleanID(parts[i+1]);

                if (u && v) {
                    allIDs.add(u);
                    allIDs.add(v);
                    
                    // Mark 'v' as having an incoming connection
                    hasIncoming.add(v);

                    if (!adj[u]) adj[u] = [];
                    // Avoid duplicate edges
                    if (!adj[u].includes(v)) adj[u].push(v);
                }
            }
        } else {
            // Handle single node lines like "StartNode" or "A[Label]"
            const single = cleanID(parts[0]);
            if (single) allIDs.add(single);
        }
    });

    // 3. Determine Root Node Logic
    const allIDsArray = [...allIDs];
    
    // Priority: Find the first node that has NO incoming edges
    let startNode = allIDsArray.find(id => !hasIncoming.has(id));
    
    // Fallback: If all nodes have incoming edges (cycle), pick the first one defined
    if (!startNode) {
        startNode = allIDsArray[0];
    }

    return { adj, allIDs, startNode };
}