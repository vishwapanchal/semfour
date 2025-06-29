
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
} from 'reactflow';
import {
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import { useToast } from '@/hooks/use-toast';
import { exampleScenarios } from '@/lib/example-scenarios';

// Define types for network elements and simulation
export interface NodeData {
  id: string;
  label: string;
  battery: number;
  queueSize: number;
  role: 'sensor' | 'router' | 'gateway';
  isSelected?: boolean;
  isFailed?: boolean;
  // BFS Visualization
  bfsVisualizationStatus?: 'idle' | 'processed' | 'inQueue' | 'processing' | 'finalPath';
  // Dijkstra Visualization
  dijkstraStatus?: 'idle' | 'unvisited' | 'tentative' | 'finalized' | 'processing' | 'finalPath';
  displayDistance?: string; // For Dijkstra distance labels
}

export interface EdgeData {
  latency: number;
  bandwidth: number;
  isSelected?: boolean;
  isVisualizedPath?: boolean; // For BFS/Dijkstra Viz path highlighting
}

export interface SimulationParams {
  algorithm: 'dijkstra' | 'bellman-ford' | 'adaptive' | 'compare';
  sourceNode: string | null;
  targetNode: string | null;
  weights: {
    alpha: number; // latency
    beta: number;  // battery
    gamma: number; // queueSize
  };
}

export interface PerformanceMetricsData {
  energyConsumption: number;
  averageLatency: number;
  deliveryRatio: number;
  networkLifetime: number;
  hopCount: number;
  totalPathLatency: number;
  bottleneckBandwidth: number;
}

export interface SimulationResult {
  algorithm: string;
  path: string[];
  metrics: PerformanceMetricsData;
}

interface StaticPathData {
  path: string[];
}

// For BFS Step-by-Step Visualization
export interface BFSVisualizationStep {
  stepNumber: number;
  description: string;
  processedNodes: Set<string>;
  nodesInQueue: string[];
  currentlyProcessingNodeId: string | null;
  pathMap: Record<string, string[]>;
  finalPathToTarget: string[];
}

// For Dijkstra Step-by-Step Visualization
export interface DijkstraVisualizationStep {
  stepNumber: number;
  description: string;
  currentNodeId: string | null; // Node just extracted from PQ or being processed
  distances: Record<string, number | typeof Infinity>; // Tentative/final distances from source
  finalizedNodes: Set<string>; // Nodes whose shortest path from source is finalized
  priorityQueueSnapshot: { nodeId: string, distance: number | typeof Infinity }[]; // Simplified view of PQ
  predecessorMap: Record<string, string | null>;
  updatedNeighborId?: string; // Neighbor whose distance was just updated
  finalPathToTarget: string[]; // Path to target if found in this step
}


interface NetworkContextType {
  nodes: Node<NodeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  onNodesChange: OnNodesChange;
  edges: Edge<EdgeData>[];
  setEdges: React.Dispatch<React.SetStateAction<Edge<EdgeData>[]>>;
  onEdgesChange: OnEdgesChange;
  selectedElement: Node<NodeData> | Edge<EdgeData> | null;
  setSelectedElement: (element: Node<NodeData> | Edge<EdgeData> | null) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  updateEdgeData: (edgeId: string, data: Partial<EdgeData>) => void;
  simulationParams: SimulationParams;
  setSimulationParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  simulationResults: SimulationResult[] | null;
  runSimulation: () => void;
  clearNetwork: () => void;
  loadExample: (data: { nodes: Node<NodeData>[], edges: Edge<EdgeData>[] }) => void;
  deleteSelectedElement: () => void;
  matrixSize: number;
  setMatrixSize: React.Dispatch<React.SetStateAction<number>>;
  matrixInput: string;
  setMatrixInput: React.Dispatch<React.SetStateAction<string>>;
  generateNetworkFromMatrix: (matrixStr: string, numNodes: number) => void;
  toggleNodeFailState: (nodeId: string) => void;

  // BFS Visualization State and Functions
  bfsVisualizationSteps: BFSVisualizationStep[];
  currentBfsVisualizationStepIndex: number;
  isBfsVisualizing: boolean;
  startBfsVisualization: () => void;
  nextBfsStep: () => void;
  resetBfsVisualization: () => void;
  currentBfsStepDescription: string;

  // Dijkstra Visualization State and Functions
  dijkstraVisualizationSteps: DijkstraVisualizationStep[];
  currentDijkstraStepIndex: number;
  isDijkstraVisualizing: boolean;
  startDijkstraVisualization: () => void;
  nextDijkstraStep: () => void;
  resetDijkstraVisualization: () => void;
  currentDijkstraStepDescription: string;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const initialNodes: Node<NodeData>[] = exampleScenarios[0].data.nodes.map(n => ({ ...n, type: 'custom', data: { ...n.data, isFailed: n.data.isFailed || false, bfsVisualizationStatus: 'idle', dijkstraStatus: 'idle', displayDistance: '' } }));
const initialEdges: Edge<EdgeData>[] = exampleScenarios[0].data.edges.map(e => ({
    ...e,
    type: e.type || 'default',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
    animated: false,
    data: { ...e.data, isVisualizedPath: false },
}));

const findPathBFSInternal = (
  sourceId: string,
  targetId: string,
  allNodes: Node<NodeData>[],
  allEdges: Edge<EdgeData>[],
  generateSteps: boolean = false
): { path: string[], steps?: BFSVisualizationStep[] } => {
  if (!sourceId || !targetId) return { path: [] };

  const visualizationSteps: BFSVisualizationStep[] = [];
  let stepCounter = 0;
  const nodeLabel = (id: string) => allNodes.find(n=>n.id===id)?.data.label || id;

  const addStep = (description: string, processed: Set<string>, queue: string[], currentProc: string | null, pathMap: Record<string, string[]>, finalPath: string[] = []) => {
    if (generateSteps) {
      visualizationSteps.push({
        stepNumber: ++stepCounter,
        description,
        processedNodes: new Set(processed),
        nodesInQueue: [...queue],
        currentlyProcessingNodeId: currentProc,
        pathMap: JSON.parse(JSON.stringify(pathMap)),
        finalPathToTarget: [...finalPath],
      });
    }
  };
  
  const sourceNodeDetails = allNodes.find(n => n.id === sourceId);
  const targetNodeDetails = allNodes.find(n => n.id === targetId);

  if (sourceNodeDetails?.data.isFailed || targetNodeDetails?.data.isFailed) {
     addStep(`Source ('${nodeLabel(sourceId)}') or Target ('${nodeLabel(targetId)}') node has failed.`, new Set(), [], null, {});
    return { path: [], steps: generateSteps ? visualizationSteps : undefined };
  }
  if (sourceId === targetId) {
    addStep(`Source and Target are the same: '${nodeLabel(sourceId)}'. Path: [${nodeLabel(sourceId)}]`, new Set([sourceId]), [], sourceId, {[sourceId]:[sourceId]}, [sourceId]);
    return { path: [sourceId], steps: generateSteps ? visualizationSteps : undefined };
  }

  const adj: Record<string, string[]> = {};
  const validNodes = allNodes.filter(node => !node.data.isFailed);
  const validNodeIds = new Set(validNodes.map(n => n.id));

  if (!validNodeIds.has(sourceId) || !validNodeIds.has(targetId)) {
     addStep(`Source ('${nodeLabel(sourceId)}') or Target ('${nodeLabel(targetId)}') node is not in the valid (non-failed) set.`, new Set(), [], null, {});
    return { path: [], steps: generateSteps ? visualizationSteps : undefined };
  }

  validNodes.forEach(node => adj[node.id] = []);
  allEdges.forEach(edge => {
    if (validNodeIds.has(edge.source) && validNodeIds.has(edge.target)) {
      if (!adj[edge.source]) adj[edge.source] = [];
      adj[edge.source].push(edge.target);
    }
  });

  const queue: string[] = [sourceId];
  const visited = new Set<string>(); 
  const discovered = new Set<string>([sourceId]); 
  const pathMap: Record<string, string[]> = { [sourceId]: [sourceId] };

  addStep(`BFS Start: Source '${nodeLabel(sourceId)}', Target '${nodeLabel(targetId)}'. Initial Queue: [${nodeLabel(sourceId)}]`, visited, queue, null, pathMap);

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    addStep(`Processing node '${nodeLabel(currentNodeId)}'. Queue: [${queue.map(id => nodeLabel(id)).join(', ')}]`, visited, [...queue], currentNodeId, pathMap);
    
    if (currentNodeId === targetId) {
      addStep(`Target '${nodeLabel(targetId)}' found! Path: ${pathMap[currentNodeId].map(id => nodeLabel(id)).join(' -> ')}`, new Set([...visited, currentNodeId]), [], currentNodeId, pathMap, pathMap[currentNodeId]);
      return { path: pathMap[currentNodeId], steps: generateSteps ? visualizationSteps : undefined };
    }

    visited.add(currentNodeId);

    (adj[currentNodeId] || []).forEach(neighborId => {
      if (!discovered.has(neighborId)) {
        discovered.add(neighborId);
        queue.push(neighborId);
        pathMap[neighborId] = [...(pathMap[currentNodeId] || []), neighborId];
        addStep(`Discovered neighbor '${nodeLabel(neighborId)}' of '${nodeLabel(currentNodeId)}'. Added to queue. Path to '${nodeLabel(neighborId)}': ${pathMap[neighborId].map(id => nodeLabel(id)).join(' -> ')}. Queue: [${queue.map(id => nodeLabel(id)).join(', ')}]`, visited, [...queue], currentNodeId, pathMap);
      }
    });
     addStep(`Finished processing neighbors of '${nodeLabel(currentNodeId)}'. Visited: {${Array.from(visited).map(id => nodeLabel(id)).join(', ')}}. Queue: [${queue.map(id => nodeLabel(id)).join(', ')}]`, visited, [...queue], null, pathMap);
  }
  addStep(`Target '${nodeLabel(targetId)}' not reachable from '${nodeLabel(sourceId)}'. BFS complete.`, visited, queue, null, pathMap);
  return { path: [], steps: generateSteps ? visualizationSteps : undefined };
};


const dijkstraAlgorithmInternal = (
  sourceId: string,
  targetId: string,
  allNodes: Node<NodeData>[],
  allEdges: Edge<EdgeData>[]
): { path: string[], steps: DijkstraVisualizationStep[] } => {
  if (!sourceId || !targetId) return { path: [], steps: [] };

  const visualizationSteps: DijkstraVisualizationStep[] = [];
  let stepCounter = 0;
  const nodeLabel = (id: string | null) => id ? (allNodes.find(n => n.id === id)?.data.label || id) : 'N/A';

  const addStep = (
    description: string,
    currentNodeId: string | null,
    distances: Record<string, number | typeof Infinity>,
    finalizedNodes: Set<string>,
    priorityQueueSnapshot: { nodeId: string, distance: number | typeof Infinity }[],
    predecessorMap: Record<string, string | null>,
    updatedNeighborId?: string,
    finalPath: string[] = []
  ) => {
    visualizationSteps.push({
      stepNumber: ++stepCounter,
      description,
      currentNodeId,
      distances: { ...distances },
      finalizedNodes: new Set(finalizedNodes),
      priorityQueueSnapshot: [...priorityQueueSnapshot],
      predecessorMap: { ...predecessorMap },
      updatedNeighborId,
      finalPathToTarget: [...finalPath],
    });
  };

  const sourceNodeDetails = allNodes.find(n => n.id === sourceId);
  const targetNodeDetails = allNodes.find(n => n.id === targetId);

  if (sourceNodeDetails?.data.isFailed || targetNodeDetails?.data.isFailed) {
    addStep(`Source ('${nodeLabel(sourceId)}') or Target ('${nodeLabel(targetId)}') node has failed.`, null, {}, new Set(), [], {});
    return { path: [], steps: visualizationSteps };
  }

  const distances: Record<string, number | typeof Infinity> = {};
  const predecessorMap: Record<string, string | null> = {};
  const priorityQueue: { nodeId: string, distance: number | typeof Infinity }[] = [];
  const finalizedNodes = new Set<string>();

  const validNodes = allNodes.filter(node => !node.data.isFailed);
  const validNodeIds = new Set(validNodes.map(n => n.id));

  if (!validNodeIds.has(sourceId) || (sourceId !== targetId && !validNodeIds.has(targetId))) {
     addStep(`Source ('${nodeLabel(sourceId)}') or Target ('${nodeLabel(targetId)}') node is not in the valid (non-failed) set.`, null, distances, finalizedNodes, [], predecessorMap);
    return { path: [], steps: visualizationSteps };
  }
  
  validNodes.forEach(node => {
    distances[node.id] = Infinity;
    predecessorMap[node.id] = null;
  });

  distances[sourceId] = 0;
  priorityQueue.push({ nodeId: sourceId, distance: 0 });
  
  addStep(
    `Dijkstra Start: Source '${nodeLabel(sourceId)}', Target '${nodeLabel(targetId)}'. Initialize distances (Source: 0, Others: ∞). PQ: [${nodeLabel(sourceId)}(0)]`,
    null, distances, finalizedNodes, [{nodeId: sourceId, distance: 0}], predecessorMap
  );

  if (sourceId === targetId) {
      finalizedNodes.add(sourceId);
       addStep(`Target '${nodeLabel(targetId)}' is source. Path: [${nodeLabel(sourceId)}]`, sourceId, distances, finalizedNodes, [], predecessorMap, undefined, [sourceId]);
      return { path: [sourceId], steps: visualizationSteps };
  }

  while (priorityQueue.length > 0) {
    priorityQueue.sort((a, b) => (a.distance as number) - (b.distance as number)); // Simulate PQ
    const { nodeId: u, distance: uDistance } = priorityQueue.shift()!;

    if (uDistance === Infinity || finalizedNodes.has(u)) {
      continue; // Already finalized or unreachable
    }
    
    finalizedNodes.add(u);
    addStep(
      `Processing node '${nodeLabel(u)}' (Dist: ${uDistance}). Finalized. PQ: [${priorityQueue.map(item => `${nodeLabel(item.nodeId)}(${item.distance === Infinity ? '∞' : item.distance})`).join(', ')}]`,
      u, distances, finalizedNodes, [...priorityQueue], predecessorMap
    );

    if (u === targetId) {
      let currentPathNode: string | null = targetId;
      const path: string[] = [];
      while (currentPathNode) {
        path.unshift(currentPathNode);
        currentPathNode = predecessorMap[currentPathNode];
      }
       addStep(
        `Target '${nodeLabel(targetId)}' found and finalized! Path: ${path.map(id => nodeLabel(id)).join(' -> ')}`,
        u, distances, finalizedNodes, [...priorityQueue], predecessorMap, undefined, path
      );
      return { path, steps: visualizationSteps };
    }

    const neighbors = allEdges.filter(edge => edge.source === u && validNodeIds.has(edge.target) && !finalizedNodes.has(edge.target))
                             .map(edge => ({ target: edge.target, weight: edge.data.latency }));

    for (const { target: v, weight: edgeWeight } of neighbors) {
      const newDist = (uDistance as number) + edgeWeight;
      if (newDist < (distances[v] as number)) {
        const oldDist = distances[v];
        distances[v] = newDist;
        predecessorMap[v] = u;
        
        const pqIndex = priorityQueue.findIndex(item => item.nodeId === v);
        if (pqIndex > -1) {
          priorityQueue[pqIndex].distance = newDist;
        } else {
          priorityQueue.push({ nodeId: v, distance: newDist });
        }
        addStep(
          `Relax edge '${nodeLabel(u)}' -> '${nodeLabel(v)}'. New dist to '${nodeLabel(v)}': ${newDist} (was ${oldDist === Infinity ? '∞' : oldDist}). PQ Updated.`,
          u, distances, finalizedNodes, [...priorityQueue].sort((a, b) => (a.distance as number) - (b.distance as number)), predecessorMap, v
        );
      }
    }
  }
  
  addStep(`Target '${nodeLabel(targetId)}' not reachable from '${nodeLabel(sourceId)}'. Dijkstra complete.`, null, distances, finalizedNodes, [], predecessorMap);
  return { path: [], steps: visualizationSteps };
};


export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeData>(initialEdges);
  const [selectedElement, setSelectedElement] = useState<Node<NodeData> | Edge<EdgeData> | null>(null);
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    algorithm: 'adaptive',
    sourceNode: initialNodes.length > 0 ? initialNodes[0].id : null,
    targetNode: initialNodes.length > 1 ? initialNodes[initialNodes.length - 1].id : initialNodes.length > 0 ? initialNodes[0].id : null,
    weights: { alpha: 0.4, beta: 0.3, gamma: 0.3 },
  });
  const [simulationResults, setSimulationResults] = useState<SimulationResult[] | null>(null);
  const { toast } = useToast();

  const [matrixSize, setMatrixSize] = useState<number>(3);
  const [matrixInput, setMatrixInput] = useState<string>('0,1,0\n0,0,1\n1,0,0');
  
  const [staticPaths, setStaticPaths] = useState<Record<string, StaticPathData | 'UNREACHABLE'>>({});

  // BFS Visualization State
  const [bfsVisualizationSteps, setBfsVisualizationSteps] = useState<BFSVisualizationStep[]>([]);
  const [currentBfsVisualizationStepIndex, setCurrentBfsVisualizationStepIndex] = useState<number>(-1);
  const [isBfsVisualizing, setIsBfsVisualizing] = useState<boolean>(false);
  const [currentBfsStepDescription, setCurrentBfsStepDescription] = useState<string>("");

  // Dijkstra Visualization State
  const [dijkstraVisualizationSteps, setDijkstraVisualizationSteps] = useState<DijkstraVisualizationStep[]>([]);
  const [currentDijkstraStepIndex, setCurrentDijkstraStepIndex] = useState<number>(-1);
  const [isDijkstraVisualizing, setIsDijkstraVisualizing] = useState<boolean>(false);
  const [currentDijkstraStepDescription, setCurrentDijkstraStepDescription] = useState<string>("");

  const clearAllVisualPathStyles = useCallback(() => {
    setEdges(eds => eds.map(e => ({
        ...e,
        className: '', // Clear any specific path classes
        data: { ...e.data, isVisualizedPath: false }
    })));
    setNodes(nds => nds.map(n => ({...n, data: {...n.data, bfsVisualizationStatus: 'idle', dijkstraStatus: 'idle', displayDistance: '' }})))
  }, [setEdges, setNodes]);

  const resetAnyActiveVisualization = useCallback((showToast = true, toastMessage = 'Visualization Reset') => {
    let visualizationWasActive = false;
    if (isBfsVisualizing) {
      setIsBfsVisualizing(false);
      setCurrentBfsVisualizationStepIndex(-1);
      setBfsVisualizationSteps([]);
      setCurrentBfsStepDescription("");
      visualizationWasActive = true;
    }
    if (isDijkstraVisualizing) {
      setIsDijkstraVisualizing(false);
      setCurrentDijkstraStepIndex(-1);
      setDijkstraVisualizationSteps([]);
      setCurrentDijkstraStepDescription("");
      visualizationWasActive = true;
    }
    if (visualizationWasActive) {
      clearAllVisualPathStyles();
      if (showToast) {
        toast({ title: toastMessage });
      }
    }
  }, [isBfsVisualizing, isDijkstraVisualizing, clearAllVisualPathStyles, toast]);


  const handleSimulationStateChange = useCallback((
    messageTitle: string,
    messageDescription: string,
    variant: 'default' | 'destructive' = 'default',
    options: { clearStaticPaths?: boolean } = { clearStaticPaths: true }
  ) => {
    clearAllVisualPathStyles();
    setSimulationResults(null);
    if (options.clearStaticPaths) {
        setStaticPaths({});
    }
    resetAnyActiveVisualization(false); // Reset without separate toast
    toast({ title: messageTitle, description: messageDescription, variant });
  }, [clearAllVisualPathStyles, toast, setSimulationResults, setStaticPaths, resetAnyActiveVisualization]);

  const applyBfsVisualizationToElements = useCallback(() => {
    if (!isBfsVisualizing || currentBfsVisualizationStepIndex < 0 || currentBfsVisualizationStepIndex >= bfsVisualizationSteps.length) {
      if(isBfsVisualizing){
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, bfsVisualizationStatus: 'idle' } })));
        setEdges(eds => eds.map(e => ({ ...e, className: '', data: { ...e.data, isVisualizedPath: false } })));
      }
      return;
    }

    const currentStep = bfsVisualizationSteps[currentBfsVisualizationStepIndex];
    if (!currentStep) return;

    setCurrentBfsStepDescription(currentStep.description);

    setNodes(nds =>
      nds.map(n => {
        let status: NodeData['bfsVisualizationStatus'] = 'idle';
        if (currentStep.finalPathToTarget.includes(n.id)) {
          status = 'finalPath';
        } else if (n.id === currentStep.currentlyProcessingNodeId) {
          status = 'processing';
        } else if (currentStep.nodesInQueue.includes(n.id)) {
          status = 'inQueue';
        } else if (currentStep.processedNodes.has(n.id)) {
          status = 'processed';
        }
        return { ...n, data: { ...n.data, bfsVisualizationStatus: status, dijkstraStatus: 'idle', displayDistance: '' } };
      })
    );

    setEdges(eds =>
      eds.map(e => {
        let isPathEdge = false;
        if (currentStep.finalPathToTarget.length > 1) {
          for (let i = 0; i < currentStep.finalPathToTarget.length - 1; i++) {
            if ((e.source === currentStep.finalPathToTarget[i] && e.target === currentStep.finalPathToTarget[i + 1]) ||
                (e.target === currentStep.finalPathToTarget[i] && e.source === currentStep.finalPathToTarget[i + 1])) {
              isPathEdge = true;
              break;
            }
          }
        }
        return {
          ...e,
          className: isPathEdge ? 'bfs-visualized-path' : '',
          data: { ...e.data, isVisualizedPath: isPathEdge },
        };
      })
    );
  }, [isBfsVisualizing, currentBfsVisualizationStepIndex, bfsVisualizationSteps, setNodes, setEdges]);


  const applyDijkstraVisualizationToElements = useCallback(() => {
    if (!isDijkstraVisualizing || currentDijkstraStepIndex < 0 || currentDijkstraStepIndex >= dijkstraVisualizationSteps.length) {
      if(isDijkstraVisualizing){
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, dijkstraStatus: 'idle', displayDistance: '' } })));
        setEdges(eds => eds.map(e => ({ ...e, className: '', data: { ...e.data, isVisualizedPath: false } })));
      }
      return;
    }
    const currentStep = dijkstraVisualizationSteps[currentDijkstraStepIndex];
    if (!currentStep) return;

    setCurrentDijkstraStepDescription(currentStep.description);

    setNodes(nds =>
      nds.map(n => {
        let status: NodeData['dijkstraStatus'] = 'unvisited';
        const distance = currentStep.distances[n.id];
        let displayDist = distance === Infinity ? '∞' : distance?.toString() ?? '';

        if (currentStep.finalPathToTarget.includes(n.id)) {
          status = 'finalPath';
        } else if (n.id === currentStep.currentNodeId) {
          status = 'processing';
        } else if (currentStep.finalizedNodes.has(n.id)) {
          status = 'finalized';
        } else if (distance !== undefined && distance !== Infinity) {
          status = 'tentative';
        }
        
        return { ...n, data: { ...n.data, dijkstraStatus: status, bfsVisualizationStatus: 'idle', displayDistance: displayDist } };
      })
    );
     setEdges(eds =>
      eds.map(e => {
        let isPathEdge = false;
        if (currentStep.finalPathToTarget.length > 1) {
          for (let i = 0; i < currentStep.finalPathToTarget.length - 1; i++) {
            if ((e.source === currentStep.finalPathToTarget[i] && e.target === currentStep.finalPathToTarget[i + 1]) ||
                (e.target === currentStep.finalPathToTarget[i] && e.source === currentStep.finalPathToTarget[i + 1])) {
              isPathEdge = true;
              break;
            }
          }
        }
        // Add style for edge being relaxed
        let edgeClassName = isPathEdge ? 'dijkstra-visualized-path' : '';
        if (currentStep.currentNodeId === e.source && currentStep.updatedNeighborId === e.target) {
            edgeClassName += ' dijkstra-relaxed-edge';
        }

        return {
          ...e,
          className: edgeClassName,
          data: { ...e.data, isVisualizedPath: isPathEdge },
        };
      })
    );

  }, [isDijkstraVisualizing, currentDijkstraStepIndex, dijkstraVisualizationSteps, setNodes, setEdges]);

  useEffect(() => {
    if (isBfsVisualizing) applyBfsVisualizationToElements();
  }, [isBfsVisualizing, currentBfsVisualizationStepIndex, bfsVisualizationSteps, applyBfsVisualizationToElements]);

  useEffect(() => {
    if (isDijkstraVisualizing) applyDijkstraVisualizationToElements();
  }, [isDijkstraVisualizing, currentDijkstraStepIndex, dijkstraVisualizationSteps, applyDijkstraVisualizationToElements]);


  const startBfsVisualization = useCallback(() => {
    resetAnyActiveVisualization(false);
    const { sourceNode: sourceId, targetNode: targetId } = simulationParams;
    if (!sourceId || !targetId) {
      toast({ title: 'BFS Vis Error', description: 'Please select source and target nodes.', variant: 'destructive' });
      return;
    }
    clearAllVisualPathStyles();
    setSimulationResults(null);

    const { steps } = findPathBFSInternal(sourceId, targetId, nodes, edges, true);
    if (steps && steps.length > 0) {
      setBfsVisualizationSteps(steps);
      setCurrentBfsVisualizationStepIndex(0);
      setIsBfsVisualizing(true);
      setIsDijkstraVisualizing(false); // Ensure other viz is off
      toast({ title: 'BFS Visualization Started', description: 'Click "Next Step" to proceed.' });
    } else {
      toast({ title: 'BFS Vis Error', description: 'Could not generate BFS steps. Path might be impossible or source/target invalid.', variant: 'destructive' });
      setBfsVisualizationSteps([]);
      setCurrentBfsVisualizationStepIndex(-1);
      setIsBfsVisualizing(false);
    }
  }, [simulationParams, nodes, edges, toast, clearAllVisualPathStyles, resetAnyActiveVisualization]);

  const nextBfsStep = useCallback(() => {
    if (isBfsVisualizing && currentBfsVisualizationStepIndex < bfsVisualizationSteps.length - 1) {
      setCurrentBfsVisualizationStepIndex(prev => prev + 1);
    } else if (isBfsVisualizing) {
      toast({ title: 'BFS Visualization Ended', description: 'This is the last step.' });
    }
  }, [isBfsVisualizing, currentBfsVisualizationStepIndex, bfsVisualizationSteps.length, toast]);

  const resetBfsVisualization = useCallback(() => {
    setIsBfsVisualizing(false);
    setCurrentBfsVisualizationStepIndex(-1);
    setBfsVisualizationSteps([]);
    setCurrentBfsStepDescription("");
    clearAllVisualPathStyles();
    toast({ title: 'BFS Visualization Reset' });
  }, [clearAllVisualPathStyles, toast]);


  const startDijkstraVisualization = useCallback(() => {
    resetAnyActiveVisualization(false);
    const { sourceNode: sourceId, targetNode: targetId } = simulationParams;
    if (!sourceId || !targetId) {
      toast({ title: 'Dijkstra Vis Error', description: 'Please select source and target nodes.', variant: 'destructive' });
      return;
    }
    clearAllVisualPathStyles();
    setSimulationResults(null);

    const { steps } = dijkstraAlgorithmInternal(sourceId, targetId, nodes, edges);
    if (steps && steps.length > 0) {
      setDijkstraVisualizationSteps(steps);
      setCurrentDijkstraStepIndex(0);
      setIsDijkstraVisualizing(true);
      setIsBfsVisualizing(false); // Ensure other viz is off
      toast({ title: 'Dijkstra Visualization Started', description: 'Click "Next Step" to proceed.' });
    } else {
      toast({ title: 'Dijkstra Vis Error', description: 'Could not generate Dijkstra steps. Path might be impossible or source/target invalid.', variant: 'destructive' });
      setDijkstraVisualizationSteps([]);
      setCurrentDijkstraStepIndex(-1);
      setIsDijkstraVisualizing(false);
    }
  }, [simulationParams, nodes, edges, toast, clearAllVisualPathStyles, resetAnyActiveVisualization]);

  const nextDijkstraStep = useCallback(() => {
    if (isDijkstraVisualizing && currentDijkstraStepIndex < dijkstraVisualizationSteps.length - 1) {
      setCurrentDijkstraStepIndex(prev => prev + 1);
    } else if (isDijkstraVisualizing) {
      toast({ title: 'Dijkstra Visualization Ended', description: 'This is the last step.' });
    }
  }, [isDijkstraVisualizing, currentDijkstraStepIndex, dijkstraVisualizationSteps.length, toast]);

  const resetDijkstraVisualization = useCallback(() => {
    setIsDijkstraVisualizing(false);
    setCurrentDijkstraStepIndex(-1);
    setDijkstraVisualizationSteps([]);
    setCurrentDijkstraStepDescription("");
    clearAllVisualPathStyles();
    toast({ title: 'Dijkstra Visualization Reset' });
  }, [clearAllVisualPathStyles, toast]);

  useEffect(() => {
    const activeNodes = nodes.filter(n => !n.data.isFailed);
    const activeNodeIds = activeNodes.map(n => n.id);

    if (
        simulationParams.sourceNode && !activeNodeIds.includes(simulationParams.sourceNode) ||
        simulationParams.targetNode && !activeNodeIds.includes(simulationParams.targetNode) ||
        !simulationParams.sourceNode && activeNodeIds.length > 0 ||
        !simulationParams.targetNode && activeNodeIds.length > 0
    ) {
        let newSource = null;
        let newTarget = null;
        if (activeNodeIds.length > 0) {
            newSource = activeNodeIds[0];
            if (activeNodeIds.length > 1) {
                newTarget = activeNodeIds[1];
            } else {
                newTarget = newSource;
            }
        }
        setSimulationParams(prev => ({ ...prev, sourceNode: newSource, targetNode: newTarget }));
        handleSimulationStateChange('Network Changed', 'Source/Target nodes have been updated.', 'default', { clearStaticPaths: true });
    }
  }, [nodes]);


  const updateNodeData = useCallback((nodeId: string, data: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data, bfsVisualizationStatus: node.data.bfsVisualizationStatus || 'idle', dijkstraStatus: node.data.dijkstraStatus || 'idle' } } : node
      )
    );
    if (selectedElement && 'position' in selectedElement && selectedElement.id === nodeId) {
      setSelectedElement(prev => prev ? {...prev, data: {...prev.data, ...data}} : null);
    }
  }, [setNodes, selectedElement]);

  const updateEdgeData = useCallback((edgeId: string, data: Partial<EdgeData>) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId ? { ...edge, data: { ...edge.data, ...data, isVisualizedPath: edge.data?.isVisualizedPath || false } } : edge
      )
    );
     if (selectedElement && !('position' in selectedElement) && selectedElement.id === edgeId) {
      setSelectedElement(prev => prev ? {...prev, data: {...prev.data, ...data}} : null);
    }
  }, [setEdges, selectedElement]);

  const toggleNodeFailState = useCallback((nodeId: string) => {
    let nodeLabel = nodeId;
    setNodes(nds => nds.map(n => {
      if (n.id === nodeId) {
        nodeLabel = n.data.label || n.id;
        return { ...n, data: { ...n.data, isFailed: !n.data.isFailed } };
      }
      return n;
    }));
    const nodeNowFailed = !nodes.find(n => n.id === nodeId)?.data.isFailed;

    handleSimulationStateChange(
        'Node State Changed',
        `Node ${nodeLabel} is now ${nodeNowFailed ? 'FAILED' : 'RESTORED'}. Run simulation to see updated paths.`,
        nodeNowFailed ? 'destructive' : 'default',
        { clearStaticPaths: false } // Do NOT clear static paths on node failure/restore
    );

    if (selectedElement && 'position' in selectedElement && selectedElement.id === nodeId) {
      setSelectedElement(prev => prev ? {...prev, data: {...prev.data, isFailed: nodeNowFailed}} : null);
    }
  }, [nodes, setNodes, handleSimulationStateChange, selectedElement]);


  const clearNetwork = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedElement(null);
    handleSimulationStateChange('Network Cleared', 'Canvas has been reset.', 'default', { clearStaticPaths: true });
  }, [setNodes, setEdges, handleSimulationStateChange]);

  const loadExample = useCallback((data: { nodes: Node<NodeData>[], edges: Edge<EdgeData>[] }) => {
     const typedNodes = data.nodes.map(n => ({ ...n, type: 'custom', data: {...n.data, isFailed: n.data.isFailed || false, bfsVisualizationStatus: 'idle', dijkstraStatus: 'idle', displayDistance: ''} }));
     const styledMarkedEdges = data.edges.map(e => ({
         ...e,
         type: e.type || 'default',
         markerEnd: { type: MarkerType.ArrowClosed },
         style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
         animated: false,
         data: { ...e.data, isVisualizedPath: false }
     }));
    setNodes(typedNodes);
    setEdges(styledMarkedEdges);
    setSelectedElement(null);
    handleSimulationStateChange('Example Loaded', 'Network topology updated. Run simulation to see paths.', 'default', { clearStaticPaths: true });
  }, [setNodes, setEdges, handleSimulationStateChange]);


  const deleteSelectedElement = useCallback(() => {
    if (!selectedElement) {
       toast({ title: 'No element selected', description: 'Click on a node or edge to select it first.', variant: 'destructive'});
      return;
    }
    const isNode = 'position' in selectedElement;
    const elementId = selectedElement.id;
    const elementLabel = isNode ? (selectedElement as Node<NodeData>).data.label || elementId : elementId;

    if (isNode) {
      setNodes((nds) => nds.filter((node) => node.id !== elementId));
      setEdges((eds) => eds.filter((edge) => edge.source !== elementId && edge.target !== elementId));
    } else { 
      setEdges((eds) => eds.filter((edge) => edge.id !== elementId));
    }
    setSelectedElement(null);
    handleSimulationStateChange(
        `${isNode ? 'Node' : 'Edge'} Deleted`,
        `Element ${elementLabel} removed.`,
        'default',
        { clearStaticPaths: true }
    );
  }, [selectedElement, setNodes, setEdges, toast, handleSimulationStateChange]);

  const generateNetworkFromMatrix = useCallback((matrixStr: string, numNodes: number) => {
    if (numNodes <= 0) {
      toast({ title: 'Invalid Matrix Size', description: 'Number of nodes must be positive.', variant: 'destructive' });
      return;
    }
    const rows = matrixStr.trim().split('\n');
    if (rows.length !== numNodes) {
      toast({ title: 'Matrix Error', description: `Matrix must have ${numNodes} rows. Found ${rows.length}.`, variant: 'destructive' });
      return;
    }
    const newGeneratedNodes: Node<NodeData>[] = [];
    const newGeneratedEdges: Edge<EdgeData>[] = [];
    const adjMatrix: number[][] = [];
    const spacing = 180;
    const nodesPerRow = Math.max(1, Math.ceil(Math.sqrt(numNodes)));

    for (let i = 0; i < numNodes; i++) {
      const cols = rows[i].split(',').map(val => val.trim());
      if (cols.length !== numNodes) {
        toast({ title: 'Matrix Error', description: `Row ${i + 1} must have ${numNodes} columns. Found ${cols.length}.`, variant: 'destructive' });
        return;
      }
      const numericRow: number[] = [];
      for (let j = 0; j < numNodes; j++) {
        const val = parseInt(cols[j], 10);
        if (isNaN(val) || (val !== 0 && val !== 1)) {
          toast({ title: 'Matrix Error', description: `Invalid value '${cols[j]}' at row ${i + 1}, col ${j + 1}. Must be 0 or 1.`, variant: 'destructive' });
          return;
        }
        numericRow.push(val);
      }
      adjMatrix.push(numericRow);
      const nodeX = (i % nodesPerRow) * spacing + 50;
      const nodeY = Math.floor(i / nodesPerRow) * spacing + 50;
      const nodeId = `m_node_${i}`;
      newGeneratedNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: nodeX, y: nodeY },
        data: {
          id: nodeId,
          label: `Node ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i/26) : ''}`,
          battery: 100,
          queueSize: 0,
          role: 'sensor',
          isSelected: false,
          isFailed: false,
          bfsVisualizationStatus: 'idle',
          dijkstraStatus: 'idle',
          displayDistance: '',
        },
      });
    }
    for (let i = 0; i < numNodes; i++) {
      for (let j = 0; j < numNodes; j++) {
        if (adjMatrix[i][j] === 1) {
          const sourceNodeId = `m_node_${i}`;
          const targetNodeId = `m_node_${j}`;
          newGeneratedEdges.push({
            id: `m_edge_${i}-${j}`,
            source: sourceNodeId,
            target: targetNodeId,
            type: 'default',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
            animated: false,
            data: { latency: 10, bandwidth: 100, isVisualizedPath: false },
          });
        }
      }
    }
    setNodes(newGeneratedNodes);
    setEdges(newGeneratedEdges);
    setSelectedElement(null);
    handleSimulationStateChange(
        'Network Generated',
        `${numNodes} nodes and ${newGeneratedEdges.length} edges created from matrix.`,
        'default',
        { clearStaticPaths: true }
    );
  }, [setNodes, setEdges, setSelectedElement, toast, handleSimulationStateChange]);


  const runSimulation = useCallback(() => {
     if (isBfsVisualizing || isDijkstraVisualizing) {
      toast({ title: 'Simulation Paused', description: 'Please reset any active algorithm visualization before running.', variant: 'destructive' });
      return;
    }
    const { sourceNode: sourceId, targetNode: targetId, algorithm, weights } = simulationParams;
    const currentNodes = nodes; 
    const currentEdges = edges; 

     if (!sourceId || !targetNode) {
       toast({ title: 'Simulation Error', description: 'Please select source and target nodes.', variant: 'destructive' });
       clearAllVisualPathStyles();
       setSimulationResults(null);
       return;
     }

     const sourceNodeDetails = currentNodes.find(n => n.id === sourceId);
     const targetNodeDetails = currentNodes.find(n => n.id === targetId);

     if (sourceNodeDetails?.data.isFailed) {
        toast({ title: 'Simulation Error', description: `Source node ${sourceNodeDetails.data.label || sourceId} has failed.`, variant: 'destructive' });
        clearAllVisualPathStyles();
        setSimulationResults(null);
        return;
     }
     if (targetNodeDetails?.data.isFailed) {
        toast({ title: 'Simulation Error', description: `Target node ${targetNodeDetails.data.label || targetId} has failed.`, variant: 'destructive' });
        clearAllVisualPathStyles();
        setSimulationResults(null);
        return;
     }

    if (algorithm === 'adaptive' || algorithm === 'compare') {
        const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
        if (Math.abs(totalWeight - 1) > 0.001) {
            toast({ title: 'Simulation Error', description: 'Adaptive weights (α, β, γ) must sum to 1.', variant: 'destructive' });
            clearAllVisualPathStyles();
            setSimulationResults(null);
            return;
        }
    }

    const algorithmsToRun = algorithm === 'compare'
        ? ['dijkstra', 'bellman-ford', 'adaptive']
        : [algorithm];

    const results: SimulationResult[] = algorithmsToRun.map(algo => {
        let currentMockPath: string[] = [];
        const pathKey = `${algo}-${sourceId}-${targetId}`;

        if (algo === 'dijkstra' || algo === 'bellman-ford') {
            const storedStaticData = staticPaths[pathKey];
            if (storedStaticData) {
                if (storedStaticData !== 'UNREACHABLE') {
                    currentMockPath = storedStaticData.path;
                }
            } else {
                const { path: bfsPath } = findPathBFSInternal(sourceId, targetId, currentNodes, currentEdges, false);
                currentMockPath = bfsPath;
                if (bfsPath.length === 0 && sourceId !== targetId) {
                    setStaticPaths(prev => ({ ...prev, [pathKey]: 'UNREACHABLE' }));
                } else {
                    setStaticPaths(prev => ({ ...prev, [pathKey]: { path: currentMockPath } }));
                }
            }
        } else if (algo === 'adaptive') {
            let bestAdaptivePath: string[] = [];
            let minCost = Infinity;

            const directEdge = currentEdges.find(edge =>
                edge.source === sourceId && edge.target === targetId &&
                !currentNodes.find(n => n.id === edge.source)?.data.isFailed &&
                !currentNodes.find(n => n.id === edge.target)?.data.isFailed
            );

            if (directEdge?.data) {
                 minCost = (directEdge.data.latency * weights.alpha); 
                 bestAdaptivePath = [sourceId, targetId];
            }

            const intermediateNodeCandidates = currentNodes.filter(node =>
                node.id !== sourceId && node.id !== targetId && !node.data.isFailed
            );

            for (const intermediateNode of intermediateNodeCandidates) {
                const edge1 = currentEdges.find(e =>
                    e.source === sourceId && e.target === intermediateNode.id &&
                    !currentNodes.find(n => n.id === e.source)?.data.isFailed &&
                    !currentNodes.find(n => n.id === e.target)?.data.isFailed
                );
                const edge2 = currentEdges.find(e =>
                    e.source === intermediateNode.id && e.target === targetId &&
                    !currentNodes.find(n => n.id === e.source)?.data.isFailed &&
                    !currentNodes.find(n => n.id === e.target)?.data.isFailed
                );

                if (edge1?.data && edge2?.data && intermediateNode?.data) {
                    const pathLatencyVal = (edge1.data.latency + edge2.data.latency);
                    const latencyCostVal = weights.alpha * pathLatencyVal;
                    const batteryUnhealthiness = 100 - intermediateNode.data.battery;
                    const batteryCostVal = weights.beta * batteryUnhealthiness;
                    const queueCostVal = weights.gamma * intermediateNode.data.queueSize;
                    const totalCost = latencyCostVal + batteryCostVal + queueCostVal;

                    if (totalCost < minCost) {
                        minCost = totalCost;
                        bestAdaptivePath = [sourceId, intermediateNode.id, targetId];
                    }
                }
            }
            currentMockPath = bestAdaptivePath;
            if (currentMockPath.length === 0 && sourceId !== targetId) {
                const { path: bfsPath } = findPathBFSInternal(sourceId, targetId, currentNodes, currentEdges, false);
                currentMockPath = bfsPath;
            }
        }
        
        // ---- Unified, Direct Metric Calculation ----
        const pathLength = currentMockPath.length > 0 ? Math.max(0, currentMockPath.length - 1) : 0;
        const noPathExists = currentMockPath.length === 0 && sourceId !== targetId;
        const isPathBroken = currentMockPath.some(nodeId => currentNodes.find(n => n.id === nodeId)?.data.isFailed);

        let baseMetrics: PerformanceMetricsData;

        if (noPathExists || isPathBroken) {
            baseMetrics = {
                energyConsumption: Infinity, averageLatency: Infinity, deliveryRatio: 0, networkLifetime: 0,
                hopCount: Infinity, totalPathLatency: Infinity, bottleneckBandwidth: 0,
            };
        } else if (pathLength === 0 && sourceId === targetId) {
            const sourceNode = currentNodes.find(n => n.id === sourceId);
            baseMetrics = {
                energyConsumption: 0, averageLatency: 0, deliveryRatio: 1,
                networkLifetime: (sourceNode?.data.battery || 0) * 5,
                hopCount: 0, totalPathLatency: 0, bottleneckBandwidth: Infinity,
            };
        } else {
            let calculatedTotalLatency = 0;
            let calculatedBottleneckBandwidth = Infinity;

            for (let i = 0; i < pathLength; i++) {
                const edge = currentEdges.find(e => (e.source === currentMockPath[i] && e.target === currentMockPath[i + 1]) || (e.source === currentMockPath[i + 1] && e.target === currentMockPath[i]));
                if (edge?.data) {
                    calculatedTotalLatency += edge.data.latency;
                    calculatedBottleneckBandwidth = Math.min(calculatedBottleneckBandwidth, edge.data.bandwidth);
                } else {
                    calculatedTotalLatency = Infinity; break;
                }
            }

            if (calculatedTotalLatency === Infinity) {
                baseMetrics = { energyConsumption: Infinity, averageLatency: Infinity, deliveryRatio: 0, networkLifetime: 0, hopCount: Infinity, totalPathLatency: Infinity, bottleneckBandwidth: 0 };
            } else {
                const pathNodes = currentMockPath.map(nodeId => currentNodes.find(n => n.id === nodeId)!);
                const calculatedAverageLatency = pathLength > 0 ? calculatedTotalLatency / pathLength : 0;
                const calculatedEnergyConsumption = (pathLength * 5) + (calculatedTotalLatency * 0.1);

                const calculatedDeliveryRatio = pathNodes.slice(1).reduce((acc, node) => acc * (node.data.battery / 100.0), 1.0);
                
                const minBatteryOnPath = Math.min(...pathNodes.map(node => node.data.battery));
                const calculatedNetworkLifetime = minBatteryOnPath * 5;

                baseMetrics = {
                    energyConsumption: calculatedEnergyConsumption,
                    averageLatency: calculatedAverageLatency,
                    deliveryRatio: calculatedDeliveryRatio,
                    networkLifetime: calculatedNetworkLifetime,
                    hopCount: pathLength,
                    totalPathLatency: calculatedTotalLatency,
                    bottleneckBandwidth: calculatedBottleneckBandwidth,
                };
            }
        }
        
        return {
            algorithm: algo,
            path: currentMockPath,
            metrics: baseMetrics,
        };
    });

    setSimulationResults(results);

    const chosenAlgorithmForDisplay = algorithm === 'compare' ? 'adaptive' : algorithm;
    const resultForDisplay = results.find(r => r.algorithm === chosenAlgorithmForDisplay) || results[0];
    const pathEdgesToHighlight = new Set<string>();

     if (resultForDisplay && resultForDisplay.path.length > 1) {
        for (let i = 0; i < resultForDisplay.path.length - 1; i++) {
            const pathSource = resultForDisplay.path[i];
            const pathTarget = resultForDisplay.path[i+1];
            const edge = currentEdges.find(e => (e.source === pathSource && e.target === pathTarget) || (e.target === pathSource && e.source === pathTarget) );
            if (edge) {
                pathEdgesToHighlight.add(edge.id);
            }
        }
     }

    setEdges(eds => eds.map(e => ({
        ...e,
        className: pathEdgesToHighlight.has(e.id) ? 'general-visualized-path' : '',
    })));

    const pathFoundForDisplay = resultForDisplay && resultForDisplay.path.length > 0 && resultForDisplay.metrics.deliveryRatio > 0;
    const displayedAlgoName = resultForDisplay?.algorithm || chosenAlgorithmForDisplay;
    const pathNodeLabels = resultForDisplay?.path.map(nodeId => currentNodes.find(n => n.id === nodeId)?.data.label || nodeId).join(' -> ');

    toast({
      title: 'Simulation Complete',
      description: pathFoundForDisplay
        ? `Displaying path for ${displayedAlgoName}: ${pathNodeLabels}`
        : `No valid path found for ${displayedAlgoName}.`,
       variant: pathFoundForDisplay ? 'default' : 'destructive'
    });
  }, [nodes, edges, simulationParams, setEdges, toast, setSimulationResults, clearAllVisualPathStyles, staticPaths, setStaticPaths, isBfsVisualizing, isDijkstraVisualizing]);


  return (
    <NetworkContext.Provider
      value={{
        nodes,
        setNodes,
        onNodesChange,
        edges,
        setEdges,
        onEdgesChange,
        selectedElement,
        setSelectedElement,
        updateNodeData,
        updateEdgeData,
        simulationParams,
        setSimulationParams,
        simulationResults,
        runSimulation,
        clearNetwork,
        loadExample,
        deleteSelectedElement,
        matrixSize,
        setMatrixSize,
        matrixInput,
        setMatrixInput,
        generateNetworkFromMatrix,
        toggleNodeFailState,
        // BFS Visualization
        bfsVisualizationSteps,
        currentBfsVisualizationStepIndex,
        isBfsVisualizing,
        startBfsVisualization,
        nextBfsStep,
        resetBfsVisualization,
        currentBfsStepDescription,
        // Dijkstra Visualization
        dijkstraVisualizationSteps,
        currentDijkstraStepIndex,
        isDijkstraVisualizing,
        startDijkstraVisualization,
        nextDijkstraStep,
        resetDijkstraVisualization,
        currentDijkstraStepDescription,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
