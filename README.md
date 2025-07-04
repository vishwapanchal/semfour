# Network Navigator

**Optimizing Data Flow in IoT Sensor Networks Using Graph Theory**

Network Navigator is an interactive web application designed for visualizing, simulating, and analyzing pathfinding algorithms within the context of IoT (Internet of Things) sensor networks. This tool provides an educational platform to understand the trade-offs between different routing strategies by considering various network conditions like node battery levels, queue sizes, and link latency.

## Project Synopsis for Academic Reporting

### Abstract
The proliferation of Internet of Things (IoT) devices has made efficient network routing a critical challenge. Selecting an optimal path is not merely about the shortest distance but involves balancing multiple factors like energy consumption, latency, and node health. This project presents "Network Navigator," an interactive web-based visualization tool designed to demystify this complexity. The application allows users to construct custom network topologies and simulate the performance of various routing algorithms, including Dijkstra's, Bellman-Ford (represented by BFS), and a novel adaptive algorithm. By providing immediate visual feedback and quantitative performance metrics, the tool enables a clear comparison of routing strategies, offering insights into the trade-offs inherent in IoT network design and management.

### Introduction
The Internet of Things (IoT) represents a paradigm shift in which everyday objects are interconnected, collecting and sharing data to create smart environments in domains like healthcare, logistics, and agriculture. A fundamental challenge in these distributed systems is ensuring that data travels from a source sensor to a target gateway reliably and efficiently. Traditional pathfinding algorithms, such as Dijkstra's, often optimize for a single metric like the shortest path (lowest latency), which can be insufficient for IoT networks. For instance, the shortest path might repeatedly use a specific node, draining its battery and compromising the entire network's longevity. Similarly, a path might become congested, leading to data loss.

This project addresses the need for a more holistic approach to network analysis by developing "Network Navigator," a hands-on educational tool. It provides a platform to visually and quantitatively compare different routing strategies. Users can observe how a simple shortest-path algorithm differs from a more intelligent, multi-factor adaptive algorithm that dynamically considers node battery levels and queue sizes. By simulating real-world scenarios, including node failures, the tool helps users understand the practical consequences of choosing one algorithm over another, bridging the gap between theoretical concepts and real-world application.

### Objectives
The primary objectives of this project are:
1.  **To develop a user-friendly web application** for designing and visualizing IoT sensor network topologies through an interactive, drag-and-drop canvas.
2.  **To implement and visualize the operational steps** of classic pathfinding algorithms like Breadth-First Search (BFS) and Dijkstra's, allowing users to observe their decision-making process.
3.  **To design and implement a novel adaptive routing algorithm** that selects paths based on a weighted combination of multiple metrics, including link latency, intermediate node battery, and data queue size.
4.  **To create a comparative analysis framework** for running simulations and evaluating algorithm performance based on key metrics like energy consumption, delivery ratio, and network lifetime.
5.  **To simulate real-world network challenges,** such as node failure, and observe how different routing algorithms adapt to dynamic changes in the network topology.

### Methodology
The project was developed as a modern web application using the **Next.js** and **React** framework, enabling a highly interactive client-side experience. The core methodology is broken down as follows:

1.  **Graph Representation and Visualization:** The **ReactFlow** library was used to model the network graph. It handles the state management of nodes and edges, their positions on the canvas, and user interactions like dragging, selecting, and connecting elements. Custom node components were created to display specific IoT-related data (battery, role, queue size).

2.  **Algorithm Implementation:** The pathfinding algorithms were implemented in **TypeScript**.
    *   **Dijkstra's Algorithm** was implemented to find the path with the lowest cumulative latency.
    *   **Breadth-First Search (BFS)** was implemented to find the path with the fewest hops, serving as the pathfinding logic for the "Bellman-Ford" simulation option and as a fallback for the Adaptive algorithm.
    *   The **Adaptive Algorithm** was custom-designed as a heuristic that evaluates a limited set of 1-hop and 2-hop paths, using a weighted cost function to balance latency, battery, and queue size.

3.  **Simulation and Metrics Calculation:** A simulation engine was built within the React Context API. When a simulation is run, it executes the chosen algorithm(s) on the current network state. The performance metrics (Energy Consumption, Delivery Ratio, Network Lifetime, etc.) are then **calculated directly** from the properties of the nodes and edges that constitute the resulting path, ensuring a deterministic and realistic analysis.

4.  **Step-by-Step Visualization:** For BFS and Dijkstra's, the algorithms were re-engineered to produce a series of state snapshots at each step of their execution. The user interface reads these snapshots sequentially, updating the styles and data of nodes and edges on the canvas to provide a detailed, step-by-step visual walkthrough of the algorithm's logic.

5.  **User Interface (UI) and Styling:** The UI was built with **ShadCN/UI** components and styled with **Tailwind CSS**. This provided a professional, consistent, and responsive design for all interactive elements, including the sidebar, control panels, and performance charts.

## Core Features

-   **Interactive Topology Designer:** Easily create and modify network topologies by dragging and dropping nodes and connecting them with edges on a dynamic canvas.
-   **Step-by-Step Algorithm Visualization:** Observe the inner workings of pathfinding algorithms with a granular, step-by-step visualizer for both **Breadth-First Search (BFS)** and **Dijkstra's Algorithm**.
-   **Comparative Algorithm Simulation:** Run simulations to compare the performance of three distinct routing algorithms:
    -   **Dijkstra's Algorithm:** Finds the shortest path based on latency.
    -   **Bellman-Ford Algorithm:** A robust algorithm that also finds the shortest path (demonstrated here with a static path based on hop count via BFS).
    -   **Custom Adaptive Algorithm:** A heuristic-based algorithm that selects a path based on a weighted combination of latency, intermediate node battery, and queue size.
-   **Dynamic Performance Metrics:** After each simulation, view a detailed comparison of algorithm performance across key metrics, including:
    -   Energy Consumption
    -   Average Latency
    -   Delivery Ratio (%)
    -   Network Lifetime
    -   Hop Count & Total Path Latency
-   **Node Failure Simulation:** Toggle the operational state of any node to "failed" and observe how the routing algorithms adapt (or fail) in real-time.
-   **Pre-defined Example Scenarios:** Load various network setups to quickly test different conditions, such as low-battery nodes, congested links, or complex topologies.

## Tech Stack

-   **Framework:** [Next.js](https://nextjs.org/) (with App Router)
-   **UI Library:** [React](https://react.dev/)
-   **Graph Visualization:** [ReactFlow](https://reactflow.dev/)
-   **UI Components:** [ShadCN/UI](https://ui.shadcn.com/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **State Management:** React Context API

## Getting Started

Follow these instructions to get a local copy of the project up and running on your machine.

### Prerequisites

You need to have [Node.js](https://nodejs.org/en) (version 18.x or later) and npm installed.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Yashvanth-7353/Network_Navigator.git
    cd Network_Navigator
    ```

2.  **Install dependencies:**
    Run the following command to install all the necessary packages for the project.
    ```bash
    npm install
    ```

3.  **Run the development server:**
    Once the installation is complete, start the Next.js development server.
    ```bash
    npm run dev
    ```

4.  **Open the application:**
    Open your web browser and navigate to [http://localhost:3000](http://localhost:3000) to see the application in action.

## How to Use the Application

1.  **Load a Scenario:** Use the "Load Example" dropdown on the top-left of the canvas to choose a pre-configured network.
2.  **Select Source & Target:** In the right-hand sidebar under "Simulation Parameters," select the desired `Source Node` and `Target Node` for the simulation.
3.  **Choose an Algorithm:** Select the routing algorithm you want to analyze (`Dijkstra`, `Bellman-Ford`, `Adaptive`, or `Compare All`).
    -   If you select `Adaptive` or `Compare All`, you can adjust the weights (`α`, `β`, `γ`) to prioritize different metrics.
4.  **Run Simulation:** Click the "Run Simulation" button. The optimal path found by the selected algorithm will be highlighted on the canvas, and the performance metrics will update below.
5.  **Visualize an Algorithm Step-by-Step:**
    -   Select a source and target node.
    -   Click "Visualize BFS" or "Visualize Dijkstra".
    -   Use the "Next Step" button to walk through the algorithm's execution. The node and edge styles will change, and a description of the current step will appear.
    -   Click "Reset Visualization" to exit the mode.
6.  **Simulate Node Failure:**
    -   Click on any node in the canvas.
    -   In the sidebar, click the "Fail Node" button. The node will be marked as failed.
    -   Run a new simulation to see how the paths are recalculated. Click "Restore Node" to bring it back online.
