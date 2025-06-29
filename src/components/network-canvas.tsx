
'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  Panel,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useNetwork } from '@/context/network-context';
import CustomNode from './custom-node';
import { Button } from './ui/button';
import { Play, Plus, Trash2, Maximize, Minimize, Eye, SkipForward, RotateCcw, Route } from 'lucide-react'; // Added Route for Dijkstra
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { exampleScenarios } from '@/lib/example-scenarios';
import { Badge } from './ui/badge'; 

const nodeTypes = {
  custom: CustomNode,
};

export function NetworkCanvas() {
  const {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    setSelectedElement,
    runSimulation,
    clearNetwork,
    loadExample,
    // BFS Visualization
    startBfsVisualization,
    nextBfsStep,
    resetBfsVisualization,
    isBfsVisualizing,
    currentBfsStepDescription,
    // Dijkstra Visualization
    startDijkstraVisualization,
    nextDijkstraStep,
    resetDijkstraVisualization,
    isDijkstraVisualizing,
    currentDijkstraStepDescription,
    simulationParams, 
  } = useNetwork();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isAnyVisualizationActive = isBfsVisualizing || isDijkstraVisualizing;

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      if (isAnyVisualizationActive) return; 
      setEdges((eds) =>
        addEdge({ ...params, type: 'default', markerEnd: { type: MarkerType.ArrowClosed }, data: { latency: 10, bandwidth: 100, isVisualizedPath: false } }, eds)
      );
    },
    [setEdges, isAnyVisualizationActive]
  );

   const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (isAnyVisualizationActive) return;

      if (!reactFlowInstance || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      const newNodeId = `node_${+new Date()}`;
      const newNodeData = {
        id: newNodeId,
        label: `Node ${nodes.length + 1}`,
        battery: 100,
        queueSize: 0,
        role: 'sensor',
        isSelected: false,
        isFailed: false,
        bfsVisualizationStatus: 'idle' as const,
        dijkstraStatus: 'idle' as const,
        displayDistance: '',
      };
      const newNode: Node = {
        id: newNodeId,
        type: 'custom',
        position,
        data: newNodeData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, nodes.length, setNodes, isAnyVisualizationActive]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (isAnyVisualizationActive) return;
      setSelectedElement(node);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isSelected: n.id === node.id },
        }))
      );
       setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          data: { ...e.data, isSelected: false },
           className: e.data?.isVisualizedPath ? (isBfsVisualizing ? 'bfs-visualized-path' : 'dijkstra-visualized-path') : '',
        }))
      );
    },
    [setSelectedElement, setNodes, setEdges, isAnyVisualizationActive, isBfsVisualizing]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (isAnyVisualizationActive) return;
      setSelectedElement(edge);
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          data: { ...e.data, isSelected: e.id === edge.id },
          className: e.data?.isVisualizedPath ? (isBfsVisualizing ? 'bfs-visualized-path' : 'dijkstra-visualized-path') : (e.id === edge.id ? 'selected-edge' : ''), // Simplified logic
        }))
      );
       setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isSelected: false },
        }))
      );
    },
    [setSelectedElement, setEdges, setNodes, isAnyVisualizationActive, isBfsVisualizing]
  );

   const onPaneClick = useCallback(() => {
    if (isAnyVisualizationActive) return;
    setSelectedElement(null);
     setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isSelected: false },
        }))
      );
     setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          data: { ...e.data, isSelected: false },
          className: e.data?.isVisualizedPath ? (isBfsVisualizing ? 'bfs-visualized-path' : 'dijkstra-visualized-path') : '',
        }))
      );
  }, [setSelectedElement, setNodes, setEdges, isAnyVisualizationActive, isBfsVisualizing]);

  const handleAddNode = useCallback(() => {
    if (isAnyVisualizationActive) return;
    const newNodeId = `node_${+new Date()}`;
    const newNodeData = {
      id: newNodeId,
      label: `Node ${nodes.length + 1}`,
      battery: 100,
      queueSize: 0,
      role: 'sensor' as const,
      isSelected: false,
      isFailed: false,
      bfsVisualizationStatus: 'idle' as const,
      dijkstraStatus: 'idle' as const,
      displayDistance: '',
    };
    const newNode: Node = {
      id: newNodeId,
      type: 'custom',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: newNodeData,
    };
    setNodes((nds) => nds.concat(newNode));
  }, [nodes.length, setNodes, isAnyVisualizationActive]);

  const handleExampleChange = (value: string) => {
    if (isAnyVisualizationActive) {
        if (isBfsVisualizing) resetBfsVisualization();
        if (isDijkstraVisualizing) resetDijkstraVisualization();
    }
    if (value === 'clear') {
      clearNetwork();
    } else {
       const example = exampleScenarios.find(ex => ex.id === value);
       if (example) {
         loadExample(example.data);
       }
    }
  };

  const handleToggleFullscreen = useCallback(() => {
    if (!reactFlowWrapper.current) return;

    if (!document.fullscreenElement) {
      reactFlowWrapper.current.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);


  return (
    <div className="flex-grow h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-background"
        nodesDraggable={!isAnyVisualizationActive}
        nodesConnectable={!isAnyVisualizationActive}
        elementsSelectable={!isAnyVisualizationActive}
        zoomOnScroll={!isAnyVisualizationActive}
        panOnDrag={!isAnyVisualizationActive}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Panel position="top-left" className="p-2 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Select onValueChange={handleExampleChange} disabled={isAnyVisualizationActive}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Load Example" />
              </SelectTrigger>
              <SelectContent>
                {exampleScenarios.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                ))}
                <SelectItem value="clear">Clear Network</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleAddNode} disabled={isAnyVisualizationActive}>
              <Plus className="mr-2 h-4 w-4" /> Add Node
            </Button>
            <Button variant="destructive" size="sm" onClick={clearNetwork} disabled={isAnyVisualizationActive}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear All
            </Button>
            <Button variant="default" size="sm" onClick={runSimulation} disabled={isAnyVisualizationActive || !simulationParams.sourceNode || !simulationParams.targetNode}>
              <Play className="mr-2 h-4 w-4" /> Run Simulation
            </Button>
            <Button variant="outline" size="sm" onClick={handleToggleFullscreen}>
              {isFullscreen ? <Minimize className="mr-2 h-4 w-4" /> : <Maximize className="mr-2 h-4 w-4" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {!isAnyVisualizationActive ? (
              <>
                <Button variant="secondary" size="sm" onClick={startBfsVisualization} disabled={!simulationParams.sourceNode || !simulationParams.targetNode}>
                  <Eye className="mr-2 h-4 w-4" /> Visualize BFS
                </Button>
                 <Button variant="secondary" size="sm" onClick={startDijkstraVisualization} disabled={!simulationParams.sourceNode || !simulationParams.targetNode}>
                  <Route className="mr-2 h-4 w-4" /> Visualize Dijkstra
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={isBfsVisualizing ? nextBfsStep : nextDijkstraStep}>
                  <SkipForward className="mr-2 h-4 w-4" /> Next Step
                </Button>
                <Button variant="outline" size="sm" onClick={isBfsVisualizing ? resetBfsVisualization : resetDijkstraVisualization}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset Visualization
                </Button>
              </>
            )}
          </div>
           {isBfsVisualizing && currentBfsStepDescription && (
            <Badge variant="outline" className="p-2 text-xs bg-card text-card-foreground w-full whitespace-normal text-center">
              BFS: {currentBfsStepDescription}
            </Badge>
          )}
          {isDijkstraVisualizing && currentDijkstraStepDescription && (
             <Badge variant="outline" className="p-2 text-xs bg-card text-card-foreground w-full whitespace-normal text-center">
              Dijkstra: {currentDijkstraStepDescription}
            </Badge>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}

