
'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { BatteryMedium, Layers2, Router, Network, Server, ShieldAlert, Ban, Eye, CheckCircle, Dot, HelpCircle, Target, TrendingUp } from 'lucide-react';
import type { NodeData } from '@/context/network-context';
import { cn } from '@/lib/utils';

const CustomNode = memo(({ data, isConnectable, selected }: NodeProps<NodeData>) => {
  const { label, battery, queueSize, role, isFailed, bfsVisualizationStatus, dijkstraStatus, displayDistance } = data;

  const getIcon = () => {
    if (isFailed) return <Ban size={16} className="text-destructive" />;
    
    // Algorithm Visualization Icons take precedence
    if (bfsVisualizationStatus === 'processing') return <Eye size={16} className="text-blue-400 animate-pulse" />;
    if (bfsVisualizationStatus === 'inQueue') return <Dot size={20} className="text-yellow-400" />;
    if (bfsVisualizationStatus === 'processed' || bfsVisualizationStatus === 'finalPath') return <CheckCircle size={16} className={bfsVisualizationStatus === 'finalPath' ? "text-chart-5" : "text-green-400"} />;

    if (dijkstraStatus === 'processing') return <Target size={16} className="text-purple-400 animate-pulse" />;
    if (dijkstraStatus === 'tentative') return <HelpCircle size={16} className="text-orange-400" />;
    if (dijkstraStatus === 'finalized' || dijkstraStatus === 'finalPath') return <TrendingUp size={16} className={dijkstraStatus === 'finalPath' ? "text-chart-5" : "text-teal-400"} />;


    switch (role) {
      case 'sensor':
        return <Network size={16} className="text-muted-foreground" />;
      case 'router':
        return <Router size={16} className="text-muted-foreground" />;
      case 'gateway':
        return <Server size={16} className="text-muted-foreground" />;
      default:
        return <Network size={16} className="text-muted-foreground" />;
    }
  };

  const getBatteryColorClass = (level: number) => {
    if (level < 20) return 'text-battery-low';
    if (level < 50) return 'text-battery-medium';
    return 'text-battery-high';
  };

  const getRoleIndicatorStyle = (nodeRole: NodeData['role']) => {
    if (isFailed) return 'bg-destructive/70';
    // BFS Visualization Status
    if (bfsVisualizationStatus === 'finalPath') return 'bg-chart-5';
    if (bfsVisualizationStatus === 'processing') return 'bg-blue-400';
    if (bfsVisualizationStatus === 'inQueue') return 'bg-yellow-400';
    if (bfsVisualizationStatus === 'processed') return 'bg-green-400';
    // Dijkstra Visualization Status
    if (dijkstraStatus === 'finalPath') return 'bg-chart-5'; // Same as BFS final path for consistency
    if (dijkstraStatus === 'processing') return 'bg-purple-400';
    if (dijkstraStatus === 'tentative') return 'bg-orange-400';
    if (dijkstraStatus === 'finalized') return 'bg-teal-400';


    switch (nodeRole) {
      case 'sensor':
        return 'bg-[hsl(var(--role-sensor-accent-hsl))]';
      case 'router':
        return 'bg-[hsl(var(--role-router-accent-hsl))]';
      case 'gateway':
        return 'bg-[hsl(var(--role-gateway-accent-hsl))]';
      default:
        return 'bg-muted'; 
    }
  };

  const getVisualizationClass = () => {
    // BFS takes precedence if active
    if (bfsVisualizationStatus && bfsVisualizationStatus !== 'idle') {
        switch(bfsVisualizationStatus) {
            case 'processing': return 'border-blue-400 ring-2 ring-blue-400 shadow-lg scale-105 bfs-viz-processing';
            case 'inQueue': return 'border-yellow-400 opacity-90 bfs-viz-inQueue';
            case 'processed': return 'border-green-400 opacity-80 bfs-viz-processed';
            case 'finalPath': return 'border-chart-5 ring-2 ring-chart-5 shadow-md bfs-viz-finalPath';
            default: return '';
        }
    }
    // Then Dijkstra
    if (dijkstraStatus && dijkstraStatus !== 'idle' && dijkstraStatus !== 'unvisited') {
         switch(dijkstraStatus) {
            case 'processing': return 'border-purple-400 ring-2 ring-purple-400 shadow-lg scale-105 dijkstra-processing';
            case 'tentative': return 'border-orange-400 opacity-90 dijkstra-tentative';
            case 'finalized': return 'border-teal-400 opacity-85 dijkstra-finalized';
            case 'finalPath': return 'border-chart-5 ring-2 ring-chart-5 shadow-md dijkstra-finalPath'; // Reuse final path style
            default: return '';
        }
    }
    return '';
  }

  const isVisualizing = (bfsVisualizationStatus && bfsVisualizationStatus !== 'idle') || (dijkstraStatus && dijkstraStatus !== 'idle' && dijkstraStatus !== 'unvisited');

  return (
    <Card className={cn(
        'w-36 transition-all duration-150 ease-in-out overflow-hidden',
        getVisualizationClass(),
        isFailed && !isVisualizing && 'opacity-60 border-destructive shadow-none',
        selected && !isFailed && !isVisualizing && 'border-primary ring-2 ring-primary shadow-lg',
        selected && isFailed && !isVisualizing && 'border-destructive ring-2 ring-destructive shadow-md'
      )}>
      <div className={cn("h-1.5 w-full", getRoleIndicatorStyle(role))} /> 
      <CardContent className="p-2 text-center">
         <div className="flex items-center justify-center mb-1 gap-1">
            {getIcon()}
            <div className={cn("text-xs font-semibold truncate", isFailed && "line-through text-muted-foreground")} title={label}>{label}</div>
         </div>
        {!isFailed && !isVisualizing && ( 
          <div className="flex justify-around items-center text-xs mt-1">
            <div className={`flex items-center gap-0.5 ${getBatteryColorClass(battery)}`} title={`Battery: ${battery}%`}>
              <BatteryMedium size={12} />
              <span>{battery}%</span>
            </div>
            <div className="flex items-center gap-0.5 text-muted-foreground" title={`Queue: ${queueSize}`}>
              <Layers2 size={12} />
              <span>{queueSize}</span>
            </div>
          </div>
        )}
        {isFailed && !isVisualizing && (
            <div className="text-xs text-destructive font-semibold mt-1">NODE FAILED</div>
        )}
         {bfsVisualizationStatus && bfsVisualizationStatus !== 'idle' && (
            <div className="text-xs text-muted-foreground mt-1 capitalize">
                BFS: {bfsVisualizationStatus === 'finalPath' ? 'On Path' : bfsVisualizationStatus}
            </div>
        )}
        {dijkstraStatus && dijkstraStatus !== 'idle' && dijkstraStatus !== 'unvisited' && (
             <div className="text-xs text-muted-foreground mt-1 capitalize">
                Dijkstra: {dijkstraStatus === 'finalPath' ? 'On Path' : dijkstraStatus}
                {displayDistance && (dijkstraStatus === 'tentative' || dijkstraStatus === 'finalized' || dijkstraStatus === 'processing' || dijkstraStatus === 'finalPath') && 
                  <span className="block font-mono text-xs">Dist: {displayDistance}</span>
                }
            </div>
        )}
      </CardContent>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable && !isFailed} className={cn(isFailed && "!cursor-not-allowed !bg-destructive/50")} />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable && !isFailed} className={cn(isFailed && "!cursor-not-allowed !bg-destructive/50")} />
      <Handle type="target" position={Position.Left} isConnectable={isConnectable && !isFailed} className={cn(isFailed && "!cursor-not-allowed !bg-destructive/50")} />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable && !isFailed} className={cn(isFailed && "!cursor-not-allowed !bg-destructive/50")} />
    </Card>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;

