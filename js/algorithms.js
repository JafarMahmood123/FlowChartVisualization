import { parseMermaidGraph } from './parser.js';

export function getSequenceBFS(text) {
    const { adj, startNode } = parseMermaidGraph(text);
    if (!startNode) return [];
    
    const visited = new Set(); 
    const queue = [startNode]; 
    const result = [];
    
    result.push({ 
        id: startNode, 
        msg: `Start at Root [${startNode}]`, 
        type: 'log-info', 
        structure: [...queue], 
        structName: 'Queue', 
        visited: [] 
    });

    while (queue.length > 0) {
        const node = queue.shift();
        if (!visited.has(node)) {
            visited.add(node);
            const neighbors = adj[node] || [];
            const unvisited = neighbors.filter(n => !visited.has(n));
            const newAdds = [];
            
            unvisited.forEach(n => { 
                if(!queue.includes(n)) { queue.push(n); newAdds.push(n); } 
            });
            
            result.push({ 
                id: node, 
                msg: `Visited ${node}`, 
                action: `Dequeued ${node}`, 
                newAdds: newAdds, 
                type: 'log-add', 
                structure: [...queue], 
                structName: 'Queue', 
                visited: [...visited] 
            });
        }
    }
    return result;
}

export function getSequenceDFS(text) {
    const { adj, startNode } = parseMermaidGraph(text);
    if (!startNode) return [];
    
    const visited = new Set(); 
    const stack = [startNode]; 
    const result = [];
    
    result.push({ 
        id: startNode, 
        msg: `Start at Root [${startNode}]`, 
        type: 'log-info', 
        structure: [...stack], 
        structName: 'Stack', 
        visited: [] 
    });

    while (stack.length > 0) {
        const node = stack.pop();
        if (!visited.has(node)) {
            visited.add(node);
            const neighbors = (adj[node] || []).slice().reverse();
            const unvisited = neighbors.filter(n => !visited.has(n));
            unvisited.forEach(n => stack.push(n));
            
            result.push({ 
                id: node, 
                msg: `Visited ${node}`, 
                action: `Popped ${node}`, 
                newAdds: unvisited, 
                type: 'log-add', 
                structure: [...stack], 
                structName: 'Stack', 
                visited: [...visited] 
            });
        }
    }
    return result;
}

export function getSequenceLinear(text) {
    const { allIDs } = parseMermaidGraph(text);
    return [...allIDs].map(id => ({ 
        id: id, 
        msg: `Processing Node: ${id}`, 
        type: 'log-info', 
        structure: [], 
        structName: 'Linear', 
        visited: [] 
    }));
}